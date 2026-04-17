/**
 * Script de sauvegarde Supabase → JSON local
 * Usage : npx tsx scripts/backup-supabase.ts
 * Nécessite SUPABASE_SERVICE_ROLE_KEY dans .env
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Variables manquantes : VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const TABLES = [
  'users',
  'clients',
  'assessments',
  'follow_ups',
  'activity_logs',
  'pv_client_products',
  'pv_transactions',
  'client_recaps',
  'client_evolution_reports',
  'client_messages',
  'push_subscriptions',
  'client_app_accounts',
  'client_referrals',
  'rdv_change_requests',
]

/** Convertit un tableau d'objets en CSV (échappe quotes, commas, newlines) */
function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k))
      return set
    }, new Set<string>())
  )
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape((row as Record<string, unknown>)[h])).join(','))
  }
  return lines.join('\n')
}

async function backup() {
  const timestamp = new Date().toISOString().split('T')[0]
  const backupDir = path.join(process.cwd(), 'backups', timestamp)

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  console.log(`\n🗄️  Sauvegarde Lor'Squad — ${timestamp}\n`)
  const manifest: Record<string, number> = {}

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.error(`  ✗ ${table} — ${error.message}`)
        manifest[table] = -1
        continue
      }
      // JSON (format restore)
      fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify(data, null, 2))
      // CSV (format Excel / humain)
      fs.writeFileSync(path.join(backupDir, `${table}.csv`), toCsv((data ?? []) as Record<string, unknown>[]))
      manifest[table] = data?.length ?? 0
      console.log(`  ✓ ${table} — ${data?.length ?? 0} enregistrements`)
    } catch (err) {
      console.error(`  ✗ ${table} — erreur inattendue`)
      manifest[table] = -1
    }
  }

  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify({ date: timestamp, tables: manifest, total: Object.values(manifest).reduce((a, b) => a + Math.max(b, 0), 0) }, null, 2)
  )

  const total = Object.values(manifest).reduce((a, b) => a + Math.max(b, 0), 0)
  console.log(`\n✅ Sauvegarde terminée — ${total} enregistrements → backups/${timestamp}/\n`)
}

backup().catch(console.error)
