# Règles métier Herbalife — Paliers + Qualifications

> **Date de référence** : 2026-05-18 (validé Thomas)
> **Importance** : 🔴 CRITIQUE — toute logique de calcul PV dans l'app doit respecter ces règles
> **À lire AVANT** : toute modif sur `pv_monthly_breakdown`, RPC `set_user_pv_breakdown`, hook `useUserRentability`, jauge Progression, `pv-team`, FLEX margins, etc.

---

## 🔴 MAJ 2026-06-09 — NOUVELLES RÈGLES (rétroactif depuis février 2026)

Herbalife a changé les seuils. **Changement principal : Senior Consultant 35 % passe de 500 → 250 PV.** Détail validé Thomas :

- **35 % (Senior Consultant)** : **250 PV / 2 mois** glissants  *(était 500)*
- **42 % (Success Builder)** : **1000 PV / 3 mois** glissants  *(inchangé)* — **OU via QP : 2500 PV / 6 mois** (le QP donne aussi 42 %). Sans 1000/3m ni 2500, on reste à 35 % en cumulant jusqu'à 2500 → 42 %.
- **50 % (Superviseur)** : **4000 PV / 3 à 12 mois** glissants  *(inchangé)*

**Rétroactif** : appliqué via **calcul à l'affichage** (la RPC `get_distributor_qualifications` somme les fenêtres glissantes en live → rétroactif automatique, pas de migration de `users.current_rank`).

Migration : `20261201000000_herbalife_rules_2026_update.sql`. Le tableau ci-dessous reflète déjà ces nouvelles valeurs.

---

## 🏆 Paliers de remise / commission

| Palier | Remise | PV requis | Fenêtre glissante | Maintien |
|---|---|---|---|---|
| **Distributor** | **25 %** | 0 PV | — (statut par défaut à l'inscription) | Permanent (sauf inactivité prolongée) |
| **Senior Consultant** | **35 %** | **250 PV** *(MAJ — était 500)* | **2 mois glissants consécutifs** | Mensuel — à requalifier |
| **Success Builder** | **42 %** | **1000 PV** | **3 mois glissants** | Mensuel — à requalifier |
| **Qualified Producer (QP)** | **42 %** (même marge que SB) | **2500 PV** | **6 mois glissants** | Voie alternative vers le 42 % |
| **Supervisor (TAB Team)** | **50 %** | **4000 PV** | **3 à 12 mois glissants** | **Annuel** — à requalifier chaque année avec 4000 PV |

---

## 🎯 LA règle d'or à retenir

**TOUTES les qualifications sont sur FENÊTRE GLISSANTE (rolling window).**
**JAMAIS sur mois isolé.**

### Concrètement

Pour vérifier si Mandy se qualifie Senior Consultant (35 %) en mai 2026, il faut sommer :
- PV avril 2026 + PV mai 2026 (fenêtre 2 mois glissants)
- Si total ≥ **250** → qualifiée 35 % *(MAJ 2026-06-09 — était 500)*

Pour vérifier si elle se qualifie Success Builder (42 %) en mai 2026 :
- PV mars 2026 + PV avril 2026 + PV mai 2026 (fenêtre 3 mois glissants)
- Si total ≥ 1000 → qualifiée 42 %

Pour QP (2500 PV en 6 mois glissants) :
- Somme PV décembre 2025 → mai 2026 (les 6 derniers mois)
- Si total ≥ 2500 → qualif QP

Pour Supervisor (4000 PV en 1 à 12 mois glissants) :
- Somme PV maximum sur 12 derniers mois consécutifs
- Si total ≥ 4000 → qualif Sup
- Méthode TAB Team rapide : 4000 PV en 1 mois suffit

---

## 🔧 Implications pour le code de l'app

### Hook recommandé : `useDistributorQualifications(userId)`

Doit retourner pour chaque palier :
```ts
{
  rank_current: 'distributor' | 'senior_consultant' | 'success_builder' | 'qp' | 'supervisor',
  qualifications: {
    senior_consultant: {
      window_months: 2,
      pv_required: 500,
      pv_current: number,    // somme 2 derniers mois glissants
      qualified: boolean,
      progress_pct: number,  // 0-100
    },
    success_builder: {
      window_months: 3,
      pv_required: 1000,
      pv_current: number,    // somme 3 derniers mois glissants
      qualified: boolean,
      progress_pct: number,
    },
    qp: {
      window_months: 6,
      pv_required: 2500,
      pv_current: number,    // somme 6 derniers mois glissants
      qualified: boolean,
      progress_pct: number,
    },
    supervisor: {
      window_months: 12, // max
      pv_required: 4000,
      pv_current: number,    // somme 12 derniers mois glissants
      qualified: boolean,
      progress_pct: number,
      qualif_method?: 'tab' | 'cumul', // détecter si 4000 atteint en 1 mois (TAB) ou plus
    },
  }
}
```

### RPC SQL recommandée

`get_distributor_qualifications(p_user_id uuid, p_as_of_month text DEFAULT current month)` :

```sql
WITH window_pv AS (
  SELECT
    sum(pv_15 + pv_25 + pv_35 + pv_42 + pv_royalty) AS pv_2m  -- 2 derniers mois
  FROM pv_monthly_breakdown
  WHERE user_id = p_user_id
    AND month >= to_char(date_trunc('month', current_date) - interval '1 month', 'YYYY-MM')
    AND month <= p_as_of_month
), pv_3m AS (
  -- idem 3 derniers mois
), pv_6m AS (
  -- idem 6 derniers mois
), pv_12m AS (
  -- idem 12 derniers mois
)
SELECT
  pv_2m.pv_2m, pv_3m.pv_3m, pv_6m.pv_6m, pv_12m.pv_12m,
  (pv_2m.pv_2m >= 500) AS qualified_35,
  (pv_3m.pv_3m >= 1000) AS qualified_42,
  (pv_6m.pv_6m >= 2500) AS qualified_qp,
  (pv_12m.pv_12m >= 4000) AS qualified_50
FROM pv_2m, pv_3m, pv_6m, pv_12m;
```

### UI Jauge à afficher

Dans la fiche distri (page ou modale), afficher **la jauge correspondant au PROCHAIN palier** que le distri vise :

- Distributor → jauge "vers Senior Consultant" (500 PV / 2 mois glissants)
- Senior Consultant 35 % → jauge "vers Success Builder" (1000 PV / 3 mois glissants)
- Success Builder 42 % → jauge "vers Supervisor" (4000 PV / 1-12 mois glissants) — étape QP est juste un waypoint intermédiaire
- Supervisor → jauge "Maintien Sup" (4000 PV sur 12 mois pour rester)

Format jauge :
```
PROGRESSION · Success Builder (42%) → Supervisor (50%)
[████████░░░░░░░░░░░░░░░] 2900 / 4000 PV (12 mois glissants)
reste 1100 PV sur 7 mois max
```

Préciser **la fenêtre glissante** explicitement (`12 mois glissants`, `3 mois glissants`, etc.) — c'est crucial pour la compréhension utilisateur.

---

## ⚠️ Pièges à éviter dans le code

1. **NE JAMAIS** calculer la qualif sur le mois courant seul. Toujours sommer sur la fenêtre glissante.
2. **NE PAS** supposer qu'un palier est "permanent" — Senior Consultant et Success Builder doivent être requalifiés mensuellement.
3. **Le statut Supervisor est annuel** — il faut un mécanisme de revérification au 1er janvier (ou autre date selon contrat distri).
4. **Inclure les PV royalty et les PV des tiers** (15%, 25%, 35%, 42%, royalty 50%) dans le calcul — c'est le total cumulé qui qualifie. Vérifier la règle exacte selon palier (TAB Team = uniquement PV personnels par exemple).
5. **Fenêtre glissante par jour, pas par mois civil** : strictement, c'est sur les X derniers jours. Mais en pratique l'app travaille par mois → arrondir au mois civil est acceptable mais affecté la précision.

---

## 📊 Lien avec la table `pv_monthly_breakdown`

La structure actuelle de la table est correcte pour ce calcul :
```sql
pv_monthly_breakdown (
  user_id uuid,
  month text,            -- format YYYY-MM
  pv_15 numeric,         -- PV à 15% (Préféré VIP)
  pv_25 numeric,         -- PV à 25% (Distributor)
  pv_35 numeric,         -- PV à 35% (Senior Consultant)
  pv_42 numeric,         -- PV à 42% (Success Builder)
  pv_royalty numeric,    -- PV Royalty (downline Supervisor 50%)
  pv_25_is_vip boolean,  -- flag UI VIP vs Distri
  pv_35_is_vip boolean,  -- flag UI VIP vs Distri
  ...
)
```

PK `(user_id, month)` → 1 ligne par distri par mois. La saisie rétroactive (chantier #13A.4 / Phase 0.7 absorbée) permet de saisir les mois antérieurs pour avoir un historique propre.

→ **Le calcul des qualifs DOIT toujours sommer sur la fenêtre glissante demandée**, jamais lire le mois courant seul.

---

## 🔍 Tests d'acceptation pour vérifier que le calculateur marche

Pour Mandy avec données fictives :

| Mois | PV total saisi |
|---|---|
| Décembre 2025 | 200 |
| Janvier 2026 | 600 |
| Février 2026 | 400 |
| Mars 2026 | 800 |
| Avril 2026 | 900 |
| Mai 2026 | 0 (en cours) |

**Calculs attendus en mai 2026 :**
- Senior Consultant (**250** PV / 2 mois glissants) : 0 + 900 = 900 PV → ✅ qualifiée 35 %
- Success Builder (1000 PV / 3 mois glissants) : 0 + 900 + 800 = 1700 PV → ✅ qualifiée 42 %
- QP (2500 PV / 6 mois glissants) : 0 + 900 + 800 + 400 + 600 + 200 = 2900 PV → ✅ qualifiée QP
- Supervisor (4000 PV / 12 mois glissants) : 2900 PV (somme des 12 derniers mois, qui sont 6 ici) → ❌ pas encore, manque 1100 PV
- **Jauge à afficher** : "Success Builder (42 %) → Supervisor (50 %) · 2900 / 4000 PV · reste 1100 PV sur 12 mois glissants"

Si l'app affiche "0 / 4000 PV" pour mai 2026 alors que ces données ont été saisies, **le calculateur est buggé** et doit être corrigé via une Phase dédiée.

---

## 📞 Référence Bizworks

Pour validation/maj des chiffres officiels : Thomas peut consulter sa fiche RO Herbalife sur Bizworks (l'app officielle Herbalife) qui détaille les qualifications par mois.

Si les règles évoluent côté Herbalife (ils changent parfois), mettre à jour ce document + le code en conséquence.

---

## 🏅 Règle assets visuels — Pins Herbalife (badges visuels par palier)

### Source des pins

Les **vrais pins Herbalife officiels** sont rangés par Thomas dans un dossier local sur son PC. Au moment du dev, Claude Code local doit :

1. **Demander à Thomas le chemin du dossier** (ex : `~/Documents/Herbalife/pins/` ou `~/Desktop/Pins/`)
2. **Copier les fichiers** dans `public/herbalife-pins/` du repo avec une convention de nommage stricte (cf. ci-dessous)
3. **Les commiter** dans le repo (les pins font partie du brand, pas confidentiels)

### Convention de nommage obligatoire

Format : `public/herbalife-pins/<rank-slug>.png` (ou `.webp` si optimisé)

| Palier | Slug fichier |
|---|---|
| Distributor (25 %) | `distributor.png` |
| Senior Consultant (35 %) | `senior-consultant.png` |
| Success Builder (42 %) | `success-builder.png` |
| Qualified Producer (QP) | `qualified-producer.png` |
| Supervisor (50 %) — TAB Team | `supervisor.png` |
| World Team | `world-team.png` |
| GET Team | `get-team.png` |
| Millionaire Team | `millionaire-team.png` |
| President's Team | `presidents-team.png` |
| Chairman's Club | `chairmans-club.png` |
| Founder's Circle | `founders-circle.png` |

(Compléter selon les pins fournis par Thomas — il connaît les paliers exacts disponibles dans son dossier.)

### Composant React recommandé

`src/components/herbalife/HerbalifePin.tsx` :

```tsx
type Rank = 'distributor' | 'senior_consultant' | 'success_builder' | 'qualified_producer'
  | 'supervisor' | 'world_team' | 'get_team' | 'millionaire_team' | 'presidents_team'
  | 'chairmans_club' | 'founders_circle';

type Props = {
  rank: Rank;
  size?: number;          // default 32
  showLabel?: boolean;    // default false (juste le pin) → true (pin + nom à côté)
  className?: string;
};

const RANK_TO_FILE: Record<Rank, string> = {
  distributor: 'distributor.png',
  senior_consultant: 'senior-consultant.png',
  success_builder: 'success-builder.png',
  qualified_producer: 'qualified-producer.png',
  supervisor: 'supervisor.png',
  world_team: 'world-team.png',
  get_team: 'get-team.png',
  millionaire_team: 'millionaire-team.png',
  presidents_team: 'presidents-team.png',
  chairmans_club: 'chairmans-club.png',
  founders_circle: 'founders-circle.png',
};

const RANK_TO_LABEL: Record<Rank, string> = {
  distributor: 'Distributor',
  senior_consultant: 'Senior Consultant',
  // ... etc
};

export function HerbalifePin({ rank, size = 32, showLabel = false, className }: Props) {
  const file = RANK_TO_FILE[rank];
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img
        src={`/herbalife-pins/${file}`}
        alt={`Pin ${RANK_TO_LABEL[rank]}`}
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
        loading="lazy"
      />
      {showLabel && <span>{RANK_TO_LABEL[rank]}</span>}
    </span>
  );
}
```

### Changement automatique sur évolution de palier

Quand un distri se qualifie à un nouveau palier (calcul fenêtre glissante cf. §règles paliers), le pin affiché doit **changer automatiquement** sans intervention humaine.

Mécanisme :
- Le rang actuel est stocké dans `users.current_rank` (ou colonne équivalente — `current_herbalife_rank` ?)
- Une RPC `get_distributor_current_rank(user_id)` calcule en temps réel le rang max atteint sur les fenêtres glissantes
- Optionnellement : trigger SQL ou cron qui met à jour `users.current_rank` chaque jour pour optimisation
- Le composant `<HerbalifePin rank={user.current_rank} />` lit cette valeur

→ Si Mandy passe de Success Builder à Supervisor en juin 2026, son pin change automatiquement le 1er juin (ou en temps réel selon stratégie).

### Endroits dans l'app où afficher le pin

1. **Fiche distri** `/distributors/:id` : header avec pin + nom + niveau XP
2. **Modale drill-down** `TeamMemberDrilldownModal` : section rang Herbalife (au lieu du selector texte ? ou en complément)
3. **Podium XP** `/team` : à côté du nom du distri
4. **Engagement table** `/team` : colonne rang avec pin mini
5. **Paramètres > Équipe** : ligne distri avec pin mini
6. **Page Welcome bilan online** : à côté du nom du coach (au lieu de l'avatar initiales "TK") cf. §règle bilan online ci-dessous
7. **Carrousel témoignages** chantier #11 (si on veut montrer le pin du coach qui a accompagné)
8. **Page admin badges coach** chantier #10 (déjà fait — vérifier que ça utilise le pin)

### Fallback si pin absent

Si le rang d'un distri n'a pas de pin (ex : palier exotique pas encore importé), afficher un placeholder neutre (cercle gris avec ✦ ou initiales du palier). Ne JAMAIS casser le rendu.

---

## 🥰 Règle visuelle — Page Welcome Bilan Online

Demande Thomas (18/05) :

> Modifier le **nom du logo affiché** sur la page bilan online : remplacer l'avatar à initiales (« TK ») par le **vrai logo La Base 360** OU le **pin Herbalife du coach** (à choisir selon vision).

### Option recommandée

Sur la page Welcome bilan online (et thank you), remplacer la **coach card** actuelle (avatar gradient avec initiales "TK") par :

- **Logo La Base 360** (le carré gradient teal→bleu du logo brand) en haut de la card
- **Nom du coach** textuel en dessous : "Thomas K."
- **Pin Herbalife du coach** à côté du nom (petit, 24px) — auto selon `current_rank`

Layout proposé :
```
┌────────────────────────────────────┐
│  [Logo La Base 360 48px]            │
│                                     │
│  TON COACH                          │
│  Thomas K.  🎖️ Success Builder     │
└────────────────────────────────────┘
```

Le **logo La Base 360** est dans `public/logo/labase360-mark.svg` (à confirmer chemin exact, sinon Thomas fournit).

### Fichier à créer ou modifier

- `public/logo/labase360-mark.svg` (logo principal, carré gradient teal→bleu)
- `public/logo/labase360-wordmark.svg` (le mot LA BASE 360 en typo)
- Composant `<LaBase360Logo variant="mark" | "wordmark" size={n} />`
- Composer la coach card avec `<LaBase360Logo />` + nom + `<HerbalifePin rank={coach.rank} />`

### Cohérence brand

Le logo La Base 360 est la **signature brand officielle** sur les pages publiques (Welcome bilan, thank you, témoignage, business, future newsletter). Toujours l'inclure en eyebrow ou hero.

Les **pins Herbalife** sont utilisés pour **certifier** un distri (crédibilité du coach affiché aux prospects). Les 2 cohabitent.

---

**Mise à jour 2026-05-18** : ajout règles pins Herbalife + logo La Base 360 sur page Welcome bilan online.
