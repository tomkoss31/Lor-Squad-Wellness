# Invitation au Shake Bar par la roue — les mails (24/09/2026)

Maquette validée par Thomas (artifact 6ehdsG5tjjnQkao4pTMERr : « 1 OK, 3 oui », mail identique pour toutes,
signature non nominative). Pour les clientes qui gagnent des XP mais n'ont **pas de compte au Shake Bar** :
leurs XP coaching (× 5, jusqu'à 750 par mois) ne peuvent pas y être versés. Le mail les envoie sur la roue
`https://commande.labase-nutrition.com/jeu`, où le compte se crée après le tirage.

- `mail-coaching.html` — clientes en coaching, identité **La Base 360** (teal), signé « L'équipe La Base 360 ».
- `mail-club.html` — membres du club, identité **Breakfast Club** (crème/orange, logo du club), signé
  « Votre équipe du Breakfast Club ».
- Dans les deux, l'encart du bar reprend le style de `/jeu` (fond `#04100F`, ambre `#F59E0B`, logo du bar).
- **Au vous** : mail envoyé aux clientes (règle de l'équipe, Mélanie 02/09). L'app, elle, reste au tu.
- Le message clé : **utiliser l'adresse où l'on reçoit ce mail** — c'est ce qui relie les points.
- Les XP gagnés sans compte sont **gardés deux mois** (`xp_versements_bar`, statut `sans_compte`, migration
  `20261215810000`), puis versés dès que le compte existe.

Destinataires : le mode `rapprocher` de l'edge `xp-vers-le-bar` (clientes à XP sans compte au bar), actives
ou pas encore démarrées, avec une adresse valide — sans les cas douteux (compte au bar à un autre e-mail).
En base : des **brouillons** dans /admin/campagnes, `body_html` = ces fichiers à l'octet près (md5 vérifié).
