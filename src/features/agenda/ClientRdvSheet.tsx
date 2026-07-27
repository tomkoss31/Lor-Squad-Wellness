// =============================================================================
// ClientRdvSheet — boucler un RDV client sans quitter l'agenda (2026-07-27).
//
// Pourquoi ce composant existe. Le clic sur un RDV client faisait
// `navigate('/clients/:id')` : on QUITTAIT l'agenda pour la fiche. Or les
// prospects et les suivis de protocole ouvrent déjà leur modale sur place —
// la branche client était la dernière à éjecter, et c'est la majoritaire :
// 44 des 46 RDV à venir en base.
//
// Ce que dit la donnée (mesuré en prod le 2026-07-27) : 0 suivi « terminé »
// sur 147, 82 en retard dont 66 sur des clients actifs. Les suivis ne sont
// pas mal enregistrés, ils ne sont jamais soldés. Le geste manquant n'est
// donc pas « marquer fait » mais « faire le suivi » — dans cette app, un RDV
// se clôt en enregistrant le suivi qui en découle.
//
// ⚠ On n'écrit JAMAIS `completed` sur follow_ups. La table est upsertée
// `onConflict: client_id` : c'est UN pointeur vers le prochain RDV, pas un
// journal. Marquer « terminé » sortirait le client de l'agenda sans lui
// donner de suite — il disparaîtrait au lieu d'être reprogrammé.
// =============================================================================

import { useNavigate } from "react-router-dom";
import type { Client, FollowUp } from "../../types/domain";
import { createGoogleCalendarLink } from "../../lib/googleCalendar";

export interface ClientRdvSheetProps {
  client: Client;
  followUp: FollowUp | null;
  /** Faux si le RDV appartient à un autre coach : lecture seule (les RLS
   *  refuseraient l'écriture de toute façon, autant ne pas le proposer). */
  canEdit: boolean;
  onClose: () => void;
  /** Ouvre la replanification (EditScheduleModal, porté par la page). */
  onReschedule: () => void;
}

function fullName(c: Client): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Client";
}

function waLink(phone: string, text: string): string {
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function ClientRdvSheet({
  client,
  followUp,
  canEdit,
  onClose,
  onReschedule,
}: ClientRdvSheetProps) {
  const navigate = useNavigate();
  const when = followUp ? new Date(followUp.dueDate) : null;
  const whenValid = when && !Number.isNaN(when.getTime());
  const isPast = whenValid ? when.getTime() < Date.now() : false;
  const phone = client.phone?.trim();

  const whenLabel = whenValid
    ? when.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date à confirmer";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Rendez-vous avec ${fullName(client)}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          background: "var(--ls-surface)",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTop: "1px solid var(--ls-border)",
          padding: "18px 16px calc(22px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        {/* En-tête */}
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: isPast ? "var(--ls-coral)" : "var(--ls-text-muted)",
            }}
          >
            {isPast ? "Rendez-vous passé" : "Rendez-vous à venir"}
          </div>
          <h2
            style={{
              margin: "4px 0 2px",
              fontFamily: "Anton, sans-serif",
              fontWeight: 400,
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              color: "var(--ls-text)",
            }}
          >
            {fullName(client)}
          </h2>
          <div style={{ fontSize: 13.5, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif" }}>
            {whenLabel}
            {followUp?.type ? ` · ${followUp.type}` : ""}
          </div>
        </div>

        {!canEdit ? (
          <div
            style={{
              margin: "12px 0 0",
              padding: "10px 12px",
              borderRadius: 12,
              background: "color-mix(in srgb, var(--ls-text-hint) 10%, transparent)",
              fontSize: 12.5,
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Ce rendez-vous appartient à un autre coach : lecture seule.
          </div>
        ) : null}

        {/* Action principale : faire le suivi — la vraie clôture d'un RDV */}
        {canEdit ? (
          <button
            type="button"
            onClick={() => navigate(`/clients/${client.id}/follow-up/new`)}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "15px 16px",
              borderRadius: 14,
              border: "none",
              background: "var(--ls-teal)",
              color: "var(--ls-teal-contrast)",
              fontSize: 15.5,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Faire le suivi →
          </button>
        ) : null}
        {canEdit ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--ls-text-hint)",
              margin: "7px 2px 0",
              lineHeight: 1.5,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {isPast
              ? "Le RDV a eu lieu ? Enregistre le suivi : c'est lui qui solde ce rendez-vous et programme la suite."
              : "À faire après le rendez-vous."}
          </div>
        ) : null}

        {/* Joindre le client */}
        {phone ? (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <a
              href={`tel:${phone}`}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "13px 12px",
                borderRadius: 13,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              📞 Appeler
            </a>
            <a
              href={waLink(
                phone,
                `Bonjour ${client.firstName ?? ""}, c'est au sujet de notre rendez-vous.`,
              )}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "13px 12px",
                borderRadius: 13,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              💬 WhatsApp
            </a>
          </div>
        ) : null}

        {/* Replanifier + agenda perso + fiche */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {canEdit ? (
            <button type="button" onClick={onReschedule} style={secondaryStyle}>
              🗓 Modifier le rendez-vous
            </button>
          ) : null}
          {whenValid ? (
            <a
              href={createGoogleCalendarLink({
                title: `RDV ${fullName(client)}`,
                startDate: when,
                endDate: new Date(when.getTime() + (followUp?.durationMin ?? 45) * 60_000),
                description: followUp?.type ?? "Suivi",
              })}
              target="_blank"
              rel="noreferrer"
              style={{ ...secondaryStyle, display: "block", textAlign: "center", textDecoration: "none" }}
            >
              📅 Ajouter à mon agenda Google
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(`/clients/${client.id}`)}
            style={secondaryStyle}
          >
            👤 Ouvrir la fiche client
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "12px",
            borderRadius: 13,
            border: "none",
            background: "transparent",
            color: "var(--ls-text-muted)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

const secondaryStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 13,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "DM Sans, sans-serif",
};
