import { useMemo, useState } from "react";
import type { Client, FollowUpProtocolLog } from "../../types/domain";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import { logSupabaseFollowUpProtocolStep } from "../../services/supabaseService";
import { FOLLOW_UP_PROTOCOL, type FollowUpStep } from "../../data/followUpProtocol";
import { FollowUpStepModal } from "./FollowUpStepModal";
import { Card } from "../ui/Card";
import {
  evaluateProtocolEligibility,
  labelForIneligibilityReason,
} from "../../lib/followUpProtocolScheduler";

interface Props {
  client: Client;
}

type StepState = "upcoming" | "active" | "past";

/**
 * Chantier Protocole de suivi (2026-04-20) — bloc "Protocole de suivi" sur la
 * fiche client. Affiche les 5 étapes avec leur état (upcoming / active / past)
 * et un log "envoyé le ..." pour chaque étape déjà loggée en DB. Click
 * "Voir →" ouvre la modal de message + actions.
 */
export function FollowUpProtocolCard({ client }: Props) {
  const { currentUser, followUpProtocolLogs, refreshFollowUpProtocolLogs } = useAppContext();
  const { push: pushToast } = useToast();
  // Chantier Protocole Agenda+Dashboard (2026-04-20) : logs partagés via
  // AppContext pour garder fiche / dashboard / agenda en sync. Pas de
  // local fetch : on filtre la liste globale pour ce client.
  const logs = useMemo(
    () => followUpProtocolLogs.filter((l) => l.clientId === client.id),
    [followUpProtocolLogs, client.id]
  );
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const [busyStepId, setBusyStepId] = useState<string | null>(null);
  const [showReasonsDetail, setShowReasonsDetail] = useState(false);

  // Hotfix (2026-04-20) : si le client n'est pas éligible au protocole
  // automatique (vieux, inactif, pas de programme, pas de scan), on
  // affiche une bande info en tête — sans masquer les 5 étapes (la fiche
  // client reste l'endroit où le coach peut suivre précisément même un
  // dossier ancien).
  const eligibility = useMemo(
    () => evaluateProtocolEligibility(client),
    [client]
  );

  // Date du bilan initial — base pour calculer l'état des étapes.
  const initialAssessmentDate = useMemo(() => {
    const initial =
      client.assessments.find((a) => a.type === "initial") ??
      [...client.assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    return initial?.date ?? null;
  }, [client.assessments]);

  const daysSinceInitial = useMemo(() => {
    if (!initialAssessmentDate) return null;
    const diff = Date.now() - new Date(initialAssessmentDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [initialAssessmentDate]);

  // Helpers
  const logsByStep = useMemo(() => {
    const map = new Map<string, FollowUpProtocolLog>();
    for (const l of logs) map.set(l.stepId, l);
    return map;
  }, [logs]);

  function getStepState(step: FollowUpStep): StepState {
    if (!daysSinceInitial && daysSinceInitial !== 0) return "upcoming";
    if (daysSinceInitial < step.dayOffset) return "upcoming";
    if (daysSinceInitial > step.dayOffset) return "past";
    return "active";
  }

  // L'étape "active" = la première non envoyée dans la fenêtre [dayOffset-1, dayOffset+1]
  // OU, par défaut, la prochaine non envoyée en séquence.
  function isFocusedStep(step: FollowUpStep): boolean {
    if (logsByStep.has(step.id)) return false;
    if (daysSinceInitial === null) return false;
    // Fenêtre de 1 jour autour du dayOffset : on considère l'étape "actuelle"
    if (Math.abs(daysSinceInitial - step.dayOffset) <= 1) return true;
    return false;
  }

  const sentCount = logs.length;
  const total = FOLLOW_UP_PROTOCOL.length;

  const openStep = openStepId ? FOLLOW_UP_PROTOCOL.find((s) => s.id === openStepId) ?? null : null;

  async function handleMarkSent(step: FollowUpStep) {
    if (!currentUser) return;
    setBusyStepId(step.id);
    try {
      await logSupabaseFollowUpProtocolStep({
        clientId: client.id,
        coachId: currentUser.id,
        stepId: step.id,
      });
      // Refresh global — garde le dashboard + agenda à jour en même temps
      await refreshFollowUpProtocolLogs();
      pushToast({ tone: "success", title: `${step.shortTitle} marqué envoyé ✓` });
      setOpenStepId(null);
    } catch (err) {
      pushToast(
        buildSupabaseErrorToast(
          err,
          "Impossible d'enregistrer l'envoi. Vérifie la migration SQL follow_up_protocol_log."
        )
      );
    } finally {
      setBusyStepId(null);
    }
  }

  // Rendu
  if (!initialAssessmentDate) {
    // Pas de bilan initial → on n'affiche pas le bloc (pas d'ancre temporelle).
    return null;
  }

  return (
    <>
      <Card className="space-y-3">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <p className="eyebrow-label">Protocole de suivi</p>
          <span
            className="ls-badge"
            data-tone={sentCount === total ? "teal" : sentCount > 0 ? "gold" : "muted"}
            aria-label={`${sentCount} sur ${total} étapes envoyées`}
          >
            {sentCount}/{total} ✓
          </span>
        </div>
        <h2 className="text-lg font-bold" style={{ fontFamily: "Syne, sans-serif", color: "var(--ls-text)" }}>
          Accompagnement 14 jours
        </h2>
        <p style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5, margin: "0 0 8px" }}>
          5 points de contact clés pour ancrer la routine de {client.firstName} et préparer le RDV de suivi.
        </p>

        {!eligibility.eligible && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)",
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--ls-text-muted)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
            role="note"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true">ℹ️</span>
              <span>Ce client n'apparaît plus dans les suivis automatiques.</span>
              <button
                type="button"
                onClick={() => setShowReasonsDetail((v) => !v)}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  color: "var(--ls-teal)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
                aria-expanded={showReasonsDetail}
              >
                {showReasonsDetail ? "masquer" : "voir pourquoi"}
              </button>
            </div>
            {showReasonsDetail && (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {eligibility.reasons.map((reason) => (
                  <li key={reason} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--ls-coral)" }} aria-hidden="true">•</span>
                    <span>{labelForIneligibilityReason(reason)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {FOLLOW_UP_PROTOCOL.map((step, idx) => {
            const state = getStepState(step);
            const log = logsByStep.get(step.id);
            const isSent = Boolean(log);
            const isFocused = !isSent && isFocusedStep(step);
            const subtitle = (() => {
              if (isSent && log) {
                return `Envoyé le ${new Date(log.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} à ${new Date(log.sentAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
              }
              if (daysSinceInitial === null) return "À venir";
              const diff = step.dayOffset - daysSinceInitial;
              if (diff < 0) return `Il y a ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""} — non envoyé`;
              if (diff === 0) return "À envoyer aujourd'hui";
              if (diff === 1) return "À envoyer demain";
              return `Dans ${diff} jours`;
            })();

            const tone =
              isSent ? "teal" : isFocused ? "gold" : state === "past" ? "muted" : "default";

            return (
              <div key={step.id}>
                <button
                  type="button"
                  onClick={() => setOpenStepId(step.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 2px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "background 150ms",
                  }}
                >
                  {/* Pastille état */}
                  <div
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "'Syne', sans-serif",
                      background:
                        tone === "teal"
                          ? "color-mix(in srgb, var(--ls-teal) 15%, transparent)"
                          : tone === "gold"
                            ? "var(--ls-gold)"
                            : "var(--ls-surface2)",
                      color:
                        tone === "teal"
                          ? "var(--ls-teal)"
                          : tone === "gold"
                            ? "var(--ls-gold-contrast, #0B0D11)"
                            : "var(--ls-text-muted)",
                      border: tone === "default" ? "1px solid var(--ls-border)" : "none",
                    }}
                  >
                    {isSent ? "✓" : step.dayOffset}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          tone === "muted"
                            ? "var(--ls-text-muted)"
                            : "var(--ls-text)",
                      }}
                    >
                      {step.iconEmoji} {step.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
                      {subtitle}
                    </div>
                  </div>

                  {isFocused && (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
                        color: "var(--ls-gold)",
                        flexShrink: 0,
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Voir →
                    </span>
                  )}
                  {!isFocused && (
                    <span
                      style={{
                        fontSize: 16,
                        color: "var(--ls-text-hint)",
                        flexShrink: 0,
                        marginLeft: 4,
                      }}
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  )}
                </button>
                {idx < FOLLOW_UP_PROTOCOL.length - 1 && (
                  <div style={{ height: 1, background: "var(--ls-border)", margin: "0 0 0 40px" }} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {openStep && (
        <FollowUpStepModal
          step={openStep}
          client={client}
          existingLog={logsByStep.get(openStep.id)}
          onClose={() => setOpenStepId(null)}
          onMarkSent={() => handleMarkSent(openStep)}
          busy={busyStepId === openStep.id}
        />
      )}
    </>
  );
}
