# Audit du tunnel de paiement — 12/08/2026

> Parti d'une phrase jetée en passant (« zéro paiement encaissé »), ce document
> répond à trois questions de Thomas : **comment le prospect obtient le lien**,
> **qui est prévenu à chaque étape**, et **pourquoi aucune commande n'est
> marquée payée**.

---

## 1. Le constat brut

**10 liens de paiement générés. Zéro `paid`. Zéro `paid_at`.**
Total en jeu : **1 791,10 €**.

| Date | Qui | Programme | Montant | Coach |
|---|---|---|---|---|
| 10/08 | thomas *(test)* | Carte 10 visites BBC | 80,00 € | Thomas |
| 07/08 | **Djamal** | Programme Premium | 234,00 € | Thomas |
| 07/08 | **Djamal** *(3 min plus tôt)* | Programme Premium | 234,00 € | Thomas |
| 07/08 | *(sans nom)* | Programme Découverte | 159,00 € | Thomas |
| 07/08 | Manon | F1 + Aloe + Thé | 135,15 € | Thomas |
| 28/07 | *(sans nom)* | F1 + Protéine + Aloe | 125,45 € | Thomas |
| 19/07 | **Jeremy** | Programme Premium | 234,00 € | Thomas |
| 17/07 | **Laurence** | Programme Premium | 324,00 € | Mélanie |
| 16/07 | *(sans nom)* | Barres protéinées | 31,50 € | Thomas |
| 16/07 | **Jeremy** *(3 j plus tôt)* | Programme Premium | 234,00 € | Thomas |

---

## 2. Ce n'est PAS « personne n'a payé »

**Laurence MORAUX est devenue cliente de Mélanie le 17/07 — le jour même où son
lien de 324 € a été créé — avec 5 produits et le statut `active`.**

Jeremy Maria est client de Thomas depuis le 25/07, actif, 1 produit. Son bilan
en ligne est marqué `qualified` et `converti`.

Des gens ont donc payé. **L'application ne l'a simplement jamais su.**

### Ce qui est vérifié, et ce qui ne l'est pas

Vérifié en base :

- La config Square est **complète** pour Thomas et Mélanie : `square_merchant_id`,
  `square_access_token` **et** `square_webhook_signature_key` sont renseignés.
- Les 10 commandes portent un `provider_order_id` Square **valide** —
  c'est précisément la clé que le webhook utilise pour retrouver la commande
  (`.eq("provider_order_id", payment.order_id)`).
- `square-payment-webhook` est **déployé et ACTIVE** (version 10).

Donc la chaîne est correcte de bout en bout **côté application**.

⚠️ **Ce que je ne peux pas voir d'ici** : le tableau de bord Square. Il reste
deux explications possibles, et une seule tient sûrement debout :

1. **La souscription webhook n'existe pas (ou pointe ailleurs) côté Square.**
   Square n'a jamais appelé la fonction, donc rien n'a jamais été marqué payé.
   *C'est l'explication la plus probable, vu que Laurence a payé.*
2. Tout le monde a réglé au comptoir et les 10 liens sont morts sans être
   utilisés. *Peu crédible pour Laurence, dont la fiche naît le jour du lien.*

**Le test qui tranche en 10 secondes** : ouvrir le tableau de bord Square →
*Developer → Webhooks → Subscriptions*, et regarder si une souscription
`payment.updated` pointe bien vers
`https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/square-payment-webhook`.

> Indice qui va dans le même sens : une fonction `stripe-manual-reconcile`
> a été créée le 25/07. On a déjà eu besoin de réconcilier des paiements à la
> main.

---

## 3. Comment Djamal a eu le lien

Il n'y a **aucun envoi automatique**. La chaîne est celle-ci :

```
1. Le prospect remplit le bilan en ligne          → submit-online-bilan
   ├─ email au prospect  « ton bilan est arrivé »
   ├─ email à l'équipe
   └─ push au coach      « 🌱 Nouveau lead bilan online »

2. LE COACH COPIE LE LIEN À LA MAIN depuis le CRM
   (CrmLeadDetailPage:679 · CrmPage:1037 — un simple presse-papier)
   puis l'envoie par WhatsApp.
   ⚠️ Aucune trace : l'app ne sait pas si le lien a été envoyé, ni quand.

3. Le prospect ouvre /resultat-bilan/<token>      → get-online-bilan-results
   Il voit son bilan, son programme et SON PRIX.

4. Il clique « Je démarre »                       → create-payment-link
   ├─ crée le lien Square/Stripe
   ├─ insère bilan_orders (status = pending)
   └─ 🔴 PRÉVIENT PERSONNE

5. Il paie                                        → square-payment-webhook
   ├─ passe la commande en paid
   ├─ push au coach « 💶 X a payé son pack »
   └─ 🔴 mais n'a jamais tourné (cf. §2)
```

Djamal a donc reçu son lien parce que **quelqu'un le lui a envoyé à la main**.
Les deux liens à 3 minutes d'écart = il a cliqué deux fois sur « Je démarre »
(ou est revenu sur la page), et l'app a créé une deuxième commande sans
sourciller. **Rien n'empêche les doublons.**

---

## 4. Qui prévient qui — comparé aux réservations du club

| Moment | Push coach | Email |
|---|---|---|
| Le prospect remplit son bilan en ligne | ✅ | ✅ prospect + équipe |
| Il demande « rappelez-moi » (`request-callback`) | ✅ | ❌ |
| **Il clique « Je démarre » → un lien naît** | 🔴 **rien** | 🔴 **rien** |
| **Le coach fabrique un lien à la main** | 🔴 **rien** | 🔴 **rien** |
| Il paie (Square) | ✅ | ✅ | *(mais jamais déclenché)* |
| Il paie (Stripe) | ✅ | ❌ |
| — | | |
| Réservation club (`book-club-discovery`) | ✅ | ✅ |
| Prise de RDV (`book-rdv`) | ✅ | ✅ |

**Le trou est exactement là où tu le pressentais.** Les réservations du club
préviennent tout le monde ; le paiement, lui, est muet entre le moment où
quelqu'un sort sa carte et le moment où il a payé. Et personne ne dit jamais
« ce lien n'a jamais été réglé ».

---

## 5. Ce qu'il faut faire, dans l'ordre

**A. Vérifier la souscription webhook côté Square** *(Thomas, 10 secondes)*
Rien d'autre ne sert tant que ce point n'est pas tranché.

**B. Rattraper les 10 commandes en attente**
Une fonction `square-manual-reconcile` sur le modèle de
`stripe-manual-reconcile` : on interroge Square avec le `provider_order_id`
déjà stocké et on remet les statuts d'aplomb. Sans ça, la rentabilité et les PV
de juillet-août sont faux.

**C. Prévenir quand un lien naît**
Push au coach : « Djamal vient d'ouvrir le paiement · 234 € ». C'est le signal
le plus chaud de toute l'app — quelqu'un a sorti sa carte.

**D. Relancer quand un lien n'est pas réglé**
Un cron : lien créé il y a plus de 24 h, toujours `pending` → il entre dans la
file du Co-pilote (déjà maquetté). Un paiement qui échoue à 234 € vaut plus
qu'un dormant à 111 jours.

**E. Empêcher les doublons**
Un lien `pending` de moins d'une heure pour le même bilan et le même montant →
on renvoie le lien existant au lieu d'en créer un second.

**F. Un email au prospect avec son lien**
Aujourd'hui tout repose sur un copier-coller WhatsApp du coach. Les
réservations du club, elles, envoient un mail. Même standard.

---

*Établi le 12/08/2026 en lisant la base de production et le code des edge
functions. Les montants et les noms sont réels.*
