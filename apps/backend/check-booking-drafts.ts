import {strict as assert} from 'node:assert'
import {createHash} from 'node:crypto'
import {eq} from 'drizzle-orm'
import router from './src/bookings/routes'
import {db} from './src/db/client'
import {bookings,users} from './src/db/schema'
import {signAccessToken} from './src/lib/jwt'
const requestKey=crypto.randomUUID()
const hash=createHash('sha256').update(requestKey).digest('hex')
let actor:string|undefined
const contact={requestKey,patientName:'Draft integration test',phone:'+201012345678'}
const send=(path:string,body:unknown)=>router.request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
try {
 const invalid=await send('/drafts',{...contact,phone:'123'})
 assert.equal(invalid.status,400)
 const saves=await Promise.all(Array.from({length:8},()=>send('/drafts',contact)))
 const ids=await Promise.all(saves.map(async response=>{assert.equal(response.status,200);return (await response.json() as any).id}))
 assert.equal(new Set(ids).size,1)
 let rows=await db.select().from(bookings).where(eq(bookings.requestKeyHash,hash))
 assert.equal(rows.length,1);assert.equal(rows[0].requestStage,'draft');assert.notEqual(rows[0].requestKeyHash,requestKey)
 const [user]=await db.insert(users).values({name:'Draft test',username:`draft-test-${requestKey}`,passwordHash:'disabled-test-account',role:'admin'}).returning()
 actor=user.id
 const token=await signAccessToken({sub:user.id,role:'admin'})
 const listed=await router.request('/admin/?requestStage=draft&limit=100',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()) as any
 const draft=listed.data.find((row:any)=>row.id===ids[0])
 assert.ok(draft);assert.equal(draft.requestKeyHash,undefined)
 await db.update(bookings).set({status:'contacted',staffNotes:'Keep staff work'}).where(eq(bookings.id,ids[0]))
 const complete=await send('/requests',{...contact,paymentType:'insurance',insuranceCompany:'Test insurance'})
 assert.equal(complete.status,201);assert.equal((await complete.json() as any).id,ids[0])
 const repeats=await Promise.all(Array.from({length:4},()=>send('/requests',{...contact,paymentType:'cash'})))
 for(const response of repeats){assert.equal(response.status,201);assert.equal((await response.json() as any).id,ids[0])}
 await send('/drafts',{...contact,patientName:'Late stale overwrite'})
 rows=await db.select().from(bookings).where(eq(bookings.requestKeyHash,hash))
 assert.equal(rows.length,1);assert.equal(rows[0].requestStage,'complete');assert.equal(rows[0].status,'contacted');assert.equal(rows[0].staffNotes,'Keep staff work');assert.equal(rows[0].patientName,contact.patientName);assert.equal(rows[0].insuranceCompany,'Test insurance')
 console.log('PASS: invalid drafts rejected; concurrent saves create one row; dashboard exposes draft stage without secret hash; completion reuses ID; repeat completion and late autosave cannot overwrite finalized request; staff changes preserved')
} finally {
 await db.delete(bookings).where(eq(bookings.requestKeyHash,hash))
 if(actor)await db.delete(users).where(eq(users.id,actor))
}
process.exit(0)
