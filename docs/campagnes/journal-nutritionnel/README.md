# Journal nutritionnel — les images du mail de lancement

Captures de la maquette v7 validée par Thomas le 21/09/2026 (maquette :
https://claude.ai/artifact/6yR2eSaMs5BNZ1uRwfT7kf). Taille 2× (écrans Retina),
fond transparent. **Camille est une cliente fictive** — aucune donnée réelle.

- `bbc-*.png` : l'espace membre du club (orange) → le mail aux **membres BBC**.
- `std-*.png` : l'espace client standard (teal) → le mail aux **clients en suivi**.

| Image | Ce qu'elle montre |
|---|---|
| `journee` | la journée : l'anneau des protéines, les verres d'eau (la boisson du club déjà comptée en BBC), les défis du jour et l'XP |
| `repas` | une ligne par repas, « hier : … » pour reprendre la veille, sport et humeur en un bouton |
| `ajout` | ajouter un aliment : « Pareil qu'hier » en premier, puis Herbalife d'abord, puis le reste |
| `noaly` | écrire son repas en mots (« 150 g poulet, carottes, pâtes ») : Noaly calcule les protéines |
| `conseils` | « Mes conseils du jour » : ce qu'il manque et une journée simple pour y arriver, l'eau, l'assiette idéale |
| `niveau` | les 4 défis remplis : passage au niveau 🥇, la coach est prévenue |

## À quoi elles servent

Thomas, 21/09 : un **mail de campagne à tous les clients** (membres du club ET clients
en suivi) pour expliquer le journal et Noaly — **puis le même mail aux nouveaux clients**
(à brancher sur l'arrivée d'un client, pas seulement une campagne ponctuelle).

- Le mail part **au lancement**, quand le journal est en production — pas avant.
- **Refaire les captures depuis la vraie app** si l'écran codé a bougé par rapport à la maquette.
- Campagne : Paramètres → Admin → Campagnes, type `html` (identité libre, `{prénom}`,
  `{lien_desabonnement}`). Les images doivent être **hébergées** (Supabase Storage, comme la
  newsletter) avant l'envoi : un mail ne peut pas embarquer un fichier du dépôt.
- Deux versions : une aux couleurs du club pour les membres BBC, une La Base 360 pour les autres.

## Le mail aux membres du club — `mail-membres-bbc.html` (22/09/2026)

Fait : **« Votre journal, en quelques gestes »**, identité du Breakfast Club. Les visuels ne
sont PAS les PNG ci-dessus : ce sont quatre mini-écrans en **tableaux HTML** (la journée,
« Tes habituels », Noaly, « Ta semaine »), donc rien à héberger, et ils s'affichent même
quand les images sont bloquées. Seul le logo est une image (déjà en ligne sur le site du club).

- En base : deux **brouillons** dans /admin/campagnes, `body_html` = ce fichier à l'octet près
  (même md5) — « TEST — Journal nutritionnel (Thomas seul) » et « Journal nutritionnel —
  membres du club » (les membres `ebe_bbc` avec une adresse valide, sans les fiches de coach).
- Le texte parle de « votre coach, **qui** vous envoie votre lien » : pas de « elle », des
  membres sont suivies par Thomas.
- Reste : la version La Base 360 pour les clients en suivi, et l'envoi aux nouveaux clients.

## La version La Base 360 — `mail-membres-labase360.html` (24/09/2026)

Faite depuis le mail du club, aux couleurs La Base 360 (teal, Noaly en teal comme dans l'espace standard,
en-tête texte « La Base 360 » au lieu du logo du club). « Ce qui est déjà fait » : le shake du club est
remplacé par « les produits Herbalife proposés en premier ». Signé « L'équipe La Base 360 ».

**Encart « Du nouveau depuis le lancement »**, ajouté aux DEUX versions : les produits retrouvés par leur
petit nom (Formula 3, Beta Heart, aloe, thé, multi-fibres), le « +1 » sur un produit déjà noté, et les XP
qui deviennent des cadeaux au Shake Bar (lien vers la roue `/jeu`). La version club n'est pas renvoyée
à celles qui l'ont déjà reçue : elle sert aux nouvelles membres.

Destinataires La Base 360 : clientes en coaching (non club) actives ou pas encore démarrées, avec un
espace, une adresse valide, sans les fiches des coachs, et n'ayant jamais reçu le mail du journal.
Brouillons dans /admin/campagnes : « TEST — Journal · La Base 360 (Thomas seul) » et « Journal
nutritionnel — clientes La Base 360 ».
