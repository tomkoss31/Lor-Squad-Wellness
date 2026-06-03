# Brief chantier — Funnel Opportunité « gated » + mini-CRM recrutement

> **Statut : BROUILLON À VALIDER (Thomas).** Source de vérité du chantier.
> Aucune ligne de code app tant que ce brief n'est pas validé.
> Date : 2026-06-03 · Auteur : Thomas + Claude (débrief).

---

## 0. Le problème qu'on résout

Aujourd'hui, le lien partagé pour l'opportunité pro pointe **direct sur la page
publique complète** (`/opportunite` → `/business`). Résultat :
- 0 filtre : n'importe qui voit tout, sans laisser d'info.
- Capture pauvre (prénom/tél/ville) et au choix du visiteur (form en bas / popup).
- Pas de pré-qualification → on perd du temps en RDV avec des gens pas alignés.

**On veut** : un **garde-fou qualifiant** devant la page. La personne répond à un
court questionnaire **avant** d'accéder au contenu, et selon son profil on
l'oriente vers la bonne suite. Le tout alimente un **mini-CRM recrutement**.

---

## 1. La grille AVANT / PENDANT / APRÈS

### AVANT — la porte (`/rejoindre/:coachSlug?ref=…`)
- Hero visible (accroche + preuve sociale : 4 ans · 200+ partenaires · 0€ inventaire).
- **Le reste de la page est flouté** (teaser).
- Bandeau : « Avant de tout te montrer, réponds à quelques questions (1 min) — on
  veut savoir si c'est fait pour toi. »
- CTA : **« Je réponds → »**.
- Réutilise l'attribution **`?ref=<coach_id>`** existante (qui a partagé le lien).

### PENDANT — le questionnaire « rebondissant »
- **1 question par écran**, barre de progression, transitions animées.
- **Micro-rebonds** : réactions entre les questions (« Enchanté [prénom] 👋 »,
  « Plus que 2 questions », « Top, ça nous aide »).
- **Branches conditionnelles** selon le profil détecté (cf. §2 et §3).
- Mobile-first (la plupart cliqueront depuis Insta/WhatsApp sur téléphone).

### APRÈS — la sortie routée (en bas de page / écran final)
La qualification **n'envoie pas tout le monde au même endroit** :

| Profil | Sortie « après » |
|---|---|
| 🔍 **Curieux** | Débloque la page → **lecture libre « à ton rythme »** + invite douce « quand tu veux, on échange ». Pas de pression visio. |
| 💸 **Complément** | Débloque + met en avant le **Simulateur** (« voici ce que ça peut te rapporter ») + CTA **« Réserve un échange »** orienté revenu d'appoint. |
| 🚀 **Reconversion** | Débloque + **CTA prioritaire « Réserve ta visio cette semaine »** + cadre accompagnement. **Coach notifié en priorité** (lead chaud). |

---

## 2. Les 3 profils (logique de routage)

| Profil | Cherche | Temps typique | Enjeu | Posture coach |
|---|---|---|---|---|
| 🔍 Curieux | comprendre, pas s'engager | faible | faible | rassurer, informer |
| 💸 Complément | + d'argent à côté | 5-10h/sem | garde son job | flexibilité, ROI temps |
| 🚀 Reconversion | changer de vie pro | élevé | fort | vision, accompagnement |

Le profil est choisi explicitement par le prospect (question de routage) **et**
affiné par le scoring (cf. §5).

---

## 3. Arborescence de questions (à affiner ensemble)

### Tronc commun (tout le monde)
1. **Identité** (progressive) : Prénom → *« Enchanté [prénom] 👋 »* → Nom → Email → Téléphone → Ville.
2. **Source** : « Comment tu as connu La Base 360 ? » → un coach / Insta / Facebook / TikTok / bouche-à-oreille / shake bar / autre.
   - *Rebond :* si « un coach » → « Super, on lui dit que tu arrives 😉 ».
3. **🔀 ROUTAGE** : « Aujourd'hui, qu'est-ce qui t'attire le plus ? »
   - 🔍 Je suis curieux·se, je veux comprendre
   - 💸 Un complément de revenu, à côté de mon activité
   - 🚀 Une vraie reconversion / changer de vie pro

### Questions transverses (style FORM + réseau)
4. **Occupation** : « Tu fais quoi en ce moment ? » (salarié·e / indépendant·e / sans emploi / parent au foyer / étudiant·e / retraité·e).
5. **Environnement & cercle social** *(le nerf de la guerre en MLM = le réseau)* :
   - « Tu es plutôt du genre à aimer échanger avec les gens autour de toi ? » (oui beaucoup / ça dépend / pas trop)
   - « Tu connais des gens sensibles au bien-être / sport / nutrition ? » (plein / quelques-uns / pas vraiment)
6. **Affinité produit** : « Ton rapport au bien-être / nutrition aujourd'hui ? » (passionné·e / je m'y mets / curieux·se / pas du tout).
7. **Pourquoi maintenant** : « Qu'est-ce qui te pousse à regarder ça aujourd'hui ? » (champ libre court ou choix : marre de mon job / besoin de sous / envie de liberté / je teste / autre).

### Branches spécifiques (1-2 questions selon profil)
- 🔍 **Curieux** → « Ce qui t'intrigue le plus : les produits, le business, ou la communauté ? » · « Tu veux juste t'informer ou tu es prêt·e à tester ? »
- 💸 **Complément** → « Quel complément mensuel changerait vraiment ton quotidien ? » (aspiration, pas promesse) · « Ton activité actuelle te laisse de la flexibilité ? »
- 🚀 **Reconversion** → « Qu'est-ce qui te donne envie de changer ? » · « Dans quel délai tu aimerais vivre de ça ? » · « Prêt·e à te former sérieusement et être accompagné·e ? »

### Clôture (tout le monde)
8. **Dispo** : « Combien d'heures/semaine tu pourrais y consacrer ? » (<2 / 2-5 / 5-10 / 10+).
9. **Échange** : « Tu serais dispo pour un échange de 20 min en visio cette semaine ? » (oui cette semaine / plus tard / pas encore).
10. **Consentement RGPD** : case explicite « J'accepte d'être recontacté·e par un coach La Base 360 ».

---

## 4. Modèle de données

**Décision : étendre `prospect_leads`** (déjà : attribution `?ref=`/coach_slug,
source, UTM, status, push admin). Ajout de colonnes :

| Colonne | Type | Rôle |
|---|---|---|
| `email` | text null | (manquait — capturé par le funnel) |
| `last_name` | text null | nom |
| `profile` | text null | `curious` / `side_income` / `career_change` |
| `score` | int null | score de qualification (cf. §5) |
| `temperature` | text null | `hot` / `warm` / `cold` (dérivé du score) |
| `hours_per_week` | text null | dispo |
| `occupation` | text null | situation pro |
| `network_strength` | text null | force du réseau (env. social) |
| `why_now` | text null | motivation |
| `wants_visio` | text null | dispo échange |
| `answers` | jsonb | toutes les réponses brutes (audit + V2 IA) |

> ⚠️ Migration **additive** (colonnes nullables) → pas de risque sur l'existant.
> RLS `prospect_leads` déjà en place (admin/référent). À vérifier au moment du build.

---

## 5. Scoring (auto) → cœur du mini-CRM

Score additif simple (transparent, ajustable) :

| Critère | Points |
|---|---|
| Profil reconversion | +3 · complément +2 · curieux 0 |
| Dispo 10h+ | +3 · 5-10h +2 · 2-5h +1 |
| Réseau « oui beaucoup » | +2 · « ça dépend » +1 |
| Connaît des gens bien-être « plein » | +2 · « quelques-uns » +1 |
| « Pourquoi maintenant » urgent (marre du job / besoin sous / liberté) | +2 |
| Veut une visio **cette semaine** | +2 |
| Affinité produit passionné·e | +1 |

**Température** : 🔥 `hot` ≥ 8 · 🟡 `warm` 4-7 · ❄️ `cold` < 4.

→ Dans le board, chaque lead s'affiche : `🚀 Reconversion · 🔥 · 10h/sem · réseau large`.
Tri/priorisation immédiate.

---

## 6. Mini-CRM (réutilise le kanban Leads existant)

Colonnes (statuts) :
`Nouveau` → `Qualifié (auto)` → `Accès donné` → `Visio planifiée` → `Recruté` / `Perdu`

- Réutilise le composant **kanban Leads** déjà construit (chantier #1) — on ajoute
  les colonnes/statuts recrutement + l'affichage profil/score.
- Carte lead : identité, profil, score/température, réponses dépliables, source `?ref=`,
  boutons **WhatsApp / SMS / Email** (réutilise les helpers OutilsProspection),
  **« Donner l'accès »**, **« Planifier visio »**.
- Push admin déjà câblé (`submit-prospect-lead`) → on garde, en enrichissant le
  message (« 🔥 Reconversion chaud · 10h/sem »).

---

## 7. Garde-fous

- **Légal (FVD / Herbalife)** : aucune promesse de revenu. Toute question « argent »
  est formulée en **aspiration** (« combien aimerais-tu… »), jamais « tu gagneras X ».
- **RGPD** : consentement explicite + finalité claire + pas de revente. Lien mentions légales.
- **Anti-spam** : réutilise le rate-limit IP existant de `submit-prospect-lead`.
- **Pas de friction inutile** : la page se **débloque dès le form rempli** (le vrai
  « sésame » = la visio humaine, pas la lecture du texte) → on ne perd pas les tièdes.

---

## 8. Décisions à acter (Thomas)

1. **Routage « après » par profil** (curieux / complément / reconversion → 3 sorties) → *proposé : oui.*
2. **Scoring auto** affiché dans le CRM → *proposé : oui.*
3. **Débloquage** : auto après le form (reco) **ou** validation manuelle du coach avant accès ?
4. **Visio** : lien externe (Calendly/Cal.com) **ou** intégré à l'agenda interne La Base 360 ?
5. **Questionnaire** : on part sur l'arborescence conditionnelle (§3) — OK / à élaguer ?

---

## 9. Plan de build (sur `dev/thomas-test`, étapes franches)

1. **Migration** `prospect_leads` (colonnes §4) + route publique `/rejoindre/:slug`
   (clone du moteur `bilan-online`) : hero + floutage + accroche.
2. **Questionnaire rebondissant** (§3) : écrans, progression, branches, micro-rebonds.
3. **Submit + scoring** (§5) → `prospect_leads` enrichi + push admin enrichi.
4. **Sorties routées « après »** (§1) par profil.
5. **Mini-CRM** : statuts recrutement + affichage profil/score dans le kanban Leads.
6. **Visio/RDV** + **annonce distri** + fiche tuto (règle du livrable complet).

Recette à chaque étape avant prod.
