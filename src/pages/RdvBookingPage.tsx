// =============================================================================
// RdvBookingPage — Prise de RDV façon Calendly (V1 MANUELLE, 2026-06-14).
// Route publique : /rdv/:coachSlug?  (atteinte depuis la page Merci du bilan).
//
// V1 (manuelle, décision Thomas) :
//  - Choix Présentiel / Visio
//  - Choix d'un jour (14 prochains jours, dimanches exclus) + d'un créneau
//  - À la confirmation : bouton « Ajouter à Google Agenda » (lien render
//    pré-rempli — le coach/prospect l'ajoute manuellement). PAS de sync auto.
//
// ⚠️ V2 (chantier suivant, backend) : créneaux réels calculés depuis l'agenda
// de TOUS les coachs + anti-doublon + notification coach + (option) sync Google
// API. Ici tout est front-only, aucune écriture DB, aucune migration.
// =============================================================================

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  PublicShell,
  PublicCtaPrimary,
  PublicBrand,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";

type Mode = "presentiel" | "visio";

const SLOT_HOURS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const SLOT_MINUTES = 30; // durée du RDV

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// 14 prochains jours, dimanches exclus.
function buildDays(): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let added = 0;
  let cursor = 1; // dès demain
  while (added < 14 && cursor < 40) {
    const day = new Date(d);
    day.setDate(d.getDate() + cursor);
    if (day.getDay() !== 0) {
      out.push(day);
      added += 1;
    }
    cursor += 1;
  }
  return out;
}

function dayLabel(d: Date): { dow: string; num: string; mon: string } {
  const dow = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(d).replace(".", "");
  const num = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(d);
  const mon = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d).replace(".", "");
  return { dow: capitalize(dow), num, mon };
}

function googleCalUrl(opts: { title: string; start: Date; end: Date; details: string; location: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.details,
    location: opts.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function RdvBookingPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [searchParams] = useSearchParams();
  const slug = (coachSlug ?? "").trim();
  const coachName = useMemo(() => (slug ? capitalize(slug) : ""), [slug]);
  const firstName = (searchParams.get("firstName") ?? "").trim();

  const days = useMemo(buildDays, []);
  const [mode, setMode] = useState<Mode>("visio");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const canConfirm = selectedDay !== null && selectedSlot !== null;

  const eventDates = useMemo(() => {
    if (!selectedDay || !selectedSlot) return null;
    const [h, m] = selectedSlot.split(":").map(Number);
    const start = new Date(selectedDay);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + SLOT_MINUTES);
    return { start, end };
  }, [selectedDay, selectedSlot]);

  const gcalHref = useMemo(() => {
    if (!eventDates) return "#";
    const modeLabel = mode === "visio" ? "Visioconférence" : "En présentiel";
    return googleCalUrl({
      title: `RDV bilan La Base 360${coachName ? ` — ${coachName}` : ""}`,
      start: eventDates.start,
      end: eventDates.end,
      details: `Rendez-vous bilan bien-être${firstName ? ` avec ${firstName}` : ""} (${modeLabel}). Pris via La Base 360.`,
      location: mode === "visio" ? "Visioconférence (lien envoyé par ton coach)" : "La Base 360",
    });
  }, [eventDates, mode, coachName, firstName]);

  const prettyWhen = useMemo(() => {
    if (!eventDates) return "";
    const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "long" }).format(eventDates.start);
    return `${capitalize(day)} à ${selectedSlot}`;
  }, [eventDates, selectedSlot]);

  // ─── Écran de confirmation ────────────────────────────────────────────────
  if (confirmed && eventDates) {
    return (
      <PublicShell defaultTheme="dark">
        <div style={{ padding: "48px 22px 80px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <PublicBrand label="Rendez-vous" />
          <div className="ps-bounce" style={{ fontSize: 56, margin: "24px 0 12px", filter: "drop-shadow(0 4px 20px rgba(45,212,191,0.4))" }}>🗓️</div>
          <h1 style={{ fontFamily: PUBLIC_FONTS.display, fontSize: "clamp(26px,6vw,34px)", fontWeight: 600, color: "var(--cream)", lineHeight: 1.12, margin: "0 auto 14px", maxWidth: 420 }}>
            C'est <span style={publicGradText}>noté</span> !
          </h1>
          <p style={{ fontSize: 15, color: "var(--cream-muted)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 8px" }}>
            {prettyWhen} · {mode === "visio" ? "en visio" : "en présentiel"}.
          </p>
          <p style={{ fontSize: 13.5, color: "var(--cream-hint)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 28px" }}>
            Ajoute ce créneau à ton agenda pour ne pas l'oublier. Ton coach{coachName ? ` ${coachName}` : ""} te confirmera le RDV.
          </p>

          <a
            href={gcalHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "15px 24px",
              background: PUBLIC_TOKENS.gradCta,
              color: PUBLIC_TOKENS.cream,
              borderRadius: 14,
              textDecoration: "none",
              fontFamily: PUBLIC_FONTS.display,
              fontSize: 15,
              fontWeight: 600,
              maxWidth: 360,
              margin: "0 auto 12px",
              boxShadow: "0 12px 32px -8px rgba(45,212,191,0.55)",
            }}
          >
            📅 Ajouter à Google Agenda
          </a>
          <button
            type="button"
            onClick={() => { setConfirmed(false); setSelectedSlot(null); }}
            style={{ background: "none", border: "none", color: "var(--cream-hint)", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", marginTop: 8 }}
          >
            ← Choisir un autre créneau
          </button>
        </div>
      </PublicShell>
    );
  }

  // ─── Écran de réservation ─────────────────────────────────────────────────
  return (
    <PublicShell defaultTheme="dark">
      <div style={{ padding: "48px 22px 80px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>
          <PublicBrand label="Rendez-vous" />
          <h1 style={{ fontFamily: PUBLIC_FONTS.display, fontSize: "clamp(26px,6vw,36px)", fontWeight: 600, color: "var(--cream)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "24px auto 10px", maxWidth: 460 }}>
            Réserve ton <span style={publicGradText}>rendez-vous</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--cream-muted)", lineHeight: 1.55, maxWidth: 420, margin: "0 auto 28px" }}>
            {firstName ? `${firstName}, ` : ""}choisis le format et le moment qui t'arrangent.{coachName ? ` ${coachName} t'attend.` : ""}
          </p>
        </div>

        {/* Toggle Présentiel / Visio */}
        <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
          {([
            { id: "visio" as const, emoji: "💻", label: "Visio" },
            { id: "presentiel" as const, emoji: "🤝", label: "Présentiel" },
          ]).map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                style={{
                  flex: 1,
                  padding: "14px 12px",
                  borderRadius: 14,
                  background: active ? "color-mix(in srgb, var(--teal) 14%, transparent)" : "var(--glass)",
                  border: `1px solid ${active ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
                  color: "var(--cream)",
                  cursor: "pointer",
                  fontFamily: PUBLIC_FONTS.display,
                  fontSize: 14.5,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.18s",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 18 }}>{opt.emoji}</span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Jours */}
        <div style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 13, fontWeight: 600, color: "var(--cream-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          Choisis un jour
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 24, WebkitOverflowScrolling: "touch" }}>
          {days.map((d) => {
            const { dow, num, mon } = dayLabel(d);
            const active = selectedDay?.toDateString() === d.toDateString();
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => { setSelectedDay(d); setSelectedSlot(null); }}
                style={{
                  flex: "0 0 auto",
                  width: 64,
                  padding: "10px 0",
                  borderRadius: 14,
                  background: active ? "color-mix(in srgb, var(--teal) 16%, transparent)" : "var(--glass)",
                  border: `1px solid ${active ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
                  color: "var(--cream)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.18s",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--cream-hint)", fontFamily: PUBLIC_FONTS.body }}>{dow}</div>
                <div style={{ fontSize: 19, fontWeight: 700, fontFamily: PUBLIC_FONTS.display, color: "var(--cream)", lineHeight: 1.2 }}>{num}</div>
                <div style={{ fontSize: 10.5, color: "var(--cream-hint)", fontFamily: PUBLIC_FONTS.body }}>{mon}</div>
              </button>
            );
          })}
        </div>

        {/* Créneaux */}
        {selectedDay && (
          <>
            <div style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 13, fontWeight: 600, color: "var(--cream-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Choisis un créneau
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10, marginBottom: 28 }}>
              {SLOT_HOURS.map((slot) => {
                const active = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: "12px 0",
                      borderRadius: 12,
                      background: active ? PUBLIC_TOKENS.gradCta : "var(--glass)",
                      border: `1px solid ${active ? "transparent" : "var(--hair)"}`,
                      color: active ? PUBLIC_TOKENS.cream : "var(--cream)",
                      cursor: "pointer",
                      fontFamily: PUBLIC_FONTS.display,
                      fontSize: 14.5,
                      fontWeight: 600,
                      transition: "all 0.15s",
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <PublicCtaPrimary onClick={() => setConfirmed(true)} disabled={!canConfirm}>
          Confirmer mon rendez-vous →
        </PublicCtaPrimary>
        <p style={{ marginTop: 14, fontSize: 12, color: "var(--cream-hint)", fontFamily: PUBLIC_FONTS.mono, letterSpacing: "0.06em", textAlign: "center" }}>
          Sans engagement · ton coach confirme le créneau
        </p>
      </div>
    </PublicShell>
  );
}
