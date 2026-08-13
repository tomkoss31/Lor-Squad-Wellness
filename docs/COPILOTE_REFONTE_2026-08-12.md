# Le Co-pilote refondu — 12/08/2026

> Un seul écran qui descend. Livré sur `dev/thomas-test`, recetté à 390 px sur
> le compte réel de Thomas, en thème sombre **et** clair.

---

## Ce que l'écran fait maintenant

### 1. Une seule personne — jamais deux

Le haut de l'écran ne montre **qu'une chose**. Laquelle est décidée par une
fonction pure (`ceQuiCompte`), dans cet ordre :

| Rang | Ce qui prend l'écran | Pourquoi il passe devant |
|---|---|---|
| 1 | **Un RDV qui approche** | C'est calé, quelqu'un se déplace, l'heure ne se négocie pas. Fenêtre 90 min, + 15 min de grâce *après* l'heure. |
| 2 | **Un client qui écrit** | Il attend maintenant. Aujourd'hui c'est un compteur dans l'inbox — invisible. |
| 3 | **Un paiement reçu** | Une victoire, et ça se périme : merci trois jours après, ça ne vaut rien. Fenêtre 12 h. |
| 4 | **La personne en tête de file** | Celle qui attend depuis le plus longtemps. |
| 5 | **Le démarrage** | Seulement quand plus personne n'attend — un humain vaut mieux qu'un tutoriel. |
| 6 | **Rien**, et on le dit | En lime. « C'est à jour. » |

Le test qui résume tout : **un RDV dans 20 minutes passe devant Matheo qui
attend depuis 44 jours.**

### 2. Ta journée · 3. Tes clients · 4. Ton équipe

Ce qui fait que c'est **un seul écran** et pas trois pages empilées : traiter en
zone 1 **coche en zone 3** et décrémente le compteur. Même donnée, deux hauteurs.

Pour un admin, une quatrième zone : les distris chez qui quelque chose est
coincé, chacun avec **un** outil déjà nommé. L'outil n'est pas dans une
bibliothèque à aller chercher — il est posé sur la personne.

### Le message se réécrit en un tap

Trois angles sous le message prêt, qui changent selon la situation :
*Franc / Un créneau / Léger* pour un suivi raté, *Technique / Nouveau lien /
Autrement* pour un paiement bloqué, *Comme promis / Court / Un créneau* pour un
inconnu. Le bouton principal envoie **exactement le ton affiché**.

---

## Ce que l'écran a révélé, et que le code cachait

**« Lui écrire » n'écrivait à personne.** L'angle choisi vivait dans le
composant enfant ; le bouton principal ne faisait que marquer traité, et c'était
une petite puce « Envoyer » qui ouvrait WhatsApp — puce qui retombait à la ligne
comme un quatrième ton. Corrigé : l'état est remonté d'un cran.

**Le paiement n'avait pas de téléphone** : « La remercier » aurait ouvert un
WhatsApp vide.

---

## Six pièges évités grâce à la reconnaissance

Cinq lectures parallèles du Co-pilote existant, avant d'écrire une ligne :

1. **`copilote-v5.css` vide le fond, la bordure et le padding** de tout
   `.copilote-v5 > div`, en `!important`, sous 1280 px. La racine du nouvel
   écran était un `<div>` — passée en `<section>`.
2. **`opsDone = steps.every(done)` ne se déclenche JAMAIS** : les étapes 6 et 7
   n'ont aucune porte. On lit `ops.activated` (décidé serveur).
3. **`useSalleOps` n'est pas remonté** : chaque instance refait un fetch non
   caché. La vue arrive en prop.
4. **`clientMessages` est un piège à trois détentes** : il contient les
   `coach_reply` (103 non lus en base), et pour un admin **toute l'équipe**.
   Triple filtre. Relâcher le premier ferait passer le compteur de 0 à 103.
5. **`amount_cents` est en centimes** ; les edges existantes perdent les
   centimes en `.toFixed(0)`. Pas recopié.
6. **La policy `bilan_orders` a une branche admin** → `.eq(coach_user_id)`
   explicite, sinon Thomas voit les encaissements de l'équipe comme les siens.

---

## Le coût

**Zéro requête nouvelle au démarrage.** Les paiements ont été glissés dans le
`Promise.all` déjà existant de `useFileDuJour` — un aller-retour, pas deux. On
ne re-remplit pas le seau vidé le matin même.

---

---

## La revue adverse, et ce qu'elle a rattrapé

Cinq relecteurs en parallèle, chacun sur un angle (logique · périmètre de
données · 390 px · thème clair · états limites). Chaque défaut allégué est
ensuite passé devant **deux sceptiques indépendants** chargés de le démolir —
il ne survit que si les deux échouent. Neuf ont survécu. Tous corrigés.

### Les deux bloquants

**L'agenda était tronqué à 3.** `useCopiloteData` fait `slice(0, 3)`. Avec cinq
rendez-vous (8 h, 9 h, 10 h, 14 h, 18 h), celui de 14 h n'existait déjà plus en
sortie du hook — la zone 1 se serait **tue à 13 h 50**, à dix minutes du
rendez-vous, alors que sa règle n°1 est « rien ne passe devant un RDV ». Et le
compteur annonçait « 3 rendez-vous » quand il y en avait 5. Le hook expose
désormais `todayAgendaAll`, non tronqué.

**Les leads publics étaient orphelins.** `submit-prospect-lead` n'écrit
**jamais** `assigned_to_user_id` — seulement `referrer_user_id`. Ma file ne
lisait que le premier : un lead venu d'un tunnel public serait invisible chez
son coach, et rangé « chez ton équipe · responsable : personne » chez l'admin.
Le CRM et le cron de relance résolvent tous deux par `assigned_to_user_id ??
referrer_user_id` — la file s'en écartait. Alignée.

### Les sept autres

| Défaut | Ce qu'on voyait |
|---|---|
| **« Ça fait 9999 jours »** | La RPC dormants renvoie `coalesce(days_since, 9999)`. Un client qui n'a jamais commandé affichait 9999. |
| **RDV prospect → « Client introuvable »** | Un prospect n'a pas de fiche client ; `clientId` est son id de prospect. Envoie vers l'agenda. |
| **« C'est à jour » pendant le chargement** | La file n'était pas revenue, donc vide, donc l'écran félicitait quelqu'un qui a cinq personnes en attente. Le pire mensonge que cet écran puisse dire. |
| **« Plus tard » inerte sur un RDV** | Le bouton ne faisait rien. Un bouton mort est pire qu'absent — remplacé par « L'agenda ». |
| **Initiales à 3,4:1** | Crème sur corail en thème clair. Pastilles désormais teintées : **15,6:1**. |
| **Encre des boutons teal** | `--ls-bg` au lieu de `--ls-teal-contrast` (le token théma-aware). |
| **« Après ça — 0 étapes »** | À la dernière étape du démarrage. |

---

## Ce qui reste à trancher — pour toi

~~**Le bloc « Ton démarrage · 6/7 » est toujours en haut de la page.**~~
✅ **Réglé le 13/08** — voir ci-dessous.

**Deux contrastes plafonnent sous le seuil, et la cause est dans la charte.**
Le libellé corail est à 3,95:1 et la puce de ton active à 3,74:1 — cette
dernière vient de `--ls-teal-contrast` (blanc sur teal foncé), le token
théma-aware du design system, utilisé partout ailleurs dans l'app. J'ai gagné
ce que je pouvais en utilisant les bons tokens ; aller plus loin, c'est
modifier la charte, et ça t'appartient.

**`PlanDuJour.tsx` n'est plus référencé** que dans des commentaires. Je l'ai
laissé en place : c'est le filet si tu veux revenir en arrière. À supprimer
quand tu auras validé.

---

## Le démarrage réduit à une barre (13/08)

Thomas : *« ça nous prend de la place surtout sur mobile iOS ? juste une barre
simple avec un déroulant si on clique dessus ? »*

**Mesuré avant : 187 px**, posés au-dessus de la zone 1 — près d'un quart d'un
écran d'iPhone consommé avant d'arriver à ce qui compte.

**Après : 44 px de barre, 57 px avec la jauge.** 130 px rendus à l'écran. La
jauge n'est plus un bloc : elle EST le liseré du bas de la barre, donc
l'avancement reste lisible d'un coup d'œil sans coûter une ligne. Un tap déroule
les deux vraies portes — *Mon parcours* et *Ma formation Herbalife*.

**Replié par défaut à chaque ouverture, volontairement.** On ne mémorise pas
l'état ouvert : un bloc qu'on rouvre chaque matin redeviendrait ce qu'il était,
un meuble permanent qu'on cesse de voir. Dix coachs sur onze étaient gelés à
l'étape 1 alors qu'il s'affichait tous les jours *en entier* — ce n'était pas la
taille le problème, c'était la permanence.

Retiré au passage : **`opsDone`**, le booléen qui pilotait la branche
« Démarrage terminé 🎉 ». Il ne se déclenchait **jamais** (`stepDone` exige
`gates.length > 0`, or les étapes 6 et 7 n'ont aucune porte) — du code mort
depuis le début.

---

*Vérifié : build vert, 278 tests, rendu mesuré à 390 px en sombre et en clair
sur le compte de Thomas — zone 1 sur son lead de 25 jours, file de 5 dans le bon
ordre, équipe de 4 avec leurs outils, 627 € · 17 actifs.*
