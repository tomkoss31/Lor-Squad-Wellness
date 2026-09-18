// =============================================================================
// Les briques d'écran du « club en cinq onglets » (livraison A, 18/09/2026).
// Carte, ligne, feuille du bas, toast — les mêmes partout, pour que Matin,
// Contacter et Plus se ressemblent sans recopier leurs styles.
// Tokens : --ls-bbc-* uniquement (bbc-tokens.css). Effets : classes bbc-*.
// =============================================================================

import { useEffect, type CSSProperties, type ReactNode } from "react";

export function Carte({ eye, right, tone, children }: { eye: string; right?: ReactNode; tone?: "trou" | "plein"; children: ReactNode }) {
  return (
    <section
      className="bbc-carte"
      style={{
        background: tone === "plein" ? "var(--ls-bbc-s2)" : "var(--ls-bbc-s1)",
        border: tone === "trou" ? "1.5px solid var(--ls-bbc-orange)" : "1px solid var(--ls-bbc-line)",
        borderRadius: 18,
        padding: "12px 14px 8px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>{eye}</span>
        {right ? <span style={{ fontSize: 12, color: "var(--ls-bbc-hint)", whiteSpace: "nowrap" }}>{right}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "10px 0", lineHeight: 1.5 }}>{children}</div>;
}

export function Ligne({
  avant,
  titre,
  sous,
  sousTone,
  action,
  actionTone = "neutre",
  fait,
  onClick,
}: {
  avant?: ReactNode;
  titre: ReactNode;
  sous?: ReactNode;
  sousTone?: "alerte";
  action?: ReactNode;
  actionTone?: "fort" | "teal" | "neutre";
  fait?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bbc-ligne"
      style={{
        display: "grid",
        gridTemplateColumns: avant ? "auto 1fr auto" : "1fr auto",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 0",
        border: 0,
        borderTop: "1px solid var(--ls-bbc-line)",
        background: "transparent",
        color: "var(--ls-bbc-text)",
        textAlign: "left",
        fontFamily: "var(--ls-bbc-font-body)",
        cursor: onClick ? "pointer" : "default",
        opacity: fait ? 0.5 : 1,
      }}
    >
      {avant}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titre}</span>
        {sous ? (
          <span style={{ display: "block", fontSize: 12, lineHeight: 1.35, color: sousTone === "alerte" ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-muted)", fontWeight: sousTone === "alerte" ? 600 : 400 }}>{sous}</span>
        ) : null}
      </span>
      {action ? <Pastille tone={actionTone}>{action}</Pastille> : null}
    </button>
  );
}

export function Pastille({ tone = "neutre", children }: { tone?: "fort" | "teal" | "neutre"; children: ReactNode }) {
  const style: CSSProperties =
    tone === "fort"
      ? { background: "var(--ls-bbc-grad)", color: "#fff", border: "1px solid transparent", boxShadow: "0 8px 18px -10px rgba(255,45,60,.55)" }
      : tone === "teal"
        ? { background: "color-mix(in srgb, var(--ls-bbc-teal) 14%, transparent)", color: "var(--ls-bbc-teal)", border: "1px solid transparent" }
        : { background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", border: "1px solid var(--ls-bbc-line2)" };
  return (
    <span style={{ ...style, fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 999, whiteSpace: "nowrap", flex: "none" }}>{children}</span>
  );
}

export function Rond({ tone, children }: { tone: "lead" | "msg" | "neutre" | string; children: ReactNode }) {
  const bg = tone === "lead" ? "color-mix(in srgb, var(--ls-bbc-orange) 16%, transparent)" : tone === "msg" ? "color-mix(in srgb, var(--ls-bbc-teal) 14%, transparent)" : tone === "neutre" ? "var(--ls-bbc-s3)" : tone;
  const color = tone === "lead" ? "var(--ls-bbc-orange-text)" : tone === "msg" ? "var(--ls-bbc-teal)" : tone === "neutre" ? "var(--ls-bbc-muted)" : "#fff";
  return (
    <span style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--ls-bbc-font-mono)", background: bg, color, flex: "none" }}>{children}</span>
  );
}

/** Le bouton principal, avec l'effet du bouton du site (dégradé, ombre, pression). */
export function BoutonFort({ children, onClick, large, href }: { children: ReactNode; onClick?: () => void; large?: boolean; href?: string }) {
  const style: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: large ? "100%" : undefined, minHeight: large ? 48 : 40, padding: large ? "12px 18px" : "9px 16px",
    borderRadius: 999, border: 0, background: "var(--ls-bbc-grad)", color: "#fff", boxShadow: "var(--ls-bbc-grad-ombre)",
    fontFamily: "var(--ls-bbc-font-body)", fontSize: large ? 15 : 13.5, fontWeight: 700, cursor: "pointer", textDecoration: "none",
  };
  if (href) return <a href={href} className="bbc-pression" style={style} onClick={onClick}>{children}</a>;
  return <button type="button" className="bbc-pression" style={style} onClick={onClick}>{children}</button>;
}

export function BoutonDoux({ children, onClick, large, dashed }: { children: ReactNode; onClick?: () => void; large?: boolean; dashed?: boolean }) {
  return (
    <button
      type="button"
      className="bbc-pression"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: large ? "100%" : undefined, minHeight: large ? 48 : 40, padding: large ? "12px 18px" : "9px 16px",
        borderRadius: 999, border: `1px ${dashed ? "dashed" : "solid"} var(--ls-bbc-line2)`, background: "var(--ls-bbc-s1)", color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)", fontSize: large ? 15 : 13.5, fontWeight: 600, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/**
 * La feuille du bas. Une seule implémentation pour les nouveaux écrans :
 * voile + panneau qui monte avec un ressort (classe `bbc-feuille`, cf. CSS),
 * fermeture au voile, à Échap, ou en glissant vers le bas.
 */
export function Feuille({ titre, sous, onClose, children, fil }: { titre: string; sous?: ReactNode; onClose: () => void; children: ReactNode; fil?: { etape: number; sur: number } }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  let y0: number | null = null;
  return (
    <div
      className="bbc-mode bbc-feuille-voile"
      onClick={onClose}
      onTouchStart={(e) => { y0 = e.touches[0].clientY; }}
      onTouchEnd={(e) => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 90) onClose(); y0 = null; }}
    >
      <div role="dialog" aria-modal="true" aria-label={titre} className="bbc-feuille" onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--ls-bbc-line2)", margin: "0 auto 4px" }} />
        {fil ? (
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: fil.sur }, (_, i) => (
              <i key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i < fil.etape ? "var(--ls-bbc-orange)" : "var(--ls-bbc-s3)" }} />
            ))}
          </div>
        ) : null}
        <h3 style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 24, letterSpacing: ".02em", textTransform: "uppercase", margin: 0, lineHeight: 1.05 }}>{titre}</h3>
        {sous ? <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>{sous}</div> : null}
        {children}
        <button type="button" onClick={onClose} style={{ alignSelf: "center", font: "inherit", fontSize: 12.5, color: "var(--ls-bbc-muted)", background: "none", border: 0, cursor: "pointer", padding: "4px 8px" }}>
          Fermer
        </button>
      </div>
    </div>
  );
}

export function Choix({ children, onClick, tone, small }: { children: ReactNode; onClick: () => void; tone?: "fort" | "passerelle"; small?: ReactNode }) {
  return (
    <button
      type="button"
      className="bbc-pression"
      onClick={onClick}
      style={{
        textAlign: "left", font: "inherit", fontFamily: "var(--ls-bbc-font-body)", fontSize: 14, fontWeight: 600, padding: "12px 14px", borderRadius: 12, cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, width: "100%",
        border: tone === "passerelle" ? "1px dashed var(--ls-bbc-line2)" : tone === "fort" ? "1px solid transparent" : "1px solid var(--ls-bbc-line2)",
        background: tone === "fort" ? "var(--ls-bbc-grad)" : "var(--ls-bbc-s1)",
        color: tone === "fort" ? "#fff" : "var(--ls-bbc-text)",
        boxShadow: tone === "fort" ? "var(--ls-bbc-grad-ombre)" : undefined,
      }}
    >
      <span>{children}</span>
      {small ? <small style={{ fontWeight: 400, fontSize: 12, textAlign: "right", color: tone === "fort" ? "rgba(255,255,255,.85)" : tone === "passerelle" ? "var(--ls-bbc-teal)" : "var(--ls-bbc-muted)" }}>{small}</small> : null}
    </button>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bbc-toast" role="status">
      {message}
    </div>
  );
}
