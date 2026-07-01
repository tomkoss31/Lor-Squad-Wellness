# Contexte produit — Bioniq (Extravaganza EMEA 2026)

> Doc de référence pour le repo **La Base 360**. But : anticiper l'impact de Bioniq sur
> l'app SANS rien coder tant que le produit n'est pas dispo en France.
> Source : Extravaganza Herbalife EMEA, Cracovie, 26-27 juin 2026.
> Dernière mise à jour : 28/06/2026.

---

## ⛔ Statut (à relire avant tout dev)

- **Bioniq n'est PAS encore dispo en France.** Ouverture estimée : **~septembre 2026** (à confirmer sur MyHerbalife).
- **Ne rien construire dans l'app pour Bioniq tant que la dispo France n'est pas confirmée.**
- Tant que France fermée : le moteur tourne sur l'offre actuelle (shakes, bilans, club). La fiche de démarrage et le plan d'expansion ne changent pas.

---

## C'est quoi Bioniq

- Produit **micronutriments personnalisés** (acquisition Herbalife ; fondateur Vadim Fedotov, 2019 ; Cristiano Ronaldo investisseur/partenaire).
- **Fait sur mesure** : questionnaire santé 26 questions → algorithme choisit 1 formule sur 40 (23 micronutriments, granule suisse à diffusion lente).
- **Nom du client imprimé sur la boîte.** Pas de stock distributeur possible : chaque commande passe individuellement.
- Positionné comme **produit d'accroche** : on attaque par le besoin micronutriment (énergie, sommeil, immunité, perf), puis on ouvre sur le reste de la gamme. Touche les gens réfractaires aux shakes.
- "Macro = comment tu **look**, micro = comment tu te **sens**."

## Mécanique business (à exploiter dès l'ouverture France)

- **61 volume points / client** (ratio VP élevé → PV plus facile à atteindre).
- **Modèle abonnement** : rétention historique ~**5 mois** vs **3,3** moyenne Herbalife → PV plus stable.
- **Promo lancement bornée : juin → décembre 2026** (11 marchés EMEA). Sur abonnement :
  - 3 clients = 100 € · 5 = 200 € · 10 = 400 € · 50 = 600 € (+200 € / 5 supplémentaires)
  - **15 clients abonnés = qualification Superviseur.**
- ⚠️ Si la France ouvre en septembre, la fenêtre promo n'est plus que **~3-4 mois**. Stratégie : **remplir le réservoir cet été** (identifier les prospects "énergie/sommeil/perf/sportifs") pour basculer vite au jour 1.

## Nouveaux outils Herbalife annoncés

- **Pages marketing perso** (MyHerbalife > Online Business, 11 marchés) : vente directe au client, tracking ID auto, paiement via plan marketing, **zéro inventaire**.
- **Protocol** (app) : tracking bien-être client **+ dashboard coach** (nudges). En **beta 90 jours**, pas encore lancé.

---

## ⚠️ Décision produit — La Base 360 vs Protocol

**Herbalife construit déjà un dashboard coach + suivi client (Protocol).**
→ **Ne pas rebâtir ce que Protocol va fournir.** Recentrer La Base 360 sur ce que Protocol ne couvrira PAS :

- ✅ **Garder dans La Base 360** : moteur de recrutement / duplication d'équipe — expositions (métrique-reine), pilotage downline, arbre de profondeur, démarrage 30j, échelle leader.
- 🔻 **Laisser à Protocol** : suivi client pur (tracking macro, logs produit, nudges bien-être).
- 🔁 **À surveiller** : si Protocol expose une API / un export, prévoir une intégration plus tard plutôt qu'une duplication.

---

## Implications futures pour le modèle de données (NE PAS coder maintenant)

Quand France ouvre, prévoir (P2, après le moteur d'équipe) :

- Notion de **type de produit / d'exposition** déjà compatible : un bilan "Bioniq" = une exposition de type `bilan` (réutiliser la table `exposures` existante, pas de table dédiée).
- **Tag prospect "candidat Bioniq"** : champ simple sur le prospect (booléen ou tag) pour préremplir le réservoir avant l'ouverture.
- **Suivi qualif Superviseur via abonnés** : compteur "clients Bioniq abonnés" par distri + jauge vers 15 (= Superviseur). Dérivable, pas une nouvelle usine.
- Ne PAS gérer le stock Bioniq (impossible par design).

---

## Les 4 actions de l'Extravaganza (rappel)

- [ ] Utiliser l'IA chaque jour, stratégiquement, 40 jours
- [ ] Réactiver les superviseurs inactifs (challenge 30 j) — Bioniq = bon prétexte de réveil
- [ ] Qualifier / re-qualifier Active World Team cette année
- [ ] Billet Extravaganza 2027 + liste des gens à emmener

---

*Note : chiffres = objectifs d'activité / mécaniques promo annoncées, pas des promesses de revenus. À reconfirmer sur les canaux officiels Herbalife avant exécution.*
