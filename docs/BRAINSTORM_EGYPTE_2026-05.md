# Brainstorm Égypte — Mai 2026

> **Auteur** : Thomas (notes prises au bord de la piscine, Égypte)
> **Mode** : capture mobile → structuration progressive → exécution PC au retour
> **Branche** : `claude/fix-mobile-chat-history-d1jFW` (réutilisée pour les docs, pas de code dans ce fichier)
> **Référentiel** : `docs/ARCHITECTURE_SNAPSHOT_2026-05.md` (pour situer chaque idée)

---

## Comment ce fichier est tenu

Pour chaque idée Thomas balance brut, l'agent structure :

```
### [Titre court de l'idée]
- **Domaine** : Co-pilote / FLEX / Clients / Bilan / Messagerie / PV / Admin / App client / IA / Infra / UX
- **Description** : 2-4 phrases nettoyées, fidèles à l'intention
- **Pourquoi** : impact / valeur métier / pain résolu
- **Où ça se branche** : routes / composants / tables existantes
- **Effort estimé** : XS (<1h) / S (1-3h) / M (3-8h) / L (1-2j) / XL (2j+)
- **Dépendances / risques** : conflits avec chantiers en cours, externalités
- **Statut** : 🌱 brut / 🌿 mûr / 🌳 prêt à coder
- **Questions ouvertes** : (si l'idée est ambiguë, listées ici)
```

Conventions :
- Aucune idée n'est rejetée d'office. Si elle paraît incohérente, l'agent pose la question dans la section dédiée plutôt que de la trancher tout seul.
- Doublons avec l'existant signalés explicitement (référence à la snapshot architecture).
- Chaque commit du fichier porte un message du type `docs(brainstorm): +N idées (domaine X)` pour suivi.

---

## Sommaire des idées

*(rempli au fur et à mesure)*

| # | Domaine | Titre | Effort | Statut |
|---|---|---|---|---|
| — | — | *(en attente du premier dump)* | — | — |

---

## Idées par domaine

### 🛰 Co-pilote (dashboard quotidien)

*(vide pour l'instant)*

### 🎯 FLEX (moteur 5-3-1)

*(vide)*

### 👥 Clients (liste, fiche, lifecycle)

*(vide)*

### 📋 Bilan (NewAssessment, follow-up)

*(vide)*

### 💬 Messagerie

*(vide)*

### 💰 PV / Rentabilité / Square

*(vide)*

### 🛠 Admin (analytics, users, team)

*(vide)*

### 📱 App client PWA

*(vide)*

### 🤖 IA / Lor'Squad AI

*(vide)*

### 🎓 Formation / Academy / Hub développement

*(vide)*

### 🏗 Infra / Workflow / Dev experience

*(vide)*

### ✨ UX / Design / Theming

*(vide)*

---

## Décisions prises pendant le brainstorm

*(les choix tranchés par Thomas en cours de discussion sont consignés ici, datés)*

---

## Questions en suspens

*(idées qui demandent une réponse Thomas avant d'être consolidées)*

---

## Au retour PC — checklist d'exécution

Une fois rentré, ouvrir ce fichier sur PC et :

1. ☐ `git pull origin claude/fix-mobile-chat-history-d1jFW`
2. ☐ Relire la snapshot architecture pour rafraîchir le contexte
3. ☐ Trier les idées 🌳 (prêtes à coder) par ROI / effort
4. ☐ Pour chaque chantier retenu : créer une branche `feat/X` depuis `dev/thomas-test`
5. ☐ Mettre à jour CLAUDE.md (section roadmap) avec les chantiers actés
6. ☐ Archiver ce fichier en `docs/archive/BRAINSTORM_EGYPTE_2026-05.md` une fois traité

---

*Fichier vivant. Dernière maj : 2026-05-09 (création).*
