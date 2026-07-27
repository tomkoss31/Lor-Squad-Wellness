// =============================================================================
// bbcFormation — contenu des modules Formation BBC (00→08).
// Source : hub Notion « LIVE — Breakfast Budget Clubs » (Playbook officiel +
// Formations 00→08). Résumé « comme à un pote » pour les coachs qui apprennent.
// ⚠️ Horaires d'appels NON tranchés (20h/20h30) → décision orga, jamais figés.
// =============================================================================

export interface BbcFormationModule {
  n: string;
  title: string;
  subtitle: string;
  summary: string;
  points: string[];
}

export const BBC_FORMATION_MODULES: BbcFormationModule[] = [
  {
    n: "00",
    title: "La machine à royalties",
    subtitle: "le modèle, en une image",
    summary:
      "Le BBC, c'est un club de petit-déjeuner ouvert 7h-11h qui devient une machine à royalties — pas un bar de vente. Ce qui fait la différence : l'Appel Ambassadeur et l'Atelier Cœurs.",
    points: [
      "5 sources de revenus : vente détail · vente en gros · royalties · bonus mensuel · bonus annuel (Mark Hughes).",
      "Club 100 = 100 membres actifs · 3 superviseurs actifs (Junior Partners) · 9 stagiaires · ~13 superviseurs ≈ 20 000 PV d'organisation.",
      "L'échelle : 1 club ≈ 13 sup ≈ 20 000 PV → ta cible 50 000 PV = 2 à 3 clubs, pas 30 distributeurs éparpillés.",
      "Plan de carrière 5 marches : Membre → Coach stagiaire → Junior Partner → Propriétaire → Roll Out (~2 ans).",
      "Norme club : démarrage 2 500–3 000 € · 40–90 m² · 500–1 000 €/mois · 100 membres · 40 % viennent chaque jour.",
    ],
  },
  {
    n: "01",
    title: "L'invitation",
    subtitle: "pas d'invitation = pas de business",
    summary:
      "Ton identité : « je suis coach bien-être ». Ce à quoi tu invites : « une évaluation bien-être gratuite ». Reste simple, ne surcharge personne.",
    points: [
      "Ratios : temps complet = 1h/jour = 20 contacts · temps choisi = 30 min = 10 contacts.",
      "La math : 3 nouveaux clients/sem = World Team Actif · 5/sem = GET.",
      "Marché chaud : le message cobaye (la meilleure porte), les recommandations, la soirée dégustation, les réseaux.",
      "Marché froid : stands, boîtes à contact, badge, « 2 questions » en magasin.",
      "Mindset 90 jours : ce que tu fais maintenant apparaît dans 90 jours. Juillet/août/sept → résultats oct/nov/déc.",
    ],
  },
  {
    n: "02",
    title: "L'évaluation bien-être (EBE)",
    subtitle: "la porte d'entrée · 100 % des membres passent par là",
    summary:
      "45 min (+ 15 de marge). La connexion est la partie la plus importante. Intention : s'ils viennent, ils s'inscrivent.",
    points: [
      "3 parties : formulaire + connexion · chiffres Tanita (rester simple) · les 11 étapes.",
      "La question qui qualifie : « sur une échelle de 1 à 10, prêt(e) à changer ? » → 8 ou plus = on démarre tout de suite.",
      "Inclus dans l'adhésion : pesée quotidienne · petit-déj (aloé, thé, shake) · mini-coaching sur le journal.",
      "Demander les recos : « tu peux nommer jusqu'à 5 personnes pour une EBE gratuite. Qui aimerais-tu nommer ? »",
      "Période de lancement : 4-5 visites/sem les 2 premières semaines. « On n'est pas un club hebdomadaire. »",
    ],
  },
  {
    n: "03",
    title: "Le suivi et les résultats",
    subtitle: "ce qui fait rester les membres",
    summary:
      "Chaque visite = pesée + petit-déj + mini-coaching sur le journal nutritionnel. C'est la régularité qui crée les résultats… et les histoires.",
    points: [
      "Le journal nutritionnel (4 valeurs) = le cœur du suivi quotidien.",
      "Objectifs + victoires hors balance : énergie, sommeil, vêtements — pas que le poids.",
      "Ardoise + tableau des scores : rendre la progression visible au club.",
      "Partage réseaux (avant/après, ressenti) → ça ramène de nouveaux bilans.",
    ],
  },
  {
    n: "04",
    title: "Le bilan des 10 visites",
    subtitle: "le rendez-vous charnière",
    summary:
      "À la 10ᵉ visite, LE rendez-vous qui transforme un client en partenaire. 9 étapes, dans l'ordre.",
    points: [
      "La checklist : scan · objectifs + victoires hors balance · grand pot · renouvellement de carte · inscription à l'Appel Ambassadeur · ardoise + vidéo · partage réseaux · avis Google · recommandations.",
      "À la fin : on inscrit à l'Appel Ambassadeur + on pose les 3 rappels.",
      "Script d'invitation : « dans le cadre de tes prochaines étapes, je t'inscris à notre Appel Ambassadeur. Pas besoin de micro, tu écoutes. »",
      "Pas de panique s'il ne vient pas la 1ʳᵉ fois : on le remet dans la boucle au prochain entretien.",
    ],
  },
  {
    n: "05",
    title: "L'appel ambassadeur",
    subtitle: "ce qui décide si ton club est un bar ou une fabrique de royalties",
    summary:
      "On présente 4 options, on laisse écouter, et on trie dans les 10 minutes qui suivent.",
    points: [
      "Les 4 options : A juste client · B remise + 2-3 recos → Quick Start · C petit revenu → Quick Start + 1:1 · D vrai projet → parcours coach stagiaire.",
      "La règle de la patate chaude : 10 min après l'appel, tu écris à la personne (+ le visuel A/B/C/D) tant qu'elle est dans l'énergie.",
      "Règle ambassadeur : il commande pour lui et sa famille — PERSONNE D'AUTRE.",
      "Cadence : lundi + jeudi (l'horaire se règle par club — décision orga, pas figé dans l'app).",
    ],
  },
  {
    n: "06",
    title: "L'atelier cœurs",
    subtitle: "aider un membre à trouver ses 2 cœurs",
    summary:
      "Le moteur des recommandations. Avec l'Appel Ambassadeur, c'est ce qui fabrique les coachs.",
    points: [
      "La formule : relation + résultat = recommandation. S'il manque l'un des deux, il n'y a pas de cœur.",
      "On demande à chaque étape, jamais « ça t'intéresse ? » mais « qui connais-tu ? ».",
      "Le barème : 2 cœurs = 25 % de remise · 3 = 10 visites offertes (+ débloque coach stagiaire) · 5 = 30 visites.",
      "Cadence : mardi + samedi.",
    ],
  },
  {
    n: "07",
    title: "Les 6 semaines de pré-lancement",
    subtitle: "le plan avant d'ouvrir ton club · non négociable",
    summary:
      "Objectif final : ouvrir avec 30 nouveaux membres et un agenda rempli d'évaluations.",
    points: [
      "Sem 1 : partager le plan à l'équipe · rayon 15 km · liste de 200 noms (COI) · 10h d'invitation/sem.",
      "Sem 2 : contacter les clients existants · shake party · business to business.",
      "Sem 3 : tracts · porte-à-porte · teasing réseaux · préparation du club.",
      "Sem 4 : 200 messages cobayes en équipe · réserver 20 EBE d'entraînement par stagiaire · page Facebook.",
      "Sem 5-6 : club ouvert pour les EBE · 3 sample parties · 1h/jour d'invitation en continu.",
    ],
  },
  {
    n: "08",
    title: "Check-lists par rôles",
    subtitle: "qui fait quoi quand l'équipe grandit",
    summary:
      "Le rôle de chacun, du membre au propriétaire. Et la règle qui protège tout le modèle.",
    points: [
      "Le HOM disparaît du modèle BBC → remplacé par l'Appel Ambassadeur + l'Atelier Cœurs.",
      "Membre → Coach stagiaire (3 cœurs actifs) → Junior Partner (entretien 1h30, engagement 3-9 mois, viser 10 en 1ʳᵉ ligne) → Propriétaire (après 6 sem de pré-lancement) → Roll Out.",
      "La règle qui gouverne tout : on ne modifie rien — mêmes prix, horaires, scripts, formulaires. Chaque « amélioration » perso casse la duplication.",
      "Top tip : protéger la lignée (qui a amené la personne au club) et communiquer entre coachs proches.",
    ],
  },
];

export function getFormationModule(n: string): BbcFormationModule | undefined {
  return BBC_FORMATION_MODULES.find((m) => m.n === n);
}
