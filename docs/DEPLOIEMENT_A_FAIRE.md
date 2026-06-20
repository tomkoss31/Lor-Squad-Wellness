# ⚠️ À FAIRE AU DÉPLOIEMENT — ne pas oublier

> Branche de travail : `claude/volume-menu-simplification-jdr0xl`
> Dernière mise à jour : 2026-06-16

Le **merge git** déploie le **front** (Vercel sur `claude/focused-pike`), mais **PAS**
les migrations Supabase ni les Edge Functions. Il faut les lancer **à la main en CLI**.

---

## 1. Merge
`claude/volume-menu-simplification-jdr0xl` → `claude/focused-pike` (Vercel auto-deploy).

## 2. Migrations Supabase (CLI) — **obligatoire**
```bash
supabase db push --linked --include-all
```
Applique notamment :
- 🔒 **`20261202200000_fix_prospect_leads_leak`** — sécurité CRM : un distri ne voit
  plus que SES prospects (sinon Mandy voit tous les prospects de l'upline). **CRITIQUE.**
- annonces distri (encaissement Stripe…).

## 3. Edge Functions (CLI) — **obligatoire**
```bash
supabase functions deploy submit-online-bilan      # lead /bilan-online SANS slug → rattaché à l'admin
supabase functions deploy noaly                    # Noaly ne propose plus un bilan déjà fait
```

## 4. Edge Functions — **seulement si tu actives l'encaissement Stripe**
```bash
supabase functions deploy create-payment-link --no-verify-jwt
supabase functions deploy confirm-stripe-payment --no-verify-jwt
supabase functions deploy create-manual-payment-link
```
(⚠️ `create-manual-payment-link` **sans** `--no-verify-jwt`.)

---

## 5. Vérifs rapides après déploiement
- [ ] Un compte **distri** (ex. Sébastien) ne voit **que ses** prospects au CRM.
- [ ] Toi (admin) vois bien **tout** + les leads **non attribués**.
- [ ] Un lead via `/bilan-online` **sans slug** arrive **sur toi (admin)**.
- [ ] CRM **📂 Détails** sur un lead bilan online → la modale s'ouvre.
- [ ] **Noaly** sur un lead bilan online → ne propose plus de refaire un bilan.
- [ ] App client : reset mot de passe ne renvoie plus vers `/login` coach ;
      bouton retour Android ne déconnecte plus ; courbes avec sélecteur.

---

## Pur front (rien à déployer côté Supabase — actif au simple merge)
Panier (visuel + ventes hors-app + édition crayon + net VIP), CRM (Historique,
filtre par ligne, badges scopés, menu Actions, source modifiable), rentabilité
(unification override/breakdown, « Superviseur depuis », distri inactifs visibles),
app client (courbes multi-métriques), Co-pilote (popups au premier plan),
newsletter (boutons Copier le lien / Telegram), barre mobile Panier.
