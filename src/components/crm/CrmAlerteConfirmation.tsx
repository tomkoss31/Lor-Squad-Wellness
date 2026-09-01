// =============================================================================
// CrmAlerteConfirmation — « elle ne connaît pas son horaire ».
//
// Ce bandeau existait dans le pavé des rendez-vous. En sortant ce pavé du CRM
// le 31/08, je l'ai emporté avec — c'est-à-dire que j'ai retiré un filet de
// sécurité sans le remplacer. Il revient ici, seul, avec la même règle qu'au
// premier jour : ZÉRO panne = ZÉRO pixel (cf. `confirmationRatee.ts` pour
// l'incident du 21/08 qui l'a fait naître).
//
// Un badge ne répare rien. Il rend la panne visible là où le coach travaille,
// avec la seule action qui compte : prévenir la personne à la main.
// =============================================================================

import type { ConfirmationRatee } from "../../features/crm/confirmationRatee";

const QUAND = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function CrmAlerteConfirmation({ ratees }: { ratees: ConfirmationRatee[] }) {
  if (ratees.length === 0) return null;

  return (
    <section style={bloc} role="status" aria-label="Confirmations non parties">
      <p style={titre}>
        {ratees.length === 1
          ? "Une confirmation n'est pas partie"
          : `${ratees.length} confirmations ne sont pas parties`}
      </p>
      {ratees.map((r) => (
        <p key={r.id} style={ligne}>
          <strong style={{ color: "var(--ls-text)" }}>{r.nom}</strong> ne connaît pas son horaire
          {" "}({QUAND.format(new Date(r.slotStart))}) — préviens-la&nbsp;:{" "}
          <a href={`mailto:${r.email}`} style={lien}>{r.email}</a>
        </p>
      ))}
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const bloc: React.CSSProperties = {
  margin: "10px 0 0",
  padding: "11px 13px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-amber) 12%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-amber) 45%, transparent)",
};

const titre: React.CSSProperties = {
  margin: "0 0 6px",
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 14,
  color: "var(--ls-amber)",
};

const ligne: React.CSSProperties = {
  margin: "0 0 4px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
};

const lien: React.CSSProperties = {
  color: "var(--ls-text)",
  fontWeight: 600,
  wordBreak: "break-all",
};
