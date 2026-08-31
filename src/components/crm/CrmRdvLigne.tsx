// =============================================================================
// CrmRdvLigne — les rendez-vous, en UNE ligne.
//
// LE CONSTAT (Thomas, 31/08, capture à l'appui) : « j'ai toujours tous les RDV
// affichés ici, ça fait un bloc énorme ». Mesuré : 758 px sur ordinateur,
// 663 px sur téléphone — le premier écran entier, tous les jours.
//
// LE CHIFFRE QUI TRANCHE : sur les 30 derniers jours, UNE SEULE réservation a
// eu besoin d'être acceptée. Les six à venir sont arrivées déjà confirmées. Une
// action qui sert une fois par mois ne mérite pas la meilleure place de l'écran
// tous les matins.
//
// Arbitrage validé par Thomas le 28/08 : « 1. rdv dans l'agenda ». Le CRM sert
// à faire avancer des gens, pas à tenir un planning. Il ne garde donc qu'un
// rappel — qui, quand, et un lien — et l'Agenda garde le planning.
//
// ── CE QUI N'EST PAS PERDU (vérifié avant de retirer le bloc) ───────────────
// • Déplacer / Annuler        → déjà sur la fiche du lead (MoveClubBookingDialog).
// • Venue / pas venue         → « À conclure », en haut du CRM, et l'Agenda.
// • Accepter une demande      → la SEULE action qui n'existait qu'ici. Elle
//   reste, mais uniquement quand il y a vraiment quelque chose à accepter :
//   zéro demande = zéro pixel.
// =============================================================================

const JOUR = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  /** Combien de rendez-vous sont devant nous, toutes sources confondues. */
  aVenir: number;
  /** Le prochain, s'il y en a un — ISO 8601. */
  prochain: string | null;
  onOuvrirAgenda: () => void;
}

export function CrmRdvLigne({ aVenir, prochain, onOuvrirAgenda }: Props) {
  if (aVenir === 0) return null;

  return (
    <button type="button" onClick={onOuvrirAgenda} style={ligne}>
      <span aria-hidden="true" style={{ display: "flex", color: "var(--ls-purple)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </span>
      <span style={texte}>
        <b>{aVenir} rendez-vous</b> à venir
        {prochain ? <span style={detail}> · prochain {JOUR.format(new Date(prochain))}</span> : null}
      </span>
      <span style={fleche}>Agenda ›</span>
    </button>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ligne: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  minHeight: 46,
  margin: "12px 0 0",
  padding: "10px 13px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-purple) 26%, transparent)",
  color: "var(--ls-text)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13.5,
  textAlign: "left",
  cursor: "pointer",
};

const texte: React.CSSProperties = { flex: 1, minWidth: 0 };

const detail: React.CSSProperties = { color: "var(--ls-text-muted)" };

const fleche: React.CSSProperties = {
  flex: "none",
  color: "var(--ls-purple)",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 12,
};
