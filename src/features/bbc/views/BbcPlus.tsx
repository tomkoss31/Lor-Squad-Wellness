// =============================================================================
// « Plus » — tout ce qui ne change pas, rangé ici (18/09/2026).
// Les vues existantes du BBC, telles quelles ; l'apparence ; l'app complète.
// =============================================================================

import { Carte, Ligne, Rond, Vide } from "../ui";

export type VuePlus = "club" | "appels" | "boites" | "coeurs" | "messages" | "scripts" | "formation" | "lexique" | "prelancement" | "club100" | "clubs" | "reglages";

interface Props {
  onGo: (v: VuePlus) => void;
  onLiens: () => void;
  onEval: () => void;
  onClassic?: () => void;
  clair: boolean;
  onClair: () => void;
}

const ENTREES: { v: VuePlus; icone: string; titre: string; sous: string }[] = [
  { v: "club", icone: "📷", titre: "Les visites", sous: "pointage, scanner un QR, cartes, bilan des 10" },
  { v: "messages", icone: "✉️", titre: "Messages", sous: "les membres qui t'écrivent" },
  { v: "appels", icone: "📞", titre: "Les appels", sous: "Ambassadeur · Cœurs · Académie : inscrire, pointer" },
  { v: "coeurs", icone: "❤️", titre: "Les cœurs", sous: "paliers, recommandations à valider, le mur" },
  { v: "boites", icone: "📦", titre: "Les boîtes", sous: "coupons des commerçants" },
  { v: "scripts", icone: "💬", titre: "Scripts", sous: "tout ce que tu envoies" },
  { v: "formation", icone: "📚", titre: "Formation BBC", sous: "l'échelle des 5 marches, 10 modules" },
  { v: "lexique", icone: "📖", titre: "Lexique", sous: "les mots du club" },
  { v: "prelancement", icone: "🚀", titre: "Pré-lancement", sous: "les 6 semaines avant l'ouverture" },
  { v: "club100", icone: "💶", titre: "Rentabilité", sous: "le modèle Club 100, tes chiffres" },
  { v: "clubs", icone: "🏠", titre: "Mes clubs", sous: "le réseau" },
  { v: "reglages", icone: "⚙️", titre: "Réglages du club", sous: "horaires des rituels, liens, équipe" },
];

export function BbcPlus({ onGo, onLiens, onEval, onClassic, clair, onClair }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
      <Carte eye="Au comptoir">
        <Ligne avant={<Rond tone="neutre">📝</Rond>} titre="Nouvelle évaluation" sous="la fiche papier, dans l'ordre où tu la remplis" action="›" onClick={onEval} />
        <Ligne avant={<Rond tone="neutre">🔗</Rond>} titre="Mes liens" sous="bilan en ligne · réserver · ta fiche — 1 tap = message + lien" action="›" onClick={onLiens} />
      </Carte>
      <Carte eye="Le club">
        {ENTREES.map((e) => (
          <Ligne key={e.v} avant={<Rond tone="neutre">{e.icone}</Rond>} titre={e.titre} sous={e.sous} action="›" onClick={() => onGo(e.v)} />
        ))}
      </Carte>
      <Carte eye="L'app">
        <Ligne avant={<Rond tone="neutre">{clair ? "☀️" : "🌙"}</Rond>} titre="Apparence" sous={clair ? "clair — pour le comptoir du matin" : "sombre — le réglage d'origine"} action={clair ? "clair" : "sombre"} onClick={onClair} />
        {onClassic ? (
          <Ligne avant={<Rond tone="neutre">🖥️</Rond>} titre="L'app complète" sous="bilan complet, fiches clients, programmes, PV, CRM" action="Ouvrir" onClick={onClassic} />
        ) : null}
      </Carte>
      <Vide>Tout ce qui est ici existe déjà et reste tel quel. La barre du bas garde le quotidien : le matin, l'agenda, contacter, les membres.</Vide>
    </div>
  );
}
