import { strict as assert } from 'node:assert'
import { eq, inArray } from 'drizzle-orm'
import { db } from './src/db/client'
import { auditLogs, bookings, departments, doctorDepartments, doctors, users } from './src/db/schema'
import admin from './src/departments/routes'
import publicDoctors from './src/doctors/routes'
import postsRouter from './src/posts/routes'
import bookingRouter from './src/bookings/routes'
import { signAccessToken } from './src/lib/jwt'

const suffix=crypto.randomUUID()
let actor:string|undefined
let doctor:string|undefined
const bookingIds:string[]=[]
try {
 const depts=await db.select().from(departments)
 assert.ok(depts.length>=3,'At least three departments needed')
 const [user]=await db.insert(users).values({name:'Temporary integration test',username:`specialties-${suffix}`,passwordHash:'disabled-test-account',role:'admin'}).returning()
 actor=user.id
 const token=await signAccessToken({sub:user.id,role:'admin'})
 const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`}
 const send=(path:string,body:unknown,method='POST')=>admin.request(path,{method,headers,body:JSON.stringify(body)})
 const slug=`multi-specialty-test-${suffix}`
 let res=await send('/admin/doctors',{nameAr:'طبيب اختبار',nameEn:'Test doctor',slug,status:'published',departmentIds:[depts[0].id,depts[1].id,depts[0].id]})
 assert.equal(res.status,201,await res.clone().text())
 let row=await res.json() as any;doctor=row.id
 assert.equal(row.departmentIds.length,2)
 assert.equal((await db.select().from(doctorDepartments).where(eq(doctorDepartments.doctorId,doctor!))).length,2)
 for(const dept of depts.slice(0,2)) {
   const result=await publicDoctors.request(`/?locale=en&dept=${dept.slug}`).then(r=>r.json()) as any
   const matches=result.data.filter((d:any)=>d.id===doctor)
   assert.equal(matches.length,1)
   assert.equal(matches[0].departments.length,2)
   const detail=await admin.request(`/${dept.slug}?locale=en`).then(r=>r.json()) as any
   assert.ok(detail.data.doctors.some((d:any)=>d.id===doctor))
 }
 const adminList=await admin.request('/admin/doctors',{headers}).then(r=>r.json()) as any
 assert.equal(adminList.data.find((d:any)=>d.id===doctor).departmentIds.length,2)
 res=await send(`/admin/doctors/${doctor}`,{departmentIds:[crypto.randomUUID()]},'PATCH')
 assert.equal(res.status,400)
 assert.equal((await db.select().from(doctorDepartments).where(eq(doctorDepartments.doctorId,doctor!))).length,2)
 res=await send(`/admin/doctors/${doctor}`,{titleEn:'Updated title'},'PATCH')
 assert.equal(res.status,200)
 assert.equal((await db.select().from(doctorDepartments).where(eq(doctorDepartments.doctorId,doctor!))).length,2)
 for(const [dept,expected] of [[depts[1],201],[depts[2],400]] as const) {
   res=await bookingRouter.request('/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({patientName:'Specialty integration test',phone:'+201012345678',doctorSlug:slug,departmentSlug:dept.slug})})
   assert.equal(res.status,expected,await res.clone().text())
   if(expected===201){const b=await res.json() as any;bookingIds.push(b.id);const [saved]=await db.select().from(bookings).where(eq(bookings.id,b.id));assert.equal(saved.departmentId,dept.id)}
 }
 res=await send(`/admin/doctors/${doctor}`,{departmentIds:[depts[1].id]},'PATCH')
 assert.equal(res.status,200)
 assert.equal((await db.select().from(doctorDepartments).where(eq(doctorDepartments.doctorId,doctor!))).length,1)
 console.log('PASS: multiple specialties persist; API/admin/department pages return memberships; invalid updates preserve existing links; partial updates preserve specialties; booking secondary specialty works; unrelated specialty rejected; removing memberships works')
} finally {
 if(bookingIds.length)await db.delete(bookings).where(inArray(bookings.id,bookingIds))
 if(doctor)await db.delete(doctors).where(eq(doctors.id,doctor))
 if(actor){await db.delete(auditLogs).where(eq(auditLogs.actorId,actor));await db.delete(users).where(eq(users.id,actor))}
}
const allPosts = await postsRouter.request('/?locale=ar&type=article&limit=50').then(r=>r.json()) as any
const categories = [...new Set(allPosts.data.map((p:any)=>p.category).filter(Boolean))].slice(0,2) as string[]
if(categories.length===2) {
 const params = new URLSearchParams({locale:'ar',type:'article',category:categories.join(','),limit:'50'})
 const filtered = await postsRouter.request(`/?${params}`).then(r=>r.json()) as any
 const expected = allPosts.data.filter((p:any)=>categories.includes(p.category)).map((p:any)=>p.id).sort()
 assert.deepEqual(filtered.data.map((p:any)=>p.id).sort(),expected)
 console.log('PASS: multiple post categories include current and legacy category data without duplicate results')
}
process.exit(0)
