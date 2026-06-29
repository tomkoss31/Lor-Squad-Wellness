// =============================================================================
// SalleDesOperations — écran « Jour 0 · S'équiper » (chantier onboarding distri).
//
// Slice 1 : reproduction PIXEL-FIDÈLE de la maquette Claude Design validée
// (2026-06-29), 100 % en tokens --ls-ops-* (dark + clair, theme-aware), zéro
// hex en dur. Données encore statiques (placeholder) — le câblage réel
// (next_action, étapes, J0, Noaly) arrive aux slices suivantes.
//
// Présentationnel : full-width, colonne focus centrée (≤ 460px). Le « switch de
// rendu » sur /co-pilote (§3) viendra plus tard ; ici on valide juste le look.
// =============================================================================

import "./salle-ops.css";

const MONO: React.CSSProperties = { fontFamily: "var(--ls-ops-font-mono)" };

export function SalleDesOperations() {
  return (
    <div className="ls-ops-root" style={pageWrap}>
      <div style={column}>
        {/* ── Bandeau ops ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, ...MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
          <span className="ls-ops-dot" />
          <span style={{ color: "var(--ls-ops-text3)" }}>La Base · Verdun (55)</span>
          <span style={{ color: "var(--ls-ops-border-active)" }}>/</span>
          <span style={{ color: "var(--ls-ops-accent-text)" }}>Jour 0 / 90</span>
        </div>

        <div style={hair} />

        {/* ── Titre ── */}
        <div style={{ ...MONO, fontSize: 11, letterSpacing: ".2em", color: "var(--ls-ops-muted)", textTransform: "uppercase", marginBottom: 4 }}>
          Salle des opérations
        </div>
        <h1 className="ls-ops-display" style={title}>S'équiper</h1>

        <p style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ls-ops-text2)", margin: "18px 0 0" }}>
          Bienvenue. Ici, tu ne fais pas des plans.<br />
          Tu fais <span style={{ color: "var(--ls-ops-ink)", fontWeight: 600 }}>3 actions</span>. Aujourd'hui.
        </p>
        <p style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ls-ops-muted)", margin: "8px 0 0" }}>
          On déverrouille la suite quand tu es équipé·e. C'est tout.
        </p>

        {/* ── Action n°1 (dominante) ── */}
        <div style={limeCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-on-accent2)" }}>
            <span>Action n°1 · maintenant</span>
            <span aria-hidden="true" style={{ opacity: 0.55 }}>→</span>
          </div>
          <div className="ls-ops-display" style={limeTitle}>
            Ta 1<sup style={{ fontSize: ".5em" }}>re</sup> commande<br />250 PV
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ls-ops-on-accent3)", margin: "12px 0 0", maxWidth: 300 }}>
            Ça lance ta marge à 35 %. C'est le seul geste qui ouvre tout le reste.
          </p>
          <button type="button" style={limeCta}>Passer ma commande</button>
        </div>

        {/* ── Checklist équipement ── */}
        <SectionLabel>S'équiper · 4 gestes</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CheckRow state="done" label="Créer ton compte distributeur" />
          <CheckRow state="active" label="Passer ta 1ʳᵉ commande (250 PV)" />
          <CheckRow state="todo" label="Mettre ta photo + ton prénom" />
          <CheckRow state="todo" label="Enregistrer ton 1ᵉʳ contact" />
        </div>

        {/* ── 3 mots à connaître ── */}
        <SectionLabel>3 mots à connaître</SectionLabel>
        <div style={defList}>
          <DefRow term="PV" def="les « points » de tes commandes. 250 = ton départ." />
          <DefRow term="35 %" def="ta marge : ce que tu gardes sur chaque vente." />
          <DefRow term="EBE" def="le club où on t'accueille en vrai, à Verdun." />
        </div>

        {/* ── Coach · fil de sécurité ── */}
        <div style={{ ...card, marginTop: 30, padding: 18, borderRadius: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={photoAvatar}>PHOTO</div>
            <div>
              <div style={{ ...MONO, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
                Ton coach · fil de sécurité
              </div>
              <div style={{ fontSize: 16, color: "var(--ls-ops-ink)", fontWeight: 600, marginTop: 3 }}>Sophie M.</div>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ls-ops-text3)", margin: "14px 0" }}>
            Une question ? Même bête ? Il n'y en a pas. Demande.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" style={ghostBtnAccent}>Lui écrire</button>
            <button type="button" style={ghostBtnMuted}>L'appeler</button>
          </div>
        </div>

        {/* ── Prochain événement ── */}
        <div style={{ ...card, marginTop: 18, display: "flex", alignItems: "center", gap: 14, padding: "15px 16px" }}>
          <div style={{ textAlign: "center", flex: "none", width: 44 }}>
            <div className="ls-ops-display" style={{ fontSize: 24, color: "var(--ls-ops-accent-text)", lineHeight: 1 }}>02</div>
            <div style={{ ...MONO, fontSize: 9, letterSpacing: ".1em", color: "var(--ls-ops-muted)", textTransform: "uppercase" }}>JUIL</div>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--ls-ops-border)" }} />
          <div>
            <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 500 }}>Soirée d'accueil · le club</div>
            <div style={{ fontSize: 13, color: "var(--ls-ops-muted)", marginTop: 2 }}>19 h · Verdun · viens, c'est offert</div>
          </div>
        </div>

        {/* ── Jour 1 verrouillé ── */}
        <div style={lockedCard}>
          <span aria-hidden="true" style={{ fontSize: 18 }}>🔒</span>
          <div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
              Jour 1 · verrouillé
            </div>
            <div style={{ fontSize: 14, color: "var(--ls-ops-text3)", marginTop: 4, lineHeight: 1.4 }}>
              Termine de t'équiper, et demain s'ouvre tout seul.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)", margin: "30px 0 14px" }}>
      {children}
    </div>
  );
}

function CheckRow({ state, label }: { state: "done" | "active" | "todo"; label: string }) {
  const done = state === "done";
  const active = state === "active";
  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "15px 16px", borderColor: active ? "var(--ls-ops-border-active)" : "var(--ls-ops-border)" }}>
      {done ? (
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flex: "none" }}>✓</span>
      ) : (
        <span style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${active ? "var(--ls-ops-accent)" : "var(--ls-ops-disabled)"}`, flex: "none", boxSizing: "border-box" }} />
      )}
      <span style={{ fontSize: 15, color: done ? "var(--ls-ops-faint)" : active ? "var(--ls-ops-ink)" : "var(--ls-ops-text3)", fontWeight: active ? 500 : 400, textDecoration: done ? "line-through" : "none" }}>
        {label}
      </span>
    </div>
  );
}

function DefRow({ term, def }: { term: string; def: string }) {
  return (
    <div style={{ background: "var(--ls-ops-surface)", padding: "15px 16px", display: "flex", gap: 14, alignItems: "baseline" }}>
      <span style={{ ...MONO, fontWeight: 700, color: "var(--ls-ops-accent-text)", fontSize: 15, width: 46, flex: "none" }}>{term}</span>
      <span style={{ fontSize: 14, color: "var(--ls-ops-text2)", lineHeight: 1.4 }}>{def}</span>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  background: "var(--ls-ops-bg)",
  minHeight: "100%",
  padding: "calc(16px + env(safe-area-inset-top)) 0 calc(40px + env(safe-area-inset-bottom))",
};

const column: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  margin: "0 auto",
  padding: "0 24px",
  boxSizing: "border-box",
};

const hair: React.CSSProperties = {
  height: 1,
  background: "linear-gradient(90deg, var(--ls-ops-hair), transparent)",
  margin: "14px 0 18px",
};

const title: React.CSSProperties = {
  fontSize: "clamp(44px, 13vw, 62px)",
  lineHeight: 0.92,
  letterSpacing: ".01em",
  color: "var(--ls-ops-ink)",
  margin: 0,
};

const limeCard: React.CSSProperties = {
  marginTop: 26,
  background: "var(--ls-ops-accent)",
  borderRadius: 22,
  padding: "22px 22px 20px",
  position: "relative",
  overflow: "hidden",
};

const limeTitle: React.CSSProperties = {
  fontSize: 34,
  lineHeight: 0.96,
  color: "var(--ls-ops-on-accent)",
  marginTop: 12,
};

const limeCta: React.CSSProperties = {
  marginTop: 18,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ls-ops-cta-bg)",
  color: "var(--ls-ops-accent)",
  border: "none",
  borderRadius: 14,
  padding: 15,
  fontWeight: 700,
  fontSize: 16,
  minHeight: 44,
  boxSizing: "border-box",
  cursor: "pointer",
  fontFamily: "inherit",
};

const card: React.CSSProperties = {
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
};

const defList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  background: "var(--ls-ops-border)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
  overflow: "hidden",
};

const photoAvatar: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  background: "repeating-linear-gradient(135deg, var(--ls-ops-surface2), var(--ls-ops-surface2) 6px, var(--ls-ops-surface) 6px, var(--ls-ops-surface) 12px)",
  border: "1px solid var(--ls-ops-border-active)",
  flex: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 9,
  color: "var(--ls-ops-faint)",
};

const ghostBtnAccent: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  background: "var(--ls-ops-cta-bg)",
  border: "1px solid var(--ls-ops-border-active)",
  color: "var(--ls-ops-accent-text)",
  borderRadius: 12,
  padding: 13,
  fontWeight: 600,
  fontSize: 14,
  minHeight: 44,
  boxSizing: "border-box",
  cursor: "pointer",
  fontFamily: "inherit",
};

const ghostBtnMuted: React.CSSProperties = {
  ...ghostBtnAccent,
  borderColor: "var(--ls-ops-border)",
  color: "var(--ls-ops-text3)",
  fontWeight: 500,
};

const lockedCard: React.CSSProperties = {
  marginTop: 18,
  border: "1px dashed var(--ls-ops-border-active)",
  borderRadius: 18,
  padding: 20,
  display: "flex",
  alignItems: "center",
  gap: 16,
  opacity: 0.62,
};
