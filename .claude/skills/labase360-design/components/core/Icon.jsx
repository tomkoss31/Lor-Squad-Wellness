import React from 'react';

/**
 * Icon — thin wrapper over Lucide (loaded from CDN). SUBSTITUTION: no brand icon
 * set was provided; Lucide's 2px rounded-cap geometry matches the mark's terminals.
 * Requires the Lucide UMD script on the page (see the components card / UI kits).
 */
export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, style = {}, ...rest }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const lucide = typeof window !== 'undefined' ? window.lucide : null;
    if (lucide && ref.current) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      try { lucide.createIcons({ nameAttr: 'data-lucide', icons: lucide.icons, attrs: {} }); } catch (e) { /* noop */ }
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

  return (
    <span
      ref={ref}
      style={{ display: 'inline-flex', width: size, height: size, color, ...style }}
      {...rest}
    />
  );
}
