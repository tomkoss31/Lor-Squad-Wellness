// =============================================================================
// ClubDiscoveryWidget — séances découverte réservées via le tunnel public du
// Breakfast Club (/reserver), à gérer côté CRM classique.
//
// Jumeau de RdvBookingsWidget, mais pour les résas "club" (coach = null) : les
// admins les voient (RLS rdv_bookings_club_admin_read). Sert l'admin en mode
// CLASSIQUE (Mélanie) ; l'admin en mode BBC (Thomas) les voit dans « La semaine
// du club ». Masqué s'il n'y a rien à venir ou si l'utilisateur n'est pas admin.
// =============================================================================

import { useAppContext } from "../../context/AppContext";
import { Card } from "../ui/Card";
import { useActiveClubId } from "../../hooks/useActiveClubId";
import {
  useClubDiscoveryBookings,
  type ClubDiscoveryBooking,
} from "../../hooks/useClubDiscoveryBookings";

const OBJECTIF_LABEL: Record<string, string> = {
  poids: "perte de poids",
  muscle: "prise de muscle",
  energie: "regain d'énergie",
};

function fmtWhen(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function googleCalUrl(b: ClubDiscoveryBooking): string {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const qui = b.people_count === 2 ? `${b.first_name ?? "Prospect"} +1` : b.first_name ?? "Prospect";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Séance découverte — ${qui}`,
    dates: `${fmt(b.slot_start)}/${fmt(b.slot_end)}`,
    details: `Séance découverte (body scan + bilan) réservée via le site du club.${b.contact ? ` Contact : ${b.contact}` : ""}`,
    location: "11 rue Saint Pierre, Verdun",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function ClubDiscoveryWidget() {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const clubId = useActiveClubId();
  const { bookings, loading, setStatus } = useClubDiscoveryBookings(isAdmin ? clubId : null);

  if (!isAdmin || loading || bookings.length === 0) return null;

  return (
    <Card className="space-y-3">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>🥤</span>
        <div style={{ flex: 1 }}>
          <p className="eyebrow-label" style={{ color: "var(--ls-teal)" }}>Séances découverte du club</p>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {bookings.length} personne{bookings.length > 1 ? "s ont" : " a"} réservé via le site du club.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bookings.map((b) => {
          const aDeux = b.people_count === 2;
          const obj = b.objectif ? OBJECTIF_LABEL[b.objectif] ?? null : null;
          return (
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
                    {b.first_name || "Prospect"}{aDeux ? " + 1" : ""}
                  </span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
                    padding: "2px 7px", borderRadius: 999,
                    background: "color-mix(in srgb, var(--ls-teal) 16%, transparent)", color: "var(--ls-teal)",
                  }}>
                    découverte
                  </span>
                  {b.status === "confirmed" && (
                    <span style={{ fontSize: 11, color: "var(--ls-teal)", fontWeight: 600 }}>✓ Confirmé</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 3 }}>
                  {fmtWhen(b.slot_start)}
                  {obj ? ` · ${obj}` : ""}
                  {aDeux ? " · à deux" : ""}
                  {b.contact ? ` · ${b.contact}` : ""}
                </div>
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
                      background: "var(--ls-teal)", color: "var(--ls-bg)",
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
                  aria-label="Annuler cette séance"
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
          );
        })}
      </div>
    </Card>
  );
}
