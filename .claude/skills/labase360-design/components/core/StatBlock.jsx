import React from 'react';

/**
 * StatBlock — a labelled metric. Value in JetBrains Mono (aligned numerals),
 * eyebrow label above, optional delta. Numbers are first-class in this brand.
 */
export function StatBlock({ label, value, unit = null, delta = null, deltaTone = 'up', accent = 'var(--ls-teal)', style = {} }) {
  const deltaColors = { up: 'var(--ls-lime)', down: 'var(--ls-coral)', flat: 'var(--ls-text-hint)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--ls-text-hint)' }}>{label}</span>
      )}
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 30, color: accent, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ls-text-muted)' }}>{unit}</span>}
      </span>
      {delta && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: deltaColors[deltaTone] }}>
          {deltaTone === 'up' ? '▲' : deltaTone === 'down' ? '▼' : '→'} {delta}
        </span>
      )}
    </div>
  );
}
