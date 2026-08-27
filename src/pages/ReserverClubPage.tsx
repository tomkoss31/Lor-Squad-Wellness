// =============================================================================
// ReserverClubPage — tunnel public "RDV découverte" du Breakfast Club.
// Route : /reserver  (et /reserver/:clubSlug, défaut "verdun").
//
// PARCOURS ALLÉGÉ (27/08, validé Thomas — maquette v4).
// Mesuré le 27/08 : 7 personnes arrivent, 2 SEULEMENT touchent quoi que ce soit,
// 0 atteint les créneaux. La fuite est tout en haut — la page ouvrait sur une
// grosse carte récap + un formulaire de 7 champs. Trop, trop tôt.
//
// Écran 1 objectif → un seul tap (⚖️/💪/⚡). Rien d'autre. C'est l'accroche qui
//                    qualifie le lead, et via ?objectif= la pub Meta y atterrit
//                    déjà cochée → on saute direct aux créneaux.
// Écran 2 dispo    → vrais créneaux (RPC get_club_discovery_availability). Choisir
//                    une heure fait AVANCER à l'écran coordonnées. « Aucun horaire
//                    ne me va » reste ici (capte les dispos à rappeler).
// Écran 3 coordonnées → Prénom/Nom/Tél/Ville/Email + « comment tu as connu le
//                    club ? » (obligatoire : seule mesure du flyer qui marche).
//                    « Simple » : la fiche CRM se crée MAINTENANT, à la
//                    validation — pas avant. Qui lâche ici ne laisse pas de trace.
// Écran 4 confirmation.
//
// La réservation (book-club-discovery) est atomique ; la fiche CRM
// (submit-prospect-lead, idempotent depuis le 24/08) et la provenance partent
// APRÈS, en arrière-plan : une information ne doit jamais faire échouer un RDV.
//
// Identité crème PROPRE au club (≠ thème app).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import {
  PROVENANCE_CANAUX_TUNNEL,
  provenanceDesigneQuelquun,
  type ProvenanceCanalTunnel,
} from "../types/domain";
import { useClubHead } from "./club/useClubHead";
import "./ReserverClubPage.css";

import { useEtapeTunnel } from "../features/audience/useEtapeTunnel";
type Screen = "objectif" | "dispo" | "coordonnees" | "confirm";
type Objectif = "poids" | "muscle" | "energie";

// En-tête sur fond crème → wordmark AVEC le cœur rouge (logo-heart), le même
// que le menu du site.
const LOGO = "/brand/breakfast-club/logo-heart.png";
const HEART = "/brand/breakfast-club/logo-heart.png";
const OBJECTIFS: { id: Objectif; label: string; icon: string; sub: string }[] = [
  { id: "poids", label: "Perdre du poids", icon: "⚖️", sub: "Retrouver la forme, durablement" },
  { id: "muscle", label: "Reprendre du muscle", icon: "💪", sub: "Me tonifier, me renforcer" },
  { id: "energie", label: "Retrouver de l'énergie", icon: "⚡", sub: "Mieux dans mes journées" },
];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const DOW = ["DIM.", "LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM."];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// ── « Comment tu as connu le club ? » ───────────────────────────────────────
// Les VALEURS viennent de `domain.ts` — source unique partagée avec le CRM, les
// deux bilans et le vocabulaire fermé de la RPC. Seules les PHRASES sont propres
// à cet écran.
const LIBELLES_CANAL: Record<ProvenanceCanalTunnel, { emoji: string; libelle: string }> = {
  flyer: { emoji: "📬", libelle: "Un flyer dans ma boîte aux lettres" },
  parle: { emoji: "💬", libelle: "Quelqu'un m'en a parlé" },
  reseaux: { emoji: "📱", libelle: "Instagram ou Facebook" },
  autre: { emoji: "✨", libelle: "Autrement" },
};

// Même borne qu'en base (`left(v_libre, 80)` dans `noter_provenance_lead`).
const PRENOM_MAX = 80;
// Même borne que la RPC `noter_disponibilites_lead`.
const DISPO_MAX = 300;

export function ReserverClubPage() {
  const { clubSlug } = useParams<{ clubSlug?: string }>();
  const slug = (clubSlug ?? "verdun").trim() || "verdun";
  const [searchParams] = useSearchParams();
  useClubHead("Réserver mon RDV découverte · The Breakfast Club");

  const [screen, setScreen] = useState<Screen>("objectif");

  // Entonnoir du NOUVEAU parcours. Noms distincts de l'ancien jeu d'étapes
  // (« coordonnees »/« saisie commencee »/« choix du creneau »/« confirme »)
  // pour ne pas mélanger deux flux différents dans la même vue d'audience :
  // l'ancien s'arrête, le nouveau démarre proprement.
  useEtapeTunnel(
    "reserver-club",
    screen === "objectif" ? "page objectif" : screen === "dispo" ? "voit les creneaux" : screen === "coordonnees" ? "saisit coordonnees" : "reserve",
    screen === "objectif" ? 0 : screen === "dispo" ? 1 : screen === "coordonnees" ? 2 : 3,
  );

  // Lead
  const [objectif, setObjectif] = useState<Objectif | "">("");
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

  // La réponse à « comment tu as connu le club ? », posée à l'écran coordonnées.
  const [canal, setCanal] = useState<ProvenanceCanalTunnel | null>(null);
  const [prenomSource, setPrenomSource] = useState("");

  // « Aucun horaire ne me va » — porte de secours sur l'écran créneaux. Comme la
  // fiche ne se crée plus en amont (mode « simple »), cette boîte capte elle-même
  // le minimum pour rappeler : un prénom, un numéro, et les disponibilités.
  const [dispoOuvert, setDispoOuvert] = useState(false);
  const [dispoPrenom, setDispoPrenom] = useState("");
  const [dispoTel, setDispoTel] = useState("");
  const [dispoTexte, setDispoTexte] = useState("");
  const [dispoEtat, setDispoEtat] = useState<"repos" | "envoi" | "fait" | "erreur">("repos");

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

  // Choisir son objectif AMÈNE aux créneaux. Un seul geste, et l'écran change :
  // c'est l'inverse exact de l'ancienne page, où l'objectif était noyé dans un
  // formulaire de sept champs qu'il fallait finir avant de voir une seule heure.
  const allerAuxCreneaux = useCallback((o: Objectif) => {
    setObjectif(o);
    setError(null);
    setScreen("dispo");
    void loadAvailability();
  }, [loadAvailability]);

  // Pré-sélection objectif via ?objectif= : la pub Meta pointe vers
  // /reserver?objectif=poids → on atterrit DIRECTEMENT sur les créneaux, l'ad
  // ayant déjà répondu « c'est pour quoi ». Une seule fois, au montage.
  useEffect(() => {
    const q = searchParams.get("objectif");
    if (q === "poids" || q === "muscle" || q === "energie") {
      setObjectif(q);
      setScreen("dispo");
      void loadAvailability();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Crée (ou reprend) la fiche CRM. Idempotent côté edge depuis le 24/08. */
  async function creerFiche(): Promise<string | null> {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return null;
      const { data: creation } = await sb.functions.invoke("submit-prospect-lead", {
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
          metadata: { nom: nom.trim(), objectif: objectif || null, people_count: 1 },
        },
      });
      return (creation as { id?: string } | null)?.id ?? null;
    } catch {
      // Fiche best-effort : la réservation, elle, est déjà acquise.
      return null;
    }
  }

  /**
   * Écrit la provenance sur la fiche. Best-effort, APRÈS la réservation.
   * UNE SEULE réponse par lead (`deja_repondu`) : canal et prénom ensemble.
   */
  async function noterProvenance(idDuLead: string, c: ProvenanceCanalTunnel, prenomTape: string) {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { error } = await sb.rpc("noter_provenance_lead", {
        p_lead_id: idDuLead,
        p_canal: c,
        p_libre: provenanceDesigneQuelquun(c) ? prenomTape.trim().slice(0, PRENOM_MAX) || null : null,
      });
      // Repli si la migration `20261215100000` n'est pas encore appliquée
      // (l'ancienne fonction n'a pas `p_libre` → PGRST202) : on repose sans le
      // prénom, le canal étant l'essentiel récupérable.
      if (error?.code === "PGRST202") {
        await sb.rpc("noter_provenance_lead", { p_lead_id: idDuLead, p_canal: c });
      }
    } catch { /* la réponse est un bonus, jamais un obstacle */ }
  }

  /**
   * « Aucun horaire ne me va » — la personne dicte ses disponibilités.
   * Se suffit à elle-même : crée la fiche avec son prénom + numéro, puis y écrit
   * les dispos (aussi rangées dans metadata, au cas où la RPC tombe). L'échec est
   * DIT : on lui a promis un rappel, elle a le droit de savoir s'il n'est pas parti.
   */
  async function envoyerDisponibilites() {
    const texte = dispoTexte.trim();
    if (!texte || dispoEtat === "envoi") return;
    if (!dispoPrenom.trim() || dispoTel.replace(/\D/g, "").length < 6) { setDispoEtat("erreur"); return; }
    setDispoEtat("envoi");
    try {
      const sb = await getSupabaseClient();
      if (!sb) { setDispoEtat("erreur"); return; }
      const { data: creation } = await sb.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: dispoPrenom.trim(),
          phone: dispoTel.trim(),
          source: "site-club",
          coach_slug: slug,
          utm_source: searchParams.get("utm_source") ?? undefined,
          utm_medium: searchParams.get("utm_medium") ?? undefined,
          utm_campaign: searchParams.get("utm_campaign") ?? undefined,
          metadata: { objectif: objectif || null, dispo_souhaitee: texte.slice(0, DISPO_MAX) },
        },
      });
      const idDuLead = (creation as { id?: string } | null)?.id ?? null;
      if (!idDuLead) { setDispoEtat("erreur"); return; }
      const { data, error } = await sb.rpc("noter_disponibilites_lead", {
        p_lead_id: idDuLead,
        p_texte: texte.slice(0, DISPO_MAX),
      });
      setDispoEtat(!error && data === "ok" ? "fait" : "erreur");
    } catch { setDispoEtat("erreur"); }
  }

  async function confirmBooking(e?: FormEvent) {
    e?.preventDefault();
    if (!selectedSlot) { setError("Choisis d'abord ton créneau."); return; }
    if (!prenom.trim() || !nom.trim() || tel.replace(/\D/g, "").length < 6 || !ville.trim() || !EMAIL_RE.test(email.trim())) {
      setError("Complète tes coordonnées pour réserver.");
      return;
    }
    // Le canal est la seule chose qu'on demande en échange (« Autrement » est la
    // sortie) : c'est ce qui dit quel flyer a marché, indevinable autrement.
    if (!canal) { setError("Dis-nous comment tu as connu le club pour valider."); return; }
    setSubmitting(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) { setError("Connexion indisponible."); setSubmitting(false); return; }
    const { data, error: invErr } = await sb.functions.invoke("book-club-discovery", {
      body: {
        clubSlug: slug,
        slotStart: selectedSlot.iso,
        firstName: prenom.trim(),
        lastName: nom.trim(),
        contact: email.trim(),
        phone: tel.trim(),
        city: ville.trim(),
        peopleCount: 1,
        objectif: objectif || "",
      },
    });
    const res = data as { success?: boolean; error?: string } | null;
    if (invErr || !res?.success) {
      if (res?.error === "creneau_pris") {
        // On le renvoie choisir : l'erreur s'affiche sur l'écran des créneaux.
        setSelectedSlot(null);
        setSelectedDay(null);
        setScreen("dispo");
        setError("Ce créneau vient d'être pris. Choisis-en un autre.");
        void loadAvailability();
      } else {
        setError("La réservation a échoué. Réessaie dans un instant.");
      }
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setScreen("confirm");

    // ── L'ORDRE COMPTE ────────────────────────────────────────────────────
    // Le rendez-vous d'abord, la fiche + la provenance ensuite, jamais l'inverse :
    // une information ne doit pas pouvoir faire échouer une réservation. On ne
    // les attend pas non plus — l'écran de confirmation est déjà affiché.
    const canalChoisi = canal;
    const prenomProv = prenomSource;
    void (async () => {
      const idDuLead = await creerFiche();
      if (idDuLead) await noterProvenance(idDuLead, canalChoisi, prenomProv);
    })();
  }

  // « Ajouter à mon agenda » : génère un .ics téléchargeable. Réduit les no-shows.
  function addToCalendar() {
    if (!selectedSlot) return;
    const start = new Date(selectedSlot.iso);
    const end = new Date(start.getTime() + 45 * 60_000);
    const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Breakfast Club//FR", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${start.getTime()}@labase-nutrition.com`,
      `DTSTAMP:${z(new Date())}`,
      `DTSTART:${z(start)}`,
      `DTEND:${z(end)}`,
      "SUMMARY:RDV découverte · The Breakfast Club",
      "LOCATION:11 rue Saint Pierre\\, 55100 Verdun",
      "DESCRIPTION:Ton bilan bien-être\\, ton body scan et ta boisson\\, offerts. On t'attend au club !",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "seance-decouverte-breakfast-club.ics";
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

  const confWhen = selectedSlot
    ? `${capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(selectedSlot.iso)))} à ${selectedSlot.time}.`
    : "";
  const creneauCourt = selectedSlot
    ? `${capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(selectedSlot.iso)))} à ${selectedSlot.time}`
    : "";
  const coordsCompletes = !!prenom.trim() && !!nom.trim() && tel.replace(/\D/g, "").length >= 6 && !!ville.trim() && EMAIL_RE.test(email.trim());

  return (
    <div className="rc">
      <header className="rc-header"><div className="rc-wrap in">
        <a href="/club" aria-label="Aller au site du Breakfast Club">
          <img src={LOGO} alt="The Breakfast Club by La Base" />
        </a>
        <div className="rc-badge">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
          Sans engagement
        </div>
      </div></header>

      {/* ── ÉCRAN 1 — OBJECTIF (1 tap) ── */}
      {screen === "objectif" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 620 }}>
            <p className="rc-eyebrow">Étape 1 sur 3 · Ton bilan découverte</p>
            <h1 style={{ marginTop: 12, fontSize: "clamp(28px,4.4vw,48px)" }}>Réserve ton bilan découverte offert</h1>
            <p style={{ margin: "14px 0 0", fontSize: "clamp(15px,1.4vw,17px)", lineHeight: 1.6, color: "var(--sub)" }}>
              Choisis ce qui te ressemble, puis ton créneau. Bilan bien-être, body scan et une boisson — <strong>offerts</strong>, sans aucun engagement.
            </p>
          </div>

          <p className="rc-eyebrow" style={{ marginTop: "clamp(24px,3vw,34px)" }}>C'est pour quoi&nbsp;?</p>
          {/* Le seul geste demandé : un tap. C'est l'accroche, pas de l'administratif. */}
          <div className="rc-obj-hero" role="radiogroup" aria-label="Ton objectif" style={{ marginTop: 12, maxWidth: 620 }}>
            {OBJECTIFS.map((o) => (
              <button type="button" key={o.id} role="radio" aria-checked={objectif === o.id} className="rc-obj-big" onClick={() => allerAuxCreneaux(o.id)}>
                <span className="ic" aria-hidden="true">{o.icon}</span>
                <span className="txt"><span className="t">{o.label}</span><span className="s">{o.sub}</span></span>
                <span className="go" aria-hidden="true">→</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: "clamp(28px,3.5vw,40px)", maxWidth: 620, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
            <img src={HEART} alt="" aria-hidden="true" style={{ width: 54, height: "auto", flex: "none" }} />
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "#5F7154" }}>
              <strong style={{ color: "var(--ink)" }}>≈ 45 min</strong> avec un coach, au club de Verdun · 11 rue Saint&nbsp;Pierre. Aucun paiement, aucun engagement.
            </p>
          </div>
        </main>
      )}

      {/* ── ÉCRAN 2 — DISPO ── */}
      {screen === "dispo" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            <button type="button" onClick={() => setScreen("objectif")} className="rc-retour" aria-label="Revenir à mon objectif">
              <span aria-hidden="true">←</span> Retour
            </button>
            <p className="rc-eyebrow" style={{ marginTop: 14 }}>Étape 2 sur 3 · Ton créneau</p>
            <h1 style={{ marginTop: 14, fontSize: "clamp(30px,5vw,52px)" }}>Choisis quand on t'accueille.</h1>
          </div>

          {error && <div className="rc-err" role="alert" style={{ marginTop: 20, maxWidth: 640 }}>{error}</div>}

          <div className="rc-card rc-grid3" style={{ marginTop: "clamp(24px,3.5vw,36px)" }}>
            <aside className="rc-col info">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "none", width: 44, height: 44, borderRadius: 999, background: "#E7DCC4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} aria-hidden="true">☕</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: "#3A443F" }}>Breakfast Club · Verdun</span>
              </div>
              <h2 style={{ marginTop: 18, fontSize: "clamp(22px,2.4vw,27px)" }}>RDV découverte</h2>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>Bilan bien-être · body scan · boisson offerte</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 13, fontSize: 15, color: "var(--sub)" }}>
                <div>🕒 45 min de RDV · créneau réservé 1h</div>
                <div>📍 En personne · 11 rue Saint&nbsp;Pierre</div>
                <div>🎁 Offert · sans engagement</div>
              </div>
              <p style={{ margin: "20px 0 0", fontSize: 14, lineHeight: 1.55, color: "#5F7154", paddingTop: 18, borderTop: "1px solid rgba(30,51,48,.1)" }}>
                On t'accueille pour ton body scan et un vrai point sur tes objectifs. Tu laisseras tes coordonnées juste après avoir choisi ton heure.
              </p>
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
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Choisis une heure — tu laisses tes coordonnées juste après.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, maxHeight: 320, overflow: "auto" }}>
                    {daySlots.map((s) => {
                      const full = s.remaining <= 0;
                      return (
                        <button type="button" key={s.iso} className="rc-slot" disabled={full}
                          onClick={() => { setSelectedSlot(s); setError(null); setScreen("coordonnees"); window.scrollTo({ top: 0, behavior: "auto" }); }}>
                          <span className="tm">{s.time}</span>
                          <span className="pl"><span className="rc-dot" style={{ background: full ? "#C9B0A6" : s.remaining === 1 ? "#E8A93A" : "#5F9E6E" }} />{full ? "Complet" : `${s.remaining} place${s.remaining > 1 ? "s" : ""}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── « Aucun horaire ne me va » — porte de secours, sous les créneaux.
              Se suffit à elle-même (prénom + tél + dispos) puisque la fiche ne se
              crée plus en amont. La personne dicte quand elle peut, on rappelle. */}
          <section className="rc-dispo" aria-labelledby="rc-dispo-titre" style={{ maxWidth: 900 }}>
            {dispoEtat === "fait" ? (
              <p className="rc-dispo-ok" role="status">
                <span aria-hidden="true">✓</span> C'est noté. On te rappelle pour te proposer un horaire qui te va.
              </p>
            ) : !dispoOuvert ? (
              <button type="button" className="rc-dispo-ouvrir" onClick={() => setDispoOuvert(true)}>
                Aucun horaire ne te va&nbsp;? <span className="rc-dispo-ouvrir-fort">Dis-nous quand tu peux</span>
              </button>
            ) : (
              <div className="rc-dispo-boite">
                <h2 id="rc-dispo-titre" className="rc-dispo-titre">Dis-nous quand tu es disponible</h2>
                <p className="rc-dispo-sub">On s'adapte. Laisse-nous de quoi te rappeler, et écris tes créneaux comme tu les dis.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <label><span className="rc-lbl">Ton prénom</span><input className="rc-field" type="text" value={dispoPrenom} onChange={(e) => { setDispoPrenom(e.target.value); if (dispoEtat === "erreur") setDispoEtat("repos"); }} placeholder="Marie" /></label>
                  <label><span className="rc-lbl">Ton téléphone</span><input className="rc-field" type="tel" value={dispoTel} onChange={(e) => { setDispoTel(e.target.value); if (dispoEtat === "erreur") setDispoEtat("repos"); }} placeholder="06 12 34 56 78" /></label>
                </div>
                <label className="rc-lbl" htmlFor="rc-dispo-texte">Tes disponibilités</label>
                <textarea
                  id="rc-dispo-texte"
                  className="rc-dispo-texte"
                  rows={3}
                  value={dispoTexte}
                  maxLength={DISPO_MAX}
                  placeholder="Ex. : tôt le matin avant 8h, ou le samedi dans la journée."
                  onChange={(e) => { setDispoTexte(e.target.value); if (dispoEtat === "erreur") setDispoEtat("repos"); }}
                />
                <div className="rc-dispo-pied">
                  <button
                    type="button"
                    className="rc-dispo-envoyer"
                    disabled={!dispoTexte.trim() || !dispoPrenom.trim() || dispoTel.replace(/\D/g, "").length < 6 || dispoEtat === "envoi"}
                    onClick={() => void envoyerDisponibilites()}
                  >
                    {dispoEtat === "envoi" ? "…" : "Envoyer mes disponibilités"}
                  </button>
                  <p className="rc-dispo-aide" aria-live="polite">
                    {dispoEtat === "erreur"
                      ? "L'envoi n'est pas passé — vérifie ton prénom et ton numéro, ou appelle-nous."
                      : "Ça ne réserve rien — c'est nous qui revenons vers toi."}
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      )}

      {/* ── ÉCRAN 3 — COORDONNÉES ── */}
      {screen === "coordonnees" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            <button type="button" onClick={() => setScreen("dispo")} className="rc-retour" aria-label="Revenir aux créneaux">
              <span aria-hidden="true">←</span> Changer de créneau
            </button>
            <p className="rc-eyebrow" style={{ marginTop: 14 }}>Étape 3 sur 3 · Tes coordonnées</p>
            <h1 style={{ marginTop: 14, fontSize: "clamp(28px,4.4vw,46px)" }}>Presque fini&nbsp;!</h1>
          </div>

          {/* Le créneau choisi, rappelé en haut : elle sait ce qu'elle valide. */}
          {selectedSlot && (
            <div className="rc-recap" style={{ maxWidth: 640, marginTop: 18 }}>
              <span aria-hidden="true" style={{ fontSize: 22 }}>📅</span>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15.5, color: "var(--ink)" }}>{creneauCourt}</p>
                <p style={{ margin: "2px 0 0", fontSize: 13.5, color: "#5F7154" }}>Bilan bien-être + body scan + boisson · 11 rue Saint Pierre, Verdun</p>
              </div>
            </div>
          )}

          <form className="rc-card" style={{ padding: "clamp(24px,3vw,38px)", maxWidth: 640, marginTop: 18 }} onSubmit={confirmBooking}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label><span className="rc-lbl">Ton prénom</span><input className="rc-field" type="text" required value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" placeholder="Marie" /></label>
              <label><span className="rc-lbl">Ton nom</span><input className="rc-field" type="text" required value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" placeholder="Dupont" /></label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <label><span className="rc-lbl">Téléphone</span><input className="rc-field" type="tel" required value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" placeholder="06 79 44 87 59" /></label>
              <label><span className="rc-lbl">Ville</span><input className="rc-field" type="text" required value={ville} onChange={(e) => setVille(e.target.value)} autoComplete="address-level2" placeholder="Verdun" /></label>
            </div>
            <label style={{ display: "block", marginTop: 14 }}><span className="rc-lbl">Email <span style={{ fontWeight: 400, color: "var(--muted)" }}>· pour ta confirmation</span></span><input className="rc-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="marie.dupont@email.com" /></label>

            {/* « Comment tu as connu le club ? » — obligatoire pour valider.
                Seul moyen de savoir quel flyer marche : le QR imprimé est le même
                sur tous les papiers, on ne peut que demander. */}
            <div style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
              <h2 id="rc-prov-titre" className="rc-prov-titre" style={{ fontSize: "clamp(18px,2vw,22px)" }}>Comment tu as connu le club&nbsp;?</h2>
              <p className="rc-prov-sub">Une seule question, et on te laisse tranquille. C'est ce qui nous dit ce qui marche vraiment.</p>
              <div className="rc-prov-choix" role="radiogroup" aria-labelledby="rc-prov-titre" aria-required="true">
                {PROVENANCE_CANAUX_TUNNEL.map((cle) => {
                  const { emoji, libelle } = LIBELLES_CANAL[cle];
                  return (
                    <button key={cle} type="button" role="radio" aria-checked={canal === cle} className="rc-choix"
                      onClick={() => { setCanal(cle); setError(null); }}>
                      <span aria-hidden="true">{emoji}</span>{libelle}
                    </button>
                  );
                })}
              </div>
              {canal && provenanceDesigneQuelquun(canal) && (
                <div className="rc-prov-qui">
                  <label className="rc-lbl" htmlFor="rc-prov-prenom">Son prénom <span className="rc-prov-opt">— facultatif</span></label>
                  <input id="rc-prov-prenom" className="rc-field" type="text" value={prenomSource} maxLength={PRENOM_MAX} autoComplete="off" placeholder="Camille" onChange={(e) => setPrenomSource(e.target.value)} />
                  <p className="rc-prov-aide">
                    {canal === "flyer" ? "Il est peut-être écrit sur le flyer. Laisse vide si tu ne sais pas." : "Pour qu'on puisse la remercier. Laisse vide si tu ne sais pas."}
                  </p>
                </div>
              )}
            </div>

            {error && <div className="rc-err" role="alert" style={{ marginTop: 18 }}>{error}</div>}

            <button type="submit" className="rc-cta" style={{ marginTop: 24, width: "100%", minHeight: 54 }} disabled={submitting}>
              {submitting ? "…" : "Confirmer ma réservation"}
            </button>
            <p className="rc-prov-manque" aria-live="polite" style={{ textAlign: "center" }}>
              {!coordsCompletes
                ? "Complète tes coordonnées pour valider."
                : !canal
                  ? "Dis-nous comment tu as connu le club pour valider."
                  : `Tu réserves : ${creneauCourt}.`}
            </p>
          </form>
        </main>
      )}

      {/* ── ÉCRAN 4 — CONFIRMATION ── */}
      {screen === "confirm" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            <p className="rc-eyebrow">C'est tout bon</p>
            <div className="rc-card" style={{ marginTop: 16, padding: "clamp(30px,4vw,52px)" }}>
              <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 999, background: "rgba(147,166,126,.2)", color: "#5F7154", fontSize: 30 }}>✓</span>
              <h2 style={{ marginTop: 22, fontSize: "clamp(28px,3.6vw,42px)" }}>{prenom.trim() ? `C'est réservé, ${prenom.trim()} !` : "C'est réservé !"}</h2>
              <p style={{ margin: "14px 0 0", fontSize: 18, lineHeight: 1.6, color: "#3A443F" }}>{confWhen}</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 11, fontSize: 16, color: "var(--sub)" }}>
                <div>📍 11 rue Saint&nbsp;Pierre, Verdun</div>
                <div>✉️ On t'envoie la confirmation et le rappel par email.</div>
              </div>
              <p style={{ margin: "22px 0 0", padding: "18px 20px", borderRadius: 16, background: "var(--panel)", fontSize: 15, lineHeight: 1.55, color: "#5F7154" }}>
                Ton bilan bien-être, ton body scan et ta boisson sont offerts. Après le rendez-vous, tu pourras choisir ta carte de visites si tu veux continuer — aucun engagement d'ici là.
              </p>
              <button type="button" className="rc-cta" style={{ marginTop: 22, minHeight: 54, width: "100%" }} onClick={addToCalendar}>
                <span aria-hidden="true">📅</span> Ajouter à mon agenda
              </button>
              <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 13.5, color: "var(--sub)" }}>Comme ça, tu n'oublies pas — et ton téléphone te rappelle.</p>

              <div className="rc-sorties">
                <p className="rc-sorties-titre">En attendant ton rendez-vous</p>
                <a href="/club/le-rituel">Le rituel du matin, en 3 minutes</a>
                <a href="/club/resultats">Les résultats des membres</a>
                <a href="/club">Découvrir le club</a>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
