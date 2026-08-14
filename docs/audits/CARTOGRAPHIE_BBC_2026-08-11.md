# Mode BBC — ce qui existe vraiment, au 11/08/2026

> Cartographie faite **par le code et par la base**, pas par les fiches de
> chantier. Règle apprise à nos dépens : les fiches sont écrites au cadrage et
> jamais mises à jour à la livraison.
>
> Exemple concret trouvé cette nuit — l'en-tête de `BbcApp.tsx` annonce encore :
> *« Lot 1 = la charpente avec des données d'exemple […] les autres vues
> arrivent aux lots suivants — ici elles affichent un écran "à venir" »*.
> **C'est faux** : les 14 vues sont importées, codées et alimentées. Aucun
> écran « à venir » ne subsiste dans le code. Le commentaire a 3 semaines de
> retard sur la réalité.

---

## La conclusion, d'abord

**Le Mode BBC n'est pas « à coder ». Il est « à démarrer ».**

L'application est complète : 14 écrans coach, 5 écrans membre, une app membre
dédiée, 12 hooks, ses propres tokens visuels. Ce qui manque, ce sont **les
données** — parce que le club n'a pas encore ouvert.

---

## 1 · Ce qui est codé

### Les 14 écrans coach (`src/features/bbc/views/`)

| Écran | Taille | Alimenté par |
|---|---|---|
| `BbcSemaine` | 1 089 L | `useBbcCalls` `useBbcMembers` `useBbcMode` `useClubDiscoveryBookings` `useClubSettings` `useClubShifts` |
| `BbcFormation` | 916 L | `useBbcFormationProgress` `useBbcRole` |
| `BbcClub100` | 363 L | `useBbcMembers` `useClubSettings` |
| `BbcLexique` | 284 L | props (`settings`) |
| `BbcMessages` | 254 L | props (`userId`) |
| `BbcReglages` | 245 L | `useClubSettings` |
| `BbcCrm` | 216 L | `useBbcMembers` `useBbcVisits` |
| `BbcLiens` | 205 L | props (`settings`) |
| `BbcAppels` | 194 L | `useBbcCalls` `useBbcVisits` |
| `BbcClubs` | 178 L | props (`clubs`, `isAdmin`) |
| `BbcCoeurs` | 152 L | `useBbcHearts` `useClubSettings` |
| `BbcPrelancement` | 150 L | `useBbcPrelaunch` |
| `BbcClub` | 143 L | `useBbcVisits` |
| `BbcScripts` | 129 L | props (`settings`) |

**Aucune coquille.** Les cinq écrans sans hook reçoivent leurs données en
props depuis `BbcApp` — c'est un choix d'architecture, pas un manque.

### L'espace membre (`src/features/bbc/member/`)

`MemberCoeurs` · `MemberConseils` · `MemberEvolution` · `MemberMessages` ·
`MemberNoaly`, montés par `BbcClientApp` (lui-même monté par `ClientAppPage`
quand le client appartient à un club BBC).

### L'atelier

`/atelier-bbc` (DEV uniquement) rend **tous** les écrans BBC sans session.
C'est l'outil de recette : s'en servir avant de toucher au visuel.

### L'identité

`bbc-tokens.css`, préfixe `--ls-bbc-*`. **Vérifié cette nuit** : scope
`.bbc-mode` présent, aucune fuite (tous les `var()` de l'écran sont BBC, zéro
`--ls-`, `--bc-` ou `--dw-`). Les bases sont **identiques à l'app** — même vert
`#162624`, même lime, même teal — plus trois accents propres : corail, sauge,
ambre.

---

## 2 · Ce qui est vide — les chiffres en base

| Table | Lignes |
|---|---|
| `clubs` | **1** (Verdun) |
| `club_visits` | **12** |
| `member_cards` | **1** |
| `cobaye_tracker_entries` | **1** |
| `bbc_formation_progress` | **1** |
| `club_shifts` | **0** |
| `club_call_registrations` | **0** |
| `club_bilans` | **0** |
| `bbc_prelaunch_progress` | **0** |

**Zéro rituel inscrit, zéro créneau configuré.** Or les rituels sont le cœur
du modèle BBC — et `bbc-call-reminder` (le cron des rappels) est **coupé**
depuis l'incident du 29/07, à rebrancher à l'ouverture.

---

## 3 · Ce qui manque vraiment

### A · Les réglages du club — le préalable à tout

`club_shifts` et `club_call_registrations` sont vides : le club n'a jamais été
configuré. Or **tout en dépend** — les rituels, les horaires, les liens Zoom,
le barème des cœurs vivent dans `clubs.settings` et pilotent la moitié des
écrans. Un principe explicite du code (`bbcFormation.ts`) :

> *« AUCUNE VALEUR RÉGLABLE EN DUR. Écrit en dur ici, le coach ne peut plus
> rien changer. »*

**→ Premier chantier : passer une fois dans Réglages et tout remplir.**
Ce n'est pas du développement, c'est 30 minutes de saisie. Rien d'autre ne
sert tant que ce n'est pas fait.

### B · Cinq trous de contenu, déjà identifiés dans le code

`bbcFormation.ts` porte cinq champs `todo` qui **disent franchement ce qui
manque** plutôt que d'inventer (bonne pratique, à conserver) :

1. **Marche « roll out »** — le Drive ne la documente pas sous ce nom, elle
   vient du Playbook. Prérequis exacts inconnus.
2. **Nombre de messages cobayes** pour décrocher 10 évaluations — les sources
   se contredisent.
3. **Présentation projetée** pendant l'évaluation bien-être — existe dans le
   Drive, pas reprise dans l'app.
4. **Options C et D** du parcours — l'ancienne version les décalait d'un cran.
5. **Check-lists d'activation** (stagiaire / junior) — synthèse à valider.

**→ Ce sont des questions pour Thomas, pas du code.** Une demi-heure de
réponses débloque les cinq.

### C · Le cron des rappels, à rebrancher

`bbc-call-reminder` (midi le jour J / −30 min / −15 min → membre ; +30 min →
coach) est **désactivé** depuis le 29/07. Réversible :

```sql
select cron.alter_job(jobid, active := true)
  from cron.job where jobname like '%bbc-call%';
```

⚠️ **Ne jamais le reprogrammer sur la minute `0`** — sept tâches calées sur
`0 * * * *` se disputaient 6 emplacements et ont gelé la base 2 h 45.

---

## 4 · Le lien avec l'applicatif — déjà fait

Le pont club ↔ coach a été bouclé le 11/08 :

- un **RDV coach consomme une place** du club, au lieu de faire disparaître le
  créneau (migration `20261211090000`) ;
- **et l'inverse** : un créneau club complet ferme le créneau coach
  (`20261211120000` puis `130000`). Le compteur n'est plus à sens unique ;
- la réservation coach est **atomique** (verrou consultatif,
  `20261211100000`) : deux personnes ne peuvent plus prendre le même créneau.

---

## 5 · Par où commencer, demain

| Ordre | Quoi | Qui |
|---|---|---|
| 1 | Remplir **Réglages** : rituels, horaires, liens, barème des cœurs | Thomas, 30 min |
| 2 | Répondre aux **5 questions** de contenu ci-dessus | Thomas |
| 3 | Rebrancher `bbc-call-reminder` (pas sur la minute 0) | dev, 5 min |
| 4 | Recetter les 14 écrans **avec de vraies données** via `/atelier-bbc` | ensemble |
| 5 | Mettre à jour l'en-tête de `BbcApp.tsx`, qui ment | dev, 2 min |

**Rien ne justifie un gros chantier de code aujourd'hui.** Le BBC attend son
premier vrai matin, pas des lignes supplémentaires.
