// =============================================================================
// ReserverClubPage — tunnel public "RDV découverte" du Breakfast Club.
// Route : /reserver  (et /reserver/:clubSlug, défaut "verdun").
//
// Écran 1 capture  → crée un lead CRM (edge submit-prospect-lead, source=site-club).
// Écran 2 dispo    → vrais créneaux (RPC get_club_discovery_availability), puis « comment
//                    tu as connu le club ? » juste sous les créneaux, puis réservation
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
import {
  PROVENANCE_CANAUX_TUNNEL,
  provenanceDesigneQuelquun,
  type ProvenanceCanalTunnel,
} from "../types/domain";
import { useClubHead } from "./club/useClubHead";
import "./ReserverClubPage.css";

import { useEtapeTunnel } from "../features/audience/useEtapeTunnel";
type Screen = "capture" | "dispo" | "confirm";
type Objectif = "poids" | "muscle" | "energie";

// En-tête sur fond crème → wordmark AVEC le cœur rouge (logo-heart), le même
// que le menu du site. `logo-wordmark-dark` en est la version SANS cœur : elle
// était utilisée ici, d'où le « y'a plus le petit cœur rouge en haut de la page »
// de Thomas (2026-08-09).
const LOGO = "/brand/breakfast-club/logo-heart.png";
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

// ── « Comment tu as connu le club ? » ───────────────────────────────────────
// Les VALEURS viennent de `domain.ts` — source unique partagée avec le CRM, les
// deux bilans et le vocabulaire fermé de la RPC (un test lit le SQL et compare).
// Seules les PHRASES sont propres à cet écran : ici on parle à quelqu'un qui a
// ramassé un papier dans sa boîte aux lettres, le CRM affiche « 📬 Flyer ».
//
// `Record` sur le type fermé : ajouter un canal au vocabulaire sans lui écrire
// de phrase devient une erreur de compilation, et non un bouton vide en prod.
const LIBELLES_CANAL: Record<ProvenanceCanalTunnel, { emoji: string; libelle: string }> = {
  flyer: { emoji: "📬", libelle: "Un flyer dans ma boîte aux lettres" },
  parle: { emoji: "💬", libelle: "Quelqu'un m'en a parlé" },
  reseaux: { emoji: "📱", libelle: "Instagram ou Facebook" },
  autre: { emoji: "✨", libelle: "Autrement" },
};

/**
 * Le prénom est tapé par un inconnu, sur un téléphone. Même borne qu'en base
 * (`left(v_libre, 80)` dans `noter_provenance_lead`) : couper à l'écran plutôt
 * que de laisser la RPC tronquer en silence une réponse déjà envoyée.
 */
const PRENOM_MAX = 80;

export function ReserverClubPage() {
  const { clubSlug } = useParams<{ clubSlug?: string }>();
  const slug = (clubSlug ?? "verdun").trim() || "verdun";
  const [searchParams] = useSearchParams();
  useClubHead("Réserver mon RDV découverte · The Breakfast Club");

  const [screen, setScreen] = useState<Screen>("capture");
  // Les trois écrans du tunnel, dans l'ordre : c'est ici qu'on saura enfin
  // combien de gens laissent leurs coordonnées puis renoncent au créneau.
  useEtapeTunnel(
    "reserver-club",
    screen === "capture" ? "coordonnees" : screen === "dispo" ? "choix du creneau" : "confirme",
    screen === "capture" ? 0 : screen === "dispo" ? 1 : 2,
  );

  // Lead
  const [objectif, setObjectif] = useState<Objectif | "">("");
  const [people, setPeople] = useState<1 | 2>(1);
  const [partner, setPartner] = useState("");
  const [partnerNom, setPartnerNom] = useState("");
  const [partnerObjectif, setPartnerObjectif] = useState<Objectif | "">("");
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

  // L'identifiant du lead créé à l'écran 1. Il sert à deux choses :
  //
  //  1. NE PAS RECRÉER de fiche quand on revient sur ses pas. « ← Modifier mes
  //     infos » ramenait à l'écran 1, et chaque validation refaisait un lead :
  //     mesuré en base le 16/08, Claire avait TROIS fiches créées en quatre
  //     minutes avec le même numéro.
  //  2. Écrire la provenance (« comment tu as connu le club ? ») une fois la
  //     réservation acquise : elle a besoin de savoir sur quelle fiche poser la
  //     réponse. La question est posée sous les créneaux, l'écriture vient
  //     après — cf. « L'ORDRE COMPTE » dans `confirmBooking`.
  const [leadId, setLeadId] = useState<string | null>(null);

  // La réponse à « comment tu as connu le club ? », posée sous les créneaux.
  // Le canal est obligatoire pour réserver, le prénom jamais : c'est une simple
  // case à écrire, laissée vide par tous ceux qui ne savent pas.
  const [canal, setCanal] = useState<ProvenanceCanalTunnel | null>(null);
  const [prenomSource, setPrenomSource] = useState("");

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
    if (people === 2 && (!partner.trim() || !partnerNom.trim() || !partnerObjectif)) {
      setError("Complète le prénom, le nom et l'objectif de la personne qui t'accompagne.");
      document.getElementById("rc-binome")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    setSubmitting(true);
    const sb = await getSupabaseClient();
    // Crée le lead CRM (non bloquant : un échec ne doit pas empêcher la résa).
    // `leadId` garde la trace de la fiche déjà créée : repasser par cet écran
    // via « ← Modifier mes infos » ne doit plus en fabriquer une deuxième.
    try {
      if (sb && !leadId) {
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
            metadata: {
              nom: nom.trim(),
              objectif: objectif || null,
              people_count: people,
              partner_first_name: people === 2 ? partner.trim() || null : null,
              partner_last_name: people === 2 ? partnerNom.trim() || null : null,
              partner_objectif: people === 2 ? partnerObjectif || null : null,
            },
          },
        });
        const id = (creation as { id?: string } | null)?.id;
        if (id) setLeadId(id);
      }
    } catch { /* lead best-effort */ }
    setSubmitting(false);
    setScreen("dispo");
    void loadAvailability();
  }

  /**
   * Écrit la réponse sur la fiche du lead.
   *
   * Best-effort de bout en bout, et appelée APRÈS que la réservation est
   * acquise : la provenance est une INFORMATION, jamais une condition. Si la
   * RPC tombe, la personne voit sa confirmation exactement pareil — elle n'a
   * aucun moyen de savoir que quelque chose a raté, et il n'y a rien à
   * rattraper de son côté.
   *
   * UNE SEULE réponse : la fonction en base n'en accepte qu'une par lead
   * (`deja_repondu`), donc le canal et le prénom partent ensemble. Ne jamais
   * découper en deux appels — le second repartirait avec « deja_repondu » et le
   * prénom serait perdu. Le repli ci-dessous n'est pas une seconde réponse :
   * c'est la même, reposée après que la première a été REFUSÉE sans rien écrire.
   *
   * `p_qui` existe toujours côté base (l'ancien choix dans la liste d'équipe),
   * on ne l'envoie simplement plus : cet écran ne propose aucun nom de coach.
   */
  async function noterProvenance(idDuLead: string, c: ProvenanceCanalTunnel, prenomTape: string) {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { error } = await sb.rpc("noter_provenance_lead", {
        p_lead_id: idDuLead,
        p_canal: c,
        // Un prénom n'a de sens que pour un flyer ou du bouche-à-oreille :
        // personne ne distribue Instagram. La RPC applique la même règle.
        p_libre: provenanceDesigneQuelquun(c) ? prenomTape.trim().slice(0, PRENOM_MAX) || null : null,
      });
      // Tant que la migration `20261215100000` n'est pas appliquée, la fonction
      // en base n'a que trois paramètres : PostgREST ne trouve alors AUCUNE
      // signature qui accepte `p_libre` (PGRST202) et la réponse serait perdue
      // ENTIÈRE, canal compris. On la repose donc sans le prénom — le canal est
      // l'essentiel, et c'est la seule partie récupérable. `p_qui` et `p_libre`
      // ont tous deux une valeur par défaut, donc cet appel-là fonctionne avec
      // l'ancienne fonction comme avec la nouvelle : le repli se retire tout
      // seul le jour où la migration passe.
      if (error?.code === "PGRST202") {
        await sb.rpc("noter_provenance_lead", { p_lead_id: idDuLead, p_canal: c });
      }
    } catch { /* la réponse est un bonus, jamais un obstacle */ }
  }

  async function confirmBooking() {
    // Deux garde-fous, doublés par l'état `disabled` du bouton : le créneau
    // parce qu'il n'y a rien à réserver sans lui, le canal parce que c'est la
    // seule chose qu'on demande en échange (« Autrement » est la sortie).
    if (!selectedSlot || !canal) return;
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
        peopleCount: people,
        partnerFirstName: people === 2 ? partner.trim() : "",
        partnerLastName: people === 2 ? partnerNom.trim() : "",
        partnerObjectif: people === 2 ? partnerObjectif || "" : "",
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

    // ── L'ORDRE COMPTE ────────────────────────────────────────────────────
    // Le rendez-vous d'abord, la provenance ensuite, et jamais l'inverse : une
    // information ne doit pas pouvoir faire échouer une réservation. On ne
    // l'attend pas non plus — l'écran de confirmation est déjà affiché.
    //
    // `leadId` est posé à l'écran des coordonnées par `submit-prospect-lead`,
    // qui répond `{ success: true, id }`. S'il manque (edge en échec, réseau),
    // on réserve quand même et on ne pose rien : il n'y a pas de fiche sur
    // laquelle écrire, et ce n'est pas à la personne de le savoir.
    if (leadId) void noterProvenance(leadId, canal, prenomSource);
  }

  // « Ajouter à mon agenda » : génère un .ics téléchargeable (iOS/Android/desktop).
  // Réduit les no-shows — l'événement + le rappel natif du téléphone.
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
      "DESCRIPTION:Ton body scan + bilan bien-être\\, offerts. On t'attend au club !",
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

  const confPeople = people === 2 ? (partner.trim() ? `Pour toi et ${partner.trim()} (2 personnes)` : "Pour toi et ton binôme (2 personnes)") : "Pour toi (1 personne)";
  const confWhen = selectedSlot
    ? `${capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(selectedSlot.iso)))} à ${selectedSlot.time}.`
    : "";
  // Le même créneau, en plus court : sous le bouton de validation, il rappelle
  // ce qu'on est en train de réserver sans répéter l'année.
  const creneauCourt = selectedSlot
    ? `${capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(selectedSlot.iso)))} à ${selectedSlot.time}`
    : "";

  return (
    <div className="rc">
      <header className="rc-header"><div className="rc-wrap in">
        {/* Le logo ramène au SITE, pas au formulaire (corrigé le 19/08).
            Avant, il faisait `setScreen("capture")` : cliquer le logo — le
            geste le plus universel du web pour « aller à l'accueil » — effaçait
            le créneau choisi, et depuis l'écran de confirmation relançait le
            formulaire alors que le rendez-vous était déjà pris. */}
        <a href="/club" aria-label="Aller au site du Breakfast Club">
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
            <h1 style={{ marginTop: 12, fontSize: "clamp(30px,4.4vw,48px)" }}>Ton RDV découverte commence ici.</h1>
            <p style={{ margin: "14px 0 0", fontSize: "clamp(15px,1.4vw,17px)", lineHeight: 1.6, color: "var(--sub)" }}>
              Dis-nous où tu en es, puis choisis ton créneau. Le body scan et le bilan bien-être sont <strong>offerts</strong>, sans aucun engagement.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "clamp(20px,3vw,32px)", alignItems: "start", marginTop: "clamp(24px,3vw,36px)" }}>
            {/* récap */}
            <div>
              <aside className="rc-card" style={{ padding: "clamp(26px,3vw,38px)" }}>
                <p className="rc-eyebrow" style={{ fontSize: 12, letterSpacing: ".22em" }}>Ce que tu réserves</p>
                <h2 style={{ marginTop: 12, fontSize: "clamp(26px,3.2vw,38px)" }}>RDV découverte</h2>
                <p style={{ margin: "8px 0 0", fontSize: 16, color: "#5F7154" }}>≈ 45 min avec un coach, au club de Verdun.</p>
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

              <p style={{ margin: "24px 0 0", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>Tu viens…</p>
              <div className="rc-seg" role="radiogroup" aria-label="Nombre de personnes" style={{ marginTop: 12 }}>
                <button type="button" aria-pressed={people === 1} onClick={() => setPeople(1)}><span aria-hidden="true">🙋</span>Seul·e</button>
                <button type="button" aria-pressed={people === 2} onClick={() => setPeople(2)}><span aria-hidden="true">👫</span>À deux</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 22 }}>
                <label><span className="rc-lbl">Ton prénom</span><input className="rc-field" type="text" required value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" placeholder="Marie" /></label>
                <label><span className="rc-lbl">Ton nom</span><input className="rc-field" type="text" required value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" placeholder="Dupont" /></label>
              </div>
              <label style={{ display: "block", marginTop: 14 }}><span className="rc-lbl">Email</span><input className="rc-field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="marie.dupont@email.com" /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                <label><span className="rc-lbl">Téléphone</span><input className="rc-field" type="tel" required value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" placeholder="06 79 44 87 59" /></label>
                <label><span className="rc-lbl">Ville</span><input className="rc-field" type="text" required value={ville} onChange={(e) => setVille(e.target.value)} autoComplete="address-level2" placeholder="Verdun" /></label>
              </div>

              {people === 2 && (
                <div id="rc-binome" style={{ marginTop: 26, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden="true" style={{ fontSize: 20 }}>👫</span>
                    <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--orange)" }}>La personne qui t'accompagne</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
                    <label><span className="rc-lbl">Son prénom</span><input className="rc-field" type="text" required value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Alex" /></label>
                    <label><span className="rc-lbl">Son nom</span><input className="rc-field" type="text" required value={partnerNom} onChange={(e) => setPartnerNom(e.target.value)} placeholder="Martin" /></label>
                  </div>
                  <p style={{ margin: "18px 0 0", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>Son objectif</p>
                  <div className="rc-obj" role="radiogroup" aria-label="Objectif de la personne qui t'accompagne" aria-required="true" style={{ marginTop: 12 }}>
                    {OBJECTIFS.map((o) => (
                      <button type="button" key={o.id} role="radio" aria-checked={partnerObjectif === o.id} onClick={() => { setPartnerObjectif(o.id); setError(null); }}>
                        <span className="ic" aria-hidden="true">{o.icon}</span><span className="t">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="rc-err" role="alert" style={{ marginTop: 18 }}>{error}</div>}
              <button type="submit" className="rc-cta" style={{ marginTop: 26 }} disabled={submitting}>{submitting ? "…" : "Choisir mon créneau →"}</button>
              {/* Retirés le 2026-08-09 (Thomas) : la ligne « tes infos restent
                  chez nous · jamais revendues » et le repli « pas prêt à choisir
                  un créneau ? appelle-nous ». Le bandeau « Sans engagement » en
                  haut de page le dit déjà, et proposer d'appeler juste sous le
                  bouton principal offrait une porte de sortie au moment où la
                  personne allait valider. Le numéro reste joignable ailleurs
                  (pied de page du site, mail de confirmation). */}
            </form>
          </div>
        </main>
      )}

      {/* ── ÉCRAN 2 — DISPO ── */}
      {screen === "dispo" && (
        <main className="rc-wrap" style={{ paddingTop: "clamp(24px,3.6vw,44px)", paddingBottom: "clamp(48px,7vw,80px)" }}>
          <div style={{ maxWidth: 640 }}>
            {/* Le retour vit ICI, au-dessus du titre (19/08). Il existait déjà,
                mais enterré dans la colonne de gauche : on le croisait en
                descendant VERS le bouton de réservation, ce qui est exactement
                l'endroit où il ne faut pas proposer de partir. */}
            <button
              type="button"
              onClick={() => setScreen("capture")}
              className="rc-retour"
              aria-label="Revenir à mes coordonnées"
            >
              <span aria-hidden="true">←</span> Retour
            </button>
            <p className="rc-eyebrow" style={{ marginTop: 14 }}>Étape 2 sur 2 · Ton créneau</p>
            <h1 style={{ marginTop: 14, fontSize: "clamp(30px,5vw,52px)" }}>Choisis quand on t'accueille.</h1>
          </div>

          <div className="rc-card rc-grid3" style={{ marginTop: "clamp(24px,3.5vw,36px)" }}>
            <aside className="rc-col info">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "none", width: 44, height: 44, borderRadius: 999, background: "#E7DCC4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }} aria-hidden="true">☕</span>
                <span style={{ fontWeight: 600, fontSize: 15, color: "#3A443F" }}>Breakfast Club · Verdun</span>
              </div>
              <h2 style={{ marginTop: 18, fontSize: "clamp(22px,2.4vw,27px)" }}>RDV découverte</h2>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--muted)" }}>Body scan + bilan bien-être</p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 13, fontSize: 15, color: "var(--sub)" }}>
                <div>🕒 45 min de RDV · créneau réservé 1h</div>
                <div>📍 En personne · 11 rue Saint&nbsp;Pierre</div>
                <div>👥 {people === 2 ? "Pour 2 personnes" : "Pour 1 personne"}</div>
              </div>
              <p style={{ margin: "20px 0 0", fontSize: 14, lineHeight: 1.55, color: "#5F7154", paddingTop: 18, borderTop: "1px solid rgba(30,51,48,.1)" }}>
                Réservation <strong style={{ color: "var(--ink)" }}>gratuite et sans engagement</strong>. On t'accueille pour ton body scan et un vrai point sur tes objectifs.
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
                  {/* Ni l'erreur ni le bouton de validation ne vivent plus ici :
                      les deux sont descendus dans le bloc ci-dessous, avec la
                      question. « Ce créneau vient d'être pris » remet d'ailleurs
                      `selectedDay` à null — l'erreur affichée dans cette colonne
                      disparaissait donc avec la liste, à l'instant même où elle
                      devenait utile. */}
                </div>
              )}
            </section>
          </div>

          {/* ── « Comment tu as connu le club ? » ────────────────────────────
              ICI, sous les créneaux, et plus sur l'écran de confirmation.
              Mesuré en base sur deux jours : 11 personnes laissent leurs
              coordonnées, 5 arrivent au choix du créneau, UNE SEULE atteint la
              confirmation. Poser la question là-bas, c'était la poser à presque
              personne — et c'est aussi pour ça que la validation se fait
              maintenant d'un seul geste, ici, avec la réponse.

              C'est le seul moyen de savoir qui a distribué un flyer : le QR
              imprimé est le MÊME sur tous les papiers, le serveur reçoit donc
              exactement la même chose pour tout le monde. Aucune technique ne
              peut le deviner — il faut demander.

              Plus aucun nom de coach (Thomas + Mélanie, 17/08) : ils ne sont
              que deux, et la moitié des recommandations viennent d'ailleurs
              (une adhérente, une amie). Une case vide à écrire, le coach lit la
              réponse dans le CRM. */}
          <section className="rc-card rc-prov" aria-labelledby="rc-prov-titre">
            <h2 id="rc-prov-titre" className="rc-prov-titre">Comment tu as connu le club&nbsp;?</h2>
            <p className="rc-prov-sub">Une seule question, et on te laisse tranquille. C'est ce qui nous dit ce qui marche vraiment.</p>

            <div className="rc-prov-choix" role="radiogroup" aria-labelledby="rc-prov-titre" aria-required="true">
              {PROVENANCE_CANAUX_TUNNEL.map((cle) => {
                const { emoji, libelle } = LIBELLES_CANAL[cle];
                return (
                  <button
                    key={cle}
                    type="button"
                    role="radio"
                    aria-checked={canal === cle}
                    className="rc-choix"
                    onClick={() => { setCanal(cle); setError(null); }}
                  >
                    <span aria-hidden="true">{emoji}</span>{libelle}
                  </button>
                );
              })}
            </div>

            {/* Une case vide, facultative — jamais une liste de prénoms. Elle
                n'apparaît que là où quelqu'un est réellement derrière : « le
                prénom de qui ? » n'a aucun sens pour Instagram. */}
            {canal && provenanceDesigneQuelquun(canal) && (
              <div className="rc-prov-qui">
                <label className="rc-lbl" htmlFor="rc-prov-prenom">
                  Son prénom <span className="rc-prov-opt">— facultatif</span>
                </label>
                <input
                  id="rc-prov-prenom"
                  className="rc-field"
                  type="text"
                  value={prenomSource}
                  maxLength={PRENOM_MAX}
                  autoComplete="off"
                  placeholder="Camille"
                  onChange={(e) => setPrenomSource(e.target.value)}
                />
                <p className="rc-prov-aide">
                  {canal === "flyer"
                    ? "Il est peut-être écrit sur le flyer. Laisse vide si tu ne sais pas."
                    : "Pour qu'on puisse la remercier. Laisse vide si tu ne sais pas."}
                </p>
              </div>
            )}

            {error && <div className="rc-err" role="alert">{error}</div>}

            <div className="rc-prov-valider">
              <button
                type="button"
                className="rc-cta"
                disabled={!selectedSlot || !canal || submitting}
                aria-describedby="rc-prov-manque"
                onClick={() => void confirmBooking()}
              >
                {submitting ? "…" : "Confirmer ma réservation"}
              </button>
              {/* Ce qui manque, dit en toutes lettres : un bouton grisé sans
                  explication, c'est un cul-de-sac. */}
              <p id="rc-prov-manque" className="rc-prov-manque" aria-live="polite">
                {!selectedSlot
                  ? "Choisis d'abord ton créneau ci-dessus."
                  : !canal
                    ? "Dis-nous comment tu as connu le club pour valider."
                    : `Ton créneau : ${creneauCourt}.`}
              </p>
            </div>
          </section>
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
              <button type="button" className="rc-cta" style={{ marginTop: 22, minHeight: 54, width: "100%" }} onClick={addToCalendar}>
                <span aria-hidden="true">📅</span> Ajouter à mon agenda
              </button>
              <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 13.5, color: "var(--sub)" }}>Comme ça, tu n'oublies pas — et ton téléphone te rappelle.</p>

              {/* ── LA SORTIE (19/08) ────────────────────────────────────
                  Des LIENS, pas des boutons : elle vient de dire oui, on ne
                  lui vend plus rien. Ils descendent sous le CTA agenda pour
                  ne jamais lui disputer l'attention. */}
              <div className="rc-sorties">
                <p className="rc-sorties-titre">En attendant ton rendez-vous</p>
                <a href="/club/le-rituel">Le rituel du matin, en 3 minutes</a>
                <a href="/club/resultats">Les résultats des membres</a>
                <a href="/club">Découvrir le club</a>
              </div>

              {/* « Comment tu as connu le club ? » ne se pose PLUS ici : la
                  question est passée sous les créneaux, à l'écran précédent, où
                  il y a encore du monde. Ne pas la remettre ici — la RPC
                  n'accepte qu'une réponse par lead (`deja_repondu`), donc la
                  seconde serait perdue en silence, et la personne répondrait
                  deux fois à la même chose. */}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
