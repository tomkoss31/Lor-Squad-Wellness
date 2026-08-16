// =============================================================================
// EtatRdvBloc — LE bloc d'état de la fiche lead. Un seul, tout en haut.
//
// Ce qu'il remplace (constat Thomas, 16/08) : le même rendez-vous existait à
// trois endroits de la même page, avec trois jeux de boutons différents. Sur la
// fiche de quelqu'un qui venait de réserver un créneau, la page proposait
// encore « Caler un RDV » — un clic, et le coach se retrouvait avec deux
// rendez-vous dans son agenda.
//
// La règle est donc : un lead a UN état, et l'écran ne montre que les actions
// de cet état. « Poser le rendez-vous » n'apparaît que là où il a un sens, et
// il est écrit noir sur blanc que c'est LUI qui crée un rendez-vous.
// =============================================================================

import type { CrmLead } from "../../hooks/useCrmLeads";
import type { EtatRdv } from "../../features/crm/etapes";
import { lienGoogleAgenda } from "../../features/crm/agendaLien";

const JOUR_HEURE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** « vendredi 21 août à 09:00 » — capitalisé pour ouvrir le bloc. */
function creneauLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "créneau inconnu";
  const s = JOUR_HEURE.format(d).replace(" ", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function EtatRdvBloc({
  lead,
  etat,
  telHref,
  whatsAppHref,
  onPoserRdv,
  onDeplacer,
  onAnnuler,
  annulationEnCours,
  peutModifierLeRdv,
}: {
  lead: CrmLead;
  etat: EtatRdv;
  /** `tel:` prêt à l'emploi, ou null si on n'a pas de numéro. */
  telHref: string | null;
  whatsAppHref: string | null;
  onPoserRdv: () => void;
  onDeplacer: () => void;
  onAnnuler: () => void;
  annulationEnCours: boolean;
  /**
   * Déplacer et annuler une réservation du club sont réservés aux admins —
   * la RPC `coach_reschedule_club_booking` répond « forbidden », et l'UPDATE
   * d'annulation est filtré par le RLS. Montrer les boutons à quelqu'un qui
   * n'a pas le droit, c'est promettre un geste qui échouera.
   */
  peutModifierLeRdv: boolean;
}) {
  const prenom = lead.firstName?.trim() || "cette personne";

  if (etat === "aVenir" && lead.rdv) {
    // Déplacer passe par les créneaux publics du club : sans club, la liste des
    // destinations n'existe pas. On masque le bouton plutôt que d'ouvrir une
    // fenêtre vide.
    const deplacable = Boolean(lead.rdv.clubId) && peutModifierLeRdv;
    const agenda = lienGoogleAgenda(lead.rdv, {
      titre: `RDV découverte — ${prenom}${lead.lastName ? ` ${lead.lastName}` : ""}`,
      details: lead.contact ? `Contact : ${lead.contact}` : undefined,
    });
    return (
      <section style={cadre("var(--ls-teal)")} aria-label="Son rendez-vous">
        <div style={eyebrow}>Son rendez-vous</div>
        <h2 style={titre}>{creneauLong(lead.rdv.slotStart)}</h2>
        <p style={explication}>
          {lead.rdv.clubId
            ? `${prenom} a choisi ce créneau sur le site du club. `
            : "Ce créneau est déjà réservé. "}
          <strong style={{ color: "var(--ls-text)" }}>Tu n'as rien à caler</strong> — la place est
          prise.
        </p>
        <div style={rangee}>
          {agenda ? (
            <a href={agenda} target="_blank" rel="noopener noreferrer" style={bouton()}>
              📅 Ajouter à mon agenda
            </a>
          ) : null}
          {deplacable ? (
            <button type="button" onClick={onDeplacer} style={bouton()}>
              🕘 Déplacer
            </button>
          ) : null}
          {peutModifierLeRdv ? (
            <button
              type="button"
              onClick={onAnnuler}
              disabled={annulationEnCours}
              style={bouton("var(--ls-coral)")}
            >
              {annulationEnCours ? "Annulation…" : "Annuler le rendez-vous"}
            </button>
          ) : null}
        </div>
        {!peutModifierLeRdv ? (
          <p style={petiteNote}>
            Déplacer ou annuler ce créneau demande un accès administrateur — passe par Thomas ou
            Mélanie, ou appelle la personne directement.
          </p>
        ) : null}
        {/* Dit une fois, à l'endroit où la question se pose. Sans cette ligne,
            « Ajouter à mon agenda » laisse croire que le rendez-vous y était
            déjà, et qu'il vient d'être dupliqué. */}
        <p style={petiteNote}>
          Rien n'est synchronisé avec Google Agenda : ce bouton crée l'événement chez toi, le
          rendez-vous reste ici de toute façon.
        </p>
      </section>
    );
  }

  if (etat === "passe" && lead.rdv) {
    return (
      <section style={cadre("var(--ls-text-hint)")} aria-label="Son rendez-vous">
        <div style={eyebrow}>Son rendez-vous</div>
        <h2 style={titre}>{creneauLong(lead.rdv.slotStart)} — c'est passé</h2>
        <p style={explication}>
          Le créneau est derrière vous. Il n'y a plus rien à caler ici : dis ce qui s'est passé
          avec le bouton <strong style={{ color: "var(--ls-text)" }}>« Et alors ? »</strong>, et la
          fiche se rangera toute seule.
        </p>
        <div style={rangee}>
          {telHref ? (
            <a href={telHref} style={bouton("var(--ls-teal)", true)}>
              📞 Appeler {prenom}
            </a>
          ) : null}
          <button type="button" onClick={onPoserRdv} style={bouton()}>
            📅 Poser un nouveau rendez-vous
          </button>
        </div>
      </section>
    );
  }

  // ── Aucun créneau ────────────────────────────────────────────────────────
  return (
    <section style={cadre("var(--ls-coral)")} aria-label="Où en est cette personne">
      <div style={eyebrow}>Où en est {prenom}</div>
      <h2 style={titre}>
        {lead.abandonAvantCreneau ? "Parti·e sans choisir de créneau" : "Pas encore de rendez-vous"}
      </h2>
      <p style={explication}>
        {lead.abandonAvantCreneau ? (
          <>
            {prenom} a laissé son numéro sur le site puis a quitté la page avant le calendrier.{" "}
            <strong style={{ color: "var(--ls-text)" }}>C'est le signal le plus fort du CRM</strong>{" "}
            : l'envie était là.
          </>
        ) : (
          <>
            C'est au téléphone que ça se joue : tu appelles, et tu poses le créneau ensemble
            pendant l'appel.
          </>
        )}
      </p>
      <div style={rangee}>
        {telHref ? (
          <a href={telHref} style={bouton("var(--ls-teal)", true)}>
            📞 Appeler {prenom}
          </a>
        ) : null}
        <button type="button" onClick={onPoserRdv} style={bouton()}>
          📅 Poser le rendez-vous
        </button>
        {whatsAppHref ? (
          <a href={whatsAppHref} target="_blank" rel="noopener noreferrer" style={bouton()}>
            📱 WhatsApp
          </a>
        ) : null}
      </div>
      <p style={petiteNote}>
        « Poser le rendez-vous » ouvre ton agenda — c'est ce bouton-là qui crée un rendez-vous.
      </p>
    </section>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function cadre(accent: string): React.CSSProperties {
  return {
    marginTop: 16,
    padding: "16px 17px",
    borderRadius: 16,
    background: `color-mix(in srgb, ${accent} 5%, var(--ls-surface))`,
    border: `1px solid color-mix(in srgb, ${accent} 32%, var(--ls-border))`,
  };
}

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-text-muted)",
  fontWeight: 600,
};

const titre: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 21,
  fontWeight: 700,
  lineHeight: 1.2,
  color: "var(--ls-text)",
  margin: "5px 0 4px",
};

const explication: React.CSSProperties = {
  margin: "0 0 13px",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
};

const rangee: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const petiteNote: React.CSSProperties = {
  margin: "11px 0 0",
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
};

/** Les cibles font 44 px de haut : la fiche se travaille au téléphone. */
function bouton(couleur?: string, plein = false): React.CSSProperties {
  const c = couleur ?? "var(--ls-text)";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
    padding: "10px 15px",
    borderRadius: 11,
    fontFamily: "DM Sans, sans-serif",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
    border: plein ? "1px solid var(--ls-teal)" : `1px solid color-mix(in srgb, ${c} 30%, var(--ls-border))`,
    background: plein ? "var(--ls-teal)" : "var(--ls-surface)",
    color: plein ? "var(--ls-teal-contrast, #0B0D11)" : c,
  };
}
