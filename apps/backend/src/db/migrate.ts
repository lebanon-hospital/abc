/**
 * Runtime migration runner used by the production image (see Dockerfile CMD).
 * Uses a session-level advisory lock so concurrent container starts during a
 * rolling deploy can't apply the same migration twice.
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const MIGRATION_LOCK_ID = 901155 // arbitrary stable id (deploy date of this script)

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[migrate] DATABASE_URL is not set')
  process.exit(1)
}

const client = postgres(url, { max: 1, idle_timeout: 5 })
const started = Date.now()

try {
  await client`select pg_advisory_lock(${MIGRATION_LOCK_ID})`
  const db = drizzle(client)
  await migrate(db, { migrationsFolder: `${import.meta.dir}/migrations` })
  console.log(`[migrate] up to date (${Date.now() - started}ms)`)
} finally {
  await client`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`
  await client.end()
}
