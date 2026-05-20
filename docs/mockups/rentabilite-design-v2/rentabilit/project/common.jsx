// common.jsx — shared bits for Rentabilité mockups
// Exposes: Gauge, Sparkline, BarChart, MiniBar, Avatar, useCount, Icon,
// MOCK (data). All Babel scripts share globals via window.

/* ── Count-up hook ─────────────────────────────────────────────── */
function useCount(target, { duration = 900, delay = 60, decimals = 0 } = {}) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(target); return;
    }
    let raf, start;
    const t = setTimeout(() => {
      const tick = (ts) => {
        if (!start) start = ts;
        const p = Math.min(1, (ts - start) / duration);
        // ease-out cubic
        const e = 1 - Math.pow(1 - p, 3);
        setVal(target * e);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setVal(target);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(t); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/* ── Number formatting ─────────────────────────────────────────── */
const fmtEur = (n, { signed = false, dec = 0 } = {}) => {
  const v = Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const sign = signed ? (n >= 0 ? '+' : '−') : (n < 0 ? '−' : '');
  return `${sign}${v} €`;
};

/* ── Circular gauge ────────────────────────────────────────────── */
// Animated arc with gradient (teal→purple, plus coral tail in dark),
// projection marker (gold if ahead, coral if behind), and centered label.
function Gauge({
  value = 0.65,            // 0..1, current fraction of monthly objective
  projection = 0.78,       // 0..1, projected end-of-month
  size = 168,
  thickness = 12,
  ahead = true,            // marker color hint
  uid = 'g1',
  centerTop,               // small label above big number
  centerBig,               // big % string
  centerSub,               // small line under big number
  glow = false,            // dark mode signature glow
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  // Arc starts at the bottom-left, sweeps clockwise leaving a small gap.
  const sweep = 0.84; // fraction of full circle used by arc
  const startAngle = 130; // deg, where the arc begins
  // We rotate the whole SVG so the gap is at the bottom.

  const animVal = useCount(value, { duration: 1100, delay: 120, decimals: 3 });
  const dash = C * sweep * Math.min(1, Math.max(0, animVal));
  const trackDash = C * sweep;

  // Projection marker position on the arc (angle in rad)
  const projAngle = (startAngle + 360 * sweep * projection) * Math.PI / 180;
  const mx = cx + r * Math.cos(projAngle);
  const my = cy + r * Math.sin(projAngle);

  return (
    <div className="ls-gauge" style={{ position: 'relative', width: size, height: size, filter: glow ? `drop-shadow(0 0 14px color-mix(in oklab, var(--ls-teal) 28%, transparent))` : 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="var(--ls-teal)" />
            <stop offset="60%" stopColor="var(--ls-purple)" />
            <stop offset="100%" stopColor="var(--ls-coral)" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--ls-bg-2)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${trackDash} ${C}`}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
        />
        {/* progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={`url(#${uid}-grad)`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 200ms linear' }}
        />
        {/* projection marker */}
        <circle
          cx={mx} cy={my} r={7}
          fill="var(--ls-bg-1)"
          stroke={ahead ? 'var(--ls-gold)' : 'var(--ls-coral)'}
          strokeWidth="2.5"
          className={ahead ? 'ls-marker-pulse' : ''}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2,
      }}>
        {centerTop && <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ls-ink-3)' }}>{centerTop}</div>}
        <div className="ls-num" style={{ fontWeight: 700, fontSize: size * 0.22, lineHeight: 1, color: 'var(--ls-ink)', letterSpacing: '-0.02em' }}>{centerBig}</div>
        {centerSub && <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11.5, color: 'var(--ls-ink-3)', marginTop: 4 }}>{centerSub}</div>}
      </div>
    </div>
  );
}

/* ── Sparkline ─────────────────────────────────────────────────── */
function Sparkline({ data, width = 240, height = 56, color = 'var(--ls-teal)', fill = true, strokeWidth = 1.5, uid = 's1' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const pad = 2;
  const xs = data.map((_, i) => pad + (i / (data.length - 1)) * (width - pad * 2));
  const ys = data.map(v => height - pad - ((v - min) / Math.max(1, max - min)) * (height - pad * 2));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  // Smooth via simple Catmull-Rom → bezier
  const d = xs.reduce((acc, x, i) => {
    if (i === 0) return `M ${x} ${ys[i]}`;
    const px = xs[i - 1], py = ys[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C ${cx} ${py} ${cx} ${ys[i]} ${x} ${ys[i]}`;
  }, '');
  const areaD = `${d} L ${xs[xs.length - 1]} ${height} L ${xs[0]} ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaD} fill={`url(#${uid}-fill)`} />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={3} fill={color} />
    </svg>
  );
}

/* ── Mini horizontal progress (for team member contribution) ───── */
function MiniBar({ value = 0.6, color = 'var(--ls-purple)' }) {
  return (
    <div style={{ width: '100%', height: 4, background: 'var(--ls-bg-2)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value * 100))}%`,
        height: '100%', background: color, borderRadius: 999,
        transition: 'width 800ms var(--ls-ease-out)',
      }} />
    </div>
  );
}

/* ── Bar chart (modale 12 months) ──────────────────────────────── */
function BarChart({ data, labels, width = 620, height = 220, current = -1, peak = -1 }) {
  const max = Math.max(...data) * 1.12;
  const padL = 32, padR = 8, padT = 12, padB = 28;
  const cw = width - padL - padR;
  const bw = cw / data.length;
  const ch = height - padT - padB;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {/* gridlines */}
      {[0.25, 0.5, 0.75, 1].map(g => (
        <line key={g}
          x1={padL} x2={width - padR}
          y1={padT + ch - ch * g} y2={padT + ch - ch * g}
          stroke="var(--ls-line)"
          strokeDasharray={g === 1 ? '0' : '2 3'}
        />
      ))}
      {data.map((v, i) => {
        const h = (v / max) * ch;
        const x = padL + i * bw + bw * 0.18;
        const y = padT + ch - h;
        const w = bw * 0.64;
        const isCur = i === current, isPeak = i === peak;
        const fill = isCur ? 'url(#bc-cur)' : isPeak ? 'var(--ls-gold)' : 'var(--ls-bg-3)';
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx={4} fill={fill}
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom', animation: `ls-bar-rise 700ms ${i * 40}ms var(--ls-ease-out) both` }}
            />
            {isPeak && (
              <text x={x + w / 2} y={y - 6} textAnchor="middle"
                style={{ fontFamily: 'var(--ls-font-ui)', fontWeight: 600, fontSize: 10, fill: 'var(--ls-gold)' }}>
                ★ record
              </text>
            )}
            <text x={x + w / 2} y={height - 8} textAnchor="middle"
              style={{ fontFamily: 'var(--ls-font-ui)', fontWeight: 500, fontSize: 11, fill: isCur ? 'var(--ls-ink)' : 'var(--ls-ink-3)' }}>
              {labels[i]}
            </text>
          </g>
        );
      })}
      {/* y-axis labels */}
      {[0, 0.5, 1].map(g => (
        <text key={g} x={padL - 6} y={padT + ch - ch * g + 3} textAnchor="end"
          style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 10, fill: 'var(--ls-ink-3)' }}>
          {Math.round((max * g) / 100) / 10}k
        </text>
      ))}
      <defs>
        <linearGradient id="bc-cur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ls-teal)" />
          <stop offset="100%" stopColor="var(--ls-purple)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Avatar ────────────────────────────────────────────────────── */
function Avatar({ initials, size = 28, hue = 200, ring = false }) {
  const bg = `oklch(0.86 0.06 ${hue})`;
  const fg = `oklch(0.32 0.07 ${hue})`;
  return (
    <span className="ls-avatar" style={{
      width: size, height: size, background: bg, color: fg,
      fontSize: Math.max(10, size * 0.42),
      boxShadow: ring ? '0 0 0 2px var(--ls-bg-1), 0 0 0 3px var(--ls-line-2)' : 'none',
    }}>{initials}</span>
  );
}

/* ── Small inline icon set (16px stroke) ──────────────────────── */
const Icon = ({ name, size = 14, color = 'currentColor', strokeWidth = 1.8 }) => {
  const paths = {
    arrowUp:    'M12 19V5 M5 12l7-7 7 7',
    arrowDown:  'M12 5v14 M19 12l-7 7-7-7',
    arrowRight: 'M5 12h14 M13 5l7 7-7 7',
    spark:      'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z',
    eye:        'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z',
    eyeOff:     'M3 3l18 18 M10.5 6.2A10.8 10.8 0 0112 6c6.5 0 10 7 10 7a17 17 0 01-3.4 4.3 M6.1 7.6A17.7 17.7 0 002 13s3.5 7 10 7c1.4 0 2.7-.3 3.9-.7 M9 9a3 3 0 004.5 4',
    close:      'M6 6l12 12 M18 6L6 18',
    chevR:      'M9 6l6 6-6 6',
    trophy:     'M8 21h8 M12 17v4 M7 4h10v4a5 5 0 01-10 0V4z M5 6H3v2a3 3 0 003 3 M19 6h2v2a3 3 0 01-3 3',
    bolt:       'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
    target:     'M12 12m-9 0a9 9 0 1018 0 9 9 0 10-18 0 M12 12m-5 0a5 5 0 1010 0 5 5 0 10-10 0 M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0',
    diamond:    'M6 3h12l4 6-10 12L2 9z M2 9h20 M12 3l-4 6 4 12 4-12-4-6',
    users:      'M16 21v-2a4 4 0 00-8 0v2 M12 11a4 4 0 100-8 4 4 0 000 8 M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
    filter:     'M3 4h18l-7 9v6l-4 2v-8z',
    plus:       'M12 5v14 M5 12h14',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] || ''} />
    </svg>
  );
};

/* ── Mock data ─────────────────────────────────────────────────── */
const MOCK = {
  month: 'Mai 2026',
  daysLeft: 11,
  total: 1221,             // current month net
  totalPrev: 1048,         // last month
  projection: 1892,
  goal: 1900,
  best: { amount: 1745, month: 'Mar 2026' },
  spark: [612, 740, 1745, 980, 1048, 1221],
  bars: [820, 940, 1745, 980, 1048, 1221, 1380, 1100, 1450, 980, 870, 1100], // 12 months
  barLabels: ['Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
  calc: {
    caBrut: 1500,
    margePerso: 0.50,
    margeDirecte: 750,
    overrideTeam: 98,
    overrideExt: 373,
  },
  team: [
    { name: 'Mandy R.',     rank: 'Manager',   override: 42, contrib: 0.85, hue: 280, initials: 'MR' },
    { name: 'Victoria L.',  rank: 'L1 direct', override: 31, contrib: 0.62, hue: 20,  initials: 'VL' },
    { name: 'Sofiane B.',   rank: 'Senior',    override: 18, contrib: 0.36, hue: 160, initials: 'SB' },
    { name: 'Lucie M.',     rank: 'L1 direct', override:  7, contrib: 0.14, hue: 340, initials: 'LM' },
  ],
  external: 4,             // distri saisis manuellement
  topClients: [
    { name: 'Camille D.',   amount: 312, products: ['Reset 21j', 'Pack vegan'], hue: 320, initials: 'CD' },
    { name: 'Thomas & Mélanie', amount: 247, products: ['Boost duo', 'Coaching nutri'], hue: 200, initials: 'T&M', agg: true },
    { name: 'Yasmine K.',   amount: 198, products: ['Reset 21j'], hue: 30,  initials: 'YK' },
    { name: 'Pierre A.',    amount: 154, products: ['Pack veggie'], hue: 110, initials: 'PA' },
    { name: 'Inès R.',      amount: 132, products: ['Coaching nutri'], hue: 260, initials: 'IR' },
  ],
};

Object.assign(window, {
  useCount, fmtEur, Gauge, Sparkline, MiniBar, BarChart, Avatar, Icon, MOCK,
});
