# Lor'Squad Wellness — PROJECT_SPEC

## 1. Nom du projet

**Lor'Squad Wellness**  
**Sous-titre :** Bilan & Suivi personnalisé

---

## 2. Objectif du projet

Créer une application web premium, fluide et simple à utiliser sur **ordinateur** et **tablette**, destinée à réaliser des **bilans bien-être**, suivre les **clients**, centraliser les **données de body scan**, présenter des **visuels pédagogiques**, et accompagner le **closing** avec des programmes adaptés.

L'application doit être conçue pour un usage réel en rendez-vous client, avec une interface professionnelle, lisible, rassurante et duplicable pour toute l'équipe.

---

## 3. Utilisateurs

### Admin
- Thomas
- Mélanie

### Distributeur
- Membres de l’équipe
- Accès uniquement à leurs clients et à leurs bilans

---

## 4. Droits utilisateurs

### Admin
Peut :
- voir tous les clients
- voir tous les bilans
- voir tous les distributeurs
- modifier toutes les fiches clients
- modifier tous les bilans
- voir les suivis à venir
- créer un nouveau bilan
- consulter les historiques

### Distributeur
Peut :
- se connecter
- voir uniquement ses clients
- créer un nouveau bilan
- modifier ses propres bilans
- consulter l’historique de ses clients
- voir ses suivis à faire

Ne peut pas :
- voir les clients des autres distributeurs
- modifier les données globales de l’équipe

---

## 5. Vision produit

L’application n’est pas un simple formulaire.

C’est un **parcours guidé de consultation** en 3 dimensions :

1. **Collecte**
   - informations client
   - habitudes de vie
   - données de balance / body scan
   - objectif principal
   - programme choisi
   - suivi

2. **Pédagogie**
   - visuels sur l’hydratation
   - visuels petit-déjeuner
   - visuels Formula 1 / PDM / thé / aloe
   - besoins en eau
   - besoins en protéines
   - assiette perte de poids
   - assiette sport / prise de masse

3. **Closing & suivi**
   - choix programme
   - checklist de fin
   - statut démarré ou non
   - date du prochain suivi
   - historique client

---

## 6. Style visuel attendu

Le design doit être :

- premium
- moderne
- sombre
- sport / transformation / wellness
- très lisible sur tablette
- simple à comprendre pour les distributeurs
- sobre mais impactant

### Références de marque
- **Lor'Squad** = identité principale de l’application
- **La Base Shakes & Drinks** = univers club / nutrition / environnement
- **WDT** = challenge / transformation / parcours motivation

### Hiérarchie visuelle
1. Lor'Squad Wellness = marque principale de l’app
2. La Base Shakes & Drinks = univers nutrition / club
3. WDT = badge ou univers challenge

### Palette recommandée
- noir profond
- gris anthracite
- blanc
- bleu Lor'Squad
- rouge Lor'Squad
- vert nutrition / validation / hydratation

### Typographie recommandée
- Titres : **Bebas Neue** ou **Oswald**
- Textes interface : **Inter** ou **Montserrat**

---

## 7. Stack technique souhaitée

Créer une application web avec :

- **React**
- **Vite**
- **Tailwind CSS**
- architecture simple et propre
- composants réutilisables
- code lisible et maintenable

### Important
Pour la première version :
- utiliser des **fausses données de démonstration**
- ne pas brancher immédiatement une vraie base de données
- priorité à l’interface, au flow, à la structure et à l’expérience utilisateur

---

## 8. Écrans V1 à créer

### 1. Page de connexion
Contenu :
- logo Lor'Squad Wellness
- sous-titre "Bilan & Suivi personnalisé"
- email
- mot de passe
- bouton connexion

### 2. Dashboard
#### Version admin
- nombre total de clients
- bilans récents
- suivis à faire
- distributeurs actifs
- bouton nouveau bilan

#### Version distributeur
- mes clients
- mes bilans récents
- mes suivis à venir
- bouton nouveau bilan

### 3. Liste clients
- barre de recherche
- filtres
- cartes ou tableau client
- accès à la fiche client

### 4. Fiche client
Sections :
- identité
- statut
- dernier bilan
- programme en cours
- historique
- prochain suivi

### 5. Nouveau bilan multi-étapes

#### Étape 1 — Informations client
Champs :
- prénom
- nom
- téléphone
- email
- âge
- taille
- job
- ville (optionnel)
- distributeur responsable auto
- date auto

#### Étape 2 — Habitudes de vie
Champs :
- heures de sommeil
- siestes
- petit-déjeuner
- contenu du petit-déjeuner
- nombre de repas
- collations
- exemples repas midi / soir
- eau par jour
- fruits et légumes
- protéines
- activité physique
- allergies
- transit
- motivation de 0 à 10

#### Étape 3 — Body Scan / Balance
Champs :
- poids
- masse grasse
- masse musculaire
- hydratation
- masse osseuse
- graisse viscérale
- BMR
- âge métabolique

#### Étape 4 — Objectif principal
Choix :
- perte de poids
- prise de masse / sport

Puis :
- délai souhaité
  - 1 mois
  - 3 mois
  - 6 mois
  - 1 an

#### Étape 5A — Analyse besoins perte de poids
Afficher :
- besoin en eau
- besoin en protéines
- assiette perte de poids
- repères simples

#### Étape 6A — Routine matin perte de poids
Afficher :
- visuel aloe
- visuel thé
- Formula 1
- Protein Drink Mix
- intérêt collation / fibres

#### Étape 7A — Programmes perte de poids
Choix :
- Découverte
- Premium
- Booster 1
- Booster 2

#### Étape 5B — Analyse besoins sport / prise de masse
Afficher :
- besoin en eau
- besoin en protéines version sport
- assiette sport / masse
- repères glucides / récupération

#### Étape 6B — Routine matin sport
Afficher :
- Formula 1
- Protein Drink Mix
- collation protéinée
- hydratation
- récupération

#### Étape 7B — Programmes sport
Choix :
- Découverte
- Premium
- boosters sport

#### Étape finale — Suivi & checklist
Champs :
- client démarré oui/non
- paiement fait oui/non
- photo prise oui/non
- photo publiée oui/non
- groupe Telegram oui/non
- application installée oui/non
- prochain rendez-vous fixé oui/non
- date du prochain suivi
- commentaire final

#### Résumé final
Afficher :
- identité client
- objectif
- mesures
- besoins calculés
- programme choisi
- prochain suivi

Boutons :
- terminer
- voir fiche client
- nouveau bilan

---

## 9. Logique de bifurcation

Le parcours doit changer après le choix de l’objectif.

### Branche 1 — Perte de poids
Afficher :
- besoin en eau
- protéines en fourchette perte de poids
- assiette perte de poids
- routine matin adaptée
- programmes perte de poids

### Branche 2 — Prise de masse / sport
Afficher :
- besoin en eau
- protéines en fourchette sport
- assiette sport / prise de masse
- routine matin performance
- programmes sport

---

## 10. Règles de calcul à intégrer

### Eau
Calcul :
- besoin en eau = **poids / 30**
- affichage en litres par jour

### Protéines — Perte de poids
Calcul :
- **1,2 à 1,5 g par kg de poids de corps**

### Protéines — Sport / prise de masse
Calcul :
- **1,6 à 2,0 g par kg de poids de corps**

---

## 11. Structures de données à prévoir

### Utilisateurs
- id
- nom
- email
- rôle
- actif oui/non

### Clients
- id
- prénom
- nom
- téléphone
- email
- âge
- taille
- job
- ville
- distributeur responsable
- date de création
- statut démarré
- date démarrage
- programme en cours
- prochain suivi

### Bilans
- id
- clientId
- distributeurId
- date
- habitudes
- valeurs balance
- objectif
- délai
- besoins calculés
- routine recommandée
- programme proposé
- programme choisi
- montant
- checklist finale
- commentaire

### Suivis
- id
- clientId
- date
- type
- statut
- commentaire

---

## 12. Priorités de développement

### Priorité 1
Créer une interface solide :
- login
- dashboard
- liste clients
- fiche client
- structure du bilan multi-étapes

### Priorité 2
Créer les deux branches :
- perte de poids
- sport / prise de masse

### Priorité 3
Ajouter les contenus visuels :
- programmes
- visuels petit-déjeuner
- visuels pédagogiques

### Priorité 4
Préparer la future vraie base de données sans la brancher tout de suite

---

## 13. Contraintes importantes

- ne pas créer une usine à gaz
- code propre et simple
- design très fluide
- utilisation tablette prioritaire
- expérience claire pour un distributeur débutant
- structure évolutive pour une vraie base plus tard
- ne pas surcharger l’interface en texte
- privilégier des cartes, sections et écrans respirants

---

## 14. Résultat attendu V1

Une application web élégante et fluide permettant de :

- se connecter
- lancer un bilan
- guider le distributeur étape par étape
- bifurquer selon l’objectif
- présenter les visuels utiles
- choisir un programme
- enregistrer un bilan complet
- consulter une fiche client et un historique simple

La V1 doit déjà donner une impression **pro**, **sérieuse**, **premium** et **duplicable**.