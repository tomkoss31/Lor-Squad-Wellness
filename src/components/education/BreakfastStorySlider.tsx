import { useRef, useState } from "react";
import type { BreakfastAnalysis } from "../../types/domain";

// ─── Préréglages ────────────────────────────────────────────────────────
type PresetKey = "francais_classique" | "anglais" | "saute" | "sain_maison";

const BREAKFAST_PRESETS: Record<
  PresetKey,
  { label: string; hint: string; analysis: BreakfastAnalysis }
> = {
  francais_classique: {
    label: "Petit-déj français classique",
    hint: "Café + tartines beurre/confiture + jus",
    analysis: { sucres: 85, proteines: 15, hydratation: 5, fibres: 25 },
  },
  anglais: {
    label: "Petit-déj anglais",
    hint: "Œufs + bacon + toast + haricots",
    analysis: { sucres: 35, proteines: 70, hydratation: 20, fibres: 40 },
  },
  saute: {
    label: "Petit-déj sauté",
    hint: "Rien ou juste un café",
    analysis: { sucres: 10, proteines: 5, hydratation: 15, fibres: 0 },
  },
  sain_maison: {
    label: "Petit-déj sain maison",
    hint: "Flocons + fruits + yaourt + thé",
    analysis: { sucres: 35, proteines: 40, hydratation: 60, fibres: 65 },
  },
};

const LORSQUAD_BREAKFAST_ANALYSIS: BreakfastAnalysis = {
  sucres: 20,
  proteines: 80,
  hydratation: 90,
  fibres: 65,
};

export const DEFAULT_BREAKFAST_ANALYSIS: BreakfastAnalysis = {
  sucres: 50,
  proteines: 50,
  hydratation: 50,
  fibres: 50,
};

// ─── Helpers qualitatifs ────────────────────────────────────────────────
type Tone = "good" | "warning" | "danger";

function computeTone(field: keyof BreakfastAnalysis, value: number): Tone {
  if (field === "sucres") {
    if (value >= 60) return "danger";
    if (value >= 35) return "warning";
    return "good";
  }
  if (value < 30) return "danger";
  if (value < 55) return "warning";
  return "good";
}

function getQualitativeLabel(field: keyof BreakfastAnalysis, value: number): string {
  if (field === "sucres") {
    if (value >= 75) return "Très haut";
    if (value >= 55) return "Haut";
    if (value >= 35) return "Modéré";
    if (value >= 15) return "Bas";
    return "Très bas";
  }
  if (field === "hydratation") {
    if (value < 10) return "Zéro";
    if (value < 30) return "Faible";
    if (value < 55) return "Modérée";
    if (value < 80) return "Bonne";
    return "Très bonne";
  }
  if (value < 20) return "Faible";
  if (value < 45) return "Basse";
  if (value < 70) return "Correcte";
  return "Élevée";
}

const TONE_COLOR: Record<Tone, string> = {
  good: "var(--ls-teal)",
  warning: "var(--ls-gold)",
  danger: "var(--ls-coral)",
};

// ─── Icônes SVG ─────────────────────────────────────────────────────────
function BreakfastIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="24" cy="36" rx="18" ry="4" />
      <rect x="10" y="28" width="20" height="6" rx="1" />
      <path d="M10 31h20" strokeDasharray="2 2" />
      <path d="M32 20h6a3 3 0 0 1 0 6h-1" />
      <rect x="28" y="18" width="10" height="12" rx="1" />
      <path d="M30 14v2M33 14v2M36 14v2" strokeWidth="1" />
    </svg>
  );
}

function SolutionIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 12h10l-1 28a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
      <path d="M14 18h10" />
      <circle cx="19" cy="26" r="1" fill="currentColor" />
      <path d="M30 12h8v4h-8z" />
      <path d="M32 16h4v22a2 2 0 0 1-2 2 2 2 0 0 1-2-2z" />
    </svg>
  );
}

function LightningIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function DrowsyIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h3l2-8 4 16 3-10 2 5 2-3h4"/></svg>; }
function MuscleIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8c0-2 2-4 5-4s5 2 5 4v2c0 2 3 3 3 6s-3 4-5 4h-6c-2 0-5-1-5-4s3-4 3-6z"/></svg>; }
function DropIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/></svg>; }
function SeedIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5-5 8-10 5-16-3 0-6 2-8 5-2-3-5-5-8-5-3 6 0 11 5 16 2 1 4 1 6 0z"/></svg>; }
function CheckIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }

// ─── Composant Gauge ────────────────────────────────────────────────────
function Gauge({
  field,
  label,
  value,
  onChange,
  readOnly,
}: {
  field: keyof BreakfastAnalysis;
  label: string;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  const tone = computeTone(field, value);
  const color = TONE_COLOR[tone];
  const qualitative = getQualitativeLabel(field, value);

  return (
    <div className="ls-gauge">
      <div className="ls-gauge__label">{label}</div>
      <div className="ls-gauge__track">
        <div className="ls-gauge__fill" style={{ width: `${value}%`, background: color }} />
        {!readOnly && (
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange?.(parseInt(e.target.value, 10))}
            className="ls-gauge__input"
            aria-label={`${label} : ${qualitative}`}
          />
        )}
      </div>
      <div className="ls-gauge__qualitative" style={{ color }}>
        {qualitative}
      </div>
    </div>
  );
}

// ─── Chapter 1 : Diagnostic ─────────────────────────────────────────────
function Chapter1Diagnostic({
  breakfastContent,
  analysis,
  onAnalysisChange,
  readOnly,
}: {
  breakfastContent?: string;
  analysis: BreakfastAnalysis;
  onAnalysisChange: (next: BreakfastAnalysis) => void;
  readOnly?: boolean;
}) {
  function applyPreset(key: PresetKey) {
    onAnalysisChange(BREAKFAST_PRESETS[key].analysis);
  }

  function updateField(field: keyof BreakfastAnalysis, v: number) {
    onAnalysisChange({ ...analysis, [field]: v });
  }

  return (
    <div className="ls-chapter ls-chapter--diagnostic">
      <div className="ls-chapter__header">
        <div className="ls-chapter__icon-wrap">
          <BreakfastIcon />
        </div>
        <div>
          <div className="ls-chapter__eyebrow">Chapitre 1 · Diagnostic</div>
          <h3 className="ls-chapter__title">Voilà ce que tu m'as dit</h3>
        </div>
      </div>

      {breakfastContent && breakfastContent.trim() && (
        <div className="ls-chapter__quote">« {breakfastContent.trim()} »</div>
      )}

      {!readOnly && (
        <div className="ls-preset-select" role="group" aria-label="Préréglages">
          {(Object.keys(BREAKFAST_PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="ls-preset-btn"
              title={BREAKFAST_PRESETS[key].hint}
            >
              {BREAKFAST_PRESETS[key].label}
            </button>
          ))}
        </div>
      )}

      <div className="ls-gauges">
        <Gauge field="sucres" label="Sucres rapides" value={analysis.sucres} onChange={(v) => updateField("sucres", v)} readOnly={readOnly} />
        <Gauge field="proteines" label="Protéines" value={analysis.proteines} onChange={(v) => updateField("proteines", v)} readOnly={readOnly} />
        <Gauge field="hydratation" label="Hydratation" value={analysis.hydratation} onChange={(v) => updateField("hydratation", v)} readOnly={readOnly} />
        <Gauge field="fibres" label="Fibres" value={analysis.fibres} onChange={(v) => updateField("fibres", v)} readOnly={readOnly} />
      </div>
    </div>
  );
}

// ─── Chapter 2 : Awareness ──────────────────────────────────────────────
type Bullet = { icon: React.ReactNode; title: string; subtitle: string; positive?: boolean };

function computeAwarenessBullets(a: BreakfastAnalysis): Bullet[] {
  const bullets: Bullet[] = [];
  if (a.sucres >= 55) {
    bullets.push({
      icon: <LightningIcon />,
      title: "Pic d'énergie vers 9h30",
      subtitle: "Les sucres rapides font monter ta glycémie vite.",
    });
    bullets.push({
      icon: <DrowsyIcon />,
      title: "Coup de pompe 10h30-11h",
      subtitle: "Fringale avant le déjeuner, difficile de tenir.",
    });
  }
  if (a.proteines < 30) {
    bullets.push({
      icon: <MuscleIcon />,
      title: "Satiété courte",
      subtitle: "Peu de protéines = faim plus rapide.",
    });
  }
  if (a.hydratation < 20) {
    bullets.push({
      icon: <DropIcon />,
      title: "Hydratation à zéro au réveil",
      subtitle: "Ton corps a jeûné 8h, il attend de l'eau avant tout.",
    });
  }
  if (a.fibres < 30) {
    bullets.push({
      icon: <SeedIcon />,
      title: "Transit fragile",
      subtitle: "Peu de fibres = digestion moins régulière.",
    });
  }
  if (bullets.length === 0) {
    bullets.push({
      icon: <CheckIcon />,
      title: "Ton matin est déjà équilibré",
      subtitle: "On va voir si on peut encore affiner.",
      positive: true,
    });
  }
  return bullets;
}

function Chapter2Awareness({ analysis }: { analysis: BreakfastAnalysis }) {
  const bullets = computeAwarenessBullets(analysis);
  return (
    <div className="ls-chapter ls-chapter--awareness">
      <div className="ls-chapter__header">
        <div className="ls-chapter__icon-wrap">
          <LightningIcon />
        </div>
        <div>
          <div className="ls-chapter__eyebrow">Chapitre 2 · Prise de conscience</div>
          <h3 className="ls-chapter__title">Ce que ça fait dans ton corps</h3>
        </div>
      </div>

      <div className="ls-bullets">
        {bullets.map((b, i) => (
          <div key={i} className={`ls-bullet${b.positive ? " ls-bullet--positive" : ""}`}>
            <div className="ls-bullet__icon" style={{ color: b.positive ? "var(--ls-teal)" : "var(--ls-coral)" }}>
              {b.icon}
            </div>
            <div>
              <div className="ls-bullet__title">{b.title}</div>
              <div className="ls-bullet__subtitle">{b.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapter 3 : Solution ───────────────────────────────────────────────
function Chapter3Solution() {
  return (
    <div className="ls-chapter ls-chapter--solution">
      <div className="ls-chapter__header">
        <div className="ls-chapter__icon-wrap">
          <SolutionIcon />
        </div>
        <div>
          <div className="ls-chapter__eyebrow">Chapitre 3 · Solution</div>
          <h3 className="ls-chapter__title">Ton matin Lor'Squad</h3>
        </div>
      </div>

      <div className="ls-chapter__meta">
        <span>10 minutes</span>
        <span>·</span>
        <span>cadré</span>
        <span>·</span>
        <span>duplicable</span>
      </div>

      <div className="ls-gauges">
        <Gauge field="sucres" label="Sucres rapides" value={LORSQUAD_BREAKFAST_ANALYSIS.sucres} readOnly />
        <Gauge field="proteines" label="Protéines" value={LORSQUAD_BREAKFAST_ANALYSIS.proteines} readOnly />
        <Gauge field="hydratation" label="Hydratation" value={LORSQUAD_BREAKFAST_ANALYSIS.hydratation} readOnly />
        <Gauge field="fibres" label="Fibres" value={LORSQUAD_BREAKFAST_ANALYSIS.fibres} readOnly />
      </div>

      <div className="ls-solution-highlight">
        Ton énergie tient jusqu'au déjeuner · pas de fringale · hydraté au réveil
      </div>
    </div>
  );
}

// ─── Navigation ─────────────────────────────────────────────────────────
function ChapterIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="ls-chapter-indicator" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="ls-chapter-dot"
          data-active={i === current}
          data-done={i < current}
        />
      ))}
    </div>
  );
}

function ChapterNavigation({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="ls-chapter-nav">
      <button type="button" onClick={onPrev} disabled={current === 0} className="ls-chapter-nav__btn">
        ← Précédent
      </button>
      <div className="ls-chapter-nav__position">Chapitre {current + 1} / {total}</div>
      <button
        type="button"
        onClick={onNext}
        disabled={current === total - 1}
        className="ls-chapter-nav__btn ls-chapter-nav__btn--primary"
      >
        Suivant →
      </button>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────
export interface BreakfastStorySliderProps {
  breakfastContent?: string;
  analysis: BreakfastAnalysis;
  onAnalysisChange: (next: BreakfastAnalysis) => void;
  readOnly?: boolean;
}

export function BreakfastStorySlider({
  breakfastContent,
  analysis,
  onAnalysisChange,
  readOnly = false,
}: BreakfastStorySliderProps) {
  const [currentChapter, setCurrentChapter] = useState(0);
  const touchStartX = useRef<number>(0);
  const TOTAL = 3;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (deltaX > threshold && currentChapter > 0) {
      setCurrentChapter((c) => c - 1);
    } else if (deltaX < -threshold && currentChapter < TOTAL - 1) {
      setCurrentChapter((c) => c + 1);
    }
  }

  return (
    <div className="ls-breakfast-story" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <ChapterIndicator current={currentChapter} total={TOTAL} />

      {currentChapter === 0 && (
        <Chapter1Diagnostic
          breakfastContent={breakfastContent}
          analysis={analysis}
          onAnalysisChange={onAnalysisChange}
          readOnly={readOnly}
        />
      )}
      {currentChapter === 1 && <Chapter2Awareness analysis={analysis} />}
      {currentChapter === 2 && <Chapter3Solution />}

      <ChapterNavigation
        current={currentChapter}
        total={TOTAL}
        onPrev={() => setCurrentChapter((c) => Math.max(0, c - 1))}
        onNext={() => setCurrentChapter((c) => Math.min(TOTAL - 1, c + 1))}
      />
    </div>
  );
}
