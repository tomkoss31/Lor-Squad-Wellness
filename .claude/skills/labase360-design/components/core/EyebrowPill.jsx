import React from 'react';

/**
 * EyebrowPill — the signature pill that sits above a title. Mono caps, .2em
 * tracking. Warm fills for the club site; surface + accent text in the app.
 */
export function EyebrowPill({ children, tone = 'yellow', style = {} }) {
  const tones = {
    yellow: { background: 'var(--bc-yellow)', color: '#7a5b00' },
    orange: { background: 'var(--bc-orange)', color: '#fff' },
    pink: { background: 'var(--bc-pink)', color: '#fff' },
    sage: { background: 'var(--bc-sage)', color: '#fff' },
    peach: { background: 'var(--bc-peach)', color: '#8a4a1a' },
    // App tone: quiet surface with teal text
    app: { background: 'var(--ls-surface2)', color: 'var(--ls-teal)', border: '1px solid var(--ls-border)' },
  };
  const t = tones[tone] || tones.yellow;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
      letterSpacing: '.2em', textTransform: 'uppercase',
      padding: '7px 15px', borderRadius: 'var(--ls-radius-pill)',
      ...t, ...style,
    }}>{children}</span>
  );
}
