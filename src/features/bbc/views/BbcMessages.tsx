// =============================================================================
// BbcMessages — messagerie coach ↔ membre (port du design, BBC Lot 4).
// Liste des fils + fil actif. Données d'exemple (branchement réel = Lot 4).
// =============================================================================

import { useState } from "react";

interface Msg {
  me: boolean;
  t: string;
  time: string;
}
interface Thread {
  name: string;
  ini: string;
  tone: string;
  preview: string;
  time: string;
  unread: number;
  msgs: Msg[];
}

const THREADS: Thread[] = [
  {
    name: "Sarah M.", ini: "SM", tone: "var(--ls-bbc-teal)", preview: "nickel, j'ai bien pointé ce matin", time: "7h05", unread: 0,
    msgs: [
      { me: false, t: "coucou coach, je suis là !", time: "7h02" },
      { me: true, t: "parfait Sarah, ta visite est validée. 7/10 💪", time: "7h04" },
      { me: false, t: "nickel, j'ai bien pointé ce matin", time: "7h05" },
    ],
  },
  {
    name: "Inès L.", ini: "IL", tone: "var(--ls-bbc-lime)", preview: "du coup c'est quoi le palier junior ?", time: "6h58", unread: 2,
    msgs: [
      { me: false, t: "salut ! j'ai ramené une amie hier", time: "6h50" },
      { me: true, t: "trop bien, ça te met à 2 cœurs 🔥", time: "6h55" },
      { me: false, t: "du coup c'est quoi le palier junior ?", time: "6h58" },
    ],
  },
  {
    name: "Paul V.", ini: "PV", tone: "var(--ls-bbc-coral)", preview: "je peux passer demain matin ?", time: "hier", unread: 1,
    msgs: [
      { me: false, t: "je peux passer demain matin ?", time: "hier" },
      { me: true, t: "oui, on ouvre à 7h. je t'inscris", time: "hier" },
    ],
  },
];

export function BbcMessages() {
  const [active, setActive] = useState(0);
  const chat = THREADS[active];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)", gap: 20, height: 560 }} className="bbc-messages-grid">
      {/* liste */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 14, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--ls-bbc-s2)", borderRadius: 11, padding: "10px 13px", marginBottom: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-hint)" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <span style={{ fontSize: 13, color: "var(--ls-bbc-hint)" }}>rechercher…</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {THREADS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              onClick={() => setActive(i)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: 0, cursor: "pointer", textAlign: "left", padding: 12, borderRadius: 13, marginBottom: 3, background: i === active ? "var(--ls-bbc-s2)" : "transparent" }}
            >
              <span style={{ width: 42, height: 42, borderRadius: 999, flex: "none", background: "var(--ls-bbc-s3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: t.tone }}>{t.ini}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</span>
                  <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-hint)" }}>{t.time}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--ls-bbc-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.preview}</span>
                  {t.unread ? (
                    <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 700, color: "var(--ls-bbc-lime-ink)", background: "var(--ls-bbc-lime)", minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{t.unread}</span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* fil actif */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <span style={{ width: 40, height: 40, borderRadius: 999, background: "var(--ls-bbc-s3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, color: "var(--ls-bbc-teal)" }}>{chat.ini}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{chat.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ls-bbc-teal)" }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 6px var(--ls-bbc-teal)" }} />membre du club · carte 7/10
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          {chat.msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.me ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "62%", background: m.me ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)", color: m.me ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-text)", padding: "12px 15px", borderRadius: 16, fontSize: 13.5, lineHeight: 1.4 }}>
                {m.t}
                <span style={{ display: "block", fontSize: 10, opacity: 0.6, marginTop: 5, fontFamily: "var(--ls-bbc-font-mono)" }}>{m.time}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", borderTop: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <input placeholder={`écris à ${chat.name}…`} style={{ flex: 1, height: 48, borderRadius: 13, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, padding: "0 16px", outline: "none" }} />
          <button type="button" style={{ width: 48, height: 48, border: 0, borderRadius: 13, background: "var(--ls-bbc-lime)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-lime-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
