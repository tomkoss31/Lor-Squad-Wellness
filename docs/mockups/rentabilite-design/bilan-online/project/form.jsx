// La Base 360 — Step 02 / Objectifs
// Editorial wellness form, mobile.

const { useState, useRef, useCallback, useEffect } = React;

// ── tokens ──────────────────────────────────────────────────
const T = {
  cream: '#FAFAF7',
  navy: '#0F172A',
  gold: '#C9A84C',
  goldSoft: '#E0BF6B',
  hair: '#E5E7EB',
  shellBg: '#ECECE8',
};

// ── wordmark ────────────────────────────────────────────────
function Wordmark() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 8 }}>
      <span style={{
        fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: 14,
        letterSpacing: '0.22em', color: T.navy,
      }}>LA BASE</span>
      <span style={{ position: 'relative', display: 'inline-block', paddingBottom: 2 }}>
        <span style={{
          fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 14,
          letterSpacing: '0.04em', color: T.gold,
        }}>360</span>
        <span style={{
          position: 'absolute', left: 0, right: 0, bottom: -2,
          height: 1, background: T.gold,
        }} />
      </span>
    </div>
  );
}

// ── header ──────────────────────────────────────────────────
function Header() {
  // Top 54px is a transparent safe area for the iOS status bar / Dynamic Island.
  // Visible header content lives in the bottom 64px row.
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      paddingTop: 54,
      background: 'rgba(250,250,247,0.72)',
      backdropFilter: 'saturate(180%) blur(14px)',
      WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      borderBottom: '1px solid rgba(15,23,42,0.05)',
    }}>
      <div style={{
        height: 64, padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Wordmark />
        <span style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13,
          color: T.gold, opacity: 0.7, letterSpacing: 0.1,
        }}>Bilan offert · 2 min</span>
      </div>
    </div>
  );
}

// ── progress ────────────────────────────────────────────────
function Progress({ value = 0.4 }) {
  return (
    <div style={{ height: 2, width: '100%', background: 'rgba(15,23,42,0.06)' }}>
      <div style={{
        height: '100%', width: `${value * 100}%`,
        background: `linear-gradient(90deg, ${T.gold}, ${T.goldSoft})`,
        transition: 'width 480ms cubic-bezier(.2,.7,.2,1)',
      }} />
    </div>
  );
}

// ── mesh background (subtle blobs) ──────────────────────────
function Mesh() {
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', width: 420, height: 420, left: -120, top: -60,
        borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(16,185,129,0.14), rgba(16,185,129,0) 70%)',
        filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute', width: 380, height: 380, right: -140, top: 120,
        borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(6,182,212,0.12), rgba(6,182,212,0) 70%)',
        filter: 'blur(20px)',
      }} />
      <div style={{
        position: 'absolute', width: 460, height: 460, left: -60, bottom: -160,
        borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(139,92,246,0.10), rgba(139,92,246,0) 70%)',
        filter: 'blur(24px)',
      }} />
    </div>
  );
}

// ── eyebrow + filet ─────────────────────────────────────────
function Eyebrow({ children }) {
  return (
    <div>
      <div style={{
        fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: 13,
        letterSpacing: '0.18em', color: T.gold, textTransform: 'uppercase',
      }}>{children}</div>
      <div style={{ height: 1, width: 64, background: T.gold, marginTop: 14 }} />
    </div>
  );
}

// ── card ────────────────────────────────────────────────────
function ObjCard({ emoji, label, active, onClick, full }) {
  return (
    <button
      onClick={onClick}
      style={{
        all: 'unset', cursor: 'pointer',
        gridColumn: full ? 'span 2' : 'auto',
        boxSizing: 'border-box', minHeight: 96,
        padding: '20px 16px', borderRadius: 14,
        background: active
          ? 'color-mix(in oklab, #C9A84C 8%, rgba(255,255,255,0.92))'
          : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
        border: `1.5px solid ${active ? T.gold : T.hair}`,
        boxShadow: active
          ? '0 4px 14px rgba(201,168,76,0.25), inset 0 1px 0 rgba(255,255,255,0.6)'
          : '0 1px 0 rgba(15,23,42,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, transition: 'all 220ms cubic-bezier(.2,.7,.2,1)',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1, filter: active ? 'none' : 'saturate(0.92)' }}>{emoji}</span>
      <span style={{
        fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 15,
        color: T.navy, letterSpacing: -0.1,
      }}>{label}</span>
      {active && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          width: 16, height: 16, borderRadius: 999,
          background: T.gold, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700,
        }}>✓</span>
      )}
    </button>
  );
}

// ── slider ──────────────────────────────────────────────────
const MOTIVATION_LABELS = [
  'Pas encore là', 'Pas encore là', 'En réflexion', 'En réflexion',
  'Un peu hésitant(e)', 'Tiède mais ok', 'Décidé(e)',
  'Plutôt motivé(e)', 'Très motivé(e)', 'Engagé(e)', 'Tout donner',
];

function MotivationSlider({ value, onChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const pct = value / 10;

  const setFromEvent = useCallback((clientX) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round(x * 10));
  }, [onChange]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      setFromEvent(cx);
    };
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, setFromEvent]);

  return (
    <div>
      <div style={{
        fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: 16,
        color: T.navy, letterSpacing: -0.1,
      }}>Ta motivation, tu la situes à combien sur 10 ?</div>
      <div style={{ height: 16 }} />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <div style={{
          fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 32,
          color: T.gold, letterSpacing: '-0.02em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</div>
        <div style={{
          fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 13,
          color: T.navy, opacity: 0.7,
        }}>{MOTIVATION_LABELS[value]}</div>
      </div>
      <div style={{ height: 16 }} />
      <div
        ref={trackRef}
        onMouseDown={(e) => { setDragging(true); setFromEvent(e.clientX); }}
        onTouchStart={(e) => { setDragging(true); setFromEvent(e.touches[0].clientX); }}
        style={{
          position: 'relative', height: 24, width: '100%',
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 6,
          background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 50%, #10B981 100%)',
          boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.08)',
        }} />
        <div style={{
          position: 'absolute', left: `calc(${pct * 100}% - 12px)`,
          width: 24, height: 24, borderRadius: 999,
          background: 'white', border: `2px solid ${T.gold}`,
          boxShadow: '0 2px 8px rgba(15,23,42,0.20), 0 0 0 6px rgba(201,168,76,0.06)',
          transition: dragging ? 'none' : 'left 160ms cubic-bezier(.2,.7,.2,1)',
        }} />
      </div>
      <div style={{
        marginTop: 8, display: 'flex', justifyContent: 'space-between',
        fontFamily: 'Inter, sans-serif', fontSize: 11, color: T.navy, opacity: 0.45,
        letterSpacing: 0.4, textTransform: 'uppercase',
      }}>
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

// ── CTA ─────────────────────────────────────────────────────
function CTA({ disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        all: 'unset', boxSizing: 'border-box',
        width: '100%', padding: '18px 0',
        textAlign: 'center', borderRadius: 14,
        background: disabled
          ? 'linear-gradient(135deg, #D9CFB1, #E5D9B7)'
          : `linear-gradient(135deg, ${T.gold}, ${T.goldSoft})`,
        color: 'white',
        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16,
        letterSpacing: 0.1,
        boxShadow: disabled
          ? '0 2px 8px rgba(201,168,76,0.10)'
          : '0 8px 24px rgba(201,168,76,0.30), inset 0 1px 0 rgba(255,255,255,0.35)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 160ms, box-shadow 220ms',
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.985)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        Suivant
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M1 6h14m0 0L10 1m5 5l-5 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  );
}

// ── page ────────────────────────────────────────────────────
const OBJECTIVES = [
  { id: 'perte',    emoji: '⚖️', label: 'Perte de poids' },
  { id: 'masse',    emoji: '💪', label: 'Prise de masse' },
  { id: 'energie',  emoji: '⚡', label: "Plus d'énergie" },
  { id: 'sommeil',  emoji: '😴', label: 'Mieux dormir' },
  { id: 'bienetre', emoji: '🌿', label: 'Bien-être général', full: true },
];

function FormPage() {
  const [selected, setSelected] = useState(new Set(['perte']));
  const [motivation, setMotivation] = useState(7);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{
      minHeight: '100%', background: T.cream, color: T.navy,
      position: 'relative', overflow: 'hidden',
    }}>
      <Mesh />
      <Header />
      <Progress value={0.4} />

      <div style={{ position: 'relative', zIndex: 1, padding: '64px 24px 40px' }}>
        <Eyebrow>02 — Objectifs</Eyebrow>

        <div style={{ height: 24 }} />

        <h1 style={{
          margin: 0, fontFamily: 'Sora, sans-serif', fontWeight: 600,
          fontSize: 40, lineHeight: 1.05, letterSpacing: '-0.025em', color: T.navy,
        }}>Parle-nous de ton objectif.</h1>

        <div style={{ height: 16 }} />

        <p style={{
          margin: 0, fontFamily: 'Inter, sans-serif', fontWeight: 400,
          fontSize: 18, lineHeight: 1.45, color: T.navy, opacity: 0.7, maxWidth: 320,
        }}>Choisis ce qui te parle. Tu peux en cocher plusieurs.</p>

        <div style={{ height: 40 }} />

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {OBJECTIVES.map((o) => (
            <ObjCard
              key={o.id}
              emoji={o.emoji}
              label={o.label}
              full={o.full}
              active={selected.has(o.id)}
              onClick={() => toggle(o.id)}
            />
          ))}
        </div>

        <div style={{ height: 48 }} />

        <MotivationSlider value={motivation} onChange={setMotivation} />

        <div style={{ height: 32 }} />

        <CTA disabled={selected.size === 0} onClick={() => {}} />

        <div style={{ height: 16 }} />

        <div style={{
          textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12,
          color: T.navy, opacity: 0.5, letterSpacing: 0.1,
        }}>Tes réponses restent confidentielles · RGPD</div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

// ── shell ───────────────────────────────────────────────────
function App() {
  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: `radial-gradient(1200px 800px at 50% 30%, #F1F1ED 0%, ${T.shellBg} 70%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        position: 'relative',
        filter: 'drop-shadow(0 40px 60px rgba(15,23,42,0.18)) drop-shadow(0 12px 24px rgba(15,23,42,0.08))',
      }}>
        <IOSDevice width={393} height={852}>
          <FormPage />
        </IOSDevice>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
