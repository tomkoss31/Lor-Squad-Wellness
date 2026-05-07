# 🎯 Architecture du funnel Business — Plan complet

**Statut** : 📐 Plan validé, **non démarré côté code** (chantier futur)
**Branche cible** : `dev/thomas-test` (jamais prod direct)
**Auteurs** : Thomas + Claude (session 2026-11-07)
**Document à renvoyer à Claude** comme contexte avant d'attaquer la mise en œuvre.

---

## 1. Vision — le funnel en 1 phrase

> **Convertir un prospect froid (qui découvre par un partage social) en distri actif, en 4 étapes éducatives connectées entre elles, chacune déclenchant la suivante automatiquement.**

---

## 2. Le funnel global

```
┌─────────────────────────────────────────────────────────────────────┐
│  NIVEAU 1 — PROSPECT FROID (réseaux sociaux, partage de lien)       │
│                                                                     │
│  Source : link partagé /opportunite?ref=[user_id]                   │
│  Page éducative — sans mentionner Herbalife explicitement           │
│  → Form contact (prénom, tél, ville)                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (submit form)
┌─────────────────────────────────────────────────────────────────────┐
│  NIVEAU 2 — PROSPECT CHAUD (lead dans la BDD du distri)             │
│                                                                     │
│  Stock : table `prospects` (existante)                              │
│  Le distri est notifié, rappelle, prend RDV bilan                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (RDV bilan)
┌─────────────────────────────────────────────────────────────────────┐
│  NIVEAU 3 — CLIENT EN BILAN (étape « business ambition »)           │
│                                                                     │
│  Étape `BusinessAmbitionStep` dans le flow bilan                    │
│  Le client coche un montant : 0 / +100 / +300 / +500 / +1000 / Plus │
│  Stocké : `clients.business_interest_amount` + _note + _date        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (si amount > 0)
┌─────────────────────────────────────────────────────────────────────┐
│  NIVEAU 4 — RECYCLAGE BUSINESS                                      │
│                                                                     │
│  Push notif coach immédiate                                         │
│  → Bouton « Envoyer le plan » sur fiche client                      │
│  → Lien WhatsApp/SMS vers /opportunite (la même page que niveau 1)  │
│  → Cycle de relance automatisé (J+5 si pas de RDV planifié)         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    🎯 Conversion en distri
```

---

## 3. Détail par niveau

### Niveau 1 — Prospect froid

**URL** : `/opportunite` (ou `/opportunite?ref=[user_id]` pour tracking)

**Statut** : 🔴 À CRÉER

**Composants à construire** :
| Composant | Rôle |
|---|---|
| `OpportunitePage.tsx` | Route React intégrée, design G3 |
| Section Hero | Promesse forte, sans nommer Herbalife |
| Section "3 façons de gagner" | Consommer / Partager / Construire |
| Section "Les paliers expliqués" | 5 niveaux simplifiés |
| Section "Cas concret" | 1 000 PV → ~620 € |
| Section "Investissement de départ" ⭐ | Manque actuellement, à fournir |
| Section "Accompagnement" ⭐ | Mentor + formation + La Base 360 app |
| Section "FAQ" ⭐ | Questions fréquentes |
| Section "Témoignages" ⭐ | Slot vide à remplir |
| Section "À propos" | La Base 360, Verdun, depuis 2022 |
| `ProspectFormModal` (existant) | Réutilisé en bas de page |

**Connecteur Welcome** :
- La 3ᵉ card du Welcome (`ProfileCard ✨ "Je veux rejoindre l'aventure"`) actuellement → ouvre `ProspectFormModal` direct
- 🔁 **À modifier** : redirige vers `/opportunite` au lieu de la modale directe
- Lien partageable disponible séparément (réseaux sociaux)

**Ce qui existe déjà** :
- ✅ `ProspectFormModal.tsx` (form prénom/tél/ville)
- ✅ Edge function `submit-prospect-lead` (anti-spam IP)
- ✅ Table `prospect_leads` (cf. migration `20260423120500_prospect_leads.sql`)

**Tracking V2** :
- `?ref=[user_id]` capté à l'arrivée
- Stocké dans `prospect_leads.referrer_user_id`
- Stat sur Co-pilote : "X prospects ont vu ta page ce mois, Y ont rempli le form"

---

### Niveau 2 — Prospect chaud (lead BDD)

**Table existante** : `prospects` (cf. CLAUDE.md)

**Statut** : ✅ Existe déjà

**Composants existants** :
| Composant | Rôle |
|---|---|
| `prospects` table | Stock du lead |
| `ProspectsPage` | Vue admin/coach des leads |
| Edge function `submit-prospect-lead` | Endpoint anti-spam |

**Pas de changement nécessaire à ce niveau.** Le lead arrive, le distri est notifié comme aujourd'hui.

---

### Niveau 3 — Client en bilan (étape business ambition)

**Statut** : ✅ Existe déjà (chantier 2026-11-03)

**Composants existants** :
| Composant | Rôle |
|---|---|
| `BusinessAmbitionStep.tsx` | Étape immersive du bilan, 6 boutons paliers |
| `BusinessCuriosityCard.tsx` | Card en amont qui détermine si on affiche l'étape |
| `BusinessOpportunitiesCard.tsx` | Co-pilote : top 3 clients ouverts au business |

**Champs DB existants sur `clients`** :
- `business_curiosity` (`'never'|'maybe'|'curious'|'eager'`)
- `business_interest_amount` (number, € souhaités/mois)
- `business_interest_note` (string libre)
- `business_interest_date` (timestamptz)

**Pas de chantier sur ce niveau** — la donnée est déjà capturée correctement.

---

### Niveau 4 — Recyclage business

**Statut** : 🔴 À CONSTRUIRE — c'est le cœur du chantier

#### 4.A — Push notif coach immédiat

**Trigger** : `AFTER UPDATE OF business_interest_amount ON clients` (Postgres)

**Si `NEW.business_interest_amount > 0` ET `OLD.business_interest_amount IS NULL`** (= première fois que le client coche) :
- Appelle l'edge function `send-push` (existante)
- Cible : `clients.distributor_id` (le coach assigné)
- Payload : "🌟 [Prénom] est ouvert·e au business (+X €/mois souhaités)"
- Body : "Envoie-lui le plan d'opportunité depuis sa fiche."
- Click → ouvre `/clients/[id]?tab=actions`

**Migration SQL à créer** : `notify_coach_business_interest.sql`

#### 4.B — Bouton « Envoyer le plan » sur fiche client

**Lieu** : `ActionsTab.tsx` (fiche client → onglet Actions)

**Visible si** : `client.business_interest_amount > 0`

**Action** : ouvre une modale `SendBusinessPlanModal` avec :
- Choix canal : WhatsApp · SMS · Email · Telegram
- Message pré-rempli : "Salut [prénom], voici le plan d'opportunité que je te promets : [lien] — Thomas"
- Le `[lien]` = `https://app.../opportunite?ref=[coach_id]&c=[client_token]`
- Au click : `wa.me/[phone]?text=[encoded message]` ou équivalent

**Track** : nouveau champ `clients.business_plan_sent_at` (timestamptz)

**Migration SQL** : `add_business_plan_sent_at.sql`

#### 4.C — Suivi auto J+5

**Cron quotidien** ou trigger temporel :
- WHERE `business_interest_amount > 0`
- AND `business_plan_sent_at IS NOT NULL`
- AND `business_plan_sent_at < now() - 5 days`
- AND aucun follow-up "business" planifié

→ Push coach : "[Prénom] a vu ton plan il y a 5 jours, c'est le moment de la rappeler."

---

## 4. Carte des connecteurs techniques

### Tables BDD

| Table | Rôle | Statut |
|---|---|---|
| `prospects` | Leads niveau 2 | ✅ Existe |
| `prospect_leads` | Submissions form public | ✅ Existe |
| `clients` (champs business_*) | Niveau 3 | ✅ Existe |
| `clients.business_plan_sent_at` | Tracking envoi doc | 🔴 À ajouter |
| `prospect_leads.referrer_user_id` | Tracking ?ref= | 🔴 À ajouter |

### Edge functions Supabase

| Function | Rôle | Statut |
|---|---|---|
| `submit-prospect-lead` | Form niveau 1 → BDD | ✅ Existe |
| `send-push` | Notif push générique | ✅ Existe |
| `notify-business-interest` (nouveau) | Trigger 4.A | 🔴 À créer (ou simple trigger SQL → send-push) |

### Routes React

| Route | Rôle | Statut |
|---|---|---|
| `/welcome` | Porte d'entrée 3 cards | ✅ Existe |
| `/opportunite` | **Niveau 1, page éducative** | 🔴 À créer |
| `/opportunite?ref=...` | Tracking referrer | 🔴 V2 |
| `/clients/:id?tab=actions` | Bouton 4.B | ✅ Existe (à enrichir) |
| `/co-pilote` | BusinessOpportunitiesCard | ✅ Existe |

### Composants React

| Composant | Rôle | Statut |
|---|---|---|
| `OpportunitePage.tsx` | Page éducative (10+ sections) | 🔴 À créer |
| `ProspectFormModal.tsx` | Form contact final niveau 1 | ✅ Existe (réutilisé) |
| `BusinessAmbitionStep.tsx` | Étape bilan niveau 3 | ✅ Existe |
| `BusinessOpportunitiesCard.tsx` | Co-pilote | ✅ Existe |
| `SendBusinessPlanModal.tsx` | Bouton 4.B | 🔴 À créer |

### Pushs / notifications

| Notif | Déclencheur | Destinataire | Statut |
|---|---|---|---|
| **Lead reçu** | Form niveau 1 submitted | Distri référent (matched par `?ref=`) | ⚠️ À vérifier (existe pour prospects) |
| **Business interest coché** | Save bilan avec amount > 0 | Coach assigné | 🔴 À ajouter |
| **Plan ouvert par client** | Visite `/opportunite?c=[token]` | Coach | 🔴 V2 (avec tracking) |
| **Relance J+5** | Cron quotidien | Coach | 🔴 V3 |

---

## 5. Phasage versions

### V1 — Page `/opportunite` éducative (chantier principal)
**Effort** : ~5h dev
**Livrables** :
- [ ] Route `/opportunite` avec design G3 intégré
- [ ] 10 sections (hero → form contact)
- [ ] Modification du Welcome card 3 → redirige vers `/opportunite`
- [ ] Réutilisation `ProspectFormModal` en fin de page
- [ ] Sans mention Herbalife explicite (cold-friendly)

**Bloquants** : besoin de **contenu** Thomas pour 4 sections (cf. § 7).

### V2 — Tracking + perso (~3h dev)
**Effort** : ~3h dev
**Livrables** :
- [ ] `?ref=[user_id]` capté à l'arrivée
- [ ] Migration `prospect_leads.referrer_user_id`
- [ ] Stat Co-pilote : "X prospects vus, Y forms remplis ce mois"
- [ ] Optionnel : `?goal=300` pour personnaliser le cas concret avec le montant cible

### V3 — Push business interest + envoi doc (~4h dev)
**Effort** : ~4h dev
**Livrables** :
- [ ] Migration `add_business_plan_sent_at.sql`
- [ ] Trigger SQL `notify_coach_business_interest`
- [ ] Composant `SendBusinessPlanModal`
- [ ] Intégration dans `ActionsTab` fiche client
- [ ] Cron J+5 pour relance auto

### V4 — Mémo seuils Plan Marketing
**Effort** : 30 min dev
**Livrables** :
- [ ] Corriger seuils Get Team / Mill / President's avec facteur 20 %
- [ ] Mettre à jour les 3 docs HTML existants (`marketing-plan*.html`)
- [ ] Synchroniser avec `OpportunitePage` (formules cohérentes)

---

## 6. Règles de calcul Herbalife mémorisées

**Ratio fondamental** : `1 Royalty Point (RO) = 20 PV d'organisation`
**Facteur d'équilibrage** : 20 % (réduit le PV org effectif requis)

| Palier | Royalty Points | PV org "brut" | PV org effectif (-20%) | Bonus production |
|---|---|---|---|---|
| Supervisor | — | 4 000 PV/mois (perso + downline non-Sup) | — | 0 (commission seule) |
| G.E.T. 2500 | 2 500 RO | 50 000 | 40 000 | (à confirmer 2 %) |
| Millionaire 4000 | 4 000 RO | 80 000 | 64 000 | **4 %** à l'infini sur l'organisation |
| Millionaire 7500 | 7 500 RO | 150 000 | 120 000 | **4 %** à l'infini |
| President's | 10 000 RO | 200 000 | 160 000 | **6 %** à l'infini |

**Note** : ces seuils sont à appliquer dans le doc final V1 + corriger dans les docs HTML existants.

---

## 7. Ce dont Claude a besoin de Thomas pour démarrer V1

Thomas doit fournir (par écrit avant de coder) :

### Contenu textuel
- [ ] **Investissement de départ** : combien ça coûte de démarrer en distri Herbalife (pack initial) ? Réponse en € + ce qu'il y a dans le pack.
- [ ] **FAQ** : liste des 5-8 questions qui reviennent en boucle quand Thomas parle à un prospect (engagement, statut auto-entrepreneur, temps minimum, exclusivité, etc.).
- [ ] **Témoignages** : 2-3 témoignages courts de distri/clients (avec ou sans photo, avec ou sans vrai prénom).
- [ ] **Cas concret personnalisable** : on garde 1 000 PV → ~620 € ou tu veux un autre exemple ?
- [ ] **Phrase d'accroche Hero** : "Et si tu transformais ta passion en revenu" — OK ou autre proposition ?

### Cadrage éditorial
- [ ] **Mention Herbalife** : interdite ? autorisée mais discrète ? autorisée pleinement ?
- [ ] **Quand on dit "rejoindre l'aventure"** : on parle déjà de l'opportunité business directement, ou on commence par "rejoindre une communauté wellness" ?

### Validations techniques
- [ ] **Confirmation seuils 20 % facteur** : OK pour les valeurs du § 6 ?
- [ ] **Ordre V1 → V3** : on attaque V1 d'abord puis V2 puis V3, OK ?
- [ ] **Branchement Welcome card 3** : on remplace l'action ou on garde le double parcours (form direct ET page éducative selon contexte) ?

---

## 8. Documents existants liés

- `public/marketing-plan.html` — version technique distri/formation interne
- `public/marketing-plan-prospect.html` — version recrutement client (à recycler dans `OpportunitePage`)
- `public/marketing-plan-slides.html` — version slides présentation 16:9

Ces 3 documents sont **complémentaires** à `/opportunite` :
- `/opportunite` = porte d'entrée web/mobile, partageable, intégrée à l'app, traçable
- HTML statiques = supports imprimables (papier, PDF) pour RDV physique ou envoi pièce jointe

---

## 9. Risques identifiés

| Risque | Mitigation |
|---|---|
| Confusion entre `marketing-plan-prospect.html` (statique) et `/opportunite` (React) | Naming clair, documenter qui sert à quoi |
| Données business du client envoyées par lien → fuite RGPD | Token unique `?c=...` jetable, pas d'info perso dans l'URL |
| "Sans mentionner Herbalife" trop léger → flou | Cadrage Thomas obligatoire avant écriture du contenu |
| Conversion seuils RO/PV mal appliquée | Test mathématique en suite tests dédiés avant déploiement |
| Trop de notifications coach → fatigue | Throttling : 1 notif/client/30j max sur business interest |

---

## 10. Sécurité / RGPD

- Page `/opportunite` accessible sans auth (publique)
- Form contact = collecte explicite (consent à ajouter dans le HTML)
- Trigger push business interest = traitement légitime (relation commerciale)
- `business_plan_sent_at` = trace à utilité business, conservé tant que client actif

---

## ✅ Quand renvoyer ce document à Claude

> **À renvoyer à Claude au début de la prochaine session sur ce chantier**, en disant :
> *"On reprend le funnel business. Voilà la doc, attaque V1 sur dev/thomas-test."*
>
> Claude relira ce doc et reprendra exactement où on s'est arrêté, sans réinventer.

---

*Document généré le 2026-11-07 par Claude pour Thomas Houbert. Fait pour être stocké en Notion comme mémoire de session.*
