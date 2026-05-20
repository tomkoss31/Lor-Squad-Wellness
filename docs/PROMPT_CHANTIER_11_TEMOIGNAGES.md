# Prompt Claude Code — Chantier #11 Témoignages clients vérifiés

> **Date** : 2026-05-17
> **Branche source** : `dev/thomas-test` (1 jour après merge #1 #3 #7 #10)
> **Branche cible** : `feat/testimonials` (à créer)
> **Effort estimé** : 6-8 h-agent en 2 sprints
> **Référence brainstorm** : `docs/BRAINSTORM_EGYPTE_2026-05.md` (chantier #11)

---

## 🎯 Mission

Implémenter le chantier #11 (témoignages clients vérifiés) sur **`feat/testimonials`** depuis `dev/thomas-test`. Couplé à #1 (Bilan Online), #7 (Business) et #8 (Newsletter — à venir).

**Workflow Thomas** : il veut commencer à collecter des avis MAINTENANT en partageant un lien sur son groupe WhatsApp client. Sprint 1 = lien partageable opérationnel. Sprint 2 = finitions (admin, cron, carrousel).

---

## 📋 Décisions produit actées (NE PAS redemander)

| # | Décision |
|---|---|
| Q1 | Délai cron demande d'avis : **J+60** après création bilan client |
| Q2 | V1 : **texte + photo optionnelle** uniquement. Vidéo en V2 plus tard. |
| Q3 | Modération : **admin only** (admin role = Thomas + Mélanie) |
| Q4 | Affichage public : **prénom + 1re lettre nom + ville** (ex « Marie D., Metz ») |
| Q5 | Rating : **1-5 étoiles** |
| Q6 | Cron J+60 : **push notif PWA in-app uniquement** (pas d'email externe en V1) |

---

## 🪜 Sprint 1 — Lien partageable opérationnel (~2.5-4 h-agent)

### Étape 11.1 — Migration SQL `client_testimonials` (1 h)

```sql
-- supabase/migrations/<timestamp>_client_testimonials.sql

create table if not exists public.client_testimonials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  client_token uuid not null, -- snapshot du client_app_accounts.token au moment de la création
  coach_user_id uuid references public.users(id) on delete set null,
  
  -- Contenu
  content text not null check (char_length(content) >= 10 and char_length(content) <= 1000),
  rating int not null check (rating between 1 and 5),
  
  -- Photo
  photo_consent boolean not null default false,
  photo_url text, -- URL Supabase Storage si upload (V2)
  
  -- Localisation pour préparer #5 i18n
  language text not null default 'fr' check (language in ('fr','en','es','pt','tr','hi','de','it','ar')),
  
  -- Modération
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  rejected_reason text,
  
  -- Méta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_testimonials_status_lang on public.client_testimonials (status, language) where status = 'approved';
create index idx_testimonials_client on public.client_testimonials (client_id);
create index idx_testimonials_coach on public.client_testimonials (coach_user_id);

-- RLS
alter table public.client_testimonials enable row level security;

-- SELECT public uniquement pour les approved
create policy "testimonials_public_select_approved" on public.client_testimonials
  for select to anon, authenticated
  using (status = 'approved');

-- SELECT pour le coach propriétaire + admin
create policy "testimonials_coach_select_own" on public.client_testimonials
  for select to authenticated
  using (
    coach_user_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- INSERT via edge function service_role uniquement (pas de policy publique — token validé en edge)
-- UPDATE admin only
create policy "testimonials_admin_update" on public.client_testimonials
  for update to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
  with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

-- Trigger updated_at
create trigger tg_testimonials_updated_at
  before update on public.client_testimonials
  for each row execute function public.set_updated_at();
```

**Test** : `insert via service_role OK`, `select public ne voit que approved`, `update admin OK, update non-admin bloqué`.

---

### Étape 11.2 — Edge function `submit-testimonial` (30 min - 1 h)

`supabase/functions/submit-testimonial/index.ts`

**Spec** :
- POST publique sans auth Supabase
- Body : `{ client_token, content, rating, photo_consent, language?, photo_url? }`
- Validation :
  - `client_token` doit matcher `client_app_accounts.token` (lookup → récupère `client_id` + `coach_user_id`)
  - `content` 10-1000 chars
  - `rating` 1-5 int
  - `language` dans liste autorisée (default `fr`)
- Anti-doublon : refuser si déjà un témoignage `approved` ou `pending` pour ce `client_id` (max 1 actif)
- Insert avec `status='pending'`, snapshot `client_token`
- **Notif push admin** : envoie via pattern `send-push` aux admin actifs avec titre « 💬 Nouveau témoignage de {firstName} {city} » + click `/admin/testimonials`
- Rate limit IP : 3/h
- Réponse : `{ success: true, message: "Merci ! Ton retour est envoyé." }` ou `{ error: "..." }`

**Réutilise le pattern** de `submit-online-bilan` (validation, rate limit, notif push inline best-effort).

---

### Étape 11.3 — Page form publique `/temoignage/:client_token` (1-2 h)

**Route** : ajouter dans `src/App.tsx` :
```tsx
<Route path="/temoignage/:token" element={<TestimonialFormPage />} />
```

**Composant** : `src/pages/public/testimonial/TestimonialFormPage.tsx`

**Design** : réutiliser le shell de `BilanOnlineShell` (cohérence visuelle La Base 360 G3 — Syne + DM Sans + gold + teal). Référence visuelle : `docs/mockups/temoignage-client.html`.

**Sections de la page** :

1. **Hero** (réutilise `BoHero` ou équivalent)
   - Eyebrow : « Ton retour compte »
   - H1 : « Hey {firstName} 🌱<br>Comment ça se passe ? »
   - Lead : « Partage ton vécu en 30 secondes. Ça aide énormément les prochains. »

2. **Guide bienveillant pour le client** (3 mini-prompts cliquables qui pré-remplissent le textarea)
   - 📅 **Quand as-tu démarré ?** → insère « J'ai démarré il y a [X mois]… »
   - ✨ **Qu'est-ce qui a changé ?** → insère « Concrètement, ce qui a changé : [poids / énergie / sommeil / digestion / ballonnements / peau / mental]… »
   - 💪 **Comment tu te sens aujourd'hui ?** → insère « Aujourd'hui je me sens… »

3. **Form** :
   - Rating étoiles 1-5 interactif (gold sur hover/active)
   - Textarea content (min 10 chars, max 1000, compteur live)
   - Toggle « Je veux uploader une photo » (V2, désactiver pour V1)
   - Checkbox **mandatory** RGPD : « J'accepte que mon prénom + 1re lettre nom + ville soient affichés publiquement sur le site La Base 360 »
   - Bouton CTA gold gradient : « Envoyer mon retour »

4. **Page succès post-soumission** (route `/temoignage/:token/merci`) :
   - Check circle gold animé
   - « Merci {firstName} ! 🙏 »
   - « Ton retour a été envoyé. Thomas va le valider sous 24h, et il s'affichera bientôt sur notre site. »
   - Lien Instagram

**Auto-récupération firstName + ville** : via le `client_token` → lookup `client_app_accounts` → `client_id` → `clients.first_name` + `clients.city`. Côté front, appel à un endpoint léger ou directement via la page edge function `submit-testimonial` qui peut aussi servir un GET pour récupérer les infos.

Mieux : créer une edge function dédiée `get-testimonial-context` qui renvoie `{firstName, city, coachFirstName}` à partir du token, pour pré-remplir la page Welcome.

**Mobile-first absolu** : touch targets ≥ 44px, font ≥ 16px (anti-zoom iOS), responsive clamp.

**Tokens design** :
- Background : mesh G3 (cream + radial blobs gold/teal/coral subtils)
- Card glassmorphism backdrop-blur
- Étoiles : gold filled / cream outline
- CTA : gradient gold→gold-light + shadow lift on hover

---

## 🪜 Sprint 2 — Finitions (~3-4 h-agent, à enchaîner dans la semaine)

### Étape 11.4 — Page admin `/admin/testimonials` (1-2 h)

Composant `src/pages/admin/AdminTestimonialsPage.tsx`, admin only via `RoleRoute`.

**Sections** :
- Header « Modération témoignages » + count pending
- Filtres pills : `Pending (N)` / `Approved (N)` / `Rejected (N)` / `Tous`
- Filtres secondaires : par coach (dropdown) / par langue
- Liste cards : avatar client + prénom + ville + extrait content (3 lignes) + rating étoiles + date + status badge
- Click sur card → ouvre modale détail :
  - Content complet
  - Photo si présente
  - Bouton **Approuver** (gold) → status='approved' + approved_at + approved_by
  - Bouton **Rejeter** (coral) → ouvre input « Raison du rejet » + status='rejected'
  - Bouton **Voir fiche client** → lien `/clients/:client_id`
  - **Preview rendu carrousel** (variant compact + variant rich)

---

### Étape 11.5 — Cron `request-testimonial` J+60 (1 h)

`supabase/functions/request-testimonial/index.ts`

**Spec** :
- Cron daily 10h UTC
- Query : tous les clients avec leur **premier bilan validé** créé il y a 60 jours (± 1 jour de marge)
- ET pas de `client_testimonials` existant pour ce `client_id`
- ET `client_app_accounts.token` existe pour ce client (sinon ils n'auront pas accès)
- Pour chaque match :
  - Envoie push notif PWA via `send-push` au client app endpoint
  - Titre : « Ton retour compte 🌱 »
  - Body : « Ça fait 2 mois — partage-nous ton vécu en 30 sec ? »
  - Click → `/temoignage/{token}`
- Best-effort (un échec push n'invalide pas les autres)

Pattern : reprendre `client-anniversary-check` ou `morning-suivis-digest`.

Migration SQL pour activer le cron via `pg_cron` :
```sql
select cron.schedule(
  'request-testimonial-daily',
  '0 10 * * *',
  $$select net.http_post(
    url := 'https://<project>.functions.supabase.co/request-testimonial',
    headers := '{"Authorization": "Bearer <service_role>"}'::jsonb
  )$$
);
```

---

### Étape 11.6 — Composant `<TestimonialsCarousel />` réutilisable (1-2 h)

`src/components/testimonials/TestimonialsCarousel.tsx`

**Props** :
- `variant: "welcome" | "business" | "newsletter" | "compact"`
- `language?: string` (default detect via i18next / locale, fallback 'fr')
- `limit?: number` (default 6, random parmi les approved)
- `coachId?: string` (filter sur un coach précis, default = tous)

**Comportement** :
- Fetch `client_testimonials` where `status='approved'` and `language=<locale>` (fallback `fr` si vide)
- Auto-rotation 6 secondes
- Swipe gestures mobile (touch)
- Pause au hover desktop
- A11y : `aria-live="polite"`, navigation clavier flèches G/D
- Affichage par card :
  - Citation (content)
  - Étoiles dorées (rating)
  - « **Marie D.**, Metz » en bas
  - Photo ronde optionnelle (si `photo_consent=true` + `photo_url`)

**Style variants** :
- `welcome` : card glassmorphism large, max 1 par fois, transitions fade
- `business` : 3 cards visibles desktop, 1 mobile, scroll horizontal
- `newsletter` : compact 2 cards juxtaposées, no animation (statique HTML)
- `compact` : mini citation + étoiles, sans photo, pour sidebars

**Intégration** :
- `BilanOnlineWelcomePage` : insérer `<TestimonialsCarousel variant="welcome" />` juste avant le bouton « Commencer mon bilan »
- `BusinessPage` : insérer `<TestimonialsCarousel variant="business" />` dans la section social proof (après les piliers, avant le simulateur ou FAQ — à arbitrer)
- Newsletter (chantier #8 à venir) : `variant="newsletter"`

---

### Étape 11.7 — Recette + announcement (30 min)

- Recette parcours complet :
  - Client X reçoit la notif J+60 → click → page form → remplit → submit → status pending
  - Admin reçoit notif → ouvre `/admin/testimonials` → approve
  - Carrousel `welcome` charge ce témoignage dans `BilanOnlineWelcomePage`
- Migration `app_announcements` : annonce distri « 💬 Nouveau : tes témoignages clients sont collectés automatiquement. Va voir `/admin/testimonials` »
- Carte hub `/developpement/nouveautes`

---

## 🎨 Tokens design (réutiliser ceux de `feat/online-bilan`)

```ts
const TESTIMONIAL_TOKENS = {
  // Hérités de BO_TOKENS (BilanOnlineShell)
  cream: '#FBF7F0',
  navy: '#1A1E27',
  gold: '#C9A84C',
  goldSoft: '#E5C97D',
  teal: '#2DD4BF',
  tealDark: '#0F766E',
  coral: '#FB7185',
  hair: 'rgba(11,13,17,0.08)',
  
  // Spécifiques témoignages
  starGold: '#C9A84C',
  starEmpty: 'rgba(201,168,76,0.18)',
}
```

Fonts : Syne (titres) + DM Sans (body) — même choix que bilan online après retour au mockup Égypte validé.

---

## 📦 Liste des fichiers à créer

```
supabase/migrations/<timestamp>_client_testimonials.sql        (11.1)
supabase/migrations/<timestamp>_request_testimonial_cron.sql   (11.5)
supabase/functions/submit-testimonial/index.ts                 (11.2)
supabase/functions/get-testimonial-context/index.ts            (11.3 helper)
supabase/functions/request-testimonial/index.ts                (11.5)
src/pages/public/testimonial/TestimonialFormPage.tsx           (11.3)
src/pages/public/testimonial/TestimonialThankYouPage.tsx       (11.3)
src/pages/admin/AdminTestimonialsPage.tsx                      (11.4)
src/components/testimonials/TestimonialsCarousel.tsx           (11.6)
src/components/testimonials/TestimonialCard.tsx                (11.6 sub)
src/hooks/useTestimonials.ts                                   (11.6)
src/types/testimonial.ts                                       (types partagés)
```

Modifs sur existants :
- `src/App.tsx` : ajouter route `/temoignage/:token` + `/temoignage/:token/merci` + `/admin/testimonials`
- `src/pages/public/online-bilan/BilanOnlineWelcomePage.tsx` : insérer `<TestimonialsCarousel variant="welcome" />`
- `src/pages/public/BusinessPage.tsx` : insérer `<TestimonialsCarousel variant="business" />` dans section social proof

---

## 🚀 Ordre d'exécution

**Sprint 1 (à faire MAINTENANT pour avoir lien partageable)** :
1. 11.1 migration SQL → push DB
2. 11.2 edge function submit-testimonial → deploy
3. 11.3 page form + helper get-testimonial-context → commit + push branche

**STOP — partage le lien aux clients amorces, collecte les premiers avis**

**Sprint 2 (à faire dans la semaine)** :
4. 11.4 page admin → commit
5. 11.5 cron J+60 → migration cron + deploy
6. 11.6 carrousel + intégration Welcome bilan + Business → commit
7. 11.7 recette + announcement → commit + merge PR

---

## ⚠️ Pièges à éviter

1. **NE PAS toucher** au bilan en RDV (`NewAssessmentPage`) — totalement indépendant
2. **Réutiliser** les tokens et composants du shell `BilanOnlineShell` au lieu de créer un nouveau design
3. **Modération anti-doublon** : un client ne doit avoir qu'1 témoignage actif (pending OU approved). Vérifier dans edge function avant insert.
4. **i18n preparation** : stocker `language` dès la V1 même si seul le `fr` est utilisé, pour ne pas casser quand chantier #5 arrive
5. **Cron J+60** : tester que le cron ne re-spam pas les clients déjà ayant un témoignage. La query `WHERE NOT EXISTS (SELECT 1 FROM client_testimonials WHERE client_id = ...)` doit filtrer.
6. **Pas de doublon de modération** : approve_at NULL → status='pending', approve_at NOT NULL → status='approved'. UI admin doit refléter ça.

---

## ✅ Definition of done

- [ ] Migration appliquée prod via `supabase db push --linked --include-all`
- [ ] Edge function deployée via `supabase functions deploy submit-testimonial --no-verify-jwt`
- [ ] Edge function deployée via `supabase functions deploy get-testimonial-context --no-verify-jwt`
- [ ] Build OK (`npm run build`)
- [ ] Page form `/temoignage/<token>` accessible en preview Vercel
- [ ] Soumission via Supabase Studio insert manuel → status=pending → admin approve → apparaît sur Welcome bilan
- [ ] Cron schedulé (vérif via `select * from cron.job`)
- [ ] Announcement créé dans `app_announcements`
- [ ] PR créée + recette Thomas + merge dans `dev/thomas-test`

---

## 🤝 Workflow Thomas pour amorcer

Pendant que Sprint 1 se fait :
1. Thomas prépare la **liste des 5-10 premiers clients challengers** à inviter (prénom + token de `client_app_accounts`)
2. Une fois Sprint 1 mergé : Thomas partage les liens individuels `labase360.com/temoignage/<token>` dans son groupe WhatsApp client
3. Les premiers avis arrivent en `status='pending'`
4. Thomas approve manuellement via Supabase Studio (avant que `/admin/testimonials` du Sprint 2 soit prête)
5. Sprint 2 livré → carrousel s'affiche automatiquement sur Welcome bilan + Business

---

**Fin du prompt.** À coller dans la session Claude Code locale de Thomas.
