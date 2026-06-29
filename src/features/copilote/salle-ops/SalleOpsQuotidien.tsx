// =============================================================================
// SalleOpsQuotidien — écran « Quotidien · Aujourd'hui » (Salle des Opérations).
//
// Slice 2 : reproduction pixel-fidèle de la maquette (frame 2), 100 % en tokens
// --ls-ops-* (theme-aware), zéro hex en dur. Données statiques (placeholder) —
// câblage réel (next_action, phases, qui inviter, Noaly) aux slices suivantes.
// =============================================================================

import "./salle-ops.css";

const MONO: React.CSSProperties = { fontFamily: "var(--ls-ops-font-mono)" };

const PHASES = ["Setup", "Allumage", "Accél.", "Profond.", "Levier"] as const;
const PHASE_ACTIVE = 1; // 0-based : « Allumage »
const PHASE_DONE = 2;   // segments lime

export function SalleOpsQuotidien() {
  return (
    <div className="ls-ops-root" style={pageWrap}>
      <div style={column}>
        {/* ── Bandeau ops ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, ...MONO, fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>
          <span className="ls-ops-dot" />
          <span style={{ color: "var(--ls-ops-text3)" }}>La Base · Verdun (55)</span>
          <span style={{ color: "var(--ls-ops-border-active)" }}>/</span>
          <span style={{ color: "var(--ls-ops-accent-text)" }}>Jour 2 / 90</span>
        </div>

        <div style={hair} />

        <div style={{ ...MONO, fontSize: 11, letterSpacing: ".2em", color: "var(--ls-ops-muted)", textTransform: "uppercase", marginBottom: 4 }}>
          Salle des opérations
        </div>
        <h1 className="ls-ops-display" style={title}>Aujourd'hui</h1>

        {/* ── Tracker de phases ── */}
        <div style={{ marginTop: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", ...MONO, fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 9 }}>
            <span>Phase · <span style={{ color: "var(--ls-ops-accent-text)" }}>Allumage</span></span>
            <span style={{ color: "var(--ls-ops-faint)" }}>2 / 5</span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {PHASES.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < PHASE_DONE ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, ...MONO, fontSize: 11, letterSpacing: ".03em", textTransform: "uppercase" }}>
            {PHASES.map((p, i) => (
              <span key={p} style={{ color: i === PHASE_ACTIVE ? "var(--ls-ops-accent-text)" : "var(--ls-ops-faint)" }}>{p}</span>
            ))}
          </div>
        </div>

        {/* ── Ton action maintenant (dominante) ── */}
        <div style={limeCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...MONO, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-on-accent2)" }}>
            <span>Ton action · maintenant</span>
            <span className="ls-ops-dot" style={{ background: "var(--ls-ops-on-accent)" }} />
          </div>
          <div className="ls-ops-display" style={limeTitle}>Écris à Karim</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ls-ops-on-accent3)", margin: "12px 0 0", maxWidth: 300 }}>
            Il a aimé ta story hier. C'est chaud. Un message, maintenant — pas demain.
          </p>
          <button type="button" style={limeCta}>Lui envoyer le message</button>
        </div>

        {/* ── 3 actions du jour ── */}
        <SectionLabel>3 actions du jour · 1 faite</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CheckRow state="done" label="Publier ta photo « avant »" />
          <CheckRow state="active" label="Écrire à Karim" />
          <CheckRow state="todo" label="Inviter 1 personne à la soirée" />
        </div>

        {/* ── Qui inviter ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "30px 0 14px" }}>
          <span style={{ ...MONO, fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>Qui inviter · 3 chauds</span>
          <span style={{ ...MONO, fontSize: 10.5, color: "var(--ls-ops-faint)" }}>↓ score</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <InviteRow initial="K" name="Karim B." status="Très chaud · a réagi hier" tone="hot" />
          <InviteRow initial="L" name="Léa D." status="En attente · à relancer" tone="warm" />
          <InviteRow initial="M" name="Mehdi T." status="Curieux · à tester" tone="muted" />
        </div>

        {/* ── Script 1-tap ── */}
        <div style={{ ...card, marginTop: 18, padding: "17px 18px", borderRadius: 18 }}>
          <div style={{ ...MONO, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ls-ops-muted)", marginBottom: 9 }}>Script prêt · 1 tap</div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ls-ops-text2)", margin: "0 0 14px", fontStyle: "italic" }}>
            « Salut Karim ! T'as réagi à ma story 😄 J'ai commencé un truc qui me fait du bien, ça te dit qu'on en parle 5 min ? »
          </p>
          <button type="button" style={ghostCta}>Copier · l'envoyer</button>
        </div>

        {/* ── Noaly ── */}
        <div style={{ ...card, marginTop: 18, padding: 18, borderRadius: 20, background: "var(--ls-ops-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span className="ls-ops-display" style={noalyBadge}>N</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 600 }}>Noaly</div>
              <div style={{ ...MONO, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ls-ops-muted)" }}>ton assistant · 24/7</div>
            </div>
            <span className="ls-ops-dot" />
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ls-ops-text3)", margin: "13px 0 13px" }}>
            « Bloqué·e sur un message ? Demande-moi. Je te le réécris en 2 secondes. »
          </p>
          <div style={noalyInput}>
            <span style={{ flex: 1, fontSize: 13, color: "var(--ls-ops-faint)" }}>Pose ta question…</span>
            <span style={noalySend} aria-hidden="true">↑</span>
          </div>
        </div>

        {/* ── Progression 5 étapes ── */}
        <SectionLabel>Ta progression · étape 2 sur 5</SectionLabel>
        <div style={{ ...card, padding: "18px 16px", borderRadius: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {[1, 2, 3, 4, 5].map((n, i) => (
              <Step key={n} n={n} state={n === 1 ? "done" : n === 2 ? "active" : "todo"} last={i === 4} />
            ))}
          </div>
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 600 }}>Étape 2 sur 5 · ton lancement</div>
            <div style={{ fontSize: 13, color: "var(--ls-ops-muted)", marginTop: 3, lineHeight: 1.4 }}>Encore 1 invitation et tu es lancé·e 🚀</div>
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

function InviteRow({ initial, name, status, tone }: { initial: string; name: string; status: string; tone: "hot" | "warm" | "muted" }) {
  const toneColor = tone === "hot" ? "var(--ls-ops-hot)" : tone === "warm" ? "var(--ls-ops-warm)" : "var(--ls-ops-muted)";
  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: 13, padding: "13px 16px" }}>
      <span className="ls-ops-display" style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, var(--ls-ops-border-active), var(--ls-ops-surface2))", color: toneColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flex: "none" }}>{initial}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: "var(--ls-ops-ink)", fontWeight: 500 }}>{name}</div>
        <div style={{ ...MONO, fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: toneColor, marginTop: 2 }}>● {status}</div>
      </div>
      <span style={{ ...MONO, fontSize: 12, color: tone === "hot" ? "var(--ls-ops-accent-text)" : "var(--ls-ops-faint)" }}>→</span>
    </div>
  );
}

function Step({ n, state, last }: { n: number; state: "done" | "active" | "todo"; last: boolean }) {
  const done = state === "done";
  const active = state === "active";
  return (
    <>
      <div
        className={active ? "ls-ops-ring" : undefined}
        style={{
          width: active ? 30 : 26,
          height: active ? 30 : 26,
          borderRadius: "50%",
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: active ? 15 : 13,
          fontFamily: active ? "var(--ls-ops-font-display)" : "inherit",
          boxSizing: "border-box",
          ...(done || active
            ? { background: "var(--ls-ops-accent)", color: "var(--ls-ops-on-accent)", fontWeight: 700 }
            : { border: "2px solid var(--ls-ops-disabled)", color: "var(--ls-ops-faint)" }),
        }}
      >
        {done ? "✓" : n}
      </div>
      {!last && <div style={{ height: 2, flex: 1, background: n < 2 ? "var(--ls-ops-accent)" : "var(--ls-ops-hair)", margin: "0 6px" }} />}
    </>
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
  fontSize: "clamp(40px, 12vw, 54px)",
  lineHeight: 0.9,
  letterSpacing: ".01em",
  color: "var(--ls-ops-ink)",
  margin: 0,
};

const limeCard: React.CSSProperties = {
  marginTop: 24,
  background: "var(--ls-ops-accent)",
  borderRadius: 22,
  padding: "22px 22px 20px",
  position: "relative",
  overflow: "hidden",
};

const limeTitle: React.CSSProperties = {
  fontSize: 32,
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

const ghostCta: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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

const card: React.CSSProperties = {
  background: "var(--ls-ops-surface)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 16,
};

const noalyBadge: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 13,
  background: "var(--ls-ops-accent)",
  color: "var(--ls-ops-on-accent)",
  flex: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
};

const noalyInput: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--ls-ops-bg)",
  border: "1px solid var(--ls-ops-border)",
  borderRadius: 12,
  padding: "12px 14px",
};

const noalySend: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  background: "var(--ls-ops-accent)",
  color: "var(--ls-ops-on-accent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  flex: "none",
};
