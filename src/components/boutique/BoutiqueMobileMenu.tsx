// =============================================================================
// BoutiqueMobileMenu — navigation mobile de la boutique (< 860 px).
//
// Sur mobile la nav du header est masquée : sans ça, la seule façon d'atteindre
// « Par besoin », « Les kits » ou « Affiliation » était de scroller 12 écrans
// jusqu'au footer. Ce menu ☰ ouvre un panneau latéral avec toutes les
// destinations + le diagnostic IA + le lien panier.
//
// Les liens de section pointent vers /boutique/:slug#ancre : si la section est
// sur la page courante (vitrine) on scrolle en douceur, sinon on navigue.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { scrollToSection } from "./nav";

type Entry = { id?: string; href: string; label: string; icon: string };

export function BoutiqueMobileMenu({
  coachSlug,
  shopName,
  aiScanUrl,
  onOpenCart,
  cartCount = 0,
}: {
  coachSlug?: string;
  shopName?: string;
  aiScanUrl?: string | null;
  onOpenCart?: () => void;
  cartCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const base = `/boutique/${coachSlug ?? ""}`;

  // Verrou du scroll + fermeture clavier.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // focus le panneau pour la navigation clavier
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const sections: Entry[] = [
    { id: "bk-concern", href: `${base}#bk-concern`, label: "Trouver ma routine", icon: "🎯" },
    { id: "bk-gamme", href: `${base}#bk-gamme`, label: "Tous les produits", icon: "🧴" },
    { id: "bk-kits", href: `${base}#bk-kits`, label: "Les kits", icon: "🎁" },
    { id: "bk-ingredient", href: `${base}#bk-ingredient`, label: "Les actifs", icon: "🔬" },
  ];
  const pages: Entry[] = [
    { href: `${base}/affiliation`, label: "Devenir affiliée", icon: "💫" },
    { href: `${base}/infos`, label: "Livraison, retours & contact", icon: "📦" },
  ];

  // Sur la vitrine, une ancre présente → scroll doux plutôt que rechargement.
  // Ailleurs (page produit, infos…), on laisse le lien naviguer normalement.
  const go = (e: React.MouseEvent, entry: Entry) => {
    if (!entry.id) return;
    if (!document.getElementById(entry.id)) return;
    e.preventDefault();
    setOpen(false);
    // 80 ms : le temps que le panneau se ferme et que le verrou de scroll saute.
    scrollToSection(entry.id, 80);
  };

  return (
    <>
      <button
        className="bk-burger"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {open && (
        <div className="bk-mm" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="bk-mm-veil" onClick={() => setOpen(false)} />
          <div className="bk-mm-panel" ref={panelRef} tabIndex={-1}>
            <div className="bk-mm-head">
              <span className="bk-mark" style={{ fontSize: 18 }}>
                {shopName ?? "Beauté K Skin"}
              </span>
              <button className="bk-close" onClick={() => setOpen(false)} aria-label="Fermer le menu">
                ×
              </button>
            </div>

            <nav className="bk-mm-nav" aria-label="Navigation boutique">
              <div className="bk-mm-group">La boutique</div>
              {sections.map((s) => (
                <a key={s.href} href={s.href} onClick={(e) => go(e, s)}>
                  <span aria-hidden="true">{s.icon}</span> {s.label}
                </a>
              ))}

              <div className="bk-mm-group">Informations</div>
              {pages.map((p) => (
                <a key={p.href} href={p.href}>
                  <span aria-hidden="true">{p.icon}</span> {p.label}
                </a>
              ))}

              {aiScanUrl ? (
                <a className="bk-mm-ai" href={aiScanUrl} target="_blank" rel="noreferrer">
                  <span aria-hidden="true">🤖</span> Diagnostic peau gratuit (60 s)
                </a>
              ) : null}
            </nav>

            {onOpenCart && (
              <button
                className="bk-btn bk-btn-primary bk-mm-cart"
                onClick={() => {
                  setOpen(false);
                  onOpenCart();
                }}
              >
                Voir mon panier{cartCount > 0 ? ` · ${cartCount}` : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
