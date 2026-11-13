import router from './src/bookings/routes'
import { db } from './src/db/client'
import { bookings } from './src/db/schema'
import { eq } from 'drizzle-orm'
import { strict as assert } from 'node:assert'
const created: string[] = []
try {
  for (const data of [{ paymentType:'insurance', insuranceCompany:'شركة اختبار غير مسجلة' }, { paymentType:'cash', insuranceCompany:'ignored' }]) {
    const response = await router.request('/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({patientName:'Payment integration check', phone:'+201012345678', ...data}) })
    assert.equal(response.status, 201, await response.clone().text())
    const { id } = await response.json() as {id:string}
    created.push(id)
    const [row] = await db.select().from(bookings).where(eq(bookings.id,id))
    assert.equal(row.paymentType, data.paymentType)
    assert.equal(row.insuranceCompany, data.paymentType === 'insurance' ? data.insuranceCompany : null)
  }
  const invalid = await router.request('/requests', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({patientName:'Payment integration check',phone:'+201012345678',paymentType:'insurance'})})
  assert.equal(invalid.status,400)
  console.log('PASS: custom insurance persists; cash clears company; insurance without company rejected')
} finally {
  for (const id of created) await db.delete(bookings).where(eq(bookings.id,id))
}
process.exit(0)
