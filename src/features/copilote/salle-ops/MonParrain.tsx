// =============================================================================
// MonParrain — la personne à qui demander quand on bloque (12/08/2026).
//
// POURQUOI CE BLOC EXISTE
//
// Le cockpit affichait déjà, dans son « fil de sécurité » : « Un blocage, même
// bête ? Ton parrain et Noaly sont là. » Noaly avait son bouton. **Le parrain,
// aucun.** On nommait la ressource sans jamais donner le moyen de l'atteindre.
//
// Pour un débutant, c'est pourtant LA ressource : quelqu'un qui a déjà fait le
// geste, et qui répond. Aucun écran de l'app ne permettait de le joindre.
//
// ⚠️ DÉPENDANCE À UNE DONNÉE QUI MANQUE SOUVENT
//
// Relevé le 12/08/2026 : Thomas (4 filleuls), Mélanie (1) et Mandy (1) n'ont
// PAS de téléphone dans leur profil. Six coachs sur dix ont donc un parrain
// injoignable. Le bloc le dit franchement plutôt que d'afficher un bouton mort
// — et il invite à réclamer le numéro, ce qui est encore la façon la plus
// simple de le faire remplir.
// =============================================================================

import { useAppContext } from "../../../context/AppContext";

export function MonParrain() {
  const { currentUser, users } = useAppContext();
  const parrain = currentUser?.sponsorId
    ? users.find((u) => u.id === currentUser.sponsorId)
    : undefined;

  // Pas de parrain (admin, ou lien non posé) → on n'affiche rien plutôt qu'un
  // bloc vide : un débutant n'a pas besoin d'une case qui ne mène nulle part.
  if (!parrain) return null;

  const prenom = (parrain.name ?? "").trim().split(/\s+/)[0] || parrain.name;
  const tel = (parrain.phone ?? "").replace(/\D/g, "");
  const monPrenom = (currentUser?.name ?? "").trim().split(/\s+/)[0] || "";

  function ecrire() {
    const message =
      `Salut ${prenom} ! C'est ${monPrenom}. ` +
      `J'ai une question sur mon démarrage, tu as 2 minutes ? 🙂`;
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div style={carte}>
      <span aria-hidden="true" style={pastille}>
        {(prenom[0] ?? "?").toUpperCase()}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={etiquette}>Ton parrain</span>
        <span style={nom}>{parrain.name}</span>
        {!tel ? (
          <span style={note}>Son numéro n'est pas encore renseigné.</span>
        ) : null}
      </span>
      {tel ? (
        <button type="button" onClick={ecrire} style={bouton}>
          Lui écrire
        </button>
      ) : null}
    </div>
  );
}

// ─── Styles (tokens --ls-ops-* uniquement, comme tout le cockpit) ────────────

const carte: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
  padding: "14px 16px",
};

const pastille: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  flex: "none",
  display: "grid",
  placeItems: "center",
  fontWeight: 800,
  fontSize: 15,
  color: "var(--ls-ops-on-accent)",
  background: "var(--ls-ops-accent)",
};

const etiquette: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 10,
  letterSpacing: ".13em",
  textTransform: "uppercase",
  color: "var(--ls-ops-muted)",
  fontWeight: 700,
};

const nom: React.CSSProperties = {
  display: "block",
  fontSize: 14.5,
  fontWeight: 700,
  color: "var(--ls-ops-ink)",
  marginTop: 2,
};

const note: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--ls-ops-faint)",
  marginTop: 2,
};

const bouton: React.CSSProperties = {
  flex: "none",
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 700,
  padding: "9px 13px",
  borderRadius: 11,
  cursor: "pointer",
  color: "var(--ls-ops-accent-text)",
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border-active)",
};
