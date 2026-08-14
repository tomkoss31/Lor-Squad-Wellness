import React from 'react';

/**
 * Badge — small status label. Solid or soft (tinted) fill. Semantic tones map to
 * the app's meaning-carrying accents (teal, lime, coral, amber, purple, sage).
 */
export function Badge({ children, tone = 'teal', variant = 'soft', style = {} }) {
  const map = {
    teal: '45,212,191', lime: '197,248,42', coral: '242,119,95',
    amber: '232,169,58', purple: '167,139,250', sage: '147,166,126',
    neutral: '155,170,163',
  };
  const rgb = map[tone] || map.teal;
  const solidText = { lime: '#1a2400', teal: '#062420', amber: '#2a1c00', coral: '#2a0f0a', purple: '#1a0f33', sage: '#12200c', neutral: '#0C1A18' }[tone] || '#062420';
  const s = variant === 'solid'
    ? { background: `rgb(${rgb})`, color: solidText }
    : { background: `rgba(${rgb},.14)`, color: `rgb(${rgb})`, border: `1px solid rgba(${rgb},.28)` };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
      padding: '3px 10px', borderRadius: 'var(--ls-radius-pill)',
      lineHeight: 1.4, ...s, ...style,
    }}>{children}</span>
  );
}
