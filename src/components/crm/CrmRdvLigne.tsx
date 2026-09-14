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
//
// ── 14/09/2026 — AU BOUT DE LA BANDE ─────────────────────────────────────────
// Elle n'est plus une bande violette à elle seule : elle se range au bout de la
// bande des cases (`CrmJaugeFiltre`), sans fond ni bordure. Sur téléphone elle
// passe sous les cases, pleine largeur. Le texte ne dit plus « Agenda › » : le
// lien le dit par son nom accessible, et « › » suffit à l'œil.
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
  const quand = prochain ? JOUR.format(new Date(prochain)) : null;

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        onClick={onOuvrirAgenda}
        className="crm-rdv"
        aria-label={`Ouvrir l'Agenda — ${aVenir} rendez-vous à venir${quand ? `, le prochain ${quand}` : ""}`}
      >
        <span className="crm-rdv-ico" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
        <span className="crm-rdv-txt">
          <b>{aVenir} RDV</b> à venir{quand ? ` · prochain ${quand}` : ""}
        </span>
        <span className="crm-rdv-f" aria-hidden="true">›</span>
      </button>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
// Classes plutôt que `style={{}}` : la disposition change sous 768 px, et un
// style en ligne rendrait la media query inerte (piège du 18/08).
const CSS = `
.crm-rdv{display:inline-flex;align-items:center;gap:7px;min-height:44px;max-width:100%;padding:0 8px 0 10px;border:0;border-radius:999px;background:transparent;color:var(--ls-text-muted);font-family:"DM Sans",sans-serif;font-size:13px;text-align:left;cursor:pointer}
.crm-rdv:hover{background:color-mix(in srgb,var(--ls-purple) 8%,transparent)}
.crm-rdv:focus-visible{outline:2px solid var(--ls-purple);outline-offset:2px}
.crm-rdv-ico{display:flex;flex:none;color:var(--ls-purple)}
.crm-rdv-txt{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.crm-rdv-txt b{color:var(--ls-text);font-weight:600}
.crm-rdv-f{flex:none;color:var(--ls-purple);font-family:var(--lb360-mono,'JetBrains Mono',monospace);font-size:13px}
@media (min-width:768px){
  .crm-rdv{min-height:36px}
}
@media (max-width:767.98px){
  .crm-rdv{padding:0 4px}
  .crm-rdv-txt{white-space:normal}
}
`;
