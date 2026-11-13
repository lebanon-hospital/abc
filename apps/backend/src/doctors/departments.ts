import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { doctorDepartments, departments } from '../db/schema'

export async function doctorDepartmentMap(publishedOnly = false) {
  const rows = await db.select({ doctorId: doctorDepartments.doctorId, department: departments })
    .from(doctorDepartments).innerJoin(departments, eq(doctorDepartments.departmentId, departments.id))
    .where(publishedOnly ? eq(departments.status, 'published') : undefined)
  const result = new Map<string, (typeof departments.$inferSelect)[]>()
  for (const row of rows) result.set(row.doctorId, [...(result.get(row.doctorId) ?? []), row.department])
  return result
}
