// =============================================================================
// ClubDiscoveryWidget — RDV découverte réservés via le tunnel public du
// Breakfast Club (/reserver), à gérer côté CRM classique.
//
// Jumeau de RdvBookingsWidget, mais pour les résas "club" (coach = null) : les
// admins les voient (RLS rdv_bookings_club_admin_read). Sert l'admin en mode
// CLASSIQUE (Mélanie) ; l'admin en mode BBC (Thomas) les voit dans « La semaine
// du club ». Masqué s'il n'y a rien à venir ou si l'utilisateur n'est pas admin.
// =============================================================================

import { useState } from "react";
import { nomAffiche } from "../../features/crm/nomPropre";
import { useAppContext } from "../../context/AppContext";
import { Card } from "../ui/Card";
import { MoveClubBookingDialog } from "./MoveClubBookingDialog";
import { useActiveClubId } from "../../hooks/useActiveClubId";
import {
  useClubDiscoveryBookings,
  type ClubDiscoveryBooking,
} from "../../hooks/useClubDiscoveryBookings";

/** Même expression que l'edge `book-club-discovery` : c'est elle qui décide
 *  s'il y avait un mail à envoyer — donc s'il y a un mail à regretter. */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
  const nom = nomAffiche(b.first_name, b.last_name);
  const qui = b.people_count === 2 ? `${nom} +1` : nom;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `RDV découverte — ${qui}`,
    dates: `${fmt(b.slot_start)}/${fmt(b.slot_end)}`,
    details: `RDV découverte (body scan + bilan) réservé via le site du club.${b.contact ? ` Contact : ${b.contact}` : ""}`,
    location: "11 rue Saint Pierre, Verdun",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function ClubDiscoveryWidget() {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const clubId = useActiveClubId();
  const { bookings, loading, setStatus, reload } = useClubDiscoveryBookings(isAdmin ? clubId : null);
  // RDV en cours de déplacement — null = personne.
  const [moving, setMoving] = useState<ClubDiscoveryBooking | null>(null);

  if (!isAdmin || loading || bookings.length === 0) return null;

  return (
    <Card className="space-y-3">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden="true" style={{ fontSize: 20 }}>🥤</span>
        <div style={{ flex: 1 }}>
          <p className="eyebrow-label" style={{ color: "var(--ls-teal)" }}>RDV découverte du club</p>
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
                    {nomAffiche(b.first_name, b.last_name)}{aDeux ? " + 1" : ""}
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

                {/* ── « Elle n'a pas eu son mail » (21/08) ──────────────────
                    L'information était DÉJÀ chargée par le hook
                    (`confirm_email_sent_at`) et n'était affichée nulle part.
                    Le 21/08 : Ghislaine réserve mardi 25 à 10h, la campagne
                    d'ouverture du matin (199 mails) avait épuisé le quota
                    Resend de 100/jour, et ni elle ni les coachs n'ont rien
                    reçu — trois envois de suite tombés dans le vide, en
                    silence. Personne ne pouvait le savoir.

                    Un badge ne répare rien : il rend la panne VISIBLE là où
                    le coach travaille, avec la seule action qui compte —
                    prévenir la personne à la main. */}
                {/* Borné aux contacts qui SONT un email : une personne venue
                    avec un téléphone n'attendait aucun mail, lui afficher
                    « sa confirmation n'est pas partie » serait crier au loup.
                    Même test que l'edge, qui n'envoie que dans ce cas. */}
                {!b.confirm_email_sent_at && EMAIL_RE.test(b.contact ?? "") && (
                  <div
                    role="status"
                    style={{
                      marginTop: 6, padding: "7px 10px", borderRadius: 8,
                      background: "color-mix(in srgb, var(--ls-amber) 14%, var(--ls-surface2))",
                      border: "0.5px solid color-mix(in srgb, var(--ls-amber) 55%, transparent)",
                      color: "var(--ls-text)", fontSize: 12, lineHeight: 1.45,
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    <strong>⚠️ Sa confirmation n'est pas partie.</strong>{" "}
                    Elle ne connaît pas son horaire — préviens-la
                    {b.contact ? " " : ""}
                    {b.contact ? <a href={`mailto:${b.contact}`} style={{ color: "var(--ls-text)", fontWeight: 600 }}>{b.contact}</a> : null}.
                  </div>
                )}
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
                {/* Déplacer — demandé par Mélanie : sans ça, changer une heure
                    imposait d'annuler puis de rappeler. */}
                <button
                  type="button"
                  onClick={() => setMoving(b)}
                  style={{
                    padding: "7px 11px", borderRadius: 9,
                    background: "var(--ls-surface)", border: "0.5px solid var(--ls-border)",
                    color: "var(--ls-text)", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  🕘 Déplacer
                </button>
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
          );
        })}
      </div>

      {moving ? (
        <MoveClubBookingDialog
          booking={moving}
          clubSlug="verdun"
          onClose={() => setMoving(null)}
          onMoved={() => void reload()}
        />
      ) : null}
    </Card>
  );
}
