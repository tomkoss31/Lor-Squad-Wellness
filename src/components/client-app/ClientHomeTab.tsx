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
}: Props) {
  // totalCmLost prop conservé pour rétro-compat avec d'éventuels callers
  // mais ClientAppHomeHero recalcule lui-même via measurements.
  void totalCmLost;
  const [rdvEditOpen, setRdvEditOpen] = useState(false);
  const [showAllValues, setShowAllValues] = useState(false);

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
  const assessmentDate = metrics[0]?.date ?? null;
  const hasMultiple = metrics.length >= 2;

  // Évolution
  const deltaWeight =
    hasMultiple && first && latest && first.weight != null && latest.weight != null
      ? latest.weight - first.weight
      : null;

  // Quote rotative (change chaque ouverture)
  const quote = useMemo(() => {
    const idx = Math.floor(Math.random() * MOTIVATION_QUOTES.length);
    return MOTIVATION_QUOTES[idx];
  }, []);

  // programLabel / isUnitOnly retirés avec le HERO doublon (Chantier Conseils 2026-04-24).

  function handleAskProduct(p: HerbalifeProduct) {
    openProductAskModal(p);
  }

  function detectTelegramInstallUrl(): string {
    if (typeof window === "undefined") return "https://desktop.telegram.org/";
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "https://apps.apple.com/app/telegram-messenger/id686449807";
    if (/android/.test(ua)) return "https://play.google.com/store/apps/details?id=org.telegram.messenger";
    return "https://desktop.telegram.org/";
  }

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

      {/* 2. CARTE RDV */}
      {rdvInfo ? (
        <div
          className={rdvInfo.isImminent ? "home-rdv-imminent" : undefined}
          style={{
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#FFFFFF",
            borderRadius: 18,
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(186,117,23,0.32)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, opacity: 0.85 }}>
              Prochain RDV
            </div>
            <div
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.2)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {rdvInfo.countdown}
            </div>
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, lineHeight: 1.15 }}>
            {rdvInfo.main} · {rdvInfo.time}
          </div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
            Avec <strong>{coachFirstName}</strong> · La Base — Verdun
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "9px 14px",
                background: "rgba(255,255,255,0.22)",
                color: "#FFFFFF",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              📅 Ajouter au calendrier
            </a>
            <a
              href={GOOGLE_MAPS_LA_BASE}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "9px 14px",
                background: "rgba(0,0,0,0.15)",
                color: "#FFFFFF",
                borderRadius: 10,
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              📍 Itinéraire
            </a>
            <button
              type="button"
              onClick={() => setRdvEditOpen((v) => !v)}
              style={{
                padding: "9px 14px",
                background: "rgba(0,0,0,0.15)",
                color: "#FFFFFF",
                borderRadius: 10,
                border: "none",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Modifier
            </button>
          </div>
          {/* Secondary CTA : téléchargement .ics universel (Apple Cal / Outlook / etc.) */}
          {data.next_follow_up ? (
            <div style={{ marginTop: 10 }}>
              <a
                href={createIcsDataUri({
                  title: `Rendez-vous avec ${coachFirstName}`,
                  description: `Rendez-vous Lor'Squad Wellness avec ${coachFirstName} à La Base — Verdun.`,
                  startDate: new Date(data.next_follow_up),
                  location: "La Base Shakes and drinks, Verdun",
                  organizerName: coachFirstName,
                })}
                download={`rdv-labase-${data.next_follow_up.slice(0, 10)}.ics`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  background: "transparent",
                  color: "#E7FFF4",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "1px solid rgba(29,158,117,0.6)",
                  opacity: 0.92,
                }}
              >
                📅 Ajouter à mon calendrier (.ics)
              </a>
            </div>
          ) : null}
          {rdvEditOpen ? (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(255,255,255,0.12)", borderRadius: 10 }}>
              {rdvSent ? (
                <div style={{ fontSize: 12, fontWeight: 600 }}>✓ Message envoyé à {coachFirstName}</div>
              ) : (
                <>
                  <textarea
                    value={rdvMessage}
                    onChange={(e) => setRdvMessage(e.target.value)}
                    placeholder={`Ex : Je préfèrerais un autre créneau...`}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      background: "rgba(0,0,0,0.25)",
                      color: "#FFFFFF",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 9,
                      fontSize: 12,
                      fontFamily: "DM Sans, sans-serif",
                      outline: "none",
                      resize: "none",
                      marginBottom: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendRdvChangeRequest()}
                    style={{
                      padding: "8px 14px",
                      background: "#FFFFFF",
                      color: "#BA7517",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Envoyer à {coachFirstName}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            background: "linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)",
            color: "#FFFFFF",
            borderRadius: 18,
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(15,110,86,0.3)",
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, opacity: 0.85, marginBottom: 6 }}>
            Prochain RDV
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700 }}>
            Aucun RDV planifié
          </div>
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9, marginBottom: 12 }}>
            Demande à {coachFirstName} un nouveau rendez-vous pour poursuivre ton suivi.
          </div>
          <button
            type="button"
            onClick={() => setRecoAskOpen(true)}
            style={{
              padding: "10px 16px",
              background: "#FFFFFF",
              color: "#0F6E56",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Syne, sans-serif",
            }}
          >
            💬 Contacter {coachFirstName}
          </button>
        </div>
      )}

      {/* 3. POINT DE DÉPART */}
      {latest ? (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(15,110,86,0.18)",
            borderRadius: 16,
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <span aria-hidden="true" style={{ fontSize: 14 }}>📍</span>
            <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#0F6E56" }}>
              {hasMultiple ? "Ton évolution" : "Ton point de départ"}
            </span>
            {assessmentDate ? (
              <span style={{ fontSize: 10, color: "#9CA3AF", marginLeft: "auto" }}>
                {new Date(assessmentDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
              </span>
            ) : null}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { label: "Poids", field: "weight", unit: "kg" },
              { label: "Graisse", field: "bodyFat", unit: "%" },
              { label: "Hydratation", field: "hydration", unit: "%" },
            ].map((m) => {
              const val = latest[m.field as keyof typeof latest] as number | undefined;
              return (
                <div key={m.field} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: "#0F6E56", lineHeight: 1 }}>
                    {typeof val === "number" ? val.toFixed(1) : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4, fontWeight: 500 }}>
                    {m.unit}
                  </div>
                  <div style={{ fontSize: 9, color: "#9CA3AF", letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 3 }}>
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>

          {hasMultiple && deltaWeight != null && deltaWeight < 0 ? (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "rgba(29,158,117,0.1)",
                borderRadius: 10,
                fontSize: 12,
                color: "#0F6E56",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              🎉 −{Math.abs(deltaWeight).toFixed(1)} kg depuis le départ
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setShowAllValues(true)}
            style={{
              marginTop: 12,
              padding: "8px 0",
              background: "transparent",
              border: "none",
              color: "#0F6E56",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              textAlign: "center",
            }}
          >
            Voir toutes mes valeurs →
          </button>

          {/* Modale toutes valeurs */}
          {showAllValues ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Fermer"
              onClick={() => setShowAllValues(false)}
              onKeyDown={(e) => { if (e.key === "Escape") setShowAllValues(false); }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 9999,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                style={{
                  background: "#FFFFFF",
                  width: "100%",
                  maxWidth: 480,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  maxHeight: "80vh",
                  overflowY: "auto",
                }}
              >
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
                  Toutes tes valeurs
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {([
                    { label: "Poids", field: "weight", unit: "kg" },
                    { label: "Masse grasse", field: "bodyFat", unit: "%" },
                    { label: "Masse musculaire", field: "muscleMass", unit: "kg" },
                    { label: "Hydratation", field: "hydration", unit: "%" },
                    { label: "Graisse viscérale", field: "visceralFat", unit: "" },
                    { label: "Masse osseuse", field: "boneMass", unit: "kg" },
                    { label: "Âge métabolique", field: "metabolicAge", unit: "ans" },
                    { label: "BMR", field: "bmr", unit: "kcal" },
                  ] as const).map((m) => {
                    const val = latest[m.field] as number | undefined;
                    return (
                      <div
                        key={m.field}
                        style={{
                          padding: 12,
                          background: "#F7F5F0",
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                          {m.label}
                        </div>
                        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#0F6E56" }}>
                          {typeof val === "number" ? val.toFixed(1) : "—"}
                          <span style={{ fontSize: 11, color: "#6B7280", marginLeft: 4 }}>{m.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllValues(false)}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: 12,
                    background: "#0F6E56",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 4. RECOMMANDÉ SELON BODY SCAN */}
      {recommendedProducts.length > 0 ? (
        <div
          style={{
            background: "#FAEEDA",
            border: "1px solid #EF9F27",
            borderRadius: 16,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span aria-hidden="true" style={{ fontSize: 14 }}>⭐</span>
            <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#854F0B" }}>
              Recommandé selon ton body scan
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recommendedProducts.slice(0, 3).map((p) => (
              <div
                key={p.ref}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "#FFFFFF",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#FAEEDA",
                    color: "#BA7517",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 16,
                  }}
                >
                  💊
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.shortBenefit ?? "Recommandé pour toi"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAskProduct(p)}
                  style={{
                    padding: "7px 12px",
                    background: "linear-gradient(135deg, #EF9F27, #BA7517)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  En parler
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5. COMMUNAUTÉ CHALLENGERS */}
      <div
        style={{
          background: "#FFFFFF",
          borderLeft: "4px solid #0F6E56",
          borderRadius: 14,
          padding: "14px 16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#0088CC">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.81 8.521c-.138.614-.503.764-1.02.476l-2.814-2.074-1.358 1.306c-.152.152-.278.278-.566.278l.202-2.89L15.597 9.3c.234-.206-.054-.323-.36-.117l-6.502 4.094-2.805-.876c-.608-.19-.622-.608.126-.9l10.966-4.226c.51-.18.954.126.784.885z" />
          </svg>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#111827" }}>
            Rejoins les Challengers
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 12, lineHeight: 1.5 }}>
          Communauté Telegram pour t&apos;inspirer et progresser ensemble.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <a
            href={detectTelegramInstallUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 12px",
              background: "transparent",
              color: "#0088CC",
              border: "1px solid rgba(0,136,204,0.4)",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Installer Telegram
          </a>
          <a
            href={TELEGRAM_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 12px",
              background: "linear-gradient(135deg, #EF9F27, #BA7517)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
              fontFamily: "Syne, sans-serif",
            }}
          >
            Rejoindre le groupe
          </a>
        </div>
        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 10, textAlign: "center" }}>
          Communauté ouverte à tous les clients de l&apos;équipe Lor&apos;Squad
        </div>
      </div>

      {/* 6. MENSURATIONS RAPIDE */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "rgba(29,158,117,0.12)",
            color: "#0F6E56",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          📏
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#111827" }}>
            Tes mensurations
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            Prends tes mesures et suis ton évolution
          </div>
        </div>
        <span style={{ color: "#0F6E56", fontSize: 18 }}>→</span>
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
