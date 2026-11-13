import { createHash } from 'node:crypto'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { doctorDepartmentMap } from '../doctors/departments'
import { bookings, departments, doctors } from '../db/schema'
import { authGuard } from '../auth/middleware'
import { recordAudit } from '../lib/audit'
import { normalizePhone } from '../lib/phone'

type AuthEnv = {
  Variables: { user: { id: string; username: string; role: 'admin' | 'call_center' | 'marketer' } }
}

const bookingsRouter = new OpenAPIHono<AuthEnv>()

const STATUSES = ['new', 'contacted', 'confirmed', 'declined', 'cancelled', 'completed'] as const

/* ---------------------------------- public --------------------------------- */

const requestKeyHash = (key: string) => createHash('sha256').update(key).digest('hex')

const requestSchema = z.object({
  requestKey: z.string().uuid().optional(),
  paymentType: z.enum(['cash', 'insurance']).default('cash'),
  insuranceCompany: z.string().trim().min(1).max(120).optional(),
  patientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(20),
  departmentSlug: z.string().trim().max(80).optional(),
  doctorSlug: z.string().trim().max(80).optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD from the slot picker
  time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM slot
  preferredDate: z.string().trim().max(40).optional(),
  patientNotes: z.string().trim().max(1000).optional(),
})

const draftSchema = z.object({
  requestKey: z.string().uuid(),
  patientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(20),
})
const draftRoute = createRoute({
  method:'post', path:'/drafts', tags:['bookings'], summary:'Save initial booking contact details; the secret request key identifies this draft',
  request:{body:{content:{'application/json':{schema:draftSchema}}}},
  responses:{200:{description:'Draft saved',content:{'application/json':{schema:z.object({id:z.string().uuid()})}}},400:{description:'Invalid contact details'}},
})
bookingsRouter.openapi(draftRoute,async c=>{
  const body=c.req.valid('json')
  const phone=normalizePhone(body.phone)
  if(!phone)return c.json({error:'Invalid phone number'},400)
  const hash=requestKeyHash(body.requestKey)
  const [saved]=await db.insert(bookings).values({patientName:body.patientName,phone,requestKeyHash:hash,requestStage:'draft',source:'website',status:'new'})
    .onConflictDoUpdate({target:bookings.requestKeyHash,set:{patientName:body.patientName,phone,updatedAt:new Date()},setWhere:eq(bookings.requestStage,'draft')})
    .returning({id:bookings.id})
  const row=saved ?? (await db.select({id:bookings.id}).from(bookings).where(eq(bookings.requestKeyHash,hash)).limit(1))[0]
  return c.json({id:row.id},200)
})

const createRequestRoute = createRoute({
  method: 'post',
  path: '/requests',
  tags: ['bookings'],
  summary: 'Submit an appointment request (public, homepage hero)',
  request: { body: { content: { 'application/json': { schema: requestSchema } } } },
  responses: {
    201: {
      content: { 'application/json': { schema: z.object({ id: z.string().uuid() }) } },
      description: 'Request received',
    },
    400: { description: 'Invalid input' },
  },
})

bookingsRouter.openapi(createRequestRoute, async (c) => {
  const body = c.req.valid('json')

  if (body.paymentType === 'insurance' && !body.insuranceCompany) return c.json({ error: 'Insurance company is required' }, 400)

  const phone = normalizePhone(body.phone)
  if (!phone) return c.json({ error: 'Invalid phone number' }, 400)

  let departmentId: string | null = null
  if (body.departmentSlug) {
    const [dept] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.slug, body.departmentSlug))
      .limit(1)
    if (!dept) return c.json({error:'Invalid department'},400)
    departmentId = dept.id
  }

  let doctorId: string | null = null
  if (body.doctorSlug) {
    const [doc] = await db
      .select({ id: doctors.id, departmentId: doctors.departmentId })
      .from(doctors)
      .where(eq(doctors.slug, body.doctorSlug))
      .limit(1)
    if (!doc) return c.json({error:'Invalid doctor'},400)
    doctorId = doc.id
    const memberships = await doctorDepartmentMap()
    const assigned = memberships.get(doc.id)?.map(d=>d.id) ?? (doc.departmentId ? [doc.departmentId] : [])
    if (departmentId && !assigned.includes(departmentId)) return c.json({error:'Doctor does not practice in this department'},400)
    if (!departmentId) departmentId = doc.departmentId ?? assigned[0] ?? null
  }

  const values = {
    paymentType:body.paymentType, insuranceCompany:body.paymentType === 'insurance' ? body.insuranceCompany : null,
    patientName:body.patientName, phone, source:'website', departmentId,doctorId,
    appointmentDate:body.date || null, appointmentTime:body.time || null, preferredDate:body.preferredDate || null,
    patientNotes:body.patientNotes || null, requestStage:'complete', updatedAt:new Date(),
  }
  const hash=body.requestKey ? requestKeyHash(body.requestKey) : null
  const [saved]=await db.insert(bookings).values({...values,requestKeyHash:hash,status:'new'})
    .onConflictDoUpdate({target:bookings.requestKeyHash,set:values,setWhere:eq(bookings.requestStage,'draft')})
    .returning({id:bookings.id})
  const row=saved ?? (await db.select({id:bookings.id}).from(bookings).where(eq(bookings.requestKeyHash,hash!)).limit(1))[0]

  // TODO: staff email notification once SMTP is configured
  return c.json({ id: row.id }, 201)
})

/* ---------------------------------- admin ---------------------------------- */

bookingsRouter.use('/admin/*', authGuard)

const bookingResponse = z.object({ id: z.string().uuid() }).passthrough()

const listRoute = createRoute({
  method: 'get',
  path: '/admin/',
  tags: ['bookings'],
  summary: 'List bookings (admin, paginated, filterable)',
  security: [{ Bearer: [] }],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      requestStage: z.enum(['draft','complete']).optional(),
      status: z.enum(STATUSES).optional(),
      source: z.enum(['website', 'walk_in', 'phone']).optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(bookingResponse),
            page: z.number(),
            limit: z.number(),
            total: z.number(),
          }),
        },
      },
      description: 'Bookings page',
    },
  },
})

bookingsRouter.openapi(listRoute, async (c) => {
  const { page, limit, status, source, requestStage } = c.req.valid('query')

  const filters = [
    requestStage ? eq(bookings.requestStage,requestStage) : undefined,
    status ? eq(bookings.status, status) : undefined,
    source ? eq(bookings.source, source) : undefined,
  ].filter(Boolean)

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(bookings)
    .where(filters.length ? and(...filters) : undefined)

  const rows = await db
    .select({
      booking: bookings,
      deptNameAr: departments.nameAr,
      deptNameEn: departments.nameEn,
      deptSlug: departments.slug,
      doctorNameAr: doctors.nameAr,
      doctorNameEn: doctors.nameEn,
    })
    .from(bookings)
    .leftJoin(departments, eq(bookings.departmentId, departments.id))
    .leftJoin(doctors, eq(bookings.doctorId, doctors.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return c.json({
    data: rows.map(({ booking: { requestKeyHash: _requestKeyHash, ...booking }, deptNameAr, deptNameEn, deptSlug, doctorNameAr, doctorNameEn }) => ({
      ...booking,
      departmentSlug: deptSlug,
      departmentNameAr: deptNameAr,
      departmentNameEn: deptNameEn,
      doctorNameAr,
      doctorNameEn,
    })),
    page,
    limit,
    total: Number(total),
  })
})

const manualSchema = z.object({
  paymentType: z.enum(['cash', 'insurance']).default('cash'),
  insuranceCompany: z.string().trim().min(1).max(120).optional(),
  patientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(20),
  source: z.enum(['walk_in', 'phone']),
  departmentId: z.string().uuid().optional().nullable(),
  appointmentDate: z.string().trim().max(10).optional(),
  appointmentTime: z.string().trim().max(5).optional(),
  staffNotes: z.string().trim().max(2000).optional(),
})

const manualRoute = createRoute({
  method: 'post',
  path: '/admin/manual',
  tags: ['bookings'],
  summary: 'Register a manual entry (walk-in / phone)',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: manualSchema } } } },
  responses: { 201: { description: 'Created' }, 400: { description: 'Invalid input' } },
})

bookingsRouter.openapi(manualRoute, async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')

  if (body.paymentType === 'insurance' && !body.insuranceCompany) return c.json({ error: 'Insurance company is required' }, 400)

  const phone = normalizePhone(body.phone)
  if (!phone) return c.json({ error: 'Invalid phone number' }, 400)

  const [row] = await db
    .insert(bookings)
    .values({
      paymentType: body.paymentType,
      insuranceCompany: body.paymentType === 'insurance' ? body.insuranceCompany : null,
      patientName: body.patientName,
      phone,
      source: body.source,
      departmentId: body.departmentId ?? null,
      appointmentDate: body.appointmentDate || null,
      appointmentTime: body.appointmentTime || null,
      staffNotes: body.staffNotes || null,
      status: body.appointmentDate ? 'confirmed' : 'new',
      assignedTo: user.id,
    })
    .returning()

  await recordAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: 'create',
    entity: 'booking',
    entityId: row.id,
    metadata: { source: body.source },
  })
  return c.json(row, 201)
})

const updateSchema = z.object({
  paymentType: z.enum(['cash', 'insurance']).optional(),
  insuranceCompany: z.string().trim().min(1).max(120).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  appointmentDate: z.string().trim().max(10).nullable().optional(),
  appointmentTime: z.string().trim().max(5).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  doctorId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  staffNotes: z.string().trim().max(2000).nullable().optional(),
})

const updateRoute = createRoute({
  method: 'patch',
  path: '/admin/:id',
  tags: ['bookings'],
  summary: 'Update a booking (status, appointment, assignment)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { 'application/json': { schema: updateSchema } } },
  },
  responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } },
})

bookingsRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')
  const user = c.get('user')

  const [existing] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
  if (!existing) return c.json({ error: 'Not found' }, 404)
  const paymentType = body.paymentType ?? existing.paymentType
  const insuranceCompany = body.insuranceCompany === undefined ? existing.insuranceCompany : body.insuranceCompany
  if (paymentType === 'insurance' && !insuranceCompany) return c.json({ error: 'Insurance company is required' }, 400)

  const [row] = await db
    .update(bookings)
    .set({ ...body, insuranceCompany: paymentType === 'insurance' ? insuranceCompany : null, updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)

  await recordAudit({
    actorId: user.id,
    actorUsername: user.username,
    action: 'update',
    entity: 'booking',
    entityId: id,
    metadata: body,
  })
  return c.json(row)
})

export default bookingsRouter
