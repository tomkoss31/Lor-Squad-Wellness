// =============================================================================
// RdvBookingsWidget — RDV demandés via le funnel public, à gérer (CRM).
// Chantier RDV V2 brique 4 (2026-06-14). Le coach voit les créneaux réservés,
// les ajoute à SON Google Agenda (manuel) et confirme / annule.
// Masqué s'il n'y a aucun RDV à venir.
// =============================================================================

import { useAppContext } from "../../context/AppContext";
import { Card } from "../ui/Card";
import { useCoachRdvBookings, type RdvBooking } from "../../hooks/useCoachRdvBookings";

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(d);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fmtShort(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

// Statut des mails (confirmation + rappel J-1) pour 1 RDV prospect.
function EmailStatus({ booking }: { booking: RdvBooking }) {
  const hasEmail = Boolean(booking.contact && EMAIL_RE.test(booking.contact));

  if (!hasEmail) {
    return (
      <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
        <span aria-hidden="true">📵</span>
        Pas d'email — relance par tél / WhatsApp
      </div>
    );
  }

  const confirmed = Boolean(booking.confirm_email_sent_at);
  const reminded = Boolean(booking.reminder_email_sent_at);

  const chip = (ok: boolean, label: string, sentAt: string | null) => (
    <span
      title={ok && sentAt ? `Envoyé le ${fmtShort(sentAt)}` : undefined}
      style={{
        fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 999,
        background: ok ? "color-mix(in srgb, var(--ls-teal) 13%, transparent)" : "var(--ls-surface)",
        color: ok ? "var(--ls-teal)" : "var(--ls-text-muted)",
        border: ok ? "none" : "0.5px solid var(--ls-border)",
      }}
    >
      {ok ? "✓" : "•"} {label}
    </span>
  );

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
      {chip(confirmed, "Confirmation mail", booking.confirm_email_sent_at)}
      {chip(reminded, reminded ? "Rappel J-1 envoyé" : "Rappel J-1 prévu", booking.reminder_email_sent_at)}
    </div>
  );
}

function googleCalUrl(b: RdvBooking): string {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const modeLabel = b.mode === "visio" ? "Visio" : "Présentiel";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `RDV bilan — ${b.first_name ?? "Prospect"}`,
    dates: `${fmt(b.slot_start)}/${fmt(b.slot_end)}`,
    details: `RDV pris via La Base 360 (${modeLabel}).${b.contact ? ` Contact : ${b.contact}` : ""}`,
    location: b.mode === "visio" ? "Visioconférence" : "La Base 360",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function RdvBookingsWidget() {
  const { currentUser } = useAppContext();
  const { bookings, loading, setStatus } = useCoachRdvBookings(currentUser?.id ?? null);

  if (loading || bookings.length === 0) return null;

  return (
    <Card className="space-y-3">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>🗓️</span>
        <div style={{ flex: 1 }}>
          <p className="eyebrow-label" style={{ color: "var(--ls-teal)" }}>RDV demandés</p>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {bookings.length} prospect{bookings.length > 1 ? "s ont" : " a"} réservé via ton bilan en ligne.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bookings.map((b) => (
          <div
            key={b.id}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
                  {b.first_name || "Prospect"}
                </span>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                  padding: "2px 7px", borderRadius: 999,
                  background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)", color: "var(--ls-teal)",
                }}>
                  {b.mode === "visio" ? "Visio" : "Présentiel"}
                </span>
                {b.status === "confirmed" && (
                  <span style={{ fontSize: 11, color: "var(--ls-teal)", fontWeight: 600 }}>✓ Confirmé</span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 3 }}>
                {fmtWhen(b.slot_start)}{b.contact ? ` · ${b.contact}` : ""}
              </div>
              <EmailStatus booking={b} />
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <a
                href={googleCalUrl(b)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "7px 11px", borderRadius: 9,
                  background: "var(--ls-surface)", border: "0.5px solid var(--ls-border)",
                  color: "var(--ls-text)", fontSize: 12, fontWeight: 600, textDecoration: "none",
                  whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif",
                }}
              >
                📅 Google Agenda
              </a>
              {b.status !== "confirmed" && (
                <button
                  type="button"
                  onClick={() => void setStatus(b.id, "confirmed")}
                  style={{
                    padding: "7px 11px", borderRadius: 9, border: "none",
                    background: "var(--ls-gold)", color: "var(--ls-bg)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Confirmer
                </button>
              )}
              <button
                type="button"
                onClick={() => void setStatus(b.id, "canceled")}
                aria-label="Annuler ce RDV"
                style={{
                  padding: "7px 10px", borderRadius: 9,
                  background: "transparent", border: "0.5px solid var(--ls-border)",
                  color: "var(--ls-text-muted)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
