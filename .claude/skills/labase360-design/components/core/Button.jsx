import React from 'react';

/**
 * La Base 360 button. Primary = teal (app structural color); pill CTAs use
 * variant="cta". Lime is never used as a button fill (lime = wins only).
 */
export function Button({
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
    sm: { padding: '8px 14px', fontSize: 13, gap: 6 },
    md: { padding: '11px 20px', fontSize: 14, gap: 8 },
    lg: { padding: '15px 28px', fontSize: 16, gap: 10 },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: { background: 'var(--ls-teal)', color: '#0C1A18', border: '1px solid transparent' },
    secondary: { background: 'var(--ls-surface2)', color: 'var(--ls-text)', border: '1px solid var(--ls-border2)' },
    ghost: { background: 'transparent', color: 'var(--ls-text)', border: '1px solid transparent' },
    outline: { background: 'transparent', color: 'var(--ls-teal)', border: '1px solid var(--ls-teal)' },
    danger: { background: 'var(--ls-coral)', color: '#2A0F0A', border: '1px solid transparent' },
    // Warm gradient CTA — Breakfast Club site
    cta: { background: 'var(--bc-cta-gradient)', color: '#fff', border: '1px solid transparent', boxShadow: 'var(--bc-cta-shadow)' },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
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
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none'; }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.06)'; }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
