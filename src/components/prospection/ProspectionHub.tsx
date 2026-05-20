// Chantier #3 V4 — Hub Prospection refonte design polish (2026-05-19).
//
// Port pixel-near du design v3 (claude design + Thomas).
// Source : docs/mockups/prospection-v4-prototype-v3.html
// Styles : ./prospection-hub.css (scope .prospection-hub)
//
// Spec :
//   - Sticky header 3 rows : brand+stat-chip / twin pickers / index rail
//   - Section meta + heading (kicker + H2 italique accent + lede)
//   - 10 modules renderers (1 module à la fois)
//   - Bottom nav (prev / dots / next)
//   - Bottom-sheets pour market picker, profile picker, stat funnel
//   - Toast Copié
//   - Toggle EN↔FR par script
//   - Compteur 7j incrémenté à "J'ai envoyé" (+RDV si WhatsApp proxy)
//   - Raccourcis clavier : ←/→ modules · 1-9/0 jump · M marché · P profil · Esc
//   - Light + Dark via theme app existant. Accent gold en light, teal en dark.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createProspectionAttempt,
  fetchProspectionStats,
  filterByMarket,
  filterByMarketAndProfile,
  filterHashtags,
  filterScripts,
  PLATFORM_LABELS,
  type ProspectionClosingBlock,
  type ProspectionFollowup,
  type ProspectionHashtag,
  type ProspectionMarket,
  type ProspectionMarketTip,
  type ProspectionMetric,
  type ProspectionMindsetBlock,
  type ProspectionObjection,
  type ProspectionPlatform,
  type ProspectionProfile,
  type ProspectionProfileFlag,
  type ProspectionReplyNode,
  type ProspectionRoutineItem,
  type ProspectionScript,
  type ProspectionSource,
  type ProspectionSpecialCase,
  type ProspectionStoryBlock,
} from "../../hooks/useProspectionData";
import { useAppContext } from "../../context/AppContext";
import "./prospection-hub.css";

// ────────────────────────────────────────────────────────────
// Module metadata (10 sections, naming sans M1/M2/M3)
// ────────────────────────────────────────────────────────────
type ModuleId =
  | "mindset" | "find" | "first_msg" | "reply" | "objections"
  | "post_call" | "closing" | "special" | "story" | "routine";

interface ModuleMeta {
  id: ModuleId;
  ic: string;
  name: string;        // Tab label
  kicker: string;      // "Module · ..."
  h2: [string, string, string]; // [prefix, italic accent, suffix]
  lede: string;
  meta: string;        // Right side of section-meta (auto reading-time)
}

const MODULES: ModuleMeta[] = [
  { id: "mindset",   ic: "🧠", name: "Mindset",
    kicker: "Module · Mindset & posture",
    h2: ["D'abord, ", "le ton", "."],
    lede: "Trois vérités à intégrer avant le premier message. Cinq erreurs qui sabotent 80 % des conversations.",
    meta: "" },
  { id: "find",      ic: "🔍", name: "Trouver",
    kicker: "Module · Trouver des prospects",
    h2: ["Le scan ", "30 secondes", "."],
    lede: "Tu ouvres un profil : en 30 s tu sais si tu lui écris. Drapeaux verts/rouges, hashtags, sources hors-feed.",
    meta: "" },
  { id: "first_msg", ic: "📨", name: "Premier message",
    kicker: "Module · Premier contact",
    h2: ["Premier ", "message", "."],
    lede: "Sélectionne ta plateforme. Personnalise les variables en gold avant de copier.",
    meta: "" },
  { id: "reply",     ic: "🌳", name: "Sa réponse",
    kicker: "Module · Quand il/elle répond",
    h2: ["Que répondre, ", "selon ce qu'il dit", "."],
    lede: "Branches tiède, froid, indécis. Une réponse par branche, prête à copier.",
    meta: "" },
  { id: "objections",ic: "🛡️", name: "Objections",
    kicker: "Module · Réponses aux refus",
    h2: ["Les huit ", "non", "."],
    lede: "Pour chaque objection : ce qu'il ne faut pas dire, ce qui ouvre la porte.",
    meta: "" },
  { id: "post_call", ic: "📞", name: "Post-appel",
    kicker: "Module · Séquence post-appel",
    h2: ["Après l'appel, ", "quatre touches", "."],
    lede: "J0 – J+2 – J+5 – J+30. Une touche par jour, jamais une de plus.",
    meta: "" },
  { id: "closing",   ic: "🎯", name: "Closing",
    kicker: "Module · Closing",
    h2: ["Quand fermer, ", "et comment", "."],
    lede: "Les signaux qui montrent que c'est mûr, les scripts pour passer à l'acte.",
    meta: "" },
  { id: "special",   ic: "🔁", name: "Cas spéciaux",
    kicker: "Module · Cas spéciaux",
    h2: ["Quand ça ", "sort des rails", "."],
    lede: "Ghosting, réactivation, demande de recommandation. Trois playbooks distincts.",
    meta: "" },
  { id: "story",     ic: "📖", name: "Storytelling",
    kicker: "Module · Storytelling",
    h2: ["Raconte ton ", "avant", "."],
    lede: "La structure en 3 actes qui marche. Deux exemples vivants.",
    meta: "" },
  { id: "routine",   ic: "⏰", name: "Routine",
    kicker: "Module · Routine quotidienne",
    h2: ["Trente minutes, ", "tous les jours", "."],
    lede: "Sept actions à cocher chaque matin. Sans elles, le reste s'effondre.",
    meta: "" },
];

// Ordre profil cible : weight-women → weight-men → sport → business
const PROFILE_GLYPHS: Record<string, string> = {
  "weight-women": "⚖️",
  "weight-men": "💪",
  "sport": "🏃",
  "business": "💼",
};

// Plateformes M1 (5 onglets dans le module Premier message, TikTok 2026-05-19)
const PLATFORM_ORDER: ProspectionPlatform[] = ["insta", "fb", "whatsapp", "sms", "tiktok"];
const PLATFORM_GLYPH: Record<string, string> = {
  insta: "📷", fb: "f", whatsapp: "💬", sms: "✉", tiktok: "🎵",
};
const PLATFORM_SHORT: Record<string, string> = {
  insta: "Insta", fb: "Facebook", whatsapp: "WhatsApp", sms: "SMS", tiktok: "TikTok",
};

// ────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────
interface Props {
  markets: ProspectionMarket[];
  profiles: ProspectionProfile[];
  hashtags: ProspectionHashtag[];
  scripts: ProspectionScript[];
  marketTips: ProspectionMarketTip[];
  mindsetBlocks: ProspectionMindsetBlock[];
  metrics: ProspectionMetric[];
  profileFlags: ProspectionProfileFlag[];
  sources: ProspectionSource[];
  replyTree: ProspectionReplyNode[];
  objections: ProspectionObjection[];
  followups: ProspectionFollowup[];
  closing: ProspectionClosingBlock[];
  specialCases: ProspectionSpecialCase[];
  storytelling: ProspectionStoryBlock[];
  routines: ProspectionRoutineItem[];
  onRestartTunnel: () => void;
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export function ProspectionHub(p: Props) {
  const { currentUser } = useAppContext();

  // State
  const [marketCode, setMarketCode] = useState<string>(p.markets[0]?.code ?? "fr");
  const [profileSlug, setProfileSlug] = useState<string>(p.profiles[0]?.slug ?? "weight-women");
  const [moduleIdx, setModuleIdx] = useState<number>(0);
  const [platform, setPlatform] = useState<ProspectionPlatform>("insta");
  const [scriptLang, setScriptLang] = useState<Record<string, "native" | "fr">>({});
  const [sheet, setSheet] = useState<"market" | "profile" | "stat" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Stats 7j : initialisées à 0, fetch réel au mount via RPC get_prospection_stats
  const [sent7d, setSent7d] = useState<number>(0);
  const [rdv7d, setRdv7d] = useState<number>(0);
  const [responses7d, setResponses7d] = useState<number>(0);
  const [bumpStat, setBumpStat] = useState<boolean>(false);
  const [swapping, setSwapping] = useState<boolean>(false);
  const [caseTab, setCaseTab] = useState<"ghost_after_exchange" | "reactivation_3_6m" | "referral_request">("ghost_after_exchange");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [sentScripts, setSentScripts] = useState<Record<string, boolean>>({});
  const [pickerOpening, setPickerOpening] = useState<"market" | "profile" | null>(null);

  const indexRailRef = useRef<HTMLDivElement>(null);
  const bodyInnerRef = useRef<HTMLDivElement>(null);

  // Derived
  const market = useMemo(() => p.markets.find((m) => m.code === marketCode) ?? null, [p.markets, marketCode]);
  const profile = useMemo(() => p.profiles.find((pp) => pp.slug === profileSlug) ?? null, [p.profiles, profileSlug]);
  const marketTip = useMemo(() => p.marketTips.find((t) => t.market_code === marketCode) ?? null, [p.marketTips, marketCode]);
  const moduleMeta = MODULES[moduleIdx];

  // Filtered data
  const hashtags = useMemo(() => filterHashtags(p.hashtags, marketCode, profileSlug), [p.hashtags, marketCode, profileSlug]);
  const scripts = useMemo(() => filterScripts(p.scripts, marketCode, profileSlug), [p.scripts, marketCode, profileSlug]);
  const mindsetBlocks = useMemo(() => filterByMarket(p.mindsetBlocks, marketCode), [p.mindsetBlocks, marketCode]);
  const flags = useMemo(
    () => p.profileFlags.filter((f) => f.market_code === marketCode && f.profile_slug === profileSlug),
    [p.profileFlags, marketCode, profileSlug],
  );
  const sources = useMemo(
    () => filterByMarketAndProfile(p.sources, marketCode, profileSlug),
    [p.sources, marketCode, profileSlug],
  );
  const replyTree = useMemo(
    () => p.replyTree.filter((r) => r.market_code === marketCode && r.profile_slug === profileSlug),
    [p.replyTree, marketCode, profileSlug],
  );
  const objections = useMemo(() => filterByMarket(p.objections, marketCode), [p.objections, marketCode]);
  const followups = useMemo(() => filterByMarket(p.followups, marketCode), [p.followups, marketCode]);
  const closing = useMemo(() => filterByMarket(p.closing, marketCode), [p.closing, marketCode]);
  const specialCases = useMemo(() => filterByMarket(p.specialCases, marketCode), [p.specialCases, marketCode]);
  const storytelling = useMemo(
    () => filterByMarketAndProfile(p.storytelling, marketCode, profileSlug),
    [p.storytelling, marketCode, profileSlug],
  );
  const routines = useMemo(() => filterByMarket(p.routines, marketCode), [p.routines, marketCode]);

  // Reading-time auto pour le current module
  const readingTime = useMemo(() => {
    const text = collectModuleText({
      mid: moduleMeta.id, mindsetBlocks, scripts, replyTree, objections, followups, closing,
      specialCases, storytelling, routines, hashtags, flags, sources,
    });
    const words = text.split(/\s+/).filter(Boolean).length;
    const m = Math.max(1, Math.round(words / 200));
    return `≈ ${m} min de lecture`;
  }, [moduleMeta.id, mindsetBlocks, scripts, replyTree, objections, followups, closing, specialCases, storytelling, routines, hashtags, flags, sources]);

  // Fetch real stats au mount (RPC get_prospection_stats)
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    (async () => {
      const s = await fetchProspectionStats(currentUser.id);
      if (cancelled || !s) return;
      setSent7d(s.total_7d ?? 0);
      setResponses7d(s.responses_7d ?? 0);
      // RDV proxy : nombre d'attempts WhatsApp dans la fenêtre 7j n'est pas
      // exposé par le RPC — on garde positive_7d comme proxy "RDV pris"
      setRdv7d(s.positive_7d ?? 0);
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (sheet) {
        if (e.key === "Escape") { setSheet(null); e.preventDefault(); }
        return;
      }
      if (e.key === "ArrowLeft") { goModule(moduleIdx - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { goModule(moduleIdx + 1); e.preventDefault(); }
      else if (/^[1-9]$/.test(e.key)) { goModule(parseInt(e.key, 10) - 1); e.preventDefault(); }
      else if (e.key === "0") { goModule(9); e.preventDefault(); }
      else if (e.key.toLowerCase() === "m") { setSheet("market"); e.preventDefault(); }
      else if (e.key.toLowerCase() === "p") { setSheet("profile"); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleIdx, sheet]);

  // Auto-center active step in index rail
  useEffect(() => {
    const rail = indexRailRef.current;
    if (!rail) return;
    const active = rail.querySelector<HTMLElement>(".step.active");
    if (!active) return;
    const railRect = rail.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const delta = (aRect.left + aRect.width / 2) - (railRect.left + railRect.width / 2);
    rail.scrollBy({ left: delta, behavior: "smooth" });
  }, [moduleIdx]);

  // Body swap animation
  function goModule(idx: number) {
    const clamped = Math.max(0, Math.min(MODULES.length - 1, idx));
    if (clamped === moduleIdx) return;
    setSwapping(true);
    setTimeout(() => {
      setModuleIdx(clamped);
      setSwapping(false);
      bodyInnerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 160);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  }

  function copy(text: string, label = "Copié !") {
    void navigator.clipboard.writeText(text).catch(() => {});
    showToast(label);
  }

  async function markSent(scriptId: string, scriptPlatform: ProspectionPlatform) {
    setSentScripts((m) => ({ ...m, [scriptId]: true }));
    setSent7d((s) => s + 1);
    if (scriptPlatform === "whatsapp") setRdv7d((r) => r + 1);
    setBumpStat(true);
    setTimeout(() => setBumpStat(false), 800);
    showToast("Envoi noté · +1");
    if (currentUser?.id && marketCode && profileSlug) {
      void createProspectionAttempt({
        coach_id: currentUser.id,
        market_code: marketCode,
        profile_slug: profileSlug,
        platform: scriptPlatform,
      });
    }
  }

  function setLang(scriptId: string, lang: "native" | "fr") {
    setScriptLang((m) => ({ ...m, [scriptId]: lang }));
  }

  function openPicker(kind: "market" | "profile") {
    setPickerOpening(kind);
    setTimeout(() => setPickerOpening(null), 320);
    setSheet(kind);
  }

  const prevMod = moduleIdx > 0 ? MODULES[moduleIdx - 1] : null;
  const nextMod = moduleIdx < MODULES.length - 1 ? MODULES[moduleIdx + 1] : null;

  return (
    <div className="prospection-hub">
      {/* Sticky header */}
      <div className="ph-hdr">
        <div className="ph-row1">
          <div className="ph-brand">
            <span className="ph-gem" />
            La Base 360<small>· prospection</small>
          </div>
          <button type="button" className="ph-stat-chip" onClick={() => setSheet("stat")}>
            <span className="dot-live" />
            <span>
              <b className={bumpStat ? "bumped" : ""}>{sent7d}</b> envoyés ·{" "}
              <b className={bumpStat ? "bumped" : ""}>{rdv7d}</b> RDV
            </span>
            <span className="muted">·&nbsp;7j</span>
          </button>
        </div>

        <div className="ph-pickers">
          <button
            type="button"
            className={`ph-picker${pickerOpening === "market" ? " opening" : ""}`}
            onClick={() => openPicker("market")}
          >
            <span className="flag">{market?.flag ?? "🌍"}</span>
            <div className="info-stack">
              <span className="lbl">Marché</span>
              <span className="val">{market?.label ?? "Choisir"}</span>
            </div>
            <Caret />
          </button>
          <button
            type="button"
            className={`ph-picker${pickerOpening === "profile" ? " opening" : ""}`}
            onClick={() => openPicker("profile")}
          >
            <span className="glyph">{profile?.emoji ?? PROFILE_GLYPHS[profileSlug] ?? "👤"}</span>
            <div className="info-stack">
              <span className="lbl">Profil cible</span>
              <span className="val">{profile?.label ?? "Choisir"}</span>
            </div>
            <Caret />
          </button>
        </div>

        <nav className="ph-index" ref={indexRailRef} aria-label="Index des 10 modules">
          {MODULES.map((m, i) => {
            const cls = i === moduleIdx ? "active" : (i < moduleIdx ? "done" : "");
            return (
              <button
                key={m.id}
                className={`step ${cls}`}
                type="button"
                aria-label={m.name}
                onClick={() => goModule(i)}
              >
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span className="ic">{m.ic}</span>
                <span className="name">{m.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Section meta */}
      <div className="ph-section-meta">
        <span><b>{String(moduleIdx + 1).padStart(2, "0")}</b>&nbsp;/&nbsp;10</span>
        <span>{readingTime}</span>
      </div>

      {/* Section heading */}
      <div className="ph-section-head">
        <div className="kicker">{moduleMeta.kicker}</div>
        <h2>
          {moduleMeta.h2[0]}
          <span className="em">{moduleMeta.h2[1]}</span>
          {moduleMeta.h2[2]}
        </h2>
        <p className="lede">{moduleMeta.lede}</p>
      </div>

      {/* Body */}
      <div className="ph-body">
        <div className={`ph-body-inner${swapping ? " swapping" : ""}`} ref={bodyInnerRef}>
          {moduleMeta.id === "mindset" && <MindsetModule blocks={mindsetBlocks} />}
          {moduleMeta.id === "find" && (
            <FindModule flags={flags} hashtags={hashtags} sources={sources} profile={profile} />
          )}
          {moduleMeta.id === "first_msg" && (
            <FirstMessageModule
              scripts={scripts}
              platform={platform}
              setPlatform={setPlatform}
              marketCode={marketCode}
              scriptLang={scriptLang}
              setLang={setLang}
              sentScripts={sentScripts}
              onCopy={copy}
              onSend={markSent}
            />
          )}
          {moduleMeta.id === "reply" && (
            <ReplyModule nodes={replyTree} marketCode={marketCode} onCopy={copy} />
          )}
          {moduleMeta.id === "objections" && (
            <ObjectionsModule items={objections} marketCode={marketCode} onCopy={copy} />
          )}
          {moduleMeta.id === "post_call" && (
            <PostCallModule items={followups} marketCode={marketCode} onCopy={copy} />
          )}
          {moduleMeta.id === "closing" && (
            <ClosingModule items={closing} marketCode={marketCode} onCopy={copy} />
          )}
          {moduleMeta.id === "special" && (
            <SpecialCasesModule items={specialCases} marketCode={marketCode} caseTab={caseTab} setCaseTab={setCaseTab} onCopy={copy} />
          )}
          {moduleMeta.id === "story" && <StorytellingModule items={storytelling} />}
          {moduleMeta.id === "routine" && (
            <RoutineModule items={routines} checks={checks} setChecks={setChecks} marketTip={marketTip} />
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="ph-botnav">
        <button
          type="button"
          className="ph-btn-nav prev"
          onClick={() => goModule(moduleIdx - 1)}
          disabled={moduleIdx === 0}
        >
          <span className="arr"><ArrowLeft /></span>
          <span className="lab">
            <small>{prevMod ? "Précédent" : "Début"}</small>
            <span>{prevMod?.name ?? "Index"}</span>
          </span>
        </button>
        <div className="ph-dots" aria-hidden="true">
          {MODULES.map((_, i) => (
            <span key={i} className={`d ${i === moduleIdx ? "on" : i < moduleIdx ? "done" : ""}`} />
          ))}
        </div>
        <button
          type="button"
          className="ph-btn-nav next"
          onClick={() => goModule(moduleIdx + 1)}
          disabled={moduleIdx === MODULES.length - 1}
        >
          <span className="arr"><ArrowRight /></span>
          <span className="lab">
            <small>{nextMod ? `Suivant · ${String(moduleIdx + 2).padStart(2, "0")}` : "Fin"}</small>
            <span>{nextMod?.name ?? "—"}</span>
          </span>
        </button>
      </nav>

      {/* Toast */}
      <div className={`ph-toast${toast ? " show" : ""}`} aria-live="polite">
        <span className="ic">✓</span>
        <span>{toast ?? ""}</span>
      </div>

      {/* Sheets */}
      <div className={`ph-sheet-backdrop${sheet ? " open" : ""}`} onClick={() => setSheet(null)} />
      <div className={`ph-sheet${sheet === "stat" ? " ph-stat-sheet" : ""}${sheet ? " open" : ""}`}>
        <div className="grab" />
        {sheet === "market" && (
          <>
            <div className="sheet-head">
              <div className="kicker">Choisir un marché</div>
              <h3>Marché cible.</h3>
            </div>
            <div className="sheet-body">
              <div className="ph-opts cols-2">
                {p.markets.map((m) => (
                  <button
                    key={m.code}
                    className={`ph-opt${m.code === marketCode ? " on" : ""}`}
                    type="button"
                    onClick={() => { setMarketCode(m.code); setSheet(null); }}
                  >
                    <span className="flag">{m.flag}</span>
                    <span className="info">
                      <b>{m.label}</b>
                      <small>{m.description ?? m.code}</small>
                    </span>
                    <span className="check" />
                  </button>
                ))}
              </div>
              <p style={{ fontFamily: "var(--hub-f-mono)", fontSize: 10.5, color: "var(--hub-muted)", lineHeight: 1.6, marginTop: 14, padding: "10px 12px", background: "var(--hub-surface2)", borderRadius: 10 }}>
                Les scripts, hashtags et sources se localisent automatiquement.
              </p>
            </div>
          </>
        )}
        {sheet === "profile" && (
          <>
            <div className="sheet-head">
              <div className="kicker">Choisir un profil</div>
              <h3>Profil cible.</h3>
            </div>
            <div className="sheet-body">
              <div className="ph-opts">
                {p.profiles.map((pp) => (
                  <button
                    key={pp.slug}
                    className={`ph-opt${pp.slug === profileSlug ? " on" : ""}`}
                    type="button"
                    onClick={() => { setProfileSlug(pp.slug); setSheet(null); }}
                  >
                    <span className="glyph">{pp.emoji}</span>
                    <span className="info">
                      <b>{pp.label}</b>
                      <small>{pp.description ?? ""}</small>
                    </span>
                    <span className="check" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {sheet === "stat" && (
          <StatFunnelSheet sent={sent7d} rdv={rdv7d} responses={responses7d} />
        )}
      </div>

      {/* Restart tunnel — lien minuscule en footer, hors flow visuel */}
      <button
        type="button"
        onClick={p.onRestartTunnel}
        style={{
          alignSelf: "center",
          margin: "6px auto 18px",
          padding: "4px 10px",
          borderRadius: 999,
          border: "none",
          background: "transparent",
          color: "var(--hub-muted-2)",
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: "var(--hub-f-mono)",
          cursor: "pointer",
          opacity: 0.6,
        }}
      >
        ↺ Revoir le tunnel onboarding
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Module renderers
// ────────────────────────────────────────────────────────────

function MindsetModule({ blocks }: { blocks: ProspectionMindsetBlock[] }) {
  const truths = blocks.filter((b) => b.kind === "truth");
  const errors = blocks.filter((b) => b.kind === "error");
  return (
    <>
      {truths[0] && (
        <article className="ph-truth">
          <div className="ph-truth-row">
            <div className="num">01</div>
            <div>
              <div className="kicker">Vérité n°1 · posture</div>
              <p className="quote">{renderTruthBody(truths[0].body)}</p>
              <p style={{ fontFamily: "var(--hub-f-body)", fontStyle: "italic", fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 10 }}>
                — extrait <em>Méthode 360</em>
              </p>
            </div>
          </div>
        </article>
      )}
      {truths.slice(1).map((t, i) => (
        <div key={t.id} className="ph-truth-lite">
          <div className="ctx">Vérité n°{i + 2} · {t.title.split(" ")[0].toLowerCase()}</div>
          <p>{renderTruthBody(t.body)}</p>
        </div>
      ))}

      <div className="ph-errors-head">
        <span className="label">{errors.length} erreurs à éviter</span>
        <span style={{ fontFamily: "var(--hub-f-mono)", fontSize: 10, color: "var(--hub-muted)", letterSpacing: "0.1em" }}>↓ scroll</span>
      </div>
      {errors.map((e, i) => (
        <div key={e.id} className="ph-err">
          <span className="n">{String(i + 1).padStart(2, "0")}</span>
          <div className="txt">{e.body}</div>
        </div>
      ))}
    </>
  );
}

function FindModule({
  flags, hashtags, sources, profile,
}: {
  flags: ProspectionProfileFlag[];
  hashtags: ProspectionHashtag[];
  sources: ProspectionSource[];
  profile: ProspectionProfile | null;
}) {
  const green = flags.filter((f) => f.flag_type === "green");
  const red = flags.filter((f) => f.flag_type === "red");
  const mainstream = hashtags.filter((h) => h.category === "mainstream");
  const niche = hashtags.filter((h) => h.category === "niche");
  const cross = hashtags.filter((h) => h.category === "cross");
  const srcMap: Record<string, ProspectionSource[]> = {
    fb_groups: sources.filter((s) => s.kind === "fb_groups"),
    irl: sources.filter((s) => s.kind === "irl"),
    recommendations: sources.filter((s) => s.kind === "recommendations"),
    inbound_content: sources.filter((s) => s.kind === "inbound_content"),
  };
  return (
    <>
      <div className="ph-scan-timer">
        <span className="pulse" />
        Scan en 30 s · les 4 premières secondes
      </div>

      <div className="ph-flags">
        <div className="ph-flag-col green">
          <h5><span className="dot" />Drapeaux verts</h5>
          <ul>
            {green.map((f) => (<li key={f.id}>{f.text}</li>))}
          </ul>
        </div>
        <div className="ph-flag-col red">
          <h5><span className="dot" />Drapeaux rouges</h5>
          <ul>
            {red.map((f) => (<li key={f.id}>{f.text}</li>))}
          </ul>
        </div>
      </div>

      <div className="ph-hashtag-card">
        <div className="htag-head">
          <span>Hashtags · 3 <b>catégories</b></span>
        </div>
        {mainstream.length > 0 && (
          <div className="ph-htag-row">
            <span className="cat">Mainstream</span>
            {mainstream.map((h) => (<span key={h.id} className="ph-htag">{h.hashtag}</span>))}
          </div>
        )}
        {niche.length > 0 && (
          <div className="ph-htag-row">
            <span className="cat">Niche</span>
            {niche.map((h) => (<span key={h.id} className="ph-htag teal">{h.hashtag}</span>))}
          </div>
        )}
        {cross.length > 0 && (
          <div className="ph-htag-row">
            <span className="cat">Cross</span>
            {cross.map((h) => (<span key={h.id} className="ph-htag gold">{h.hashtag}</span>))}
          </div>
        )}
        {profile?.hashtag_advice && (
          <p style={{ fontFamily: "var(--hub-f-mono)", fontSize: 10.5, color: "var(--hub-muted)", lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--hub-line)" }}>
            {profile.hashtag_advice}
          </p>
        )}
      </div>

      <article className="ph-src-card">
        <div className="kk">Sources hors-feed</div>
        <h4>Là où on n'écrit pas en premier</h4>
        {srcMap.fb_groups[0] && (
          <div className="ph-src-row">
            <span className="lab">Facebook</span>
            <div className="body">{srcMap.fb_groups[0].detail ?? srcMap.fb_groups[0].label}</div>
          </div>
        )}
        {srcMap.irl[0] && (
          <div className="ph-src-row">
            <span className="lab">IRL</span>
            <div className="body">{srcMap.irl[0].detail ?? srcMap.irl[0].label}</div>
          </div>
        )}
        {srcMap.recommendations[0] && (
          <div className="ph-src-row">
            <span className="lab">Reco</span>
            <div className="body">{srcMap.recommendations[0].detail ?? srcMap.recommendations[0].label}</div>
          </div>
        )}
        {srcMap.inbound_content[0] && (
          <div className="ph-src-row">
            <span className="lab">Inbound</span>
            <div className="body">{srcMap.inbound_content[0].detail ?? srcMap.inbound_content[0].label}</div>
          </div>
        )}
      </article>
    </>
  );
}

function FirstMessageModule({
  scripts, platform, setPlatform, marketCode, scriptLang, setLang, sentScripts, onCopy, onSend,
}: {
  scripts: ProspectionScript[];
  platform: ProspectionPlatform;
  setPlatform: (p: ProspectionPlatform) => void;
  marketCode: string;
  scriptLang: Record<string, "native" | "fr">;
  setLang: (id: string, lang: "native" | "fr") => void;
  sentScripts: Record<string, boolean>;
  onCopy: (text: string, label?: string) => void;
  onSend: (id: string, platform: ProspectionPlatform) => void;
}) {
  const m1 = scripts.filter((s) => s.kind === "first_contact" && s.platform === platform);
  return (
    <>
      <div className="ph-platform-tabs">
        {PLATFORM_ORDER.map((pl) => (
          <button
            key={pl}
            className={`tab${platform === pl ? " on" : ""}`}
            type="button"
            onClick={() => setPlatform(pl)}
          >
            <span className="ic">{PLATFORM_GLYPH[pl]}</span>
            <span>{PLATFORM_SHORT[pl]}</span>
          </button>
        ))}
      </div>

      {m1.length === 0 && (
        <Empty>Aucun script pour cette plateforme sur ce marché × profil.</Empty>
      )}

      {m1.map((s) => {
        const isSent = !!sentScripts[s.id];
        const showFr = marketCode !== "fr" && !!s.body_fr && (scriptLang[s.id] ?? "native") === "native";
        const langActive = scriptLang[s.id] ?? "native";
        const body = langActive === "fr" && s.body_fr ? s.body_fr : s.body;
        return (
          <article key={s.id} className={`ph-script${isSent ? " sent" : ""}`}>
            <div className="head">
              <span className="glyph">{PLATFORM_GLYPH[s.platform]}</span>
              <h4>{s.label ?? PLATFORM_LABELS[s.platform]}</h4>
              {marketCode !== "fr" && s.body_fr && (
                <div className="ph-lang-switch">
                  <button type="button" className={langActive === "native" ? "on" : ""} onClick={() => setLang(s.id, "native")}>{s.language_label?.split(" ")[0] ?? "EN"}</button>
                  <button type="button" className={langActive === "fr" ? "on" : ""} onClick={() => setLang(s.id, "fr")}>FR</button>
                </div>
              )}
            </div>
            {s.tip && (
              <div className="ctx">{s.tip}</div>
            )}
            <div className="ph-msg-body">{renderScriptBody(body)}</div>
            {showFr && s.body_fr && (
              <div className="ph-trad-line">{s.body_fr}</div>
            )}
            <div className="ph-script-actions">
              <button className="ph-btn copy" type="button" onClick={() => onCopy(body)}>
                <span className="ic">⌘C</span>Copier le script
              </button>
              <button
                className={`ph-btn send${isSent ? " done" : ""}`}
                type="button"
                onClick={() => onSend(s.id, s.platform)}
              >
                {isSent ? "✓ Envoyé" : "→ J'ai envoyé"}
              </button>
            </div>
          </article>
        );
      })}
    </>
  );
}

function ReplyModule({
  nodes, marketCode, onCopy,
}: { nodes: ProspectionReplyNode[]; marketCode: string; onCopy: (t: string) => void }) {
  // Map branches → pill labels
  const branchLabel: Record<string, { pill: string; emoji: string; cls: string }> = {
    positive: { pill: "Tiède", emoji: "🔥", cls: "warm" },
    hot:      { pill: "Très chaude", emoji: "🔥", cls: "warm" },
    negative: { pill: "Froid", emoji: "❄️", cls: "cold" },
    vague:    { pill: "Indécis", emoji: "🤔", cls: "maybe" },
    lukewarm: { pill: "Tiède", emoji: "🌡️", cls: "maybe" },
    question: { pill: "Curieux", emoji: "❓", cls: "maybe" },
  };
  if (nodes.length === 0) return <Empty>Aucune branche pour ce marché × profil.</Empty>;
  return (
    <>
      {nodes.map((n) => {
        const meta = branchLabel[n.branch] ?? { pill: n.branch, emoji: "·", cls: "maybe" };
        return (
          <ReplyBranchCard key={n.id} node={n} meta={meta} marketCode={marketCode} onCopy={onCopy} />
        );
      })}
    </>
  );
}

function ReplyBranchCard({
  node, meta, marketCode, onCopy,
}: {
  node: ProspectionReplyNode;
  meta: { pill: string; emoji: string; cls: string };
  marketCode: string;
  onCopy: (t: string) => void;
}) {
  const { body, toggle } = useBodyToggle(node.body, node.body_fr, marketCode);
  const isWarm = meta.cls === "warm";
  return (
    <article className={`ph-tree-branch${isWarm ? " warm-branch" : ""}`}>
      <div className="reaction">
        <span>{meta.emoji} Il / elle réagit</span>
        <span className={`pill ${meta.cls}`}>{meta.pill}</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--hub-f-mono)", fontSize: 9.5, color: "var(--hub-muted)" }}>{node.level}</span>
        {toggle}
      </div>
      <q>{node.tip ?? "—"}</q>
      <div className="reply">{renderScriptBody(body)}</div>
      <div className="actions">
        <button className="ph-btn copy" type="button" onClick={() => onCopy(body)}>
          <span className="ic">⌘C</span>Copier
        </button>
      </div>
    </article>
  );
}

function ObjectionsModule({
  items, marketCode, onCopy,
}: { items: ProspectionObjection[]; marketCode: string; onCopy: (t: string) => void }) {
  if (items.length === 0) return <Empty>Aucune objection pour ce marché.</Empty>;
  return (
    <>
      {items.map((o, i) => (
        <ObjectionCard key={o.id} objection={o} idx={i} marketCode={marketCode} onCopy={onCopy} />
      ))}
    </>
  );
}

function ObjectionCard({
  objection: o, idx: i, marketCode, onCopy,
}: { objection: ProspectionObjection; idx: number; marketCode: string; onCopy: (t: string) => void }) {
  const { body: goodBody, toggle } = useBodyToggle(o.good_response, o.good_response_fr, marketCode);
  return (
    <div className="ph-obj">
      <div className="quote">
        <div className="n">{String(i + 1).padStart(2, "0")}<small>{o.slug}</small></div>
        <q>{o.title}</q>
      </div>
      <div className="ph-obj-row bad">
        <span className="badge">✕</span>
        <div>
          <div className="lbl">À ne pas dire</div>
          <p>{o.bad_response}</p>
        </div>
      </div>
      <div className="ph-obj-row good">
        <span className="badge">✓</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div className="lbl">Ce qui ouvre</div>
            {toggle}
          </div>
          <p>{renderScriptBody(goodBody)}</p>
        </div>
      </div>
      {o.warning && (
        <div className="ph-obj-row bad" style={{ marginTop: 6 }}>
          <span className="badge">!</span>
          <div>
            <div className="lbl" style={{ color: "var(--hub-accent-dark)" }}>Attention</div>
            <p style={{ color: "var(--hub-text)", textDecoration: "none" }}>{o.warning}</p>
          </div>
        </div>
      )}
      <div className="ph-obj-actions">
        <button className="ph-btn copy" type="button" onClick={() => onCopy(goodBody)}>
          <span className="ic">⌘C</span>Copier la réponse
        </button>
      </div>
    </div>
  );
}

function PostCallModule({
  items, marketCode, onCopy,
}: { items: ProspectionFollowup[]; marketCode: string; onCopy: (t: string) => void }) {
  const postCall = items.filter((i) => i.kind === "post_call").sort((a, b) => a.day_offset - b.day_offset);
  if (postCall.length === 0) return <Empty>Pas de séquence post-appel pour ce marché.</Empty>;
  return (
    <div className="ph-timeline">
      {postCall.map((f, idx) => (
        <FollowupStep key={f.id} followup={f} idx={idx} marketCode={marketCode} onCopy={onCopy} />
      ))}
    </div>
  );
}

function FollowupStep({
  followup: f, idx, marketCode, onCopy,
}: { followup: ProspectionFollowup; idx: number; marketCode: string; onCopy: (t: string) => void }) {
  const { body, toggle } = useBodyToggle(f.body, f.body_fr, marketCode);
  const state = idx === 0 ? "now" : "future";
  return (
    <div className={`ph-t-step ${state}`}>
      <div className="when" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>{f.title}</span>
        {toggle}
      </div>
      <h4>Touche {idx + 1}</h4>
      <div className="msg">{renderScriptBody(body)}</div>
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        <button className="ph-btn copy" type="button" onClick={() => onCopy(body)}>
          <span className="ic">⌘C</span>Copier
        </button>
        {f.warning && (
          <span style={{ fontFamily: "var(--hub-f-mono)", fontSize: 10, color: "var(--hub-accent-dark)", alignSelf: "center" }}>⚠ {f.warning}</span>
        )}
      </div>
    </div>
  );
}

function ClosingModule({
  items, marketCode, onCopy,
}: { items: ProspectionClosingBlock[]; marketCode: string; onCopy: (t: string) => void }) {
  const signals = items.filter((i) => i.kind === "signal");
  const scripts = items.filter((i) => i.kind !== "signal");
  if (items.length === 0) return <Empty>Aucun closing pour ce marché.</Empty>;
  const scriptTitle: Record<string, string> = {
    propose: "Proposer le passage à l'acte",
    hesitation: "Quand il hésite",
    final_no: "Encaisser un non sereinement",
  };
  const scriptCtx: Record<string, string> = {
    propose: "Fin d'appel · prospect mûr",
    hesitation: "Avant la dernière phrase",
    final_no: "Porte ouverte pour plus tard",
  };
  return (
    <>
      {signals.length > 0 && (
        <div className="ph-signal-card">
          <h5>Signaux d'achat ({signals.length})</h5>
          <div className="ph-signal-list">
            {signals.map((s) => (
              <div key={s.id} className="row">{s.title ?? s.body}</div>
            ))}
          </div>
        </div>
      )}
      {scripts.map((s) => (
        <CloseScriptCard
          key={s.id}
          script={s}
          marketCode={marketCode}
          title={s.title ?? scriptTitle[s.kind] ?? s.kind}
          ctx={scriptCtx[s.kind]}
          onCopy={onCopy}
        />
      ))}
    </>
  );
}

function CloseScriptCard({
  script: s, marketCode, title, ctx, onCopy,
}: {
  script: ProspectionClosingBlock;
  marketCode: string;
  title: string;
  ctx?: string;
  onCopy: (t: string) => void;
}) {
  const { body, toggle } = useBodyToggle(s.body, s.body_fr, marketCode);
  return (
    <article className="ph-close-script">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <h4>{title}</h4>
        {toggle}
      </div>
      {ctx && <div className="ctx">{ctx}</div>}
      <p>{renderScriptBody(body)}</p>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <button className="ph-btn copy" type="button" onClick={() => onCopy(body)}>
          <span className="ic">⌘C</span>Copier
        </button>
      </div>
    </article>
  );
}

function SpecialCasesModule({
  items, marketCode, caseTab, setCaseTab, onCopy,
}: {
  items: ProspectionSpecialCase[];
  marketCode: string;
  caseTab: "ghost_after_exchange" | "reactivation_3_6m" | "referral_request";
  setCaseTab: (k: "ghost_after_exchange" | "reactivation_3_6m" | "referral_request") => void;
  onCopy: (t: string) => void;
}) {
  if (items.length === 0) return <Empty>Aucun cas spécial pour ce marché.</Empty>;
  const tabs = [
    { id: "ghost_after_exchange" as const, label: "Ghost" },
    { id: "reactivation_3_6m" as const, label: "Réactivation" },
    { id: "referral_request" as const, label: "Reco" },
  ];
  const active = items.find((i) => i.kind === caseTab);
  return (
    <>
      <div className="ph-case-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={caseTab === t.id ? "on" : ""}
            onClick={() => setCaseTab(t.id)}
          >{t.label}</button>
        ))}
      </div>
      {active && (
        <SpecialCaseCard
          key={active.id}
          item={active}
          marketCode={marketCode}
          onCopy={onCopy}
        />
      )}
    </>
  );
}

function SpecialCaseCard({
  item, marketCode, onCopy,
}: { item: ProspectionSpecialCase; marketCode: string; onCopy: (t: string) => void }) {
  const { body, toggle } = useBodyToggle(item.body, item.body_fr, marketCode);
  return (
    <article className="ph-close-script">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <h4>{item.title}</h4>
        {toggle}
      </div>
      <p>{renderScriptBody(body)}</p>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <button className="ph-btn copy" type="button" onClick={() => onCopy(body)}>
          <span className="ic">⌘C</span>Copier
        </button>
      </div>
    </article>
  );
}

function StorytellingModule({ items }: { items: ProspectionStoryBlock[] }) {
  if (items.length === 0) return <Empty>Pas encore de storytelling pour ce profil sur ce marché.</Empty>;
  const structure = items.filter((i) => i.kind === "structure_step");
  const examples = items.filter((i) => i.kind === "example");
  const rules = items.filter((i) => i.kind === "rule");
  // 3 actes max (Avant / Déclic / Après) — on prend les 3 premiers structure_steps
  const acts = structure.slice(0, 3);
  return (
    <>
      {acts.length > 0 && (
        <div className="ph-story-struct">
          {acts.map((s, i) => (
            <div key={s.id} className={`seg${i === 1 ? " gold" : ""}`}>
              <div className="step">Acte {["I","II","III"][i]}</div>
              <h6>{s.title}</h6>
              <p>{s.body.length > 60 ? s.body.slice(0, 60) + "…" : s.body}</p>
            </div>
          ))}
        </div>
      )}
      {examples.map((ex) => (
        <article key={ex.id} className="ph-story-example">
          <div className="by">{ex.title}</div>
          <p>{ex.body}</p>
        </article>
      ))}
      {rules.length > 0 && (
        <div className="ph-truth-lite" style={{ marginTop: 14 }}>
          <div className="ctx">Règles d'or</div>
          {rules.map((r) => (
            <p key={r.id} style={{ fontSize: 15, marginBottom: 6, lineHeight: 1.35 }}>
              <em>{r.title}</em> — <span style={{ fontWeight: 400, fontSize: 13, color: "var(--hub-muted)" }}>{r.body}</span>
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function RoutineModule({
  items, checks, setChecks, marketTip,
}: {
  items: ProspectionRoutineItem[];
  checks: Record<string, boolean>;
  setChecks: (m: Record<string, boolean>) => void;
  marketTip: ProspectionMarketTip | null;
}) {
  const checklist = items.filter((i) => i.kind === "pre_send_checklist");
  const r30 = items.filter((i) => i.kind === "routine_30m");
  const totalMins = r30.reduce((sum, r) => sum + (r.duration_minutes ?? 0), 0) || 30;
  if (items.length === 0) return <Empty>Aucune routine pour ce marché.</Empty>;
  return (
    <>
      <div className="ph-routine-summary">
        <div>
          <div className="big">{totalMins}<small>min/jour</small></div>
        </div>
        <p>
          {r30.length} actions matinales pour {checklist.length} points de vigilance avant chaque envoi.
          {marketTip && (<><br /><span style={{ fontFamily: "var(--hub-f-mono)", fontSize: 11, opacity: 0.8 }}>{marketTip.timing}</span></>)}
        </p>
      </div>
      <div className="ph-checklist">
        {r30.map((r) => {
          const id = `r30-${r.id}`;
          const done = !!checks[id];
          return (
            <div
              key={id}
              className={`ph-check-item${done ? " done" : ""}`}
              onClick={() => setChecks({ ...checks, [id]: !done })}
            >
              <div className="box" />
              <div className="txt">
                <strong style={{ fontWeight: 600 }}>{r.title}</strong>
                {r.detail && <div style={{ fontSize: 12, color: "var(--hub-muted)", marginTop: 2 }}>{r.detail}</div>}
              </div>
              {r.duration_minutes && <div className="mins">{r.duration_minutes} min</div>}
            </div>
          );
        })}
      </div>
      {checklist.length > 0 && (
        <>
          <div className="ph-errors-head" style={{ marginTop: 18 }}>
            <span className="label" style={{ color: "var(--hub-accent-dark)" }}>
              <span style={{ background: "var(--hub-accent)" }} />Avant chaque envoi
            </span>
            <span style={{ fontFamily: "var(--hub-f-mono)", fontSize: 10, color: "var(--hub-muted)" }}>{checklist.length} points</span>
          </div>
          <div className="ph-checklist">
            {checklist.map((c) => {
              const id = `chk-${c.id}`;
              const done = !!checks[id];
              return (
                <div
                  key={id}
                  className={`ph-check-item${done ? " done" : ""}`}
                  onClick={() => setChecks({ ...checks, [id]: !done })}
                >
                  <div className="box" />
                  <div className="txt">{c.title}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Stat funnel sheet
// ────────────────────────────────────────────────────────────
function StatFunnelSheet({ sent, rdv, responses }: { sent: number; rdv: number; responses: number }) {
  // Réponses : valeur réelle si dispo, sinon proxy 42% du sent.
  const reps = responses > 0 ? responses : Math.round(sent * 0.42);
  const clos = Math.max(0, Math.round(rdv * 0.4));
  const pct = (v: number) => Math.min(100, Math.round((v / Math.max(1, sent)) * 100));
  return (
    <>
      <div className="sheet-head">
        <div className="kicker">7 derniers jours</div>
        <h3>Activité.</h3>
      </div>
      <div className="sheet-body">
        <div className="big">
          <div className="stat"><div className="v">{sent}</div><div className="k">M1 envoyés</div></div>
          <div className="stat"><div className="v">{reps}</div><div className="k">Réponses</div></div>
          <div className="stat"><div className="v">{rdv}</div><div className="k">RDV pris</div></div>
          <div className="stat"><div className="v">{clos}</div><div className="k">Closing</div></div>
        </div>
        <div className="funnel">
          <FnRow lab="Envoyés" v={sent} pct={pct(sent)} />
          <FnRow lab="Réponses" v={reps} pct={pct(reps)} />
          <FnRow lab="RDV" v={rdv} pct={pct(rdv)} />
          <FnRow lab="Closing" v={clos} pct={pct(clos)} />
        </div>
        <p style={{ fontFamily: "var(--hub-f-mono)", fontSize: 10.5, color: "var(--hub-muted)", lineHeight: 1.6, marginTop: 14 }}>
          Chaque <b style={{ color: "var(--hub-text)" }}>« J'ai envoyé »</b> incrémente le compteur.
          Les RDV s'incrémentent quand un script <b style={{ color: "var(--hub-text)" }}>WhatsApp</b> est envoyé (proxy démo).
        </p>
      </div>
    </>
  );
}

function FnRow({ lab, v, pct }: { lab: string; v: number; pct: number }) {
  return (
    <div className="fn-row">
      <span className="lab">{lab}</span>
      <div className="fn-bar"><div className="fn-fill" style={{ width: `${pct}%` }} /></div>
      <span className="v">{v}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Hook : toggle Natif ↔ FR pour les modules qui exposent un body à
 * copier-coller (scripts envoyés au prospect).
 *
 * - Sur marché FR : pas de toggle, juste le body natif (= FR).
 * - Sur marché non-FR sans body_fr : pas de toggle, juste le natif.
 * - Sur marché non-FR avec body_fr : toggle segmented inline.
 *   Par défaut on affiche le NATIF (c'est ce que le coach copie pour
 *   envoyer au prospect). FR = vérification de compréhension.
 *
 * Retourne le body courant + le node JSX du toggle (à insérer où on veut).
 */
function useBodyToggle(native: string, fr: string | null, marketCode: string): {
  body: string;
  toggle: ReactNode;
} {
  const [lang, setLang] = useState<"native" | "fr">("native");
  const hasToggle = marketCode !== "fr" && !!fr && fr.trim().length > 0;
  const body = hasToggle && lang === "fr" ? (fr as string) : native;
  if (!hasToggle) return { body, toggle: null };
  return {
    body,
    toggle: (
      <div className="ph-lang-switch" style={{ marginLeft: "auto", flexShrink: 0 }}>
        <button type="button" className={lang === "native" ? "on" : ""} onClick={() => setLang("native")}>
          {marketCode.toUpperCase()}
        </button>
        <button type="button" className={lang === "fr" ? "on" : ""} onClick={() => setLang("fr")}>
          FR
        </button>
      </div>
    ),
  };
}

function Caret() {
  return (
    <svg className="caret" viewBox="0 0 12 12" fill="none">
      <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowLeft() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 3 4 6l3.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ArrowRight() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3 8 6l-3.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "var(--hub-muted)", fontSize: 13, fontFamily: "var(--hub-f-mono)" }}>
      {children}
    </div>
  );
}

/** Render le body d'une vérité Mindset avec emphase sur les mots-clés italique gold. */
function renderTruthBody(body: string): ReactNode {
  // Stratégie simple : la 1ère phrase est traitée comme la pull-quote
  const firstSentence = body.split(/(?<=[.!?])\s+/)[0];
  return firstSentence;
}

/**
 * Render le body d'un script en mettant en valeur les variables [prénom]
 * (gold) et [contexte] (teal). On considère que [foo], [nom], [name],
 * [first name], [isim], [nombre], [nome] = "primary" (gold). Les autres
 * variables = teal.
 */
function renderScriptBody(body: string): ReactNode {
  const VAR_RE = /\[([^\]]+)\]/g;
  const PRIMARY = /^(pr[ée]nom|nom|name|first[ _]name|isim|nombre|nome|prénom)$/i;
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = VAR_RE.exec(body)) !== null) {
    if (m.index > lastIdx) parts.push(body.slice(lastIdx, m.index));
    const label = m[1];
    const isPrimary = PRIMARY.test(label.trim());
    parts.push(
      <span key={`v${key++}`} className={`ph-var${isPrimary ? "" : " teal"}`}>[{label}]</span>,
    );
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < body.length) parts.push(body.slice(lastIdx));
  return parts;
}

/** Concatène le texte d'un module pour calculer le reading time. */
function collectModuleText(args: {
  mid: ModuleId;
  mindsetBlocks: ProspectionMindsetBlock[];
  scripts: ProspectionScript[];
  replyTree: ProspectionReplyNode[];
  objections: ProspectionObjection[];
  followups: ProspectionFollowup[];
  closing: ProspectionClosingBlock[];
  specialCases: ProspectionSpecialCase[];
  storytelling: ProspectionStoryBlock[];
  routines: ProspectionRoutineItem[];
  hashtags: ProspectionHashtag[];
  flags: ProspectionProfileFlag[];
  sources: ProspectionSource[];
}): string {
  switch (args.mid) {
    case "mindset":   return args.mindsetBlocks.map((b) => b.body).join(" ");
    case "find":      return args.flags.map((f) => f.text).concat(args.hashtags.map((h) => h.hashtag), args.sources.map((s) => s.detail ?? s.label)).join(" ");
    case "first_msg": return args.scripts.filter((s) => s.kind === "first_contact").map((s) => s.body).join(" ");
    case "reply":     return args.replyTree.map((n) => n.body).join(" ");
    case "objections":return args.objections.map((o) => o.good_response + " " + o.meaning).join(" ");
    case "post_call": return args.followups.map((f) => f.body).join(" ");
    case "closing":   return args.closing.map((c) => c.body).join(" ");
    case "special":   return args.specialCases.map((s) => s.body).join(" ");
    case "story":     return args.storytelling.map((s) => s.body).join(" ");
    case "routine":   return args.routines.map((r) => (r.title + " " + (r.detail ?? ""))).join(" ");
  }
}
