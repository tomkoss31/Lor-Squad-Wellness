// =============================================================================
// QualifierRdvSheet — « elle est venue. Et alors ? »
//
// LE TROU (Thomas, 19/08) : « une fois le client dans mon agenda, s'il démarre,
// possibilité de choisir suivi classique ou convertir BBC ».
//
// Avant ça, la carte d'un RDV découverte n'était même pas cliquable
// (`AgendaPage`, branche `discovery` qui retournait sans rien faire). La
// personne venait, l'EBE se faisait sur papier, et il fallait quitter l'agenda,
// ouvrir les dossiers, créer une fiche à la main et retaper le prénom, le nom
// et le téléphone qu'on avait déjà en base.
//
// Cette feuille ne fait qu'UNE chose : poser la question et rendre la réponse.
// Elle n'écrit rien, n'appelle aucun service — c'est `AgendaPage` qui orchestre.
// Une feuille qui décide ET qui écrit devient intestable.
//
// ── CE QUI N'EST PAS UN OUBLI ─────────────────────────────────────────────
// • Trois réponses, pas dix. Deux vraies (club / classique) et une sortie.
//   « Pas encore » ne perd rien : le rendez-vous reste, le lead reste.
// • Le lime ne colore QUE l'entrée au club — c'est la seule victoire ici, et
//   la charte le réserve à ça.
// • Rien n'est envoyé à la personne depuis cet écran. Elle est en face de vous.
// • Si elle vient à deux, on qualifie UNE personne à la fois (décision Thomas
//   du 19/08) : elles ne prennent pas forcément la même chose. L'accompagnante
//   est simplement rappelée ici, pour qu'on ne l'oublie pas.
// =============================================================================

import { useEffect } from "react";

export interface QualifierCible {
  nomComplet: string;
  heure: string;
  jour: string | null;
  objectif: string | null;
  contact: string | null;
  partenaire: string | null;
}

interface Props {
  cible: QualifierCible;
  onMembre: () => void;
  onClassique: () => void;
  onPasEncore: () => void;
  onFermer: () => void;
}

const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
};

const choix: React.CSSProperties = {
  display: "flex",
  gap: 11,
  alignItems: "flex-start",
  width: "100%",
  textAlign: "left",
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-line)",
  borderRadius: 14,
  padding: 13,
  marginBottom: 9,
  color: "var(--ls-text)",
  fontFamily: "inherit",
  fontSize: 14,
  cursor: "pointer",
  minHeight: 56,
};

const titreChoix: React.CSSProperties = {
  display: "block",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14.5,
  fontWeight: 700,
  marginBottom: 2,
};

// ⚠️ `--ls-text-muted` posé sur un fond teinté retombe sous le seuil lisible
// (mesuré 3,38 en sombre le 19/08). On dérive de l'encre du texte, seule
// recette du projet qui tient dans les deux thèmes.
const sousTexte: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "color-mix(in srgb, var(--ls-text) 72%, transparent)",
};

export function QualifierRdvSheet({ cible, onMembre, onClassique, onPasEncore, onFermer }: Props) {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const contexte = [cible.objectif, cible.contact].filter(Boolean).join(" · ");

  return (
    <div
      onClick={onFermer}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Qualifier le rendez-vous de ${cible.nomComplet}`}
        style={{
          width: "100%",
          maxWidth: 460,
          margin: "0 auto",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--ls-surface)",
          borderTop: "1px solid var(--ls-line2)",
          borderRadius: "22px 22px 0 0",
          padding: "16px 15px calc(20px + env(safe-area-inset-bottom))",
          color: "var(--ls-text)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ width: 38, height: 4, borderRadius: 99, background: "var(--ls-line2)", margin: "0 auto 14px" }} />

        <div style={eyebrow}>
          rdv de {cible.heure}
          {cible.jour ? ` · ${cible.jour}` : ""}
        </div>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 21, margin: "4px 0 3px" }}>
          {cible.nomComplet}
        </div>
        {contexte ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginBottom: 15 }}>{contexte}</div>
        ) : (
          <div style={{ height: 15 }} />
        )}

        <button
          type="button"
          onClick={onMembre}
          // ⚠️ PAS de lime ici, alors que ce bouton mène au club. Le lime est un
          // jeton du mode BBC (`--ls-bbc-lime`) : il n'existe pas sous l'app
          // coach, et l'écrire avec un repli en dur (`var(--x, #C5F82A)`) serait
          // un jeton fantôme — le motif exact qui a produit cinq bugs le 09/08.
          // L'accent de cet écran-ci est le teal, et il suffit à dire « c'est
          // celui-là, le principal ».
          style={{
            ...choix,
            background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface2))",
            borderColor: "color-mix(in srgb, var(--ls-teal) 45%, var(--ls-line))",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 20, flex: "none", lineHeight: 1.2 }}>☕</span>
          <span>
            <span style={titreChoix}>Elle prend sa carte de membre</span>
            <span style={sousTexte}>Fiche créée dans le club, carte activée, prix saisi à la main.</span>
          </span>
        </button>

        <button type="button" onClick={onClassique} style={choix}>
          <span aria-hidden="true" style={{ fontSize: 20, flex: "none", lineHeight: 1.2 }}>📋</span>
          <span>
            <span style={titreChoix}>Elle démarre en suivi classique</span>
            <span style={sousTexte}>Fiche client normale, hors club. Le bilan se complète ensuite.</span>
          </span>
        </button>

        <button type="button" onClick={onPasEncore} style={{ ...choix, background: "transparent", minHeight: 46 }}>
          <span aria-hidden="true" style={{ fontSize: 20, flex: "none", lineHeight: 1.2 }}>🕓</span>
          <span>
            <span style={titreChoix}>Pas encore</span>
            <span style={sousTexte}>Elle réfléchit, ou elle n'est pas venue. Rien ne bouge.</span>
          </span>
        </button>

        {cible.partenaire ? (
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "var(--ls-text-muted)",
              border: "1px solid var(--ls-line)",
              borderRadius: 12,
              padding: "10px 12px",
              marginTop: 4,
            }}
          >
            Elle est venue avec <strong style={{ color: "var(--ls-text)" }}>{cible.partenaire}</strong>. On qualifie une
            personne à la fois — vous pourrez vous occuper d'elle juste après.
          </div>
        ) : null}

        <button
          type="button"
          onClick={onFermer}
          style={{
            display: "block",
            width: "100%",
            minHeight: 44,
            marginTop: 10,
            background: "none",
            border: 0,
            color: "var(--ls-text-muted)",
            fontFamily: "inherit",
            fontSize: 13,
            padding: 13,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
