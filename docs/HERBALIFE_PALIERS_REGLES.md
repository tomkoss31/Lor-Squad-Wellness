# Règles métier Herbalife — Paliers + Qualifications

> **Date de référence** : 2026-05-18 (validé Thomas)
> **Importance** : 🔴 CRITIQUE — toute logique de calcul PV dans l'app doit respecter ces règles
> **À lire AVANT** : toute modif sur `pv_monthly_breakdown`, RPC `set_user_pv_breakdown`, hook `useUserRentability`, jauge Progression, `pv-team`, FLEX margins, etc.

---

## 🏆 Paliers de remise / commission

| Palier | Remise | PV requis | Fenêtre glissante | Maintien |
|---|---|---|---|---|
| **Distributor** | **25 %** | 0 PV | — (statut par défaut à l'inscription) | Permanent (sauf inactivité prolongée) |
| **Senior Consultant** | **35 %** | **500 PV** | **2 mois glissants consécutifs** | Mensuel — à requalifier |
| **Success Builder** | **42 %** | **1000 PV** | **3 mois glissants** | Mensuel — à requalifier |
| **Qualified Producer (QP)** | étape | **2500 PV** | **6 mois glissants** | Étape intermédiaire vers Supervisor |
| **Supervisor (TAB Team)** | **50 %** | **4000 PV** | **1 à 12 mois glissants** | **Annuel** — à requalifier chaque année avec 4000 PV |

---

## 🎯 LA règle d'or à retenir

**TOUTES les qualifications sont sur FENÊTRE GLISSANTE (rolling window).**
**JAMAIS sur mois isolé.**

### Concrètement

Pour vérifier si Mandy se qualifie Senior Consultant (35 %) en mai 2026, il faut sommer :
- PV avril 2026 + PV mai 2026 (fenêtre 2 mois glissants)
- Si total ≥ 500 → qualifiée 35 %

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
- Senior Consultant (500 PV / 2 mois glissants) : 0 + 900 = 900 PV → ✅ qualifiée 35 %
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

**Fin du document.** Lire absolument avant tout dev touchant aux calculs PV / qualifications / FLEX margins / rentabilité.
