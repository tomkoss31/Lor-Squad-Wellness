// =============================================================================
// ClubRejoindreRdvPage — tunnel public "en parler avec l'équipe" (recrutement).
// Route : /club/rejoindre/rdv[/:coachSlug]  (+ alias /rdv-rejoindre-l-equipe).
// CTA source : /club/rejoindre (« En parler avec l'équipe »).
//
// C'est le JUMEAU du tunnel "RDV découverte" /reserver (même identité crème,
// même calendrier), mais :
//   - SANS questions santé/poids → 2 courtes questions PRO (Tu cherches quoi ? /
//     Tu te projettes quand ?) + un mot libre facultatif.
//   - RÉSERVATION sur le VRAI agenda du coach : RPC get_coach_availability_by_slug
//     + edge book-rdv (bookingType='recrutement') → table rdv_bookings. On NE
//     reconstruit rien : c'est exactement le back-end du funnel /rdv, avec un
//     marqueur qui distingue le candidat équipe d'un prospect bilan côté CRM.
//
// Coach par défaut = "thomas" (il pilote l'ouverture de nouveaux clubs). Un slug
// dans l'URL (/club/rejoindre/rdv/:coachSlug) permet de router vers un autre coach.
// Identité crème PROPRE au club (≠ thème app) — réutilise ReserverClubPage.css.
// =============================================================================

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useClubHead } from "./useClubHead";
import "../ReserverClubPage.css";
import "./ClubRejoindreRdvPage.css";

type Screen = "capture" | "dispo" | "confirm";
type Mode = "presentiel" | "visio";
type Looking = "reconversion" | "complement" | "curieux";
type Timing = "asap" | "few-months" | "info";

const LOGO = "/brand/breakfast-club/logo-wordmark-dark.png";
const HEART = "/brand/breakfast-club/logo-heart.png";
const DEFAULT_COACH_SLUG = "thomas";
const TEL = "+33679448759";

const LOOKINGS: { id: Looking; label: string; icon: string }[] = [
  { id: "reconversion", label: "Une reconversion", icon: "🔄" },
  { id: "complement", label: "Un complément de revenu", icon: "💶" },
  { id: "curieux", label: "Juste curieux·se", icon: "👀" },
];
const TIMINGS: { id: Timing; label: string; icon: string }[] = [
  { id: "asap", label: "Dès que possible", icon: "🚀" },
  { id: "few-months", label: "Dans quelques mois", icon: "🗓️" },
  { id: "info", label: "Je me renseigne", icon: "💭" },
];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW = ["DIM.", "LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM."];

const p2 = (n: number) => String(n).padStart(2, "0");
const cellKey = (y: number, m: number, d: number) => `${y}-${p2(m + 1)}-${p2(d)}`;
function parisDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function parisTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));
}
function capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

interface Slot { iso: string; time: string }

export function ClubRejoindreRdvPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = (coachSlug ?? DEFAULT_COACH_SLUG).trim().toLowerCase() || DEFAULT_COACH_SLUG;
  const coachName = useMemo(() => capitalize(slug), [slug]);
  const [searchParams] = useSearchParams();
  useClubHead("En parler avec l'équipe · The Breakfast Club");

  const [screen, setScreen] = useState<Screen>("capture");

  // Réponses PRO + coordonnées
  const [looking, setLooking] = useState<Looking | "">("");
  const [timing, setTiming] = useState<Timing | "">("");
  const [note, setNote] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [ville, setVille] = useState("");
  const [mode, setMode] = useState<Mode>("presentiel");

  // Dispo
  const [loading, setLoading] = useState(false);
  const [slotsByDay, setSlotsByDay] = useState<Map<string, Slot[]>>(new Map());
  const [cal, setCal] = useState<{ year: number; month: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    const sb = await getSupabaseClient();
    if (!sb) { setLoading(false); return; }
    const { data, error: rpcErr } = await sb.rpc("get_coach_availability_by_slug", { p_slug: slug, p_days: 30 });
    if (rpcErr || !data) { setSlotsByDay(new Map()); setLoading(false); return; }
    const rows = data as Array<{ slot_start: string }>;
    const map = new Map<string, Slot[]>();
    for (const r of rows) {
      const key = parisDayKey(r.slot_start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ iso: r.slot_start, time: parisTime(r.slot_start) });
    }
    for (const arr of map.values()) arr.sort((a, b) => a.iso.localeCompare(b.iso));
    setSlotsByDay(map);
    const firstKey = [...map.keys()].sort()[0];
    if (firstKey) {
      const [y, m] = firstKey.split("-").map(Number);
      setCal({ year: y, month: m - 1 });
    } else {
      const now = new Date();
      setCal({ year: now.getFullYear(), month: now.getMonth() });
    }
    setLoading(false);
  }, [slug]);

  function submitCapture(e: FormEvent) {
    e.preventDefault();
    // Q1 qualifie le candidat dès son arrivée. Les boutons ne sont pas des
    // <input> → la validation native du formulaire ne les couvre pas.
    if (!looking) {
      setError("Dis-nous ce qui t'amène pour continuer.");
      document.getElementById("rjr-looking")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    setScreen("dispo");
    void loadAvailability();
  }

  async function confirmBooking() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) { setError("Connexion indisponible."); setSubmitting(false); return; }
    const { data, error: invErr } = await sb.functions.invoke("book-rdv", {
      body: {
        coachSlug: slug,
        mode,
        slotStart: selectedSlot.iso,
        firstName: prenom.trim(),
        contact: email.trim(),
        bookingType: "recrutement",
        lastName: nom.trim(),
        phone: tel.trim(),
        city: ville.trim(),
        looking,
        timing: timing || "",
        note: note.trim(),
      },
    });
    const res = data as { success?: boolean; error?: string } | null;
    if (invErr || !res?.success) {
      if (res?.error === "creneau_pris") {
        setError("Ce créneau vient d'être pris. Choisis-en un autre.");
        setSelectedSlot(null);
        setSelectedDay(null);
        void loadAvailability();
      } else {
        setError("La demande a échoué. Réessaie dans un instant.");
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setScreen("confirm");
  }

  // « Ajouter à mon agenda » : .ics téléchargeable (iOS/Android/desktop) → moins
  // de no-shows (l'événement + le rappel natif du téléphone).
  function addToCalendar() {
    if (!selectedSlot) return;
    const start = new Date(selectedSlot.iso);
    const end = new Date(start.getTime() + 30 * 60_000);
    const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const where = mode === "visio" ? "En visio — le lien te sera envoyé avant le RDV" : "11 rue Saint Pierre\\, 55100 Verdun";
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Breakfast Club//FR", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${start.getTime()}-rejoindre@labase-nutrition.com`,
      `DTSTAMP:${z(new Date())}`,
      `DTSTART:${z(start)}`,
      `DTEND:${z(end)}`,
      "SUMMARY:RDV équipe · The Breakfast Club",
      `LOCATION:${where}`,
      "DESCRIPTION:On parle du modèle du club\\, de tes questions\\, et de la suite. Sans engagement.",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "rdv-equipe-breakfast-club.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // ─── Calendrier ────────────────────────────────────────────────────────────
  const todayStart = useMemo(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }, []);
  const firstAvailKey = useMemo(() => [...slotsByDay.keys()].sort()[0] ?? null, [slotsByDay]);

  function moveMonth(delta: number) {
    if (!cal) return;
    let { year, month } = cal;
    month += delta;
    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }
    if (firstAvailKey) {
      const [fy, fm] = firstAvailKey.split("-").map(Number);
      if (year < fy || (year === fy && month < fm - 1)) return; // pas avant le 1er mois dispo
    }
    setCal({ year, month });
    setSelectedDay(null);
    setSelectedSlot(null);
  }

  const daySlots = selectedDay ? (slotsByDay.get(selectedDay) ?? []) : [];
  const noAvailability = !loading && slotsByDay.size === 0;

  function renderCalendar() {
    if (!cal) return null;
    const { year, month } = cal;
    const first = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    const cells: ReactNode[] = [];
    for (let i = 0; i < first; i++) cells.push(<div className="rc-cell" key={`b${i}`} />);
    for (let d = 1; d <= dim; d++) {
      const key = cellKey(year, month, d);
      const date = new Date(year, month, d);
      const past = date < todayStart;
      const hasSlots = (slotsByDay.get(key)?.length ?? 0) > 0;
      let status: "past" | "off" | "open";
      if (past) status = "past";
      else if (!hasSlots) status = "off";
      else status = "open";
      const clickable = status === "open";
      const on = selectedDay === key;
      const st: CSSProperties = { cursor: clickable ? "pointer" : "not-allowed" };
      if (on) Object.assign(st, { background: "#1E3330", color: "#FAF6EF", boxShadow: "0 8px 18px -8px rgba(30,51,48,.5)" });
      else if (status === "past") Object.assign(st, { background: "transparent", color: "rgba(30,51,48,.20)" });
      else if (status === "off") Object.assign(st, { background: "repeating-linear-gradient(-45deg,#EBE5DA,#EBE5DA 4px,#F5F1E9 4px,#F5F1E9 8px)", color: "rgba(30,51,48,.34)" });
      else Object.assign(st, { background: "#E2EFD9", color: "#2F5136" });
      cells.push(
        <div className="rc-cell" key={key}>
          <button type="button" className="rc-day" style={st} disabled={!clickable}
            aria-pressed={on}
            onClick={() => { setSelectedDay(key); setSelectedSlot(null); }}>{d}</button>
        </div>,
      );
    }
    return cells;
  }

  const confWhen = selectedSlot
    ? `${capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(selectedSlot.iso)))} à ${selectedSlot.time}.`
    : "";

  const utm = searchParams.get("utm_source");
  const restartHref = `/club/rejoindre/rdv${coachSlug ? `/${coachSlug}` : ""}${utm ? `?utm_source=${encodeURIComponent(utm)}` : ""}`;

  return (
    <div className="rc">
      <header className="rc-header"><div className="rc-wrap in">
        <a href={restartHref} onClick={(e) => { e.preventDefault(); setScreen("capture"); }} aria-label="Recommencer">
          <img src={LOGO} alt="The Breakfast Club by La Base" />
        </a>
        <div className="rc-badge">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
          Sans engagement
        </div>
      </div></header>

      {/* ── ÉCRAN 1 — CAPTURE ── */}
      {screen === "capture" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            <p className="rc-eyebrow">Étape 1 sur 2 · On se rencontre</p>
            <h1 style={{ marginTop: 12, fontSize: "clamp(30px,4.4vw,48px)" }}>On commence par en parler.</h1>
            <p style={{ margin: "14px 0 0", fontSize: "clamp(15px,1.4vw,17px)", lineHeight: 1.6, color: "var(--sub)" }}>
              Dis-nous ce que tu cherches, puis choisis quand on se parle. 20-30 min, <strong>sans discours de vente</strong> et sans engagement.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "clamp(20px,3vw,32px)", alignItems: "start", marginTop: "clamp(24px,3vw,36px)" }}>
            {/* récap */}
            <div>
              <aside className="rc-card" style={{ padding: "clamp(26px,3vw,38px)" }}>
                <p className="rc-eyebrow" style={{ fontSize: 12, letterSpacing: ".22em" }}>Ce dont on parle</p>
                <h2 style={{ marginTop: 12, fontSize: "clamp(26px,3.2vw,38px)" }}>En parler avec l'équipe</h2>
                <p style={{ margin: "8px 0 0", fontSize: 16, color: "#5F7154" }}>≈ 30 min avec {coachName}, au club de Verdun ou en visio.</p>
                <ul style={{ listStyle: "none", margin: "24px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
                  {["Le modèle du club, expliqué en vrai", "Tes questions, toutes tes questions", "Ce que ça demande (et ce que ça rapporte)", "On te forme — pas besoin d'être coach", "Aucun CV, aucun engagement"].map((t) => (
                    <li key={t} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 12, fontSize: 16, lineHeight: 1.4, color: "#3A443F" }}>
                      <span aria-hidden="true" style={{ color: "var(--orange)", fontWeight: 700 }}>✓</span>{t}
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 26, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontWeight: 700, fontSize: 17 }}>Le premier pas</span>
                  <span style={{ fontFamily: "Anton", fontSize: 30, color: "#5F7154" }}>Un échange</span>
                </div>
              </aside>
              <div style={{ display: "flex", justifyContent: "center", padding: "clamp(24px,4vw,40px) 0 0" }}>
                <img src={HEART} alt="" aria-hidden="true" style={{ width: "clamp(200px,24vw,280px)", height: "auto" }} />
              </div>
            </div>

            {/* formulaire */}
            <form className="rc-card" style={{ padding: "clamp(26px,3vw,40px)" }} onSubmit={submitCapture}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 999, background: "var(--grad)", color: "#fff", fontFamily: "Anton", fontSize: 16 }}>1</span>
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--orange)" }}>Tes réponses</span>
              </div>
              <h2 style={{ marginTop: 14, fontSize: "clamp(24px,3.2vw,34px)" }}>Qu'est-ce qui t'amène ?</h2>

              <p id="rjr-looking" style={{ margin: "24px 0 0", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>Tu cherches plutôt…</p>
              <div className="rc-obj" role="radiogroup" aria-label="Ce que tu cherches" aria-required="true" style={{ marginTop: 12 }}>
                {LOOKINGS.map((o) => (
                  <button type="button" key={o.id} role="radio" aria-checked={looking === o.id} onClick={() => { setLooking(o.id); setError(null); }}>
                    <span className="ic" aria-hidden="true">{o.icon}</span><span className="t">{o.label}</span>
                  </button>
                ))}
              </div>

              <p style={{ margin: "24px 0 0", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>Tu te projettes quand ? <span style={{ color: "var(--muted)", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>(facultatif)</span></p>
              <div className="rc-obj" role="radiogroup" aria-label="Quand tu te projettes" style={{ marginTop: 12 }}>
                {TIMINGS.map((o) => (
                  <button type="button" key={o.id} role="radio" aria-checked={timing === o.id} onClick={() => setTiming(timing === o.id ? "" : o.id)}>
                    <span className="ic" aria-hidden="true">{o.icon}</span><span className="t">{o.label}</span>
                  </button>
                ))}
              </div>

              <label style={{ display: "block", marginTop: 24 }}>
                <span className="rc-lbl">Envie d'ajouter un mot ? <span style={{ color: "var(--muted)", fontWeight: 500 }}>(facultatif)</span></span>
                <textarea className="rc-field" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ton parcours, ta ville, ce qui te motive… deux lignes suffisent." />
              </label>

              <div style={{ margin: "26px 0 0", paddingTop: 22, borderTop: "1px solid var(--line)" }}>
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--orange)" }}>Pour te recontacter</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                <label><span className="rc-lbl">Ton prénom</span><input className="rc-field" type="text" required value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" placeholder="Alex" /></label>
                <label><span className="rc-lbl">Ton nom</span><input className="rc-field" type="text" required value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" placeholder="Martin" /></label>
              </div>
              <label style={{ display: "block", marginTop: 14 }}><span className="rc-lbl">Email</span><input className="rc-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="alex.martin@email.com" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <label><span className="rc-lbl">Téléphone</span><input className="rc-field" type="tel" required value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" placeholder="06 79 44 87 59" /></label>
                <label><span className="rc-lbl">Ta ville <span style={{ color: "var(--muted)", fontWeight: 500 }}>(facultatif)</span></span><input className="rc-field" type="text" value={ville} onChange={(e) => setVille(e.target.value)} autoComplete="address-level2" placeholder="Verdun, ou ailleurs" /></label>
              </div>

              {error && <div className="rc-err" role="alert" style={{ marginTop: 18 }}>{error}</div>}
              <button type="submit" className="rc-cta" style={{ marginTop: 26 }}>Choisir un créneau →</button>
              <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>Tes infos restent chez nous · jamais revendues. Aucun engagement.</p>
              <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 14, lineHeight: 1.5, color: "var(--sub)" }}>Tu préfères le téléphone ? <a href={`tel:${TEL}`} style={{ color: "var(--orange)", fontWeight: 700, textDecoration: "none" }}>Appelle-nous</a>, on prend le temps d'en parler.</p>
            </form>
          </div>
        </main>
      )}

      {/* ── ÉCRAN 2 — DISPO ── */}
      {screen === "dispo" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            <p className="rc-eyebrow">Étape 2 sur 2 · Le créneau</p>
            <h1 style={{ marginTop: 14, fontSize: "clamp(30px,5vw,52px)" }}>Choisis quand on se parle.</h1>
          </div>

          <div className="rc-card rc-grid3" style={{ marginTop: "clamp(24px,3.5vw,36px)" }}>
            <aside className="rc-col info">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "none", width: 44, height: 44, borderRadius: 999, background: "#E7DCC4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} aria-hidden="true">💬</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: "#3A443F" }}>Échange · {coachName}</span>
              </div>
              <h2 style={{ marginTop: 18, fontSize: "clamp(22px,2.4vw,27px)" }}>En parler ensemble</h2>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>Le modèle du club · tes questions</p>

              {/* Présentiel / Visio */}
              <div className="rc-seg" role="radiogroup" aria-label="Format du rendez-vous" style={{ marginTop: 18 }}>
                <button type="button" aria-pressed={mode === "presentiel"} onClick={() => setMode("presentiel")}><span aria-hidden="true">🤝</span>Au club</button>
                <button type="button" aria-pressed={mode === "visio"} onClick={() => setMode("visio")}><span aria-hidden="true">💻</span>En visio</button>
              </div>

              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 13, fontSize: 15, color: "var(--sub)" }}>
                <div>🕒 20-30 min</div>
                <div>{mode === "visio" ? "💻 En visio · lien envoyé avant" : "📍 En personne · 11 rue Saint Pierre"}</div>
                <div>💬 Sans discours de vente</div>
              </div>
              <p style={{ margin: "20px 0 0", fontSize: 14, lineHeight: 1.55, color: "#5F7154", paddingTop: 18, borderTop: "1px solid rgba(30,51,48,.1)" }}>
                Rencontre <strong style={{ color: "var(--ink)" }}>gratuite et sans engagement</strong>. On répond à tout, tu décides ensuite.
              </p>
              <button type="button" onClick={() => setScreen("capture")} style={{ marginTop: 18, background: "none", border: "none", color: "var(--orange)", fontFamily: "Poppins", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>← Modifier mes réponses</button>
            </aside>

            <section className="rc-col">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <p style={{ margin: 0, fontFamily: "Anton", fontSize: 22 }}>{cal ? MONTHS[cal.month] : ""} <span style={{ color: "var(--muted)" }}>{cal?.year}</span></p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="rc-navbtn" aria-label="Mois précédent" onClick={() => moveMonth(-1)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
                  <button type="button" className="rc-navbtn" aria-label="Mois suivant" onClick={() => moveMonth(1)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginTop: 20 }}>
                {DOW.map((d) => <div className="rc-dow" key={d}>{d}</div>)}
                {loading ? <div style={{ gridColumn: "1 / -1", padding: "30px 0", textAlign: "center", color: "var(--muted)" }}>Chargement des créneaux…</div> : renderCalendar()}
              </div>
              {noAvailability ? (
                <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 14, background: "var(--panel)", fontSize: 14, lineHeight: 1.55, color: "#5F7154" }}>
                  Aucun créneau ouvert pour l'instant. Laisse-nous tes infos et <a href={`tel:${TEL}`} style={{ color: "var(--orange)", fontWeight: 700 }}>appelle-nous</a> — on cale ça ensemble.
                </div>
              ) : (
                <div className="rc-legend">
                  <span><span className="rc-sw" style={{ background: "#E2EFD9" }} />Disponible</span>
                  <span><span className="rc-sw" style={{ background: "repeating-linear-gradient(-45deg,#EBE5DA,#EBE5DA 3px,#F5F1E9 3px,#F5F1E9 6px)" }} />Fermé</span>
                </div>
              )}
            </section>

            <section className="rc-col slots">
              {!selectedDay ? (
                <div style={{ minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12, color: "var(--muted)" }}>
                  <span style={{ fontSize: 30 }} aria-hidden="true">📅</span>
                  <span style={{ fontSize: 15, lineHeight: 1.5, maxWidth: "20ch" }}>Choisis un jour pour voir les créneaux disponibles.</span>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(daySlots[0]?.iso ?? selectedDay)))}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, maxHeight: 320, overflow: "auto" }}>
                    {daySlots.map((s) => {
                      const on = selectedSlot?.iso === s.iso;
                      return (
                        <button type="button" key={s.iso} className="rc-slot" aria-pressed={on}
                          style={on ? { borderColor: "var(--orange)", boxShadow: "0 10px 24px -14px rgba(224,83,42,.55)" } : undefined}
                          onClick={() => setSelectedSlot(s)}>
                          <span className="tm">{s.time}</span>
                          <span className="pl"><span className="rc-dot" style={{ background: "#5F9E6E" }} />Dispo</span>
                        </button>
                      );
                    })}
                  </div>
                  {error && <div className="rc-err">{error}</div>}
                  {selectedSlot && <button type="button" className="rc-cta" style={{ marginTop: 16, minHeight: 54, fontSize: 16 }} disabled={submitting} onClick={confirmBooking}>{submitting ? "…" : "Confirmer le rendez-vous"}</button>}
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ── ÉCRAN 3 — CONFIRMATION ── */}
      {screen === "confirm" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            <p className="rc-eyebrow">C'est tout bon</p>
            <div className="rc-card" style={{ marginTop: 16, padding: "clamp(30px,4vw,52px)" }}>
              <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 999, background: "rgba(147,166,126,.2)", color: "#5F7154", fontSize: 30 }}>✓</span>
              <h2 style={{ marginTop: 22, fontSize: "clamp(28px,3.6vw,42px)" }}>{prenom.trim() ? `C'est noté, ${prenom.trim()} !` : "C'est noté !"}</h2>
              <p style={{ margin: "14px 0 0", fontSize: 18, lineHeight: 1.6, color: "#3A443F" }}>{confWhen}</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 11, fontSize: 16, color: "var(--sub)" }}>
                <div>{mode === "visio" ? "💻 En visio — on t'envoie le lien avant" : "📍 11 rue Saint Pierre, Verdun"}</div>
                <div>👤 Avec {coachName} et l'équipe</div>
                <div>✉️ On t'envoie la confirmation par email.</div>
              </div>
              <p style={{ margin: "22px 0 0", padding: "18px 20px", borderRadius: 16, background: "var(--panel)", fontSize: 15, lineHeight: 1.55, color: "#5F7154" }}>
                On prend le temps d'en parler, sans discours de vente. Tu poses toutes tes questions, et tu décides ensuite — aucun engagement.
              </p>
              <button type="button" className="rc-cta" style={{ marginTop: 22, minHeight: 54, width: "100%" }} onClick={addToCalendar}>
                <span aria-hidden="true">📅</span> Ajouter à mon agenda
              </button>
              <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 13.5, color: "var(--muted)" }}>Comme ça, tu n'oublies pas — et ton téléphone te rappelle.</p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
