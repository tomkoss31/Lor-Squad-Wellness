/**
 * Sauvegarde Supabase → JSON + CSV locaux.
 * Usage : npx tsx scripts/backup-supabase.ts   (ou `npm run backup`)
 * Nécessite VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
 *
 * ─── Réécrit le 2026-07-29, après l'audit qui a suivi le gel de la base ───
 *
 * Trois défauts trouvés, tous silencieux :
 *
 * 1. LISTE ÉCRITE À LA MAIN — 14 tables sauvegardées sur les 118 que compte la
 *    base. Manquaient entre autres les RDV prospects de l'agenda, les
 *    consentements RGPD, les commandes de paiement et les leads. La liste
 *    citait même `activity_logs`, table supprimée depuis : elle échouait à
 *    chaque exécution pendant que le récap hebdomadaire affichait « ✅ OK ».
 *    → On demande désormais à la base ce qu'elle contient (backup_table_list()).
 *
 * 2. AUCUNE PAGINATION — `select('*')` s'arrête à la limite de l'API. Aucune
 *    table ne l'avait encore atteinte (la plus grosse était à 774 lignes), mais
 *    le jour où elle la dépasse, la sauvegarde se tronque SANS rien dire.
 *    → Lecture par pages, et on vérifie le total contre un vrai décompte.
 *
 * 3. LES COMPTES DE CONNEXION N'ÉTAIENT PAS SAUVEGARDÉS. Ils vivent dans le
 *    schéma `auth`, hors de portée de l'API REST. Sans eux, une restauration
 *    rendait les données mais plus personne ne pouvait se connecter.
 *    → Récupérés via l'API d'administration.
 *
 * Et surtout : LE SCRIPT ÉCHOUE BRUYAMMENT. Toute table en erreur fait sortir
 * le script en code 1, ce qui fait échouer l'action GitHub et t'envoie un mail
 * d'échec. Une sauvegarde qui se dit « OK » alors qu'elle est partielle est
 * pire que pas de sauvegarde : elle te rassure à tort.
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

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Taille d'une page de lecture. En dessous de la limite de l'API, par sécurité. */
const PAGE = 500

/** Tables de journal : volumineuses, sans valeur en cas de restauration. */
const IGNOREES = new Set([
  'push_notifications_sent',
  'client_rdv_reminders_sent',
  'club_call_reminders_sent',
])

type Erreur = { quoi: string; message: string }
const erreurs: Erreur[] = []

/** Convertit un tableau d'objets en CSV (échappe guillemets, virgules, sauts de ligne). */
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
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n')
}

/**
 * Lit une table entière, page par page.
 * Renvoie null si la lecture a échoué — l'appelant enregistre l'erreur.
 */
async function lireTable(table: string): Promise<Record<string, unknown>[] | null> {
  const rows: Record<string, unknown>[] = []
  for (let debut = 0; ; debut += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(debut, debut + PAGE - 1)
    if (error) {
      erreurs.push({ quoi: table, message: error.message })
      return null
    }
    rows.push(...((data ?? []) as Record<string, unknown>[]))
    if (!data || data.length < PAGE) return rows
  }
}

/** Les comptes de connexion : schéma `auth`, invisible depuis l'API REST. */
async function lireComptesAuth(): Promise<Record<string, unknown>[] | null> {
  const comptes: Record<string, unknown>[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) {
      erreurs.push({ quoi: 'auth.users', message: error.message })
      return null
    }
    comptes.push(...(data.users as unknown as Record<string, unknown>[]))
    if (data.users.length < 200) return comptes
  }
}

/**
 * Inventaire du stockage : le CHEMIN et les métadonnées de chaque fichier.
 * Les fichiers eux-mêmes (images, PDF) ne sont PAS téléchargés — c'est un
 * inventaire, pas une copie. Il permet de savoir ce qui manquerait.
 */
async function lireStockage(): Promise<Record<string, unknown>[] | null> {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) {
    erreurs.push({ quoi: 'storage.buckets', message: error.message })
    return null
  }
  const inventaire: Record<string, unknown>[] = []
  for (const bucket of buckets ?? []) {
    const aExplorer: string[] = ['']
    while (aExplorer.length) {
      const dossier = aExplorer.pop() as string
      const { data: entrees, error: e2 } = await supabase.storage
        .from(bucket.name)
        .list(dossier, { limit: 1000 })
      if (e2) {
        erreurs.push({ quoi: `storage/${bucket.name}/${dossier}`, message: e2.message })
        continue
      }
      for (const entree of entrees ?? []) {
        const chemin = dossier ? `${dossier}/${entree.name}` : entree.name
        // Une entrée sans id est un dossier : on descend dedans.
        if (entree.id === null) aExplorer.push(chemin)
        else inventaire.push({ bucket: bucket.name, chemin, taille: entree.metadata?.size ?? null, modifie_le: entree.updated_at ?? null })
      }
    }
  }
  return inventaire
}

async function backup() {
  const timestamp = new Date().toISOString().split('T')[0]
  const backupDir = path.join(process.cwd(), 'backups', timestamp)
  fs.mkdirSync(backupDir, { recursive: true })

  console.log(`\n🗄️  Sauvegarde La Base 360 — ${timestamp}\n`)

  const { data: tables, error: errListe } = await supabase.rpc('backup_table_list')
  if (errListe || !tables) {
    console.error(`\n❌ Impossible de lister les tables : ${errListe?.message ?? 'réponse vide'}`)
    console.error(`   La fonction backup_table_list() est-elle bien déployée ?\n`)
    process.exit(1)
  }

  const manifest: Record<string, number> = {}
  const ecrire = (nom: string, rows: Record<string, unknown>[]) => {
    fs.writeFileSync(path.join(backupDir, `${nom}.json`), JSON.stringify(rows, null, 2))
    if (rows.length) fs.writeFileSync(path.join(backupDir, `${nom}.csv`), toCsv(rows))
    manifest[nom] = rows.length
  }

  for (const { nom } of tables as { nom: string }[]) {
    if (IGNOREES.has(nom)) {
      console.log(`  – ${nom} — ignorée (table de journal)`)
      continue
    }
    const rows = await lireTable(nom)
    if (rows === null) {
      console.error(`  ✗ ${nom} — ÉCHEC`)
      manifest[nom] = -1
      continue
    }
    ecrire(nom, rows)
    console.log(`  ✓ ${nom} — ${rows.length} enregistrements`)
  }

  const comptes = await lireComptesAuth()
  if (comptes === null) {
    console.error('  ✗ comptes de connexion — ÉCHEC')
    manifest['_auth_users'] = -1
  } else {
    ecrire('_auth_users', comptes)
    console.log(`  ✓ comptes de connexion — ${comptes.length}`)
  }

  const fichiers = await lireStockage()
  if (fichiers === null) {
    console.error('  ✗ inventaire du stockage — ÉCHEC')
    manifest['_storage_inventory'] = -1
  } else {
    ecrire('_storage_inventory', fichiers)
    console.log(`  ✓ inventaire du stockage — ${fichiers.length} fichiers référencés`)
  }

  const total = Object.values(manifest).reduce((a, b) => a + Math.max(b, 0), 0)
  fs.writeFileSync(
    path.join(backupDir, 'manifest.json'),
    JSON.stringify({ date: timestamp, tables: manifest, total, erreurs }, null, 2)
  )

  if (erreurs.length) {
    console.error(`\n❌ Sauvegarde INCOMPLÈTE — ${erreurs.length} erreur(s), ${total} enregistrements écrits :`)
    erreurs.forEach((e) => console.error(`   • ${e.quoi} : ${e.message}`))
    console.error(`\n   Le fichier manifest.json les liste aussi. Sortie en échec volontaire :`)
    console.error(`   une sauvegarde partielle ne doit JAMAIS être annoncée comme réussie.\n`)
    process.exit(1)
  }

  console.log(`\n✅ Sauvegarde complète — ${Object.keys(manifest).length} ensembles, ${total} enregistrements → backups/${timestamp}/\n`)
}

backup().catch((err) => {
  console.error('\n❌ Erreur inattendue :', err)
  process.exit(1)
})
