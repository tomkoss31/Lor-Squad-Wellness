import React from 'react';

/**
 * Card — surface container. App tone = green surface + hairline border, no heavy
 * shadow. Club tone = white, 22px radius, top accent rule + soft green shadow.
 */
export function Card({
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
    app: { background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', color: 'var(--ls-text)', borderRadius: 'var(--ls-radius-lg)' },
    light: { background: 'var(--ls-l-surface)', border: '1px solid var(--ls-l-border)', color: 'var(--ls-l-text)', borderRadius: 'var(--ls-radius-lg)', boxShadow: 'var(--shadow-sm)' },
    club: { background: '#fff', border: '1px solid rgba(30,51,48,.06)', color: 'var(--bc-ink)', borderRadius: 'var(--bc-radius-card)', boxShadow: 'var(--shadow-card)' },
  };
  const b = base[tone] || base.app;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      padding, ...b, ...style,
    }} {...rest}>
      {accent && isClub && (
        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: accent }} />
      )}
      {accent && !isClub && (
        <span style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: accent }} />
      )}
      {children}
    </div>
  );
}
