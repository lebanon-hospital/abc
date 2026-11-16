import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { asc, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { heroSlides } from '../db/schema'
import { authGuard, requireRoles } from '../auth/middleware'
import { recordAudit } from '../lib/audit'

type Env = { Variables: { user: { id: string; username: string; role: 'admin' | 'call_center' | 'marketer' } } }
const router = new OpenAPIHono<Env>()

const idParam = z.object({ id: z.string().uuid() })

const slideInput = z.object({
  titleAr: z.string().trim().max(160).default(''),
  titleEn: z.string().trim().max(160).default(''),
  // recommended desktop size 1920×1080 (16:9), mobile 1080×1920 (9:16) — auto-compressed to WebP ≤1920px on upload
  desktopUrl: z.string().trim().url(),
  mobileUrl: z.string().trim().url().optional().or(z.literal('')), // '' clears → falls back to desktop image
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
})


/* ---------------------------------- public --------------------------------- */

router.openapi(createRoute({
  method: 'get', path: '/', tags: ['hero-slides'],
  summary: 'Homepage hero slides (public, active only, ordered)',
  responses: { 200: { description: 'Hero slides' } },
}), async (c) => {
  const rows = await db.select().from(heroSlides)
    .where(eq(heroSlides.isActive, true))
    .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt))
  return c.json({ data: rows.map((r) => ({ id: r.id, titleAr: r.titleAr, titleEn: r.titleEn, desktopUrl: r.desktopUrl, mobileUrl: r.mobileUrl })) })
})

/* ---------------------------------- admin ---------------------------------- */

router.use('/admin/*', authGuard, requireRoles(['admin']))

router.openapi(createRoute({
  method: 'get', path: '/admin/', tags: ['hero-slides'],
  summary: 'List hero slides (admin)',
  security: [{ Bearer: [] }],
  responses: { 200: { description: 'All slides' } },
}), async (c) => {
  const rows = await db.select().from(heroSlides)
    .orderBy(asc(heroSlides.sortOrder), asc(heroSlides.createdAt))
  return c.json({ data: rows })
})

router.openapi(createRoute({
  method: 'post', path: '/admin/', tags: ['hero-slides'],
  summary: 'Create a hero slide',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: slideInput } } } },
  responses: { 201: { description: 'Created' }, 400: { description: 'Invalid input' } },
}), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')
  const [row] = await db.insert(heroSlides)
    .values({ ...body, mobileUrl: body.mobileUrl || null })
    .returning()
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: 'create', entity: 'hero_slide', entityId: row.id, metadata: { titleAr: row.titleAr } })
  return c.json(row, 201)
})

router.openapi(createRoute({
  method: 'patch', path: '/admin/:id', tags: ['hero-slides'],
  summary: 'Update a hero slide (send mobileUrl "" to clear it)',
  security: [{ Bearer: [] }],
  request: { params: idParam, body: { content: { 'application/json': { schema: slideInput.partial() } } } },
  responses: { 200: { description: 'Updated' }, 404: { description: 'Missing' } },
}), async (c) => {
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')
  const user = c.get('user')
  const [row] = await db.update(heroSlides)
    .set({
      ...body,
      ...(body.mobileUrl !== undefined ? { mobileUrl: body.mobileUrl || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(heroSlides.id, id))
    .returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: 'update', entity: 'hero_slide', entityId: id, metadata: body })
  return c.json(row)
})

router.openapi(createRoute({
  method: 'delete', path: '/admin/:id', tags: ['hero-slides'],
  summary: 'Delete a hero slide (the image file stays in the media library)',
  security: [{ Bearer: [] }],
  request: { params: idParam },
  responses: { 200: { description: 'Deleted' }, 404: { description: 'Missing' } },
}), async (c) => {
  const { id } = c.req.valid('param')
  const user = c.get('user')
  const [row] = await db.delete(heroSlides).where(eq(heroSlides.id, id)).returning()
  if (!row) return c.json({ error: 'Not found' }, 404)
  await recordAudit({ actorId: user.id, actorUsername: user.username, action: 'delete', entity: 'hero_slide', entityId: id, metadata: { titleAr: row.titleAr } })
  return c.json({ ok: true })
})

export default router
