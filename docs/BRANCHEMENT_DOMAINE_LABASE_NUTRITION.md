# Brancher `labase-nutrition.com` sur le site du club

> Vitrine grand public du Breakfast Club. Le flyer papier imprime
> `www.labase-nutrition.com` et son QR code pointe sur `/reserver` : une fois
> distribué, ce lien ne peut plus changer.

## Le principe

`labase360.fr` = plateforme des coachs (connexion, agenda, CRM).
`labase-nutrition.com` = vitrine du club, **même application, même déploiement**.

La racine de l'app renvoie vers `/co-pilote`, donc un visiteur du flyer
tomberait sur l'écran de connexion coach. Une règle dans `vercel.json` fait donc
que, **sur ce domaine uniquement**, la racine mène au tunnel de réservation :

```json
{ "source": "/",
  "has": [{ "type": "host", "value": "^(?:www\\.)?labase-nutrition\\.com$" }],
  "destination": "/reserver",
  "permanent": false }
```

Trois choix à ne pas défaire :
- **redirection, pas réécriture** — une réécriture garderait l'URL à `/` et le
  routeur React repartirait vers `/co-pilote` ;
- **temporaire (307), jamais permanente** — la vraie page d'accueil du club
  remplacera cette règle ; un 301 resterait gravé dans les navigateurs ;
- **hôte ancré** — `commande.labase-nutrition.com` (Shake Bar, autre projet
  Vercel) et `labase360.fr` ne sont pas concernés.

## L'ordre, qui n'est pas négociable

Le DNS vient en **dernier**. Tant que la nouvelle version n'est pas en
production, l'adresse du flyer afficherait l'écran de connexion — et sans
erreur visible : la réécriture SPA renvoie un HTTP 200, donc rien n'alerte.
Le `?utm_source=flyer` serait détruit au passage.

1. **Recette** du tunnel sur la preview `dev/thomas-test`.
2. **Merger un seul train** `dev/thomas-test` → `claude/focused-pike` → `main`,
   contenant la page, le correctif CSS et `vercel.json`. Jamais `vercel.json`
   seul.
3. **Attendre un déploiement `target: production`** sur le projet
   `lor-squad-wellness`.
4. **Répéter sur le domaine existant** : ouvrir `https://www.labase360.fr/reserver`.
   La page de réservation doit s'afficher — même code, seul l'hôte changera.
5. **Vercel** → projet `lor-squad-wellness` → Settings → Domains → ajouter
   `www.labase-nutrition.com`. **Recopier la valeur affichée**, ne pas la saisir
   de mémoire.
6. **OVH** → zone DNS de `labase-nutrition.com` → remplacer l'enregistrement
   `www` (aujourd'hui un CNAME AWS CloudFront qui ne résout plus) par la valeur
   donnée par Vercel. TTL 60 le temps de la bascule, puis 3600.

**Ne toucher à rien d'autre** : `commande`, et les lignes liées aux e-mails
(`MX`, `SPF`, `DKIM` — `*._domainkey` —, `DMARC`).

## L'apex (sans `www`) — à traiter aussi

`labase-nutrition.com` tout court n'est **pas** du parking : c'est la fonction
« Redirection » d'OVH, active, qui renvoie en HTTP vers `www`. Mais **le port
443 ne répond pas** : tout lien `https://labase-nutrition.com` échoue durement,
sans page d'erreur. Or Instagram et WhatsApp préfixent `https://` tout seuls.

7. **OVH → Domaine → onglet Redirection** : supprimer la redirection.
   Supprimer seulement l'enregistrement `A` ne suffit pas — la fonction possède
   le couple `A` + `TXT` et les recrée.
8. **Vercel** : ajouter `labase-nutrition.com` au même projet, en choisissant la
   redirection vers `www.labase-nutrition.com`.
9. **OVH** : créer l'enregistrement `A` de l'apex avec l'IP affichée par Vercel.
   Le certificat HTTPS sera émis dans la foulée.

Reporter cette partie est tenable, mais alors ne jamais communiquer l'adresse
sans `www`.

## Vérifier après propagation

```bash
curl -I https://www.labase-nutrition.com/                          # 307 vers /reserver
curl -I "https://www.labase-nutrition.com/reserver?utm_source=flyer"  # 200, query intacte
curl -I https://labase-nutrition.com/                              # 308 vers www, pas un timeout
curl -I https://commande.labase-nutrition.com/                     # inchangé (Shake Bar)
curl -I https://www.labase360.fr/                                  # toujours l'app coach
```

Puis tester le QR **sur un téléphone qui n'a jamais ouvert l'app coach** :
c'est le seul test qui reproduit l'expérience d'une prospecte.
