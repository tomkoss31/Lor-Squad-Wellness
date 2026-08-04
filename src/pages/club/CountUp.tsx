import { useEffect, useRef, useState } from "react";

// Compteur animé : les chiffres montent de 0 → end quand ils entrent dans l'écran.
// Finition « premium ». La valeur FINALE est toujours exacte (même si l'anim est
// coupée) ; respecte prefers-reduced-motion (affiche direct la valeur).
export function CountUp({
  end,
  decimals = 0,
  duration = 900,
  prefix = "",
  suffix = "",
}: {
  end: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(end);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          setVal(end * eased);
          if (p < 1) requestAnimationFrame(tick);
          else setVal(end);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    // Filet de sécurité : si l'anim ne s'est jamais déclenchée (page cachée au
    // chargement, rAF en pause, élément resté hors écran), on affiche la VRAIE
    // valeur au bout de 4 s — jamais un « 0 » figé sur une page de prix.
    const safety = window.setTimeout(() => {
      if (!started.current) {
        started.current = true;
        io.disconnect();
        setVal(end);
      }
    }, 4000);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [end, duration]);

  const formatted = val.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
