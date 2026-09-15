// Aplica arquivo(s) .sql de supabase/migrations/ direto no Postgres do projeto,
// usando SUPABASE_DB_URL (connection string com senha, NUNCA prefixada com VITE_
// para não vazar no bundle do cliente). Uso:
//   node scripts/db-migrate.mjs supabase/migrations/202609141200_coop_transfer_host.sql
//   node scripts/db-migrate.mjs --all   (roda todas em ordem, ignora erro "already exists")
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = resolve(fileURLToPath(import.meta.url), '..', '..')
const envPath = join(root, '.env')
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim()
  }
} catch {}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('SUPABASE_DB_URL não definida em .env. Veja docs/COOP_SETUP.md.')
  process.exit(1)
}

const args = process.argv.slice(2)
const migrationsDir = join(root, 'supabase', 'migrations')
const files = args[0] === '--all'
  ? readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort().map(f => join(migrationsDir, f))
  : args.map(a => resolve(root, a))

if (!files.length) {
  console.error('Nenhum arquivo .sql informado. Uso: node scripts/db-migrate.mjs <arquivo.sql> [...] | --all')
  process.exit(1)
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  for (const file of files) {
    const sql = readFileSync(file, 'utf8')
    process.stdout.write(`Aplicando ${file}... `)
    try {
      await client.query(sql)
      console.log('OK')
    } catch (error) {
      console.log('FALHOU')
      throw error
    }
  }
} finally {
  await client.end()
}
