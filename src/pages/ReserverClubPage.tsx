// =============================================================================
// ReserverClubPage — tunnel public "séance découverte" du Breakfast Club.
// Route : /reserver  (et /reserver/:clubSlug, défaut "verdun").
//
// Écran 1 capture  → crée un lead CRM (edge submit-prospect-lead, source=site-club).
// Écran 2 dispo    → vrais créneaux (RPC get_club_discovery_availability) + réservation
//                    (edge book-club-discovery : capacité N atomique + email + notif).
// Écran 3 confirmation.
//
// Identité crème PROPRE au club (≠ thème app). Maquette validée :
// scratchpad/maquette/reserver.html. Copy + photos = WIP (itérations à venir).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import "./ReserverClubPage.css";

type Screen = "capture" | "dispo" | "confirm";
type Objectif = "poids" | "muscle" | "energie";

const LOGO = "/brand/breakfast-club/logo-wordmark-dark.png";
const HEART = "/brand/breakfast-club/logo-heart.png";
const OBJECTIFS: { id: Objectif; label: string; icon: string }[] = [
  { id: "poids", label: "Perdre du poids", icon: "⚖️" },
  { id: "muscle", label: "Reprendre du muscle", icon: "💪" },
  { id: "energie", label: "Retrouver de l'énergie", icon: "⚡" },
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

interface Slot { iso: string; time: string; remaining: number }

export function ReserverClubPage() {
  const { clubSlug } = useParams<{ clubSlug?: string }>();
  const slug = (clubSlug ?? "verdun").trim() || "verdun";
  const [searchParams] = useSearchParams();

  const [screen, setScreen] = useState<Screen>("capture");

  // Lead
  const [objectif, setObjectif] = useState<Objectif | "">("");
  const [people, setPeople] = useState<1 | 2>(1);
  const [partner, setPartner] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [ville, setVille] = useState("");

  // Dispo
  const [loading, setLoading] = useState(false);
  const [slotsByDay, setSlotsByDay] = useState<Map<string, Slot[]>>(new Map());
  const [cal, setCal] = useState<{ year: number; month: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-sélection objectif via ?objectif=
  useEffect(() => {
    const q = searchParams.get("objectif");
    if (q === "poids" || q === "muscle" || q === "energie") setObjectif(q);
  }, [searchParams]);

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    const sb = await getSupabaseClient();
    if (!sb) { setLoading(false); return; }
    const { data, error: rpcErr } = await sb.rpc("get_club_discovery_availability", { p_slug: slug, p_days: 90 });
    if (rpcErr || !data) { setSlotsByDay(new Map()); setLoading(false); return; }
    const rows = data as Array<{ slot_start: string; remaining: number }>;
    const map = new Map<string, Slot[]>();
    for (const r of rows) {
      const key = parisDayKey(r.slot_start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ iso: r.slot_start, time: parisTime(r.slot_start), remaining: r.remaining });
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

  async function submitCapture(e: FormEvent) {
    e.preventDefault();
    // L'objectif qualifie le lead dès son arrivée dans le CRM : sans lui, le
    // coach reçoit un prénom et un téléphone sans savoir ce que la personne
    // vient chercher. Les boutons ne sont pas des <input>, la validation
    // native du formulaire ne les couvre donc pas.
    if (!objectif) {
      setError("Choisis ton objectif pour continuer.");
      document.getElementById("rc-objectif")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    setSubmitting(true);
    const sb = await getSupabaseClient();
    // Crée le lead CRM (non bloquant : un échec ne doit pas empêcher la résa)
    try {
      if (sb) {
        await sb.functions.invoke("submit-prospect-lead", {
          body: {
            first_name: prenom.trim(),
            phone: tel.trim(),
            city: ville.trim(),
            email: email.trim(),
            source: "site-club",
            coach_slug: slug,
            utm_source: searchParams.get("utm_source") ?? undefined,
            utm_medium: searchParams.get("utm_medium") ?? undefined,
            utm_campaign: searchParams.get("utm_campaign") ?? undefined,
            metadata: {
              nom: nom.trim(),
              objectif: objectif || null,
              people_count: people,
              partner_first_name: people === 2 ? partner.trim() || null : null,
            },
          },
        });
      }
    } catch { /* lead best-effort */ }
    setSubmitting(false);
    setScreen("dispo");
    void loadAvailability();
  }

  async function confirmBooking() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) { setError("Connexion indisponible."); setSubmitting(false); return; }
    const { data, error: invErr } = await sb.functions.invoke("book-club-discovery", {
      body: {
        clubSlug: slug,
        slotStart: selectedSlot.iso,
        firstName: prenom.trim(),
        contact: email.trim(),
        peopleCount: people,
        partnerFirstName: people === 2 ? partner.trim() : "",
        objectif: objectif || "",
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
        setError("La réservation a échoué. Réessaie dans un instant.");
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setScreen("confirm");
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
      const daySlotsArr = slotsByDay.get(key);
      const rem = daySlotsArr ? daySlotsArr.reduce((a, s) => a + s.remaining, 0) : 0;
      let status: "past" | "off" | "full" | "few" | "open";
      if (past) status = "past";
      else if (!daySlotsArr) status = "off";
      else if (rem === 0) status = "full";
      else if (rem <= 3) status = "few";
      else status = "open";
      const clickable = status === "open" || status === "few";
      const on = selectedDay === key;
      const st: CSSProperties = { cursor: clickable ? "pointer" : "not-allowed" };
      if (on) Object.assign(st, { background: "#1E3330", color: "#FAF6EF", boxShadow: "0 8px 18px -8px rgba(30,51,48,.5)" });
      else if (status === "past") Object.assign(st, { background: "transparent", color: "rgba(30,51,48,.20)" });
      else if (status === "off") Object.assign(st, { background: "repeating-linear-gradient(-45deg,#EBE5DA,#EBE5DA 4px,#F5F1E9 4px,#F5F1E9 8px)", color: "rgba(30,51,48,.34)" });
      else if (status === "full") Object.assign(st, { background: "#F4E0D9", color: "#B06A54" });
      else if (status === "few") Object.assign(st, { background: "#FBEBCF", color: "#8A6412" });
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

  const confPeople = people === 2 ? (partner.trim() ? `Pour toi et ${partner.trim()} (2 personnes)` : "Pour toi et ton binôme (2 personnes)") : "Pour toi (1 personne)";
  const confWhen = selectedSlot
    ? `${capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(selectedSlot.iso)))} à ${selectedSlot.time}.`
    : "";

  return (
    <div className="rc">
      <header className="rc-header"><div className="rc-wrap in">
        <a href={`/reserver${slug !== "verdun" ? `/${slug}` : ""}`} onClick={(e) => { e.preventDefault(); setScreen("capture"); }} aria-label="Recommencer">
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
            <p className="rc-eyebrow">Étape 1 sur 2 · Réservation</p>
            <h1 style={{ marginTop: 12, fontSize: "clamp(30px,4.4vw,48px)" }}>Ta séance découverte commence ici.</h1>
            <p style={{ margin: "14px 0 0", fontSize: "clamp(15px,1.4vw,17px)", lineHeight: 1.6, color: "var(--sub)" }}>
              Dis-nous où tu en es, puis choisis ton créneau. Le body scan et le bilan bien-être sont <strong>offerts</strong>, sans aucun engagement.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "clamp(20px,3vw,32px)", alignItems: "start", marginTop: "clamp(24px,3vw,36px)" }}>
            {/* récap */}
            <div>
              <aside className="rc-card" style={{ padding: "clamp(26px,3vw,38px)" }}>
                <p className="rc-eyebrow" style={{ fontSize: 12, letterSpacing: ".22em" }}>Ce que tu réserves</p>
                <h2 style={{ marginTop: 12, fontSize: "clamp(26px,3.2vw,38px)" }}>Séance découverte</h2>
                <p style={{ margin: "8px 0 0", fontSize: 16, color: "#5F7154" }}>≈ 20 min avec un coach, au club de Verdun.</p>
                <ul style={{ listStyle: "none", margin: "24px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
                  {["Analyse de composition corporelle (body scan)", "Bilan bien-être personnalisé", "Tes objectifs, à ton rythme", "Seul·e ou à deux — comme tu veux", "Aucun paiement, aucun engagement"].map((t) => (
                    <li key={t} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 12, fontSize: 16, lineHeight: 1.4, color: "#3A443F" }}>
                      <span aria-hidden="true" style={{ color: "var(--orange)", fontWeight: 700 }}>✓</span>{t}
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 26, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontWeight: 700, fontSize: 17 }}>À régler aujourd'hui</span>
                  <span style={{ fontFamily: "Anton", fontSize: 34, color: "#5F7154" }}>0 €</span>
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
                <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--orange)" }}>Tes informations</span>
              </div>
              <h2 style={{ marginTop: 14, fontSize: "clamp(24px,3.2vw,34px)" }}>Qui es-tu ?</h2>

              <p id="rc-objectif" style={{ margin: "24px 0 0", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>Ton objectif</p>
              <div className="rc-obj" role="radiogroup" aria-label="Ton objectif" aria-required="true" style={{ marginTop: 12 }}>
                {OBJECTIFS.map((o) => (
                  <button type="button" key={o.id} role="radio" aria-checked={objectif === o.id} onClick={() => { setObjectif(o.id); setError(null); }}>
                    <span className="ic" aria-hidden="true">{o.icon}</span><span className="t">{o.label}</span>
                  </button>
                ))}
              </div>
              {error && <div className="rc-err" role="alert">{error}</div>}

              <p style={{ margin: "24px 0 0", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>Tu viens…</p>
              <div className="rc-seg" role="radiogroup" aria-label="Nombre de personnes" style={{ marginTop: 12 }}>
                <button type="button" aria-pressed={people === 1} onClick={() => setPeople(1)}><span aria-hidden="true">🙋</span>Seul·e</button>
                <button type="button" aria-pressed={people === 2} onClick={() => setPeople(2)}><span aria-hidden="true">👫</span>À deux</button>
              </div>
              {people === 2 && (
                <label style={{ display: "block", marginTop: 14 }}>
                  <span className="rc-lbl">Prénom de ton binôme <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optionnel)</span></span>
                  <input className="rc-field" type="text" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Alex" />
                </label>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 22 }}>
                <label><span className="rc-lbl">Prénom</span><input className="rc-field" type="text" required value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" placeholder="Marie" /></label>
                <label><span className="rc-lbl">Nom</span><input className="rc-field" type="text" required value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" placeholder="Dupont" /></label>
              </div>
              <label style={{ display: "block", marginTop: 14 }}><span className="rc-lbl">Email</span><input className="rc-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="marie.dupont@email.com" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <label><span className="rc-lbl">Téléphone</span><input className="rc-field" type="tel" required value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" placeholder="06 79 44 87 59" /></label>
                <label><span className="rc-lbl">Ville</span><input className="rc-field" type="text" required value={ville} onChange={(e) => setVille(e.target.value)} autoComplete="address-level2" placeholder="Verdun" /></label>
              </div>

              <button type="submit" className="rc-cta" style={{ marginTop: 26 }} disabled={submitting}>{submitting ? "…" : "Choisir mon créneau →"}</button>
              <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: 13, lineHeight: 1.5, color: "var(--muted)" }}>Tes infos restent chez nous · jamais revendues. Réservation gratuite et sans engagement.</p>
            </form>
          </div>
        </main>
      )}

      {/* ── ÉCRAN 2 — DISPO ── */}
      {screen === "dispo" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            <p className="rc-eyebrow">Étape 2 sur 2 · Ton créneau</p>
            <h1 style={{ marginTop: 14, fontSize: "clamp(30px,5vw,52px)" }}>Choisis quand on t'accueille.</h1>
          </div>

          <div className="rc-card rc-grid3" style={{ marginTop: "clamp(24px,3.5vw,36px)" }}>
            <aside className="rc-col info">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "none", width: 44, height: 44, borderRadius: 999, background: "#E7DCC4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} aria-hidden="true">☕</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: "#3A443F" }}>Breakfast Club · Verdun</span>
              </div>
              <h2 style={{ marginTop: 18, fontSize: "clamp(22px,2.4vw,27px)" }}>Séance découverte</h2>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>Body scan + bilan bien-être</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 13, fontSize: 15, color: "var(--sub)" }}>
                <div>🕒 ≈ 20 min</div>
                <div>📍 En personne · 11 rue Saint&nbsp;Pierre</div>
                <div>👥 {people === 2 ? "Pour 2 personnes" : "Pour 1 personne"}</div>
              </div>
              <p style={{ margin: "20px 0 0", fontSize: 14, lineHeight: 1.55, color: "#5F7154", paddingTop: 18, borderTop: "1px solid rgba(30,51,48,.1)" }}>
                Réservation <strong style={{ color: "var(--ink)" }}>gratuite et sans engagement</strong>. On t'accueille pour ton body scan et un vrai point sur tes objectifs.
              </p>
              <button type="button" onClick={() => setScreen("capture")} style={{ marginTop: 18, background: "none", border: "none", color: "var(--orange)", fontFamily: "Poppins", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 }}>← Modifier mes infos</button>
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
              <div className="rc-legend">
                <span><span className="rc-sw" style={{ background: "#E2EFD9" }} />Disponible</span>
                <span><span className="rc-sw" style={{ background: "#FBEBCF" }} />Dernières places</span>
                <span><span className="rc-sw" style={{ background: "#F4E0D9" }} />Complet</span>
                <span><span className="rc-sw" style={{ background: "repeating-linear-gradient(-45deg,#EBE5DA,#EBE5DA 3px,#F5F1E9 3px,#F5F1E9 6px)" }} />Fermé</span>
              </div>
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
                      const full = s.remaining <= 0;
                      const on = selectedSlot?.iso === s.iso;
                      return (
                        <button type="button" key={s.iso} className="rc-slot" disabled={full} aria-pressed={on}
                          style={on ? { borderColor: "var(--orange)", boxShadow: "0 10px 24px -14px rgba(224,83,42,.55)" } : undefined}
                          onClick={() => setSelectedSlot(s)}>
                          <span className="tm">{s.time}</span>
                          <span className="pl"><span className="rc-dot" style={{ background: full ? "#C9B0A6" : s.remaining === 1 ? "#E8A93A" : "#5F9E6E" }} />{full ? "Complet" : `${s.remaining} place${s.remaining > 1 ? "s" : ""}`}</span>
                        </button>
                      );
                    })}
                  </div>
                  {error && <div className="rc-err">{error}</div>}
                  {selectedSlot && <button type="button" className="rc-cta" style={{ marginTop: 16, minHeight: 54, fontSize: 16 }} disabled={submitting} onClick={confirmBooking}>{submitting ? "…" : "Confirmer ma réservation"}</button>}
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
              <h2 style={{ marginTop: 22, fontSize: "clamp(28px,3.6vw,42px)" }}>{prenom.trim() ? `C'est réservé, ${prenom.trim()} !` : "C'est réservé !"}</h2>
              <p style={{ margin: "14px 0 0", fontSize: 18, lineHeight: 1.6, color: "#3A443F" }}>{confWhen}</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 11, fontSize: 16, color: "var(--sub)" }}>
                <div>👤 {confPeople}</div>
                <div>📍 11 rue Saint&nbsp;Pierre, Verdun</div>
                <div>✉️ On t'envoie la confirmation et le rappel par email.</div>
              </div>
              <p style={{ margin: "22px 0 0", padding: "18px 20px", borderRadius: 16, background: "var(--panel)", fontSize: 15, lineHeight: 1.55, color: "#5F7154" }}>
                Ton bilan et ton body scan sont offerts. Après le rendez-vous, tu pourras choisir ta carte de visites si tu veux continuer — aucun engagement d'ici là.
              </p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
