import React from 'react';

/**
 * Logo — the La Base 360 lockup. The symbol is a flat SVG (open teal ring, lime
 * 45° bar, white B); the wordmark is composed in HTML (Anton + JetBrains Mono),
 * never baked into the SVG. tone controls the mark colorway.
 */
export function Logo({ tone = 'dark', showText = true, size = 40, layout = 'horizontal', style = {} }) {
  const colors = {
    dark: { ring: '#2DD4BF', bar: '#C5F82A', letter: '#FFFFFF', name: 'var(--ls-text)', tag: 'var(--ls-teal)' },
    light: { ring: '#0D9488', bar: '#6D8C0B', letter: '#17201C', name: 'var(--ls-l-text)', tag: 'var(--ls-l-teal)' },
    mono: { ring: 'currentColor', bar: 'currentColor', letter: 'currentColor', name: 'currentColor', tag: 'currentColor' },
  };
  const c = colors[tone] || colors.dark;

  const mark = (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ flex: 'none' }} role="img" aria-label="La Base 360">
      <path d="M 176.3 71.6 A 80 80 0 1 1 128.3 23.6" fill="none" stroke={c.ring} strokeWidth="13" strokeLinecap="round" />
      <rect x="-24" y="-6.5" width="48" height="13" rx="6.5" fill={c.bar} transform="translate(159 41) rotate(-45)" />
      <path fillRule="evenodd" fill={c.letter} d="M 66 52 L 111 52 C 131 52 144 63.5 144 77 C 144 88 137 95.5 127 99.5 C 139.5 103 149 112.5 149 126 C 149 140.5 135 151 113 151 L 66 151 Z M 87 70 L 87 91 L 109 91 C 118.5 91 124 86.5 124 80.5 C 124 74.5 118.5 70 109 70 Z M 87 110 L 87 133 L 112 133 C 122 133 128 128 128 121.5 C 128 115 122 110 112 110 Z" />
    </svg>
  );

  if (!showText) return <span style={{ display: 'inline-flex', color: c.ring, ...style }}>{mark}</span>;

  const stacked = layout === 'stacked';
  return (
    <span style={{
      display: 'inline-flex',
      flexDirection: stacked ? 'column' : 'row',
      alignItems: 'center',
      gap: stacked ? size * 0.28 : size * 0.32,
      ...style,
    }}>
      {mark}
      <span style={{ display: 'flex', flexDirection: 'column', gap: size * 0.08, alignItems: stacked ? 'center' : 'flex-start' }}>
        <span style={{
          fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: c.name,
          fontSize: size * 0.52, letterSpacing: '.01em', lineHeight: 0.92,
        }}>La Base 360</span>
        <span style={{
          fontFamily: 'var(--font-mono)', color: c.tag,
          fontSize: Math.max(8, size * 0.16), letterSpacing: '.24em', textTransform: 'uppercase',
        }}>The Wellness Nutrition Club</span>
      </span>
    </span>
  );
}
