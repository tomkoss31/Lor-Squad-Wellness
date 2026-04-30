# ❓ FAQ Lor'Squad — Questions fréquentes distri

**Pour Mel quand un distri lui pose une question, ou à partager direct à l'équipe**

---

## 🔑 Connexion & accès

### Q : J'ai oublié mon mot de passe
R : Sur la page de login, click "Mot de passe oublié" → email avec lien de reset. Si ça marche pas, demande à Thomas un reset manuel.

### Q : Je peux me connecter depuis mon téléphone ?
R : Oui, tout marche depuis le navigateur mobile. Pour une expérience optimale, **installe la PWA** (sur iPhone : Partager → "Sur l'écran d'accueil").

### Q : Pourquoi mes notifications n'arrivent pas ?
R : 3 causes possibles :
1. Tu n'as pas autorisé les notifs au navigateur (ré-autorise dans les réglages site)
2. Tu utilises Safari sans avoir installé la PWA (les notifs Web Push ne marchent QUE en PWA installée sur iOS)
3. Tu es en mode "Ne pas déranger" (vérifie tes réglages système)

---

## 📋 Bilan client

### Q : Je peux modifier un bilan déjà sauvegardé ?
R : Oui, va sur la fiche client → bouton "Modifier le bilan initial" en haut. Tu retombes sur le wizard avec toutes tes données pré-remplies.

### Q : Le client dit qu'il n'a pas reçu son QR
R : Sur la fiche client → bouton "🔗 Envoyer l'accès à l'app" → tu peux ré-envoyer par WhatsApp/SMS ou copier le lien.

### Q : J'ai mis un mauvais ID Herbalife (21XY au lieu de 21Y)
R : Les **2 formats sont valides** depuis avril 2026 :
- 21Y0103610 (distri classique)
- 21XY010361 (VIP / membership)

L'app accepte les 2. Si erreur "format invalide", vérifie pas de typo (ID en majuscules).

---

## 💰 PV & commandes

### Q : Pourquoi ma jauge PV est rouge ?
R : Tu es à moins de 40% de ton seuil mensuel. Va sur /pv et regarde le Plan PV pour voir 3 clients prioritaires à relancer.

### Q : Mon client a passé une commande, le PV est compté quand ?
R : Dès que tu enregistres la commande dans l'app (date livraison renseignée). Avant la livraison, c'est en "à venir".

### Q : Comment changer mon objectif PV mensuel ?
R : Paramètres → Profil → "Objectif PV mensuel" → entre ton chiffre (ex: 4000 pour Supervisor). La jauge s'adapte.

### Q : Le kanban n'affiche pas mon client
R : 1) Vérifie qu'il a un **programme actif** (statut "active" sur sa fiche). 2) Il doit avoir au moins **1 commande** enregistrée. Si tu as toi-même bougé sa carte dans une autre colonne (override), elle reste là jusqu'à ce que tu retires le verrou 🔒.

---

## 👥 Clients

### Q : Je veux supprimer un client (RGPD)
R : Sur la fiche client → onglet **Actions** → "Supprimer ce dossier". ⚠️ Action irréversible. Pour soft-archive, préfère passer en lifecycle "Arrêté" ou "Perdu" (le client reste en base mais sort des digests).

### Q : Comment transférer un client à un autre coach ?
R : Fiche client → onglet **Actions** → "Transférer ce client" → choisis le distri destinataire. Le client passera dans son portfolio.

### Q : Mon client veut faire pause 1 mois
R : Fiche client → bouton lifecycle en haut → "En pause". Il reste dans ta base, sort des digests automatiques, mais tu peux le réactiver d'1 clic plus tard.

### Q : Que voient les autres distri sur mes clients ?
R : **Rien**. Chaque distri voit uniquement ses propres clients. Les admins (Thomas, Mel) voient tout le club.

---

## 🎓 Academy

### Q : Je peux passer une section ?
R : Oui, dans le tutoriel chaque step a un bouton "Passer". Mais tu n'auras pas le **certificat final** si tu en passes une.

### Q : J'ai relancé une section, j'ai perdu mes points ?
R : Non. Le système prend le **max de progression** atteinte. Tu peux revoir n'importe quelle section sans pénalité.

### Q : Combien de temps pour finir l'Academy ?
R : ~35 min cumulé sur les 8 sections (2-6 min par section). Tu peux la faire en 1 fois ou étalée sur plusieurs jours, ta progression est sauvegardée.

---

## 🔥 Streak & XP

### Q : Mon streak est tombé à 1, j'avais 12 jours
R : Ton streak reset si tu sautes un jour complet (>36h sans connexion). Pas de rattrapage possible — c'est ce qui fait la valeur du streak.

### Q : Comment gagner plus d'XP rapidement ?
R : 5 sources d'XP :
- 🎓 Academy (50/section)
- 📋 Bilan créé (10)
- 📅 RDV planifié (5)
- 💬 Message envoyé à un client (2)
- 🔥 Connexion quotidienne (5/jour)

L'option la plus rentable : **finir l'Academy** (+400 XP d'un coup).

### Q : C'est quoi "lifetime cumulé X jours" ?
R : Le nombre total de jours où tu as ouvert l'app. Différent du streak (jours consécutifs). Le lifetime ne se reset jamais.

---

## 💬 Messagerie

### Q : Le client peut me répondre ?
R : Oui, l'onglet "Coach" sur son app PWA est une vraie messagerie bidirectionnelle. Vous pouvez aussi envoyer des photos.

### Q : Comment envoyer un message à plusieurs clients d'un coup ?
R : /clients → sélectionne plusieurs clients (cases) → bouton "💬 Message groupé" en haut → tu rédiges 1 fois, ça envoie à tous. WhatsApp ouvre une fenêtre par client.

### Q : Templates de message ?
R : Sur fiche client → bouton "💬 Templates" → 5 templates contextuels (relance douce, anniversaire, recommandé non pris, etc). Modifiable avant envoi.

---

## 📱 PWA & technique

### Q : L'app est lente / freeze
R : 1) Hard refresh (Ctrl+Shift+R sur PC). 2) Si PWA, ferme complètement (swipe up sur mobile, fermer onglet sur PC). 3) Vide le cache navigateur si ça persiste.

### Q : Mes données sont synchronisées entre PC et téléphone ?
R : Oui, tout est en temps réel via Supabase. Si tu fais un bilan sur ton PC, il apparaît sur ton mobile en 2 secondes.

### Q : Mode hors ligne ?
R : Lecture des fiches clients déjà chargées : oui. Création de nouveau bilan / envoi de message : non (besoin connexion). Les données se sync dès retour réseau.

---

**Pas trouvé ta réponse ?** Demande à Thomas direct, ou pose la question sur le Telegram Challengers.
