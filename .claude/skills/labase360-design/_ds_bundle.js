/* @ds-bundle: {"format":4,"namespace":"LaBase360DesignSystem_afe5db","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"EyebrowPill","sourcePath":"components/core/EyebrowPill.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Logo","sourcePath":"components/core/Logo.jsx"},{"name":"StatBlock","sourcePath":"components/core/StatBlock.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"426e4d7a80ab","components/core/Button.jsx":"98bf394bc1f4","components/core/Card.jsx":"fc2985e7c885","components/core/EyebrowPill.jsx":"5bf7eb0b0596","components/core/Icon.jsx":"de0f8b9c4274","components/core/Logo.jsx":"42c6381a1a2d","components/core/StatBlock.jsx":"17556e7d7722","ui_kits/app-360/App.jsx":"5e2be93862e3","ui_kits/app-360/BottomNav.jsx":"1707d114f569","ui_kits/app-360/ClubScreen.jsx":"8aefead6949d","ui_kits/app-360/HomeScreen.jsx":"4270b8a53987","ui_kits/app-360/LogMealSheet.jsx":"28a26ef6fb91","ui_kits/app-360/LoginScreen.jsx":"6712ea342d44","ui_kits/breakfast-club-site/Hero.jsx":"6c5f58a1bc7f","ui_kits/breakfast-club-site/Sections.jsx":"3863d7a83236","ui_kits/breakfast-club-site/SiteApp.jsx":"c4c30784df40","ui_kits/breakfast-club-site/SiteHeader.jsx":"413af898b749"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LaBase360DesignSystem_afe5db = window.LaBase360DesignSystem_afe5db || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
/**
 * Badge — small status label. Solid or soft (tinted) fill. Semantic tones map to
 * the app's meaning-carrying accents (teal, lime, coral, amber, purple, sage).
 */
function Badge({
  children,
  tone = 'teal',
  variant = 'soft',
  style = {}
}) {
  const map = {
    teal: '45,212,191',
    lime: '197,248,42',
    coral: '242,119,95',
    amber: '232,169,58',
    purple: '167,139,250',
    sage: '147,166,126',
    neutral: '155,170,163'
  };
  const rgb = map[tone] || map.teal;
  const solidText = {
    lime: '#1a2400',
    teal: '#062420',
    amber: '#2a1c00',
    coral: '#2a0f0a',
    purple: '#1a0f33',
    sage: '#12200c',
    neutral: '#0C1A18'
  }[tone] || '#062420';
  const s = variant === 'solid' ? {
    background: `rgb(${rgb})`,
    color: solidText
  } : {
    background: `rgba(${rgb},.14)`,
    color: `rgb(${rgb})`,
    border: `1px solid rgba(${rgb},.28)`
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 'var(--ls-radius-pill)',
      lineHeight: 1.4,
      ...s,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * La Base 360 button. Primary = teal (app structural color); pill CTAs use
 * variant="cta". Lime is never used as a button fill (lime = wins only).
 */
function Button({
  variant = 'primary',
  size = 'md',
  pill = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  children,
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '8px 14px',
      fontSize: 13,
      gap: 6
    },
    md: {
      padding: '11px 20px',
      fontSize: 14,
      gap: 8
    },
    lg: {
      padding: '15px 28px',
      fontSize: 16,
      gap: 10
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'var(--ls-teal)',
      color: '#0C1A18',
      border: '1px solid transparent'
    },
    secondary: {
      background: 'var(--ls-surface2)',
      color: 'var(--ls-text)',
      border: '1px solid var(--ls-border2)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--ls-text)',
      border: '1px solid transparent'
    },
    outline: {
      background: 'transparent',
      color: 'var(--ls-teal)',
      border: '1px solid var(--ls-teal)'
    },
    danger: {
      background: 'var(--ls-coral)',
      color: '#2A0F0A',
      border: '1px solid transparent'
    },
    // Warm gradient CTA — Breakfast Club site
    cta: {
      background: 'var(--bc-cta-gradient)',
      color: '#fff',
      border: '1px solid transparent',
      boxShadow: 'var(--bc-cta-shadow)'
    }
  };
  const v = variants[variant] || variants.primary;
  return /*#__PURE__*/React.createElement("button", _extends({
    onClick: disabled ? undefined : onClick,
    disabled: disabled,
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      letterSpacing: '.01em',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      padding: s.padding,
      fontSize: s.fontSize,
      borderRadius: pill || variant === 'cta' ? 'var(--ls-radius-pill)' : 'var(--ls-radius)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'transform var(--dur-fast) var(--ease-standard), filter var(--dur-base) var(--ease-standard)',
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(.97)';
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.filter = 'none';
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.filter = 'brightness(1.06)';
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — surface container. App tone = green surface + hairline border, no heavy
 * shadow. Club tone = white, 22px radius, top accent rule + soft green shadow.
 */
function Card({
  tone = 'app',
  accent = null,
  padding = 20,
  children,
  style = {},
  ...rest
}) {
  const isClub = tone === 'club';
  const isLight = tone === 'light';
  const base = {
    app: {
      background: 'var(--ls-surface)',
      border: '1px solid var(--ls-border)',
      color: 'var(--ls-text)',
      borderRadius: 'var(--ls-radius-lg)'
    },
    light: {
      background: 'var(--ls-l-surface)',
      border: '1px solid var(--ls-l-border)',
      color: 'var(--ls-l-text)',
      borderRadius: 'var(--ls-radius-lg)',
      boxShadow: 'var(--shadow-sm)'
    },
    club: {
      background: '#fff',
      border: '1px solid rgba(30,51,48,.06)',
      color: 'var(--bc-ink)',
      borderRadius: 'var(--bc-radius-card)',
      boxShadow: 'var(--shadow-card)'
    }
  };
  const b = base[tone] || base.app;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      overflow: 'hidden',
      padding,
      ...b,
      ...style
    }
  }, rest), accent && isClub && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 5,
      background: accent
    }
  }), accent && !isClub && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: 3,
      background: accent
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/EyebrowPill.jsx
try { (() => {
/**
 * EyebrowPill — the signature pill that sits above a title. Mono caps, .2em
 * tracking. Warm fills for the club site; surface + accent text in the app.
 */
function EyebrowPill({
  children,
  tone = 'yellow',
  style = {}
}) {
  const tones = {
    yellow: {
      background: 'var(--bc-yellow)',
      color: '#7a5b00'
    },
    orange: {
      background: 'var(--bc-orange)',
      color: '#fff'
    },
    pink: {
      background: 'var(--bc-pink)',
      color: '#fff'
    },
    sage: {
      background: 'var(--bc-sage)',
      color: '#fff'
    },
    peach: {
      background: 'var(--bc-peach)',
      color: '#8a4a1a'
    },
    // App tone: quiet surface with teal text
    app: {
      background: 'var(--ls-surface2)',
      color: 'var(--ls-teal)',
      border: '1px solid var(--ls-border)'
    }
  };
  const t = tones[tone] || tones.yellow;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '.2em',
      textTransform: 'uppercase',
      padding: '7px 15px',
      borderRadius: 'var(--ls-radius-pill)',
      ...t,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { EyebrowPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EyebrowPill.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Icon — thin wrapper over Lucide (loaded from CDN). SUBSTITUTION: no brand icon
 * set was provided; Lucide's 2px rounded-cap geometry matches the mark's terminals.
 * Requires the Lucide UMD script on the page (see the components card / UI kits).
 */
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 2,
  style = {},
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const lucide = typeof window !== 'undefined' ? window.lucide : null;
    if (lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      try {
        lucide.createIcons({
          nameAttr: 'data-lucide',
          icons: lucide.icons,
          attrs: {}
        });
      } catch (e) {/* noop */}
      // set stroke + size on the produced svg
      const svg = ref.current.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('stroke-width', strokeWidth);
        svg.style.color = color;
      }
    }
  }, [name, size, color, strokeWidth]);
  return /*#__PURE__*/React.createElement("span", _extends({
    ref: ref,
    style: {
      display: 'inline-flex',
      width: size,
      height: size,
      color,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Logo.jsx
try { (() => {
/**
 * Logo — the La Base 360 lockup. The symbol is a flat SVG (open teal ring, lime
 * 45° bar, white B); the wordmark is composed in HTML (Anton + JetBrains Mono),
 * never baked into the SVG. tone controls the mark colorway.
 */
function Logo({
  tone = 'dark',
  showText = true,
  size = 40,
  layout = 'horizontal',
  style = {}
}) {
  const colors = {
    dark: {
      ring: '#2DD4BF',
      bar: '#C5F82A',
      letter: '#FFFFFF',
      name: 'var(--ls-text)',
      tag: 'var(--ls-teal)'
    },
    light: {
      ring: '#0D9488',
      bar: '#6D8C0B',
      letter: '#17201C',
      name: 'var(--ls-l-text)',
      tag: 'var(--ls-l-teal)'
    },
    mono: {
      ring: 'currentColor',
      bar: 'currentColor',
      letter: 'currentColor',
      name: 'currentColor',
      tag: 'currentColor'
    }
  };
  const c = colors[tone] || colors.dark;
  const mark = /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 200",
    width: size,
    height: size,
    style: {
      flex: 'none'
    },
    role: "img",
    "aria-label": "La Base 360"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 176.3 71.6 A 80 80 0 1 1 128.3 23.6",
    fill: "none",
    stroke: c.ring,
    strokeWidth: "13",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-24",
    y: "-6.5",
    width: "48",
    height: "13",
    rx: "6.5",
    fill: c.bar,
    transform: "translate(159 41) rotate(-45)"
  }), /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    fill: c.letter,
    d: "M 66 52 L 111 52 C 131 52 144 63.5 144 77 C 144 88 137 95.5 127 99.5 C 139.5 103 149 112.5 149 126 C 149 140.5 135 151 113 151 L 66 151 Z M 87 70 L 87 91 L 109 91 C 118.5 91 124 86.5 124 80.5 C 124 74.5 118.5 70 109 70 Z M 87 110 L 87 133 L 112 133 C 122 133 128 128 128 121.5 C 128 115 122 110 112 110 Z"
  }));
  if (!showText) return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: c.ring,
      ...style
    }
  }, mark);
  const stacked = layout === 'stacked';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexDirection: stacked ? 'column' : 'row',
      alignItems: 'center',
      gap: stacked ? size * 0.28 : size * 0.32,
      ...style
    }
  }, mark, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: size * 0.08,
      alignItems: stacked ? 'center' : 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: c.name,
      fontSize: size * 0.52,
      letterSpacing: '.01em',
      lineHeight: 0.92
    }
  }, "La Base 360"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: c.tag,
      fontSize: Math.max(8, size * 0.16),
      letterSpacing: '.24em',
      textTransform: 'uppercase'
    }
  }, "The Wellness Nutrition Club")));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Logo.jsx", error: String((e && e.message) || e) }); }

// components/core/StatBlock.jsx
try { (() => {
/**
 * StatBlock — a labelled metric. Value in JetBrains Mono (aligned numerals),
 * eyebrow label above, optional delta. Numbers are first-class in this brand.
 */
function StatBlock({
  label,
  value,
  unit = null,
  delta = null,
  deltaTone = 'up',
  accent = 'var(--ls-teal)',
  style = {}
}) {
  const deltaColors = {
    up: 'var(--ls-lime)',
    down: 'var(--ls-coral)',
    flat: 'var(--ls-text-hint)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '.2em',
      textTransform: 'uppercase',
      color: 'var(--ls-text-hint)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 30,
      color: accent,
      lineHeight: 1
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      color: 'var(--ls-text-muted)'
    }
  }, unit)), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: deltaColors[deltaTone]
    }
  }, deltaTone === 'up' ? '▲' : deltaTone === 'down' ? '▼' : '→', " ", delta));
}
Object.assign(__ds_scope, { StatBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatBlock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-360/App.jsx
try { (() => {
// App — orchestrates the La Base 360 client PWA: login -> home/club with tab bar + log sheet.
function App() {
  const [screen, setScreen] = React.useState('login'); // login | app
  const [tab, setTab] = React.useState('home');
  const [sheet, setSheet] = React.useState(false);
  const [meals, setMeals] = React.useState([{
    name: 'Bowl petit-déjeuner',
    time: '08:15',
    kcal: 420,
    icon: 'sunrise'
  }, {
    name: 'Café + amandes',
    time: '10:40',
    kcal: 180,
    icon: 'coffee'
  }]);
  const addMeal = o => {
    setMeals(m => [...m, {
      name: o.name,
      time: 'à l\'instant',
      kcal: o.kcal,
      icon: o.icon
    }]);
    setSheet(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--ls-bg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  }, screen === 'login' && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement(LoginScreen, {
    onLogin: () => setScreen('app')
  })), screen === 'app' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, tab === 'home' && /*#__PURE__*/React.createElement(HomeScreen, {
    meals: meals,
    onLogMeal: () => setSheet(true)
  }), tab === 'club' && /*#__PURE__*/React.createElement(ClubScreen, null), tab === 'log' && /*#__PURE__*/React.createElement(HomeScreen, {
    meals: meals,
    onLogMeal: () => setSheet(true)
  }), tab === 'profile' && /*#__PURE__*/React.createElement(ProfileStub, {
    onLogout: () => {
      setScreen('login');
      setTab('home');
    }
  })), /*#__PURE__*/React.createElement(BottomNav, {
    active: tab,
    onChange: t => {
      if (t === 'log') {
        setSheet(true);
      } else {
        setTab(t);
      }
    }
  }), /*#__PURE__*/React.createElement(LogMealSheet, {
    open: sheet,
    onClose: () => setSheet(false),
    onAdd: addMeal
  })));
}
function ProfileStub({
  onLogout
}) {
  const {
    Logo,
    Button,
    Card,
    StatBlock
  } = window.LaBase360DesignSystem_afe5db;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '26px 18px 96px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: '50%',
      background: 'var(--ls-surface2)',
      border: '1px solid var(--ls-border2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ls-teal)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      fontSize: 22
    }
  }, "MR"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--ls-text)',
      fontSize: 24
    }
  }, "Marie Rousseau"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ls-text-hint)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12
    }
  }, "Membre depuis mars 2026")), /*#__PURE__*/React.createElement(Card, {
    tone: "app",
    padding: 18,
    style: {
      width: '100%',
      display: 'flex',
      justifyContent: 'space-around'
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    label: "S\xE9rie",
    value: "12",
    unit: "j",
    accent: "var(--ls-lime)"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    label: "Repas",
    value: "284",
    accent: "var(--ls-teal)"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    label: "XP",
    value: "4 120",
    accent: "var(--ls-purple)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: "dark",
    size: 34,
    style: {
      opacity: .5
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    pill: true,
    style: {
      width: '100%'
    },
    onClick: onLogout
  }, "Se d\xE9connecter"));
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-360/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-360/BottomNav.jsx
try { (() => {
// BottomNav — La Base 360 app tab bar.
const {
  Icon
} = window.LaBase360DesignSystem_afe5db;
function BottomNav({
  active,
  onChange
}) {
  const tabs = [{
    id: 'home',
    icon: 'house',
    label: 'Accueil'
  }, {
    id: 'log',
    icon: 'utensils',
    label: 'Repas'
  }, {
    id: 'club',
    icon: 'users',
    label: 'Club'
  }, {
    id: 'profile',
    icon: 'user',
    label: 'Profil'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 72,
      background: 'rgba(22,38,36,.92)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--ls-border)',
      display: 'flex',
      paddingBottom: 8,
      alignItems: 'stretch'
    }
  }, tabs.map(t => {
    const on = active === t.id;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => onChange(t.id),
      style: {
        flex: 1,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        color: on ? 'var(--ls-teal)' : 'var(--ls-text-hint)',
        fontFamily: 'var(--font-body)',
        fontSize: 10.5,
        fontWeight: 600
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: t.icon,
      size: 22,
      strokeWidth: on ? 2.4 : 2
    }), t.label);
  }));
}
window.BottomNav = BottomNav;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-360/BottomNav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-360/ClubScreen.jsx
try { (() => {
// ClubScreen — Mode BBC member feed inside the app. Same dark family, five carrier accents.
const DSC = window.LaBase360DesignSystem_afe5db;
function ClubScreen() {
  const {
    Card,
    Badge,
    Icon,
    EyebrowPill
  } = DSC;
  const feed = [{
    who: 'Le club',
    accent: 'var(--ls-bbc-lime)',
    icon: 'megaphone',
    title: 'Défi petit-déj — semaine 3',
    body: '18 membres ont déjà validé ce matin.',
    meta: 'il y a 12 min'
  }, {
    who: 'Léa D.',
    accent: 'var(--ls-bbc-teal)',
    icon: 'user-round',
    title: 'a atteint son objectif protéines',
    body: '5 jours d\'affilée. Bravo Léa 👏',
    meta: 'il y a 40 min'
  }, {
    who: 'Urgent',
    accent: 'var(--ls-bbc-coral)',
    icon: 'triangle-alert',
    title: 'Commande à finaliser',
    body: 'Ta box de la semaine ferme à 18 h.',
    meta: 'il y a 1 h'
  }, {
    who: 'Silence',
    accent: 'var(--ls-bbc-amber)',
    icon: 'moon',
    title: 'Personne n\'a ouvert le rituel du soir',
    body: 'Un petit mot du coach ?',
    meta: 'hier'
  }, {
    who: 'Rituel',
    accent: 'var(--ls-bbc-purple)',
    icon: 'sparkles',
    title: 'Méditation guidée · 8 min',
    body: 'Ajoutée à ton rituel du soir.',
    meta: 'hier'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px 96px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "app"
  }, "Mode BBC"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--ls-bbc-text)',
      fontSize: 28,
      letterSpacing: '.01em',
      margin: '12px 0 0'
    }
  }, "Le Breakfast Club"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--ls-bbc-text-muted)',
      fontFamily: 'var(--font-bbc-body)',
      fontSize: 14,
      margin: '6px 0 0'
    }
  }, "Chaque couleur dit quelque chose : club, membre, urgent, silence, rituel.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, feed.map((f, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "app",
    accent: f.accent,
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--ls-radius)',
      background: 'var(--ls-bbc-surface2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: f.accent,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: f.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: f.accent
    }
  }, f.who), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--ls-bbc-text-muted)'
    }
  }, f.meta)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ls-bbc-text)',
      fontWeight: 600,
      fontSize: 15,
      marginTop: 4
    }
  }, f.title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ls-bbc-text-muted)',
      fontSize: 13,
      marginTop: 3,
      fontFamily: 'var(--font-bbc-body)'
    }
  }, f.body)))))));
}
window.ClubScreen = ClubScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-360/ClubScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-360/HomeScreen.jsx
try { (() => {
// HomeScreen — La Base 360 client dashboard. Composes DS primitives.
const DS = window.LaBase360DesignSystem_afe5db;
function HomeScreen({
  onLogMeal,
  meals
}) {
  const {
    Card,
    StatBlock,
    Badge,
    Button,
    Icon,
    EyebrowPill
  } = DS;
  const ring = (pct, color) => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 120 120",
    style: {
      width: 96,
      height: 96
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "52",
    fill: "none",
    stroke: "var(--ls-surface2)",
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "52",
    fill: "none",
    stroke: color,
    strokeWidth: "12",
    strokeLinecap: "round",
    strokeDasharray: 2 * Math.PI * 52,
    strokeDashoffset: 2 * Math.PI * 52 * (1 - pct),
    transform: "rotate(-90 60 60)"
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '20px 18px 96px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '.16em',
      textTransform: 'uppercase',
      color: 'var(--ls-text-hint)'
    }
  }, "Mardi 9 ao\xFBt"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--ls-text)',
      fontSize: 28,
      letterSpacing: '.01em',
      margin: '4px 0 0'
    }
  }, "Salut, Marie")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 42,
      borderRadius: '50%',
      background: 'var(--ls-surface2)',
      border: '1px solid var(--ls-border2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ls-teal)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 600
    }
  }, "MR")), /*#__PURE__*/React.createElement(Card, {
    tone: "app",
    padding: 20
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, ring(0.72, 'var(--ls-teal)'), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 22,
      fontWeight: 600,
      color: 'var(--ls-text)'
    }
  }, "72%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: 'var(--ls-text-hint)'
    }
  }, "objectif"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    label: "Calories",
    value: "1 248",
    unit: "/ 1 800 kcal"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    label: "Prot\xE9ines",
    value: "86",
    unit: "g",
    accent: "var(--ls-teal)"
  }), /*#__PURE__*/React.createElement(StatBlock, {
    label: "Eau",
    value: "1,4",
    unit: "L",
    accent: "var(--ls-sage)"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Card, {
    tone: "app",
    accent: "var(--ls-lime)",
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    label: "S\xE9rie",
    value: "12",
    unit: "jours",
    accent: "var(--ls-lime)"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "flame",
    color: "var(--ls-lime)",
    size: 26
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "lime",
    variant: "solid"
  }, "Record perso"))), /*#__PURE__*/React.createElement(Card, {
    tone: "app",
    padding: 16
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(StatBlock, {
    label: "Rituel",
    value: "3/4",
    accent: "var(--ls-purple)"
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "sunrise",
    color: "var(--ls-purple)",
    size: 26
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "purple"
  }, "Petit-d\xE9j fait")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "app"
  }, "Aujourd'hui"), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    size: "sm",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 15
    }),
    onClick: onLogMeal
  }, "Ajouter")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, meals.map((m, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "app",
    padding: 14
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--ls-radius)',
      background: 'var(--ls-surface2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ls-teal)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: m.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ls-text)',
      fontWeight: 600,
      fontSize: 15
    }
  }, m.name), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--ls-text-hint)',
      fontSize: 12,
      fontFamily: 'var(--font-mono)'
    }
  }, m.time)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--ls-text-muted)',
      fontSize: 14
    }
  }, m.kcal, " kcal"))))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-360/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-360/LogMealSheet.jsx
try { (() => {
// LogMealSheet — bottom sheet to log a meal.
const {
  Button,
  Icon,
  Badge
} = window.LaBase360DesignSystem_afe5db;
function LogMealSheet({
  open,
  onClose,
  onAdd
}) {
  const options = [{
    name: 'Bowl petit-déjeuner',
    kcal: 420,
    icon: 'sunrise',
    tag: 'Petit-déj'
  }, {
    name: 'Salade poulet quinoa',
    kcal: 540,
    icon: 'salad',
    tag: 'Déjeuner'
  }, {
    name: 'Shake protéiné',
    kcal: 210,
    icon: 'cup-soda',
    tag: 'Collation'
  }, {
    name: 'Saumon légumes',
    kcal: 610,
    icon: 'fish',
    tag: 'Dîner'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 20,
      pointerEvents: open ? 'auto' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(11,20,18,.6)',
      opacity: open ? 1 : 0,
      transition: 'opacity var(--dur-base) var(--ease-standard)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--ls-surface)',
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      border: '1px solid var(--ls-border2)',
      padding: '14px 18px 26px',
      transform: open ? 'translateY(0)' : 'translateY(102%)',
      transition: 'transform var(--dur-slow) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 4,
      borderRadius: 999,
      background: 'var(--ls-border2)',
      margin: '0 auto 16px'
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--ls-text)',
      fontSize: 22,
      margin: '0 0 14px',
      letterSpacing: '.01em'
    }
  }, "Ajouter un repas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, options.map((o, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => onAdd(o),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 13,
      textAlign: 'left',
      cursor: 'pointer',
      background: 'var(--ls-surface2)',
      border: '1px solid var(--ls-border)',
      borderRadius: 'var(--ls-radius)',
      padding: '12px 14px',
      color: 'var(--ls-text)',
      fontFamily: 'var(--font-body)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--ls-radius)',
      background: 'var(--ls-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--ls-teal)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: o.icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, o.name), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "sage"
  }, o.tag))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: 'var(--ls-text-muted)',
      fontSize: 14
    }
  }, o.kcal, " kcal"))))));
}
window.LogMealSheet = LogMealSheet;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-360/LogMealSheet.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app-360/LoginScreen.jsx
try { (() => {
// LoginScreen — La Base 360 client PWA sign-in. Dark, warm, premium.
const {
  Button,
  Logo,
  EyebrowPill
} = window.LaBase360DesignSystem_afe5db;
function LoginScreen({
  onLogin
}) {
  const [email, setEmail] = React.useState('marie@exemple.fr');
  const [pw, setPw] = React.useState('••••••••');
  const field = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--ls-surface2)',
    border: '1px solid var(--ls-border)',
    borderRadius: 'var(--ls-radius)',
    color: 'var(--ls-text)',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    padding: '13px 15px',
    outline: 'none'
  };
  const lab = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: 'var(--ls-text-hint)',
    marginBottom: 7,
    display: 'block'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '48px 26px 30px',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 22,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: "dark",
    layout: "stacked",
    size: 64
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 48
    }
  }, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "app"
  }, "Bon retour"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--ls-text)',
      fontSize: 34,
      letterSpacing: '.01em',
      lineHeight: 1.02,
      margin: '14px 0 0'
    }
  }, "Reprends ta", /*#__PURE__*/React.createElement("br", null), "progression")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      marginTop: 30
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lab
  }, "E-mail"), /*#__PURE__*/React.createElement("input", {
    style: field,
    value: email,
    onChange: e => setEmail(e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: lab
  }, "Mot de passe"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    style: field,
    value: pw,
    onChange: e => setPw(e.target.value)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    pill: true,
    style: {
      width: '100%'
    },
    onClick: onLogin
  }, "Se connecter"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'center',
      color: 'var(--ls-text-muted)',
      fontSize: 13
    }
  }, "Pas encore membre ? ", /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--ls-teal)',
      textDecoration: 'none',
      fontWeight: 600
    }
  }, "Rejoindre le club"))));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app-360/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/breakfast-club-site/Hero.jsx
try { (() => {
// Hero — Breakfast Club landing hero. Cream ground, ghost numeral, framed image, CTA.
const {
  Button,
  EyebrowPill
} = window.LaBase360DesignSystem_afe5db;
function Hero({
  onReserve
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--bc-cream)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '72px 28px 84px',
      display: 'grid',
      gridTemplateColumns: '1.1fr .9fr',
      gap: 48,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "yellow"
  }, "The Wellness Nutrition Club"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-ink)',
      fontSize: 68,
      lineHeight: 1.02,
      letterSpacing: '.005em',
      margin: '18px 0 0'
    }
  }, "Le petit-d\xE9j", /*#__PURE__*/React.createElement("br", null), "qui change", /*#__PURE__*/React.createElement("br", null), "ta journ\xE9e"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-bc-body)',
      color: 'var(--bc-text)',
      fontSize: 18,
      lineHeight: 1.6,
      maxWidth: 440,
      margin: '20px 0 30px'
    }
  }, "Rejoins un club de nutrition bien-\xEAtre : des repas pens\xE9s par des coachs, une communaut\xE9 qui te suit, et des rituels qui tiennent."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "cta",
    size: "lg",
    onClick: onReserve
  }, "R\xE9server ma place"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: 'var(--bc-link)',
      fontFamily: 'var(--font-bc-body)',
      fontWeight: 600,
      textDecoration: 'none'
    }
  }, "Voir la m\xE9thode \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: -46,
      right: -8,
      fontFamily: 'var(--font-title)',
      fontSize: 240,
      color: 'var(--bc-peach)',
      opacity: .5,
      lineHeight: 1,
      zIndex: 0,
      pointerEvents: 'none'
    }
  }, "360"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: '18px -18px -18px 18px',
      background: 'var(--bc-sage)',
      opacity: .3,
      borderRadius: 'var(--bc-radius-card)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      borderRadius: 'var(--bc-radius-card)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      background: 'var(--bc-card-dark)',
      aspectRatio: '4/5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/breakfast-club/logo-mark.png",
    alt: "Breakfast Club",
    style: {
      width: '72%'
    }
  }))))));
}
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/breakfast-club-site/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/breakfast-club-site/Sections.jsx
try { (() => {
// Sections — Breakfast Club feature cards, dark band, pricing, footer.
const DSB = window.LaBase360DesignSystem_afe5db;
function FeatureCards() {
  const {
    Card,
    EyebrowPill,
    Icon
  } = DSB;
  const feats = [{
    icon: 'salad',
    accent: 'var(--bc-orange)',
    title: 'Repas de coach',
    body: 'Des menus équilibrés pensés par des nutritionnistes, livrés prêts à savourer.'
  }, {
    icon: 'users',
    accent: 'var(--bc-pink)',
    title: 'Une vraie communauté',
    body: 'Un club qui te suit, te motive et célèbre chaque victoire avec toi.'
  }, {
    icon: 'sunrise',
    accent: 'var(--bc-sage)',
    title: 'Des rituels qui tiennent',
    body: 'Petit-déj, hydratation, mouvement : des habitudes simples, ancrées pour de bon.'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bc-cream)',
      padding: '20px 0 76px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '0 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "orange"
  }, "La m\xE9thode"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-ink)',
      fontSize: 44,
      letterSpacing: '.005em',
      margin: '16px 0 0'
    }
  }, "Trois piliers, z\xE9ro prise de t\xEAte")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 22
    }
  }, feats.map((f, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "club",
    accent: f.accent,
    padding: 26
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 14,
      background: f.accent,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: f.icon,
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-ink)',
      fontSize: 22,
      margin: '0 0 8px'
    }
  }, f.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-bc-body)',
      color: 'var(--bc-text)',
      fontSize: 15,
      lineHeight: 1.6,
      margin: 0
    }
  }, f.body))))));
}
function DarkBand() {
  const {
    EyebrowPill
  } = DSB;
  const stats = [['1 200+', 'membres actifs'], ['92%', 'tiennent leurs rituels'], ['4,9/5', 'note moyenne']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bc-green)',
      padding: '72px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '0 28px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "peach"
  }, "Le club en chiffres"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-on-dark)',
      fontSize: 40,
      margin: '16px 0 40px'
    }
  }, "On ne le fait pas seul"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 24
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-editorial)',
      fontWeight: 800,
      color: 'var(--bc-orange)',
      fontSize: 52,
      lineHeight: 1
    }
  }, s[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '.14em',
      textTransform: 'uppercase',
      color: 'var(--bc-on-dark-muted)',
      marginTop: 8
    }
  }, s[1]))))));
}
function Pricing({
  onReserve
}) {
  const {
    Card,
    EyebrowPill,
    Button,
    Icon
  } = DSB;
  const plans = [{
    name: 'Découverte',
    price: '0',
    per: '/ essai',
    feats: ['1 semaine offerte', 'Accès communauté', 'Menu de base'],
    cta: 'Commencer',
    primary: false
  }, {
    name: 'Club',
    price: '129',
    per: '/ mois',
    feats: ['Repas de coach illimités', 'Suivi personnalisé', 'Rituels & défis', 'App La Base 360'],
    cta: 'Réserver ma place',
    primary: true
  }, {
    name: 'Duo',
    price: '199',
    per: '/ mois',
    feats: ['Tout le plan Club', 'Deux membres', 'Séances en binôme'],
    cta: 'Choisir Duo',
    primary: false
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--bc-cream)',
      padding: '76px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '0 28px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "pink"
  }, "Tarifs"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-ink)',
      fontSize: 44,
      margin: '16px 0 0'
    }
  }, "Rejoins quand tu veux")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 22,
      alignItems: 'start'
    }
  }, plans.map((p, i) => /*#__PURE__*/React.createElement(Card, {
    key: i,
    tone: "club",
    accent: p.primary ? 'var(--bc-orange)' : 'var(--bc-sage)',
    padding: 28,
    style: p.primary ? {
      transform: 'scale(1.04)',
      zIndex: 1
    } : {}
  }, p.primary && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "orange"
  }, "Le plus choisi")), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-ink)',
      fontSize: 24,
      margin: '0 0 10px'
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-editorial)',
      fontWeight: 800,
      color: 'var(--bc-ink)',
      fontSize: 46
    }
  }, p.price, "\xA0\u20AC"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      color: '#8A938D',
      fontSize: 13
    }
  }, p.per)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginBottom: 22
    }
  }, p.feats.map((f, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      color: 'var(--bc-text)',
      fontFamily: 'var(--font-bc-body)',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    color: "var(--bc-orange)",
    strokeWidth: 2.5
  }), f))), /*#__PURE__*/React.createElement(Button, {
    variant: p.primary ? 'cta' : 'outline',
    pill: true,
    style: {
      width: '100%',
      ...(p.primary ? {} : {
        color: 'var(--bc-orange)',
        borderColor: 'var(--bc-orange)'
      })
    },
    onClick: onReserve
  }, p.cta))))));
}
function SiteFooter() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--bc-footer)',
      padding: '48px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/breakfast-club/logo-wordmark-dark.png",
    alt: "The Breakfast Club",
    style: {
      height: 52
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--bc-on-dark-hint)',
      letterSpacing: '.08em'
    }
  }, "\xA9 2026 LA BASE 360 \xB7 THE BREAKFAST CLUB")));
}
window.FeatureCards = FeatureCards;
window.DarkBand = DarkBand;
window.Pricing = Pricing;
window.SiteFooter = SiteFooter;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/breakfast-club-site/Sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/breakfast-club-site/SiteApp.jsx
try { (() => {
// SiteApp — Breakfast Club public site + a simple reservation modal.
function SiteApp() {
  const {
    Button,
    EyebrowPill
  } = window.LaBase360DesignSystem_afe5db;
  const [modal, setModal] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const open = () => {
    setDone(false);
    setModal(true);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bc-cream)',
      minHeight: '100%'
    }
  }, /*#__PURE__*/React.createElement(SiteHeader, {
    onReserve: open
  }), /*#__PURE__*/React.createElement(Hero, {
    onReserve: open
  }), /*#__PURE__*/React.createElement(FeatureCards, null), /*#__PURE__*/React.createElement(DarkBand, null), /*#__PURE__*/React.createElement(Pricing, {
    onReserve: open
  }), /*#__PURE__*/React.createElement(SiteFooter, null), modal && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setModal(false),
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(23,32,28,.55)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: '#fff',
      borderRadius: 'var(--bc-radius-card)',
      boxShadow: 'var(--shadow-card)',
      padding: 34,
      width: 420,
      maxWidth: '100%'
    }
  }, !done ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(EyebrowPill, {
    tone: "orange"
  }, "R\xE9servation"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-ink)',
      fontSize: 30,
      margin: '14px 0 6px'
    }
  }, "R\xE9serve ta place"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-bc-body)',
      color: 'var(--bc-text)',
      fontSize: 15,
      margin: '0 0 20px'
    }
  }, "Une semaine offerte, sans engagement."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "Ton pr\xE9nom",
    style: inp,
    defaultValue: "Marie"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Ton e-mail",
    style: inp,
    defaultValue: "marie@exemple.fr"
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "cta",
    size: "lg",
    pill: true,
    style: {
      width: '100%'
    },
    onClick: () => setDone(true)
  }, "Confirmer ma place")) : /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '10px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 46
    }
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-title)',
      textTransform: 'uppercase',
      color: 'var(--bc-ink)',
      fontSize: 28,
      margin: '10px 0 6px'
    }
  }, "\xC0 tr\xE8s vite\xA0!"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-bc-body)',
      color: 'var(--bc-text)',
      fontSize: 15,
      margin: '0 0 22px'
    }
  }, "On t'a envoy\xE9 un e-mail avec les d\xE9tails de ta premi\xE8re semaine."), /*#__PURE__*/React.createElement(Button, {
    variant: "outline",
    pill: true,
    style: {
      color: 'var(--bc-orange)',
      borderColor: 'var(--bc-orange)'
    },
    onClick: () => setModal(false)
  }, "Fermer")))));
}
const inp = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(30,51,48,.14)',
  borderRadius: 'var(--ls-radius)',
  padding: '13px 15px',
  fontFamily: 'var(--font-bc-body)',
  fontSize: 15,
  color: 'var(--bc-ink)',
  outline: 'none'
};
window.SiteApp = SiteApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/breakfast-club-site/SiteApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/breakfast-club-site/SiteHeader.jsx
try { (() => {
// SiteHeader — Breakfast Club public site nav.
const {
  Button
} = window.LaBase360DesignSystem_afe5db;
function SiteHeader({
  onReserve
}) {
  const links = ['Le club', 'La méthode', 'Le menu', 'Tarifs'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'rgba(252,248,241,.86)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(30,51,48,.06)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '14px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/breakfast-club/logo-wordmark.png",
    alt: "The Breakfast Club",
    style: {
      height: 46
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 26,
      marginLeft: 18
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: 'var(--bc-text)',
      textDecoration: 'none',
      fontFamily: 'var(--font-bc-body)',
      fontWeight: 500,
      fontSize: 15
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "cta",
    onClick: onReserve
  }, "R\xE9server"))));
}
window.SiteHeader = SiteHeader;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/breakfast-club-site/SiteHeader.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.EyebrowPill = __ds_scope.EyebrowPill;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.StatBlock = __ds_scope.StatBlock;

})();
