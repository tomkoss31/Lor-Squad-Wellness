/**
 * Script de restauration depuis une sauvegarde JSON
 * Usage : npx tsx scripts/restore-supabase.ts YYYY-MM-DD
 * ⚠️ ATTENTION : écrase les données existantes par upsert
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

async function restore(date: string) {
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
  console.log(`\n🔄 Restauration Lor'Squad — sauvegarde du ${date}\n`)

  for (const table of Object.keys(manifest.tables)) {
    const filePath = path.join(backupDir, `${table}.json`)
    if (!fs.existsSync(filePath)) continue

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (!data || data.length === 0) {
      console.log(`  ⊘ ${table} — vide, ignoré`)
      continue
    }

    const { error } = await supabase.from(table).upsert(data, { onConflict: 'id' })
    if (error) {
      console.error(`  ✗ ${table} — ${error.message}`)
    } else {
      console.log(`  ✓ ${table} — ${data.length} enregistrements restaurés`)
    }
  }

  console.log('\n✅ Restauration terminée.\n')
}

const date = process.argv[2]
if (!date) {
  console.error('Usage : npx tsx scripts/restore-supabase.ts YYYY-MM-DD')
  process.exit(1)
}

restore(date).catch(console.error)
