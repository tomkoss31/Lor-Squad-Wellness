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
