// Chantier Home Premium Client (2026-04-24).
// Onglet Accueil refondu : hero + RDV gold + point de départ + programme +
// recommandés + Telegram Challengers + mensurations rapide + actions + footer.

import { useEffect, useMemo, useState } from "react";
import type { HerbalifeProduct } from "../../data/herbalifeCatalog";
import { ClientPublicShareConsent } from "./ClientPublicShareConsent";
import { createIcsDataUri } from "../../lib/googleCalendar";
import { ClientAppHomeHero } from "./ClientAppHomeHero";
import { ClientAppDailyAction } from "./ClientAppDailyAction";
import type { Assessment, Measurement } from "../../lib/clientAppData";

interface MetricEntry {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  hydration?: number;
  visceralFat?: number;
  metabolicAge?: number;
  boneMass?: number;
  bmr?: number;
}

interface HomeData {
  client_id: string;
  client_first_name: string;
  client_last_name: string;
  coach_name: string;
  coach_whatsapp?: string;
  coach_phone?: string;
  program_title?: string;
  assessments_count?: number;
  next_follow_up?: string;
}

interface Props {
  data: HomeData;
  latest: (Record<string, number> & { date: string }) | undefined;
  first: (Record<string, number> & { date: string }) | undefined;
  metrics: MetricEntry[];
  recommendedProducts: HerbalifeProduct[];
  rdvSent: boolean;
  rdvMessage: string;
  setRdvMessage: (v: string) => void;
  sendRdvChangeRequest: () => void | Promise<void>;
  getGoogleCalendarUrl: () => string;
  setRecoAskOpen: (v: boolean) => void;
  openProductAskModal: (product: HerbalifeProduct) => void;
  /** Total cm perdus (mensurations) — conservé pour compat, désormais
   *  recalculé directement depuis `measurements` par ClientAppHomeHero. */
  totalCmLost?: number;
  /** Callback passage onglet Évolution. Optionnel V1 — défaut noop. */
  onSeeEvolution?: () => void;
  /** Mensurations normalisées (cm) issues de l'edge client-app-data.
   *  Chantier MEGA v2 (2026-04-25) : pilote l'affichage du badge -cm. */
  measurements?: Measurement[];
  /** Chantier J (2026-04-26) : checkbox "Ajouté à mon agenda".
   *  Token client (uuid) pour appeler client-app-confirm-calendar. */
  clientToken?: string | null;
  /** Id du follow_up affiché — requis pour confirmer côté serveur. */
  nextFollowUpId?: string | null;
  /** Timestamp ISO de confirmation client (ou null si pas confirmé). */
  nextFollowUpAddedToCalendarAt?: string | null;
  /** Callback appelé après confirmation réussie (refetch live data). */
  onCalendarConfirmed?: () => void;
}

const TELEGRAM_GROUP_URL = "https://t.me/+ul1vgYs-uS0yNmFk";
const GOOGLE_MAPS_LA_BASE =
  "https://www.google.com/maps/search/?api=1&query=La+Base+Shakes+and+drinks+Verdun";

const MOTIVATION_QUOTES = [
  "Chaque jour est une victoire.",
  "Ta transformation est en marche.",
  "Tu es plus fort que tes excuses.",
  "Un pas aujourd'hui, un bond demain.",
  "Le meilleur moment, c'est maintenant.",
  "Ton corps entend tout ce que ton mental dit.",
  "Progrès > perfection.",
];

function formatRdvDate(iso: string): { main: string; time: string; countdown: string; isImminent: boolean } {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffH = diffMs / (60 * 60 * 1000);
  const diffD = diffH / 24;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dDay = new Date(d);
  dDay.setHours(0, 0, 0, 0);
  const daysDiff = Math.round((dDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  let main = "";
  if (daysDiff === 0) main = "Aujourd'hui";
  else if (daysDiff === 1) main = "Demain";
  else if (daysDiff < 7) main = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  else main = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  let countdown = "";
  if (diffMs < 0) countdown = "Passé";
  else if (diffH < 1) countdown = `Dans ${Math.round(diffMs / (60 * 1000))} min`;
  else if (diffH < 24) countdown = `Dans ${Math.round(diffH)}h`;
  else if (diffD < 7) countdown = `Dans ${Math.ceil(diffD)} jour${Math.ceil(diffD) > 1 ? "s" : ""}`;
  else countdown = `Dans ${Math.ceil(diffD)} jours`;

  return { main, time, countdown, isImminent: diffH >= 0 && diffH < 24 };
}

export function ClientHomeTab({
  data,
  latest,
  first,
  metrics,
  recommendedProducts,
  rdvSent,
  rdvMessage,
  setRdvMessage,
  sendRdvChangeRequest,
  getGoogleCalendarUrl,
  setRecoAskOpen,
  openProductAskModal,
  totalCmLost = 0,
  onSeeEvolution,
  measurements = [],
  clientToken,
  nextFollowUpId,
  nextFollowUpAddedToCalendarAt,
  onCalendarConfirmed,
}: Props) {
  // Props rétro-compat conservés pour ne pas casser les callers,
  // mais inutilisés depuis le refactor v2 (2026-04-25).
  void totalCmLost;
  void latest;
  void recommendedProducts;
  void openProductAskModal;
  const [rdvEditOpen, setRdvEditOpen] = useState(false);

  // Chantier J (2026-04-26) : confirmation "Ajouté à mon agenda".
  // Optimistic UI : on flip localement dès le clic, on rollback si l'edge
  // function échoue. Le refetch via onCalendarConfirmed() resync ensuite.
  const [calendarConfirmedLocal, setCalendarConfirmedLocal] = useState<boolean>(
    !!nextFollowUpAddedToCalendarAt,
  );
  const [calendarConfirmLoading, setCalendarConfirmLoading] = useState(false);
  useEffect(() => {
    setCalendarConfirmedLocal(!!nextFollowUpAddedToCalendarAt);
  }, [nextFollowUpAddedToCalendarAt]);

  const handleConfirmCalendar = async () => {
    if (calendarConfirmedLocal || calendarConfirmLoading) return;
    if (!clientToken || !nextFollowUpId) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !anonKey) return;
    setCalendarConfirmLoading(true);
    setCalendarConfirmedLocal(true); // optimistic
    try {
      const res = await fetch(
        `${supabaseUrl}/functions/v1/client-app-confirm-calendar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ token: clientToken, followUpId: nextFollowUpId }),
        },
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      onCalendarConfirmed?.();
    } catch (err) {
      console.warn("[rdv] confirm calendar failed", err);
      setCalendarConfirmedLocal(false); // rollback
    } finally {
      setCalendarConfirmLoading(false);
    }
  };

  // Confettis premier login
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const KEY = `lorsquad-client-first-open-${data.client_id}`;
    try {
      if (!window.localStorage.getItem(KEY)) {
        setShowConfetti(true);
        window.localStorage.setItem(KEY, "true");
        window.setTimeout(() => setShowConfetti(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }, [data.client_id]);

  const rdvInfo = data.next_follow_up ? formatRdvDate(data.next_follow_up) : null;
  const coachFirstName = (data.coach_name ?? "").split(/\s+/)[0] || "ton coach";

  // Quote rotative (change chaque ouverture)
  const quote = useMemo(() => {
    const idx = Math.floor(Math.random() * MOTIVATION_QUOTES.length);
    return MOTIVATION_QUOTES[idx];
  }, []);

  return (
    <div className="home-premium">
      <style>{`
        .home-premium {
          display: flex;
          flex-direction: column;
          gap: 14px;
          font-family: 'DM Sans', sans-serif;
        }
        @keyframes home-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .home-premium > * { animation: home-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .home-premium > *:nth-child(1) { animation-delay: 0ms; }
        .home-premium > *:nth-child(2) { animation-delay: 80ms; }
        .home-premium > *:nth-child(3) { animation-delay: 160ms; }
        .home-premium > *:nth-child(4) { animation-delay: 220ms; }
        .home-premium > *:nth-child(5) { animation-delay: 280ms; }
        .home-premium > *:nth-child(6) { animation-delay: 340ms; }
        .home-premium > *:nth-child(7) { animation-delay: 400ms; }
        .home-premium > *:nth-child(8) { animation-delay: 450ms; }
        .home-premium > *:nth-child(9) { animation-delay: 500ms; }
        @keyframes rdv-pulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(186,117,23,0.32); }
          50% { box-shadow: 0 6px 26px rgba(239,159,39,0.55); }
        }
        .home-rdv-imminent { animation: rdv-pulse 2.2s ease-in-out infinite; }
        @keyframes confetti-fall {
          0% { transform: translateY(-20vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .home-premium > * { animation: none !important; }
          .home-rdv-imminent { animation: none !important; }
          .home-confetti > span { animation: none !important; display: none; }
        }
      `}</style>

      {/* Confettis premier login */}
      {showConfetti ? (
        <div
          aria-hidden="true"
          className="home-confetti"
          style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 1.5;
            const duration = 2.5 + Math.random() * 1.5;
            const colors = ["#EF9F27", "#1D9E75", "#D4537E", "#F5B847", "#0F6E56"];
            const color = colors[i % colors.length];
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: 0,
                  left: `${left}%`,
                  width: 10,
                  height: 14,
                  background: color,
                  borderRadius: 2,
                  animation: `confetti-fall ${duration}s ease-in ${delay}s both`,
                }}
              />
            );
          })}
        </div>
      ) : null}

      {/* 1. HERO — supprimé (doublon avec le bandeau gold en haut de
          ClientAppPage qui contient déjà avatar + salutation + meta programme).
          Voir chantier Conseils 2026-04-24. */}

      {/* Chantier MEGA v2 (2026-04-25) : Hero transformation + action du jour.
          Mapping metrics (flat) → Assessment[] (nested bodyScan) attendu
          par ClientAppHomeHero. Le composant gère lui-même le cas
          1 bilan vs 2+, et masque le badge -cm si totalCmLost === 0. */}
      <ClientAppHomeHero
        assessments={metrics.map<Assessment>((m) => ({
          date: m.date,
          type: "follow-up",
          bodyScan: {
            weight: m.weight,
            bodyFat: m.bodyFat,
            muscleMass: m.muscleMass,
            hydration: m.hydration,
            visceralFat: m.visceralFat,
            metabolicAge: m.metabolicAge,
            bmr: m.bmr,
          },
        }))}
        measurements={measurements}
        programLabel={data.program_title ?? "Programme"}
        startDate={first?.date ?? metrics[0]?.date ?? new Date().toISOString()}
        onSeeEvolution={onSeeEvolution ?? (() => undefined)}
      />
      <ClientAppDailyAction onAction={() => undefined} />

      {/* 2. CARTE RDV (compact teal v2 — 2026-04-25) */}
      {rdvInfo ? (
        <div style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
          borderLeft: "4px solid #1D9E75",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#1D9E75", letterSpacing: "1.5px", fontWeight: 500 }}>
              📅 PROCHAIN RDV
            </div>
            <div style={{ background: "#1D9E75", color: "white", fontSize: 11, padding: "3px 10px", borderRadius: 999, fontWeight: 500 }}>
              {rdvInfo.countdown}
            </div>
          </div>
          <div style={{ fontSize: 16, color: "#444", fontWeight: 500 }}>
            {rdvInfo.main} · {rdvInfo.time}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            Avec {coachFirstName} · La Base — Verdun
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" style={{
              padding: "6px 10px", background: "#FAEEDA", color: "#854F0B", borderRadius: 8,
              textDecoration: "none", fontSize: 11, fontWeight: 500,
            }}>📅 Calendrier</a>
            <a href={GOOGLE_MAPS_LA_BASE} target="_blank" rel="noopener noreferrer" style={{
              padding: "6px 10px", background: "#F4F4F4", color: "#444", borderRadius: 8,
              textDecoration: "none", fontSize: 11, fontWeight: 500,
            }}>📍 Itinéraire</a>
            <button type="button" onClick={() => setRdvEditOpen((v) => !v)} style={{
              padding: "6px 10px", background: "#F4F4F4", color: "#444", borderRadius: 8,
              border: "none", fontSize: 11, fontWeight: 500, cursor: "pointer",
            }}>Modifier</button>
            {data.next_follow_up ? (
              <a href={createIcsDataUri({
                title: `Rendez-vous avec ${coachFirstName}`,
                description: `Rendez-vous Lor'Squad Wellness avec ${coachFirstName} à La Base — Verdun.`,
                startDate: new Date(data.next_follow_up),
                location: "La Base Shakes and drinks, Verdun",
                organizerName: coachFirstName,
              })} download={`rdv-labase-${data.next_follow_up.slice(0, 10)}.ics`} style={{
                padding: "6px 10px", background: "#F4F4F4", color: "#444", borderRadius: 8,
                textDecoration: "none", fontSize: 11, fontWeight: 500,
              }}>📅 .ics</a>
            ) : null}
          </div>
          {nextFollowUpId && clientToken ? (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="rdv-added-to-calendar"
                checked={calendarConfirmedLocal}
                disabled={calendarConfirmedLocal || calendarConfirmLoading}
                onChange={(e) => {
                  if (e.target.checked) void handleConfirmCalendar();
                }}
                style={{ width: 16, height: 16, cursor: calendarConfirmedLocal ? "default" : "pointer" }}
              />
              <label
                htmlFor="rdv-added-to-calendar"
                style={{
                  fontSize: 12,
                  color: calendarConfirmedLocal ? "#1D9E75" : "#888",
                  fontWeight: 500,
                  cursor: calendarConfirmedLocal ? "default" : "pointer",
                  userSelect: "none",
                }}
              >
                {calendarConfirmedLocal
                  ? "✅ Ajouté à mon agenda"
                  : "Confirmer l'ajout à mon agenda"}
              </label>
            </div>
          ) : null}
          {rdvEditOpen ? (
            <div style={{ marginTop: 10, padding: 10, background: "#F8F8F8", borderRadius: 8 }}>
              {rdvSent ? (
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1D9E75" }}>✓ Message envoyé à {coachFirstName}</div>
              ) : (
                <>
                  <textarea value={rdvMessage} onChange={(e) => setRdvMessage(e.target.value)}
                    placeholder="Ex : Je préfèrerais un autre créneau..."
                    rows={2}
                    style={{ width: "100%", padding: "8px 10px", background: "#FFFFFF",
                      color: "#444", border: "1px solid #ddd", borderRadius: 8, fontSize: 12,
                      fontFamily: "DM Sans, sans-serif", outline: "none", resize: "none",
                      marginBottom: 8, boxSizing: "border-box" }} />
                  <button type="button" onClick={() => void sendRdvChangeRequest()}
                    style={{ padding: "7px 12px", background: "#1D9E75", color: "white",
                      border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    Envoyer la demande
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: 14,
          marginBottom: 12,
          borderLeft: "4px solid #BA7517",
        }}>
          <div style={{ fontSize: 10, color: "#BA7517", letterSpacing: "1.5px", fontWeight: 500, marginBottom: 8 }}>
            📅 PROCHAIN RDV
          </div>
          <div style={{ fontSize: 14, color: "#444", fontWeight: 500 }}>
            Aucun RDV planifié
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
            Demande à {coachFirstName} un nouveau rendez-vous.
          </div>
        </div>
      )}

      {/* 5. COMMUNAUTÉ CHALLENGERS — compact 1 ligne (v2 2026-04-25) */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#E6F1FB", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18,
          }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: "#444", fontWeight: 500 }}>
              Rejoins les Challengers
            </div>
            <div style={{ fontSize: 10, color: "#888" }}>
              Communauté Telegram
            </div>
          </div>
          <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noopener noreferrer" style={{
            background: "#B8922A", color: "white", fontSize: 11,
            padding: "6px 12px", borderRadius: 8,
            fontWeight: 500, textDecoration: "none",
          }}>
            Rejoindre
          </a>
        </div>
      </div>

      {/* 6. MENSURATIONS / RECO — grid 2 cols (v2 2026-04-25) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => onSeeEvolution?.()} style={{
          background: "#FFFFFF", border: "none", borderRadius: 12, padding: 14,
          textAlign: "center", cursor: "pointer",
        }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>📏</div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 500 }}>Mes mensurations</div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Suis ton évolution</div>
        </button>
        <button type="button" onClick={() => setRecoAskOpen(true)} style={{
          background: "#FFFFFF", border: "none", borderRadius: 12, padding: 14,
          textAlign: "center", cursor: "pointer",
        }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>🎁</div>
          <div style={{ fontSize: 12, color: "#444", fontWeight: 500 }}>Recommander</div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>Parraine un ami</div>
        </button>
      </div>

      {/* 7. CTA DEMANDER UNE RECO */}
      <button
        type="button"
        onClick={() => setRecoAskOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "linear-gradient(135deg, #FAEEDA, #F0DBB0)",
          border: "1px solid rgba(184,146,42,0.35)",
          borderRadius: 14,
          padding: "14px 16px",
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "#B8922A",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🎁
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#633806" }}>
            Demander une recommandation
          </div>
          <div style={{ fontSize: 11, color: "#854F0B", marginTop: 2 }}>
            {coachFirstName} te répondra avec un conseil personnalisé
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* 8. AVIS GOOGLE */}
      <a
        href={GOOGLE_MAPS_LA_BASE}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#FFFFFF",
          border: "1px solid rgba(184,146,42,0.2)",
          borderRadius: 14,
          padding: "12px 16px",
          textDecoration: "none",
        }}
      >
        <div style={{ width: 36, height: 36, background: "rgba(184,146,42,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#B8922A">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#111827" }}>
            Laisser un avis Google
          </div>
          <div style={{ fontSize: 10, color: "#9CA3AF" }}>★★★★★ La Base — Verdun</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>

      {/* Consentement partage public (RGPD 2026-04-24) */}
      <ClientPublicShareConsent
        clientId={data.client_id}
        clientFirstName={data.client_first_name}
      />

      {/* 9. FOOTER QUOTE */}
      <div
        style={{
          textAlign: "center",
          padding: "20px 8px 8px",
          fontSize: 13,
          color: "#6B7280",
          fontStyle: "italic",
          fontFamily: "Syne, sans-serif",
          lineHeight: 1.5,
        }}
      >
        « {quote} »
        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 10, fontStyle: "normal" }}>
          Propulsé par <strong style={{ color: "#BA7517" }}>Lor&apos;Squad</strong> · La Base Verdun
        </div>
      </div>
    </div>
  );
}
