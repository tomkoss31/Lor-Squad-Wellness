/**
 * Script de restauration depuis une sauvegarde JSON
 * Usage :
 *   npx tsx scripts/restore-supabase.ts YYYY-MM-DD             → restaure TOUTES les tables
 *   npx tsx scripts/restore-supabase.ts YYYY-MM-DD clients     → restaure UNE table seulement
 *   npx tsx scripts/restore-supabase.ts YYYY-MM-DD --dry-run   → simule sans écrire
 *
 * ⚠️ ATTENTION : upsert par id → écrase les enregistrements existants avec le même id
 *    Les enregistrements créés APRÈS le backup et pas dans le fichier ne sont PAS supprimés.
 *    En cas de doute, fais d'abord un dry-run.
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

async function restore(date: string, tableFilter?: string, dryRun = false) {
  const backupDir = path.join(process.cwd(), 'backups', date)

  if (!fs.existsSync(backupDir)) {
    console.error(`Sauvegarde introuvable : ${backupDir}`)
    process.exit(1)
  }

  const manifestPath = path.join(backupDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('Fichier manifest.json manquant')
    process.exit(1)
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  const mode = dryRun ? ' (DRY-RUN — simulation)' : ''
  console.log(`\n🔄 Restauration Lor'Squad — sauvegarde du ${date}${mode}\n`)

  const tables = tableFilter ? [tableFilter] : Object.keys(manifest.tables)

  for (const table of tables) {
    const filePath = path.join(backupDir, `${table}.json`)
    if (!fs.existsSync(filePath)) {
      console.log(`  ⊘ ${table} — fichier absent`)
      continue
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (!data || data.length === 0) {
      console.log(`  ⊘ ${table} — vide, ignoré`)
      continue
    }

    if (dryRun) {
      console.log(`  ◎ ${table} — ${data.length} enregistrements seraient restaurés`)
      continue
    }

    const { error } = await supabase.from(table).upsert(data, { onConflict: 'id' })
    if (error) {
      console.error(`  ✗ ${table} — ${error.message}`)
    } else {
      console.log(`  ✓ ${table} — ${data.length} enregistrements restaurés`)
    }
  }

  console.log(`\n${dryRun ? '🔍 Simulation' : '✅ Restauration'} terminée.\n`)
}

const args = process.argv.slice(2)
const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a))
const dryRun = args.includes('--dry-run')
const tableFilter = args.find((a) => a !== date && a !== '--dry-run')

if (!date) {
  console.error('Usage : npx tsx scripts/restore-supabase.ts YYYY-MM-DD [table] [--dry-run]')
  process.exit(1)
}

restore(date, tableFilter, dryRun).catch(console.error)
