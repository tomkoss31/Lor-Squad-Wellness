// =============================================================================
// RdvBookingPage — Prise de RDV façon Calendly (V2, 2026-06-14).
// Route publique : /rdv/:coachSlug?  (atteinte depuis la page Merci du bilan).
//
// V2 : créneaux RÉELS du coach du lien (RPC get_coach_availability_by_slug =
// dispos déclarées MOINS RDV déjà pris → anti-doublon). Réservation via l'edge
// book-rdv (insert + notif coach). À la confirmation : bouton « Ajouter à Google
// Agenda » (lien render pré-rempli, ajout MANUEL — pas de sync auto).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  PublicShell,
  PublicCtaPrimary,
  PublicBrand,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";
import { getSupabaseClient } from "../services/supabaseClient";

type Mode = "presentiel" | "visio";
const SLOT_MINUTES = 30;

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function parisDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function parisDayParts(d: Date): { dow: string; num: string; mon: string } {
  const dow = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "Europe/Paris" }).format(d).replace(".", "");
  const num = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "Europe/Paris" }).format(d);
  const mon = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "Europe/Paris" }).format(d).replace(".", "");
  return { dow: capitalize(dow), num, mon };
}
function parisTime(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d);
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

interface DayGroup { key: string; sample: Date; slots: Date[] }

export function RdvBookingPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [searchParams] = useSearchParams();
  const slug = (coachSlug ?? "").trim();
  const coachName = useMemo(() => (slug ? capitalize(slug) : ""), [slug]);
  const firstName = (searchParams.get("firstName") ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [mode, setMode] = useState<Mode>("visio");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const loadSlots = useMemo(
    () => async () => {
      setLoading(true);
      const sb = await getSupabaseClient();
      if (!sb || !slug) {
        setGroups([]);
        setLoading(false);
        return;
      }
      const { data, error } = await sb.rpc("get_coach_availability_by_slug", { p_slug: slug, p_days: 14 });
      if (error) {
        setGroups([]);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as Array<{ slot_start: string }>;
      const map = new Map<string, Date[]>();
      for (const r of rows) {
        const d = new Date(r.slot_start);
        const k = parisDayKey(d);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(d);
      }
      const gs: DayGroup[] = [...map.entries()]
        .map(([key, slots]) => ({ key, sample: slots[0], slots: slots.sort((a, b) => a.getTime() - b.getTime()) }))
        .sort((a, b) => a.sample.getTime() - b.sample.getTime());
      setGroups(gs);
      setLoading(false);
    },
    [slug],
  );

  useEffect(() => { void loadSlots(); }, [loadSlots]);

  const selectedGroup = groups.find((g) => g.key === selectedKey) ?? null;
  const canConfirm = selectedSlot !== null && !submitting;

  const slotEnd = useMemo(
    () => (selectedSlot ? new Date(selectedSlot.getTime() + SLOT_MINUTES * 60_000) : null),
    [selectedSlot],
  );

  const gcalHref = useMemo(() => {
    if (!selectedSlot || !slotEnd) return "#";
    const modeLabel = mode === "visio" ? "Visioconférence" : "En présentiel";
    return googleCalUrl({
      title: `RDV bilan La Base 360${coachName ? ` — ${coachName}` : ""}`,
      start: selectedSlot,
      end: slotEnd,
      details: `Rendez-vous bilan bien-être${firstName ? ` avec ${firstName}` : ""} (${modeLabel}). Pris via La Base 360.`,
      location: mode === "visio" ? "Visioconférence (lien envoyé par ton coach)" : "La Base 360",
    });
  }, [selectedSlot, slotEnd, mode, coachName, firstName]);

  async function handleConfirm() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setBookingError(null);
    const sb = await getSupabaseClient();
    if (!sb) { setBookingError("Connexion indisponible."); setSubmitting(false); return; }
    const { data, error } = await sb.functions.invoke("book-rdv", {
      body: { coachSlug: slug, mode, slotStart: selectedSlot.toISOString(), firstName },
    });
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      if (res?.error === "creneau_pris") {
        setBookingError("Ce créneau vient d'être pris. Choisis-en un autre.");
        setSelectedSlot(null);
        void loadSlots();
      } else {
        setBookingError("La réservation a échoué. Réessaie dans un instant.");
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setConfirmed(true);
  }

  const prettyWhen = useMemo(() => {
    if (!selectedSlot) return "";
    const day = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "long", timeZone: "Europe/Paris" }).format(selectedSlot);
    return `${capitalize(day)} à ${parisTime(selectedSlot)}`;
  }, [selectedSlot]);

  // ─── Confirmation ─────────────────────────────────────────────────────────
  if (confirmed && selectedSlot && slotEnd) {
    return (
      <PublicShell defaultTheme="dark">
        <div style={{ padding: "48px 22px 80px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <PublicBrand label="Rendez-vous" />
          <div className="ps-bounce" style={{ fontSize: 56, margin: "24px 0 12px", filter: "drop-shadow(0 4px 20px rgba(45,212,191,0.4))" }}>🗓️</div>
          <h1 style={{ fontFamily: PUBLIC_FONTS.display, fontSize: "clamp(26px,6vw,34px)", fontWeight: 600, color: "var(--cream)", lineHeight: 1.12, margin: "0 auto 14px", maxWidth: 420 }}>
            C'est <span style={publicGradText}>réservé</span> !
          </h1>
          <p style={{ fontSize: 15, color: "var(--cream-muted)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 8px" }}>
            {prettyWhen} · {mode === "visio" ? "en visio" : "en présentiel"}.
          </p>
          <p style={{ fontSize: 13.5, color: "var(--cream-hint)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto 28px" }}>
            Ton coach{coachName ? ` ${coachName}` : ""} a été prévenu. Ajoute le créneau à ton agenda pour ne pas l'oublier.
          </p>
          <a
            href={gcalHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", padding: "15px 24px",
              background: PUBLIC_TOKENS.gradCta, color: PUBLIC_TOKENS.cream,
              borderRadius: 14, textDecoration: "none",
              fontFamily: PUBLIC_FONTS.display, fontSize: 15, fontWeight: 600,
              maxWidth: 360, margin: "0 auto",
              boxShadow: "0 12px 32px -8px rgba(45,212,191,0.55)",
            }}
          >
            📅 Ajouter à Google Agenda
          </a>
        </div>
      </PublicShell>
    );
  }

  // ─── Réservation ──────────────────────────────────────────────────────────
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
                  flex: 1, padding: "14px 12px", borderRadius: 14,
                  background: active ? "color-mix(in srgb, var(--teal) 14%, transparent)" : "var(--glass)",
                  border: `1px solid ${active ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
                  color: "var(--cream)", cursor: "pointer",
                  fontFamily: PUBLIC_FONTS.display, fontSize: 14.5, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.18s",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 18 }}>{opt.emoji}</span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--cream-muted)", fontSize: 14, padding: "20px 0" }}>Chargement des créneaux…</p>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 18px", background: "var(--glass)", border: "1px solid var(--hair)", borderRadius: 16 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            <p style={{ fontSize: 14, color: "var(--cream-muted)", lineHeight: 1.6 }}>
              Aucun créneau ouvert pour le moment{coachName ? ` chez ${coachName}` : ""}. Pas d'inquiétude — ton coach va te recontacter directement.
            </p>
          </div>
        ) : (
          <>
            {/* Jours */}
            <div style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 13, fontWeight: 600, color: "var(--cream-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
              Choisis un jour
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 24, WebkitOverflowScrolling: "touch" }}>
              {groups.map((g) => {
                const { dow, num, mon } = parisDayParts(g.sample);
                const active = selectedKey === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => { setSelectedKey(g.key); setSelectedSlot(null); setBookingError(null); }}
                    style={{
                      flex: "0 0 auto", width: 64, padding: "10px 0", borderRadius: 14,
                      background: active ? "color-mix(in srgb, var(--teal) 16%, transparent)" : "var(--glass)",
                      border: `1px solid ${active ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
                      color: "var(--cream)", cursor: "pointer", textAlign: "center", transition: "all 0.18s",
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
            {selectedGroup && (
              <>
                <div style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 13, fontWeight: 600, color: "var(--cream-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                  Choisis un créneau
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 10, marginBottom: 28 }}>
                  {selectedGroup.slots.map((s) => {
                    const active = selectedSlot?.getTime() === s.getTime();
                    return (
                      <button
                        key={s.toISOString()}
                        type="button"
                        onClick={() => { setSelectedSlot(s); setBookingError(null); }}
                        style={{
                          padding: "12px 0", borderRadius: 12,
                          background: active ? PUBLIC_TOKENS.gradCta : "var(--glass)",
                          border: `1px solid ${active ? "transparent" : "var(--hair)"}`,
                          color: active ? PUBLIC_TOKENS.cream : "var(--cream)",
                          cursor: "pointer", fontFamily: PUBLIC_FONTS.display, fontSize: 14.5, fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                      >
                        {parisTime(s)}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {bookingError && (
          <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(251,113,133,0.12)", color: PUBLIC_TOKENS.coral, fontSize: 13, border: "1px solid rgba(251,113,133,0.4)" }}>
            {bookingError}
          </div>
        )}

        {groups.length > 0 && (
          <>
            <PublicCtaPrimary onClick={handleConfirm} disabled={!canConfirm}>
              {submitting ? "Réservation…" : "Confirmer mon rendez-vous →"}
            </PublicCtaPrimary>
            <p style={{ marginTop: 14, fontSize: 12, color: "var(--cream-hint)", fontFamily: PUBLIC_FONTS.mono, letterSpacing: "0.06em", textAlign: "center" }}>
              Sans engagement · ton coach est prévenu instantanément
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}
