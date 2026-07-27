# Handoff — Refonte page « Résultat Bilan »

> Cible : **`src/pages/BilanResultatPremiumPage.tsx`** (route publique `/resultat-bilan/:token`, prospect non authentifié).
> Objet : **réécrire l'intégralité du rendu** de la page en gardant la logique data/paiement existante.
> Maquette de référence (structure + copy + couleurs) : `ResultatBilan.dc.html`.
> Branche de travail : `dev/thomas-test`.

---

## 1. Le problème qu'on corrige

La page actuelle est **14 sections empilées à plat**, toutes au même poids visuel, mono-colonne, la décision (prix + caisse) tout en bas. Chaque nouvelle idée (ancrage prix, langage humain, add-on, communauté, rappel) a été ajoutée comme **une carte de plus** → mur illisible, le lead décroche avant d'agir.

**Principe de la refonte : un entonnoir, pas une brochure.**
`perso/confiance → éducation/valeur → offre/caisse`, avec **une hiérarchie forte** et **la caisse toujours accessible**.

---

## 2. Nouvelle architecture (3 pièces structurantes)

1. **Menu chapitre collant** en haut (`Mon bilan · Mon plan · Mes formules · Démarrer`) — scrollspy : le chapitre actif se surligne ; clic = scroll vers l'ancre. Tue le « trop de scroll ».
2. **Colonne de décision collante** à droite (desktop ≥ 900px) : formule sélectionnée + prix + €/jour + `Je démarre` (Square) + `Fais-toi rappeler` + « paiement sécurisé Square ». **La caisse est toujours à un clic.**
3. **Barre de paiement collante en bas** (mobile < 900px) : reprend la sélection + prix + €/jour + CTA. Le rail desktop disparaît, la barre mobile apparaît.

Le contenu se replie en **3 actes** + un bandeau final.

---

## 3. Ordre exact des sections (remplace les 14 blocs à plat)

```
HEADER collant : logo · menu chapitre · pastille « Ta sélection · <prog> · <prix> € »

┌─ MAIN (col gauche) ────────────────┐  ┌─ ASIDE = RAIL collant (droite) ─┐
│ ACTE 1 · TON BILAN                 │  │ Ta sélection                    │
│  - Hero perso (Salut {prénom}…)    │  │ <nom formule> / sous-titre      │
│  - Coach (avatar + « Préparé par ») │  │ <prix> €                        │
│  - 4 stat cards (bilan)            │  │ soit <€/jour> · vs déjeuner     │
│  - Analyse de Noaly (encadré teal) │  │ ── CTA Je démarre (Square)      │
│                                    │  │ ── Fais-toi rappeler            │
│ ACTE 2 · TON PLAN                  │  │ 🔒 Paiement sécurisé · Square   │
│  - 5 stratégies (liste compacte)   │  │ + encart « appli We Do incluse »│
│  - Ce que tu vas boire (4 produits)│  └─────────────────────────────────┘
│  - PARLONS VRAI : ancrage prix     │
│    · 8,30 € déj  vs  <€/jour> route │
│    · « Voir le détail du calcul »  │  (mobile : rail masqué → barre
│       → breakdown produit/produit  │           de paiement collante en bas)
│  ACTE 3 · TES FORMULES             │
│  - Grille formules (reco en avant) │
│  - Add-on issu des réponses        │
│  - WE DO TRANSFORMATIONS (challenge│
│    21 j / 10 000 $ + appli + stats)│
│  - Pourquoi (2 cartes)             │
│  - FAQ (accordéon)                 │
│  - Bloc DÉMARRER (états caisse)    │
└────────────────────────────────────┘

BANDEAU « ET APRÈS » (pleine largeur) : 4 étapes du parcours /qualif
```

---

## 4. Design tokens — NE PAS inventer

On **garde `PublicShell` + `PUBLIC_TOKENS` + `PUBLIC_FONTS`** (`src/styles/public-tokens.ts`). C'est déjà le bon ADN. Rappels :

| Rôle | Token / valeur |
|---|---|
| Fond | `PUBLIC_TOKENS.ink` `#0B0D11` / panneaux `#131820` |
| Texte | `cream` `#FBF7F0` · muted `rgba(251,247,240,.58)` · hint `.32` |
| Filets | `rgba(251,247,240,.10)` / `.18` |
| Accent confiance | `teal` `#2DD4BF` |
| Accent énergie / CTA | `lime` `#c5f82a` |
| CTA (bouton) | `PUBLIC_TOKENS.gradCta` = `linear-gradient(120deg,#2DD4BF,#c5f82a)`, texte `#06241f` |
| Titres / phrases | `PUBLIC_FONTS.display` (Sora) |
| Chiffres / prix | `PUBLIC_FONTS.impact` (Anton) |
| Corps | `PUBLIC_FONTS.body` (Inter) |
| Petits labels tech | `PUBLIC_FONTS.mono` (JetBrains Mono) — ex. noms catalogue produits |

Mot accentué en gradient : `publicGradText` (teal→lime, italic) déjà exporté.
⚠️ **Ne pas** utiliser le thème interne `var(--ls-*)` ni les composants du design system coach : cette page a son ADN public à part.

---

## 5. Données & bindings réels (par bloc)

Tout vient de l'edge existant `get-online-bilan-results` → `ResultsDTO`. Rien de nouveau à créer côté serveur.

- **Hero** : `bilan.firstName` (capitalize), `coach.name`. Avatar = initiale coach.
- **Stat cards** : `primaryObjective` (via `OBJECTIVE_LABELS[bilan.objectives[0]]`), `bilan.currentWeightKg`, `bilan.weightLossTargetKg` (préfixe −), `bilan.motivationScore` /10, `bilan.age`. Masquer chaque carte si la valeur est `null` (comportement actuel — garder).
- **Analyse Noaly** : `bilan.aiAnalysis` ; **garder le fallback** si null (« {coach} prépare ta lecture… »).
- **5 stratégies** : `pickStrategies(bilan.objectives)` (déjà en place, V2 par objectif). Passer en **liste compacte numérotée** (numéro Anton teal), pas 5 grosses cartes. Tag « Fondation » sur `s.foundation`.
- **Ce que tu vas boire** : union ordonnée des produits des formules, mappée par `PRODUCT_HUMAN[id]` (`title` + `detail`) ; nom catalogue en mono.
- **PARLONS VRAI** : `LUNCH_AVG_EUR` (= 8,30 €) → **écrire la source : « coût moyen d'un déjeuner en France — enquête Edenred / Ifop »**. Comparé au `dailyCost(...)` de la formule **sélectionnée**.
- **Formules** : `programmes` (edge, prix réels DB). Reco = présélection existante (`pickAddOn` → formule qui contient l'add-on, sinon `premium`, sinon 1ʳᵉ). **Garder** : sous-titre par ID (`PROGRAMME_SUBTITLE_BY_ID`), badge par ID, **liste produits complète (NE PAS re-tronquer / pas de `.slice`)**, jamais « /mois ».
- **Add-on** : `pickAddOn(bilan.objectives + answers)` (déjà là). Bloc lime : `title`, `reason` (cite sa réponse), `benefit` (allégations autorisées uniquement — cf. commentaire `bilanAddOns.ts`, **ne pas** réintroduire l'argument graisse viscérale), `dailyCost([addOn.productId])`.
- **We Do Transformations** (MAJ 2026-07-18, section 9 de la page dev) : challenge 21 j, « **10 000 $ en jeu pour les 10 plus belles transformations** », « L'appli We Do, dans ta poche · Incluse — pas une option », stats `COMMUNITY_STATS` (`formatCount`), lien `TELEGRAM_GROUP_URL`.
- **Pourquoi** : `WHY` réduit à **2 cartes** (« On le fait ensemble » + « Un suivi qui se voit ») — les cartes communauté/challenge sont désormais dans la section We Do (cf. note code ligne ~1106).
- **Témoignages** : garder `TestimonialsCarousel` + masquage si `onLoaded(0)` (pas de titre orphelin). *(optionnel dans l'entonnoir — à placer avant la FAQ si conservé.)*
- **FAQ** : `FAQ` existant, en **accordéon** (une ouverte à la fois).
- **Bandeau « Et après »** : les 4 étapes réelles de `/qualif/:token` (cf. `qualif-bootstrap` / `qualif-update`) : ① identité + RGPD (fiche self-serve) · ② saveurs F1/Thé/Aloé (push coach) · ③ appli We Do + 1ʳᵉ pesée (`ClientBaselineStep`) · ④ Telegram → « Ouvrir mon espace ».

---

## 6. €/jour — être PRÉCIS (les leads sont pointilleux)

Le €/jour NE se calcule PAS « prix du pack ÷ durée ». Utiliser **`dailyCost(productIds, priceById)`** de `src/data/routineCost.ts` :

> €/jour = Σ ( prix unitaire du produit ÷ nombre de jours qu'il tient à la dose conseillée )

- Durées réelles = `PRODUCT_DAYS` (F1 = 21 j, PDM/Protéines = 42 j, Aloé ≈ 31 j, Thé = 30 j, Multifibres = 30 j, Phyto = 30 j).
- Prix unitaires = `priceById` (construit depuis `data.produits`, **prix DB réels**).
- `dailyCost` renvoie `null` si une dose/un prix manque → **masquer** le €/jour plutôt qu'afficher un faux.

**Ajouter un dépliant « Voir le détail du calcul »** sous l'ancrage prix : pour la formule sélectionnée, lister **produit par produit** `nom · tient X j · Y,YY €/j`, puis le **total = €/jour affiché**. Micro-copie : « On ne divise pas le pack par une durée au hasard… ». C'est ce qui rend le prix défendable.

> ⚠️ Dans la maquette DC, les **prix unitaires sont illustratifs** (F1 3,00 €/j, etc.). En intégration, ils viennent de `priceById` — donc **réels** automatiquement. Vérifier juste que `PRODUCT_DAYS` couvre tous les produits des formules affichées.

---

## 7. Interactions & états (garder la logique existante)

- **Sélection formule** → met à jour : rail, pastille header, ancrage « Parlons vrai », bloc Démarrer, barre mobile. (state `selected`, fallback = reco.)
- **Je démarre** → `create-payment-link` (Square hosted checkout, prix serveur). Fallback si pas d'encaissement → panneau « ton coach t'envoie le lien ». Retour caisse → `?paid=1`.
- **Écran payé** → **preuve serveur `bilan_orders.paid`** (poll `get-online-bilan-results`), **jamais** le seul `?paid=1`. Garder le fix du poll (2026-07-16) + retour Stripe `confirm-stripe-payment`.
- **Fais-toi rappeler** → `request-callback` (horodate le lead + push coach). État `idle → sending → done`.
- **Continuer mon inscription** (après payé) → `navigate('/qualif/'+token)`.
- **Scrollspy / menu** : ⚠️ **ne pas utiliser `scrollIntoView`** — calculer `el.getBoundingClientRect().top + window.scrollY − 78` puis `window.scrollTo({top, behavior:'smooth'})`.
- **FAQ** : accordéon (index ouvert). **Détail calcul** : toggle booléen.

---

## 8. Responsive

- **≥ 900px** : grille `1fr 344px`, rail collant (`top: 84px`), barre mobile masquée.
- **< 900px** : grille 1 colonne ; rail masqué ; **barre de paiement collante en bas** affichée (prix + €/jour + CTA) ; menu chapitre scrollable horizontalement ; pastille sélection du header masquée ; stats 4→2 ; produits/formules/pourquoi → 1 colonne ; padding-bottom du contenu pour ne pas passer sous la barre.
- **< 560px** : stats, étapes qualif, tuiles ancrage → 1 colonne.

---

## 9. Garde-fous — NE PAS casser (déjà corrigés dans le code)

1. Best-seller / sous-titre **par ID** de programme (pas d'index positionnel).
2. Liste produits des formules **complète** (le 5ᵉ produit justifie l'écart de prix — pas de `.slice`).
3. Jamais « /mois » (packs à prix fixe, durée ajustée au rythme).
4. Écran payé sur **preuve serveur** `bilan_orders.paid`.
5. Témoignages **masqués** si aucun avis validé.
6. Add-on : **allégations autorisées uniquement** (Règlement UE 1924/2006 — cf. `bilanAddOns.ts`).
7. Fallback analyse Noaly si `aiAnalysis` null.

---

## 10. À faire côté Thomas / TODO

- [ ] Vérifier que `PRODUCT_DAYS` (routineCost.ts) couvre tous les produits des formules actives, sinon le €/jour se masque.
- [ ] Confirmer la copy We Do (10 000 $ / 10 transformations) et les 3 chiffres `COMMUNITY_STATS` (relevé manuel Telegram).
- [ ] Square : credentials/webhook actifs (carte « Encaissement » dans Paramètres > Profil).
- [ ] Rien de nouveau côté edges : `get-online-bilan-results`, `create-payment-link`, `request-callback`, `qualif-bootstrap/update` existent déjà.

---

## 11. Ce qui NE change pas

`ResultsDTO`, tous les edges, `pickAddOn`, `pickStrategies`, `routineCost`, `community`, `TELEGRAM_GROUP_URL`, la route, le token unifié résultat↔qualif. **On ne touche qu'au rendu** (structure, hiérarchie, responsive) — pas au contrat data ni au paiement.
