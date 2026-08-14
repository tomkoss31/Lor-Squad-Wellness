// =============================================================================
// BbcNewMemberButton — « ＋ Nouvelle évaluation », le bouton qui ouvre la
// feuille de saisie de la fiche papier.
//
// Il apparaît à DEUX endroits, et c'est voulu : sur « Ce matin » (le coach
// saisit au comptoir juste après la pesée) et en tête de « Mes membres » (la
// liste qu'il ouvre de toute façon). Une seule feuille, deux portes — cf. la
// règle anti-dérive navigation : le second n'est qu'un raccourci, pas une
// seconde implémentation.
//
// Il vit donc dans UN fichier. Les deux copies écrites en parallèle étaient
// identiques au caractère près : la première divergence (un padding, une
// nuance) aurait fait passer le raccourci pour un autre bouton.
//
// Jetons --ls-bbc-* uniquement. Fond lime, encre lime-ink : le lime ne sert
// jamais de couleur de texte (2,18:1 sur clair).
// =============================================================================

interface BbcNewMemberButtonProps {
  onClick: () => void;
  /** La ligne d'aide sous le bouton. Le second appel y ajoute son renvoi. */
  aide?: React.ReactNode;
}

export function BbcNewMemberButton({ onClick, aide }: BbcNewMemberButtonProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          width: "100%",
          // 52 px : le coach appuie debout, une tablette à la main.
          minHeight: 52,
          border: 0,
          borderRadius: 14,
          background: "var(--ls-bbc-lime)",
          color: "var(--ls-bbc-lime-ink)",
          fontFamily: "var(--ls-bbc-font-body)",
          fontSize: 15,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 19 }}>
          ＋
        </span>{" "}
        Nouvelle évaluation
      </button>
      {aide ? (
        <p
          style={{
            fontSize: 10.5,
            color: "var(--ls-bbc-hint)",
            textAlign: "center",
            margin: "8px 0 0",
            lineHeight: 1.45,
          }}
        >
          {aide}
        </p>
      ) : null}
    </div>
  );
}

export default BbcNewMemberButton;
