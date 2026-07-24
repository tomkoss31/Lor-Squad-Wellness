// =============================================================================
// BbcFormation — parcours + échelle des rôles à accès gradué (port du design).
// Statut courant · échelle 5 marches cliquable · parcours 00→08 · glossaire ·
// « la règle qui gouverne tout : on ne modifie rien ».
// =============================================================================

import { useState } from "react";
import { getFormationModule } from "../data/bbcFormation";

const ROLES: Array<{ role: string; sub: string; st: "done" | "current" | "next" | "locked"; exp: string }> = [
  { role: "Membre", sub: "EBE faite + un programme", st: "done",
    exp: "T'es client du club : tu viens le matin, tu bois ton shake, tu te pèses, tu progresses. Ton ticket d'entrée : avoir fait ton évaluation bien-être (l'EBE) et suivre un programme. C'est tout — pas de pression, juste tes résultats." },
  { role: "Coach stagiaire", sub: "3 cœurs actifs dans le club · tu es ici", st: "current",
    exp: "Là tu passes de l'autre côté : t'as amené 3 personnes qui restent dans le club (= 3 cœurs actifs), donc t'as prouvé que tu sais faire venir du monde. Tu peux maintenant coacher, envoyer tes cobayes tous les jours et faire tes premiers bilans. C'est ta marche actuelle." },
  { role: "Junior partner", sub: "entretien 1h30 · engagement 3 à 9 mois", st: "next",
    exp: "Le club owner te choisit. Vous faites un entretien de 1h30 (le « pourquoi », tes objectifs chiffrés sur 90 jours) et tu signes un engagement de 3 à 9 mois. Ton but : 10 nouveaux en première ligne. C'est l'apprentissage pour faire tourner un club. Si tu n'ouvres pas en 9 mois, tu redeviens stagiaire." },
  { role: "Propriétaire", sub: "ouvre ton club après 6 semaines de prélancement", st: "locked",
    exp: "Tu ouvres ton propre club. Obligatoire avant : 6 semaines de prélancement (non négociable) — 200 messages cobayes, 20 évaluations d'entraînement, viser 30 membres le jour de l'ouverture. C'est ce qui fait la différence entre un club qui vit et un club qui ferme." },
  { role: "Roll out", sub: "ton équipe duplique le modèle", st: "locked",
    exp: "Le sommet : ton équipe ouvre des clubs à son tour. Tu ne fais plus le chiffre toi-même, tu touches des royalties sur l'organisation. L'objectif du modèle : le Club 100 dupliqué encore et encore — 3 clubs ≈ 50 000 PV." },
];

const PARCOURS: Array<{ n: string; t: string; d: string; st: "done" | "current" | "next" | "locked" }> = [
  { n: "00", t: "La machine à royalties", d: "le modèle, les 5 éléments, le Club 100", st: "done" },
  { n: "01", t: "L'invitation", d: "marché chaud/froid, ratios, message cobaye", st: "done" },
  { n: "02", t: "L'évaluation bien-être", d: "les 11 étapes, 80/20, l'échelle 1-10", st: "done" },
  { n: "03", t: "Le suivi et les résultats", d: "pesée, journal 4 valeurs, tableau des scores", st: "current" },
  { n: "04", t: "Le bilan des 10 visites", d: "les 9 étapes du rdv charnière", st: "next" },
  { n: "05", t: "L'appel ambassadeur", d: "invitation, rappels, suivi 10 min", st: "locked" },
  { n: "06", t: "L'atelier cœurs", d: "aider un membre à trouver ses 2 cœurs", st: "locked" },
  { n: "07", t: "Les 6 semaines de pré-lancement", d: "le plan avant d'ouvrir ton club", st: "locked" },
  { n: "08", t: "Check-lists par rôles", d: "qui fait quoi quand l'équipe grandit", st: "locked" },
];

const GLOSSARY: Array<{ t: string; d: string }> = [
  { t: "cobaye", d: "une personne à qui tu envoies le message pour un bilan gratuit. 20 messages/jour = le seul chiffre qui compte le mois 1." },
  { t: "cœur", d: "1 personne que tu fais venir et qui rejoint le club. 2 = compte ambassadeur (25% remise), 3 = 10 visites offertes, 5 = 30." },
  { t: "EBE — évaluation bien-être", d: "la porte d'entrée. 100 % des membres passent par là. 45 min, 80 % d'écoute, on qualifie sur l'échelle 1 à 10." },
  { t: "bilan des 10 visites", d: "le rendez-vous charnière à la 10ᵉ visite. 9 étapes. C'est là qu'un client devient un partenaire." },
  { t: "appel ambassadeur", d: "lundi & jeudi (horaire à confirmer). On montre les remises, le remboursement, le complément de revenu. Tri A · B · C · D." },
  { t: "atelier des cœurs", d: "mardi & samedi. On aide un membre à trouver ses 2 cœurs. Avec l'appel, c'est ce qui fabrique les coachs." },
  { t: "stagiaire", d: "coach en formation : 3 cœurs actifs, il coache dans le club et fait ses premiers bilans." },
  { t: "PV / Club 100", d: "PV = les points de volume. Un club à maturité ≈ 20 000 PV. Le Club 100 = 100 membres actifs, le modèle à dupliquer." },
];

const STAR = "M12 2l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 19.1l1.4-6.3L3 8.5l6.4-.6z";
const LOCK = "M6.5 10V7.5a5.5 5.5 0 0 1 11 0V10M5 10h14v10.5H5z";
const CHECK = "M20 6 9 17l-5-5";

export function BbcFormation() {
  const [sel, setSel] = useState(1);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const openMod = openModule ? getFormationModule(openModule) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 20, alignItems: "start" }} className="bbc-formation-grid">
      {/* LEFT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--ls-bbc-s1)", border: "1px solid rgba(197,248,42,.32)", borderRadius: 20, padding: "18px 20px" }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: "var(--ls-bbc-lime)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-lime-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={STAR} /></svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>tu es</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Coach stagiaire</div>
            <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 2 }}>prochaine marche : junior partner</div>
          </div>
        </div>

        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />l'échelle des rôles
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 21, top: 22, bottom: 22, width: 2, background: "var(--ls-bbc-line)" }} />
            {ROLES.map((r, i) => {
              const nodeBg = r.st === "done" ? "var(--ls-bbc-teal)" : r.st === "current" ? "var(--ls-bbc-lime)" : "var(--ls-bbc-bg)";
              const numColor = r.st === "done" || r.st === "current" ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)";
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setSel(i)}
                  style={{ position: "relative", display: "flex", gap: 13, alignItems: "flex-start", padding: "9px 10px", margin: "0 -10px", borderRadius: 12, cursor: "pointer", width: "calc(100% + 20px)", textAlign: "left", border: 0, background: i === sel ? "var(--ls-bbc-s2)" : "transparent" }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 700, fontSize: 14, background: nodeBg, border: `2px solid ${r.st === "done" ? "var(--ls-bbc-teal)" : r.st === "current" ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`, color: numColor, zIndex: 1 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: r.st === "locked" ? "var(--ls-bbc-muted)" : "var(--ls-bbc-text)" }}>{r.role}</span>
                      {r.st === "done" ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-teal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={CHECK} /></svg>
                      ) : r.st === "next" || r.st === "locked" ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={LOCK} /></svg>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: r.st === "current" || r.st === "next" ? "var(--ls-bbc-lime-text)" : r.st === "done" ? "var(--ls-bbc-teal)" : "var(--ls-bbc-muted)", marginTop: 2 }}>{r.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ls-bbc-lime-text)", marginBottom: 6 }}>{ROLES[sel].role}</div>
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-text)", lineHeight: 1.55 }}>{ROLES[sel].exp}</div>
          </div>
        </div>

        <div style={{ background: "rgba(251,113,133,.08)", border: "1px solid rgba(251,113,133,.26)", borderRadius: 18, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-coral)", textTransform: "uppercase" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={LOCK} /></svg>la règle qui gouverne tout
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>On ne modifie rien.</div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.5 }}>Mêmes prix, mêmes horaires, mêmes scripts, mêmes formulaires. Chaque « amélioration » perso casse la duplication.</div>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)", flex: "none" }} />
          <span style={{ flex: 1, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>le parcours étape par étape</span>
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-lime-text)" }}>3 / 9 fait</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 16 }}>Les modules se débloquent à chaque échelon. Tu inventes rien, tu déroules.</div>
        {PARCOURS.map((m) => {
          const badge = m.st === "done" ? "var(--ls-bbc-teal)" : m.st === "locked" ? "var(--ls-bbc-hint)" : "var(--ls-bbc-lime)";
          const bBg = m.st === "done" ? "rgba(45,212,191,.12)" : m.st === "current" ? "rgba(197,248,42,.12)" : "transparent";
          return (
            <button key={m.n} type="button" onClick={() => setOpenModule(m.n)} style={{ display: "flex", alignItems: "center", gap: 15, padding: "13px 8px", width: "100%", background: "transparent", border: "none", borderTop: "1px solid var(--ls-bbc-line)", cursor: "pointer", textAlign: "left", color: "var(--ls-bbc-text)", opacity: m.st === "locked" ? 0.7 : 1 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 16, background: bBg, border: `1px solid ${badge}`, color: badge }}>{m.n}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: m.st === "locked" ? "var(--ls-bbc-muted)" : "var(--ls-bbc-text)" }}>{m.t}</div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{m.d}</div>
              </div>
              {m.st === "current" ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-bbc-lime-ink)", background: "var(--ls-bbc-lime)", padding: "7px 13px", borderRadius: 10 }}>reprendre</span>
              ) : m.st === "locked" ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={LOCK} /></svg>
              ) : null}
              <span aria-hidden="true" style={{ fontSize: 16, color: "var(--ls-bbc-hint)" }}>›</span>
            </button>
          );
        })}

        <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--ls-bbc-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />le vocabulaire du club
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 14 }}>Les mots qu'on emploie tous les matins, expliqués comme à un pote.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {GLOSSARY.map((g) => (
              <div key={g.t} style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ls-bbc-lime-text)" }}>{g.t}</div>
                <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.5 }}>{g.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {openMod ? (
        <div onClick={() => setOpenModule(null)} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} className="bbc-mode" style={{ width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, flex: "none", background: "var(--ls-bbc-lime)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 16, color: "var(--ls-bbc-lime-ink)" }}>{openMod.n}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, lineHeight: 1.1 }}>{openMod.title}</div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 2 }}>{openMod.subtitle}</div>
              </div>
              <button type="button" onClick={() => setOpenModule(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15, flex: "none" }}>✕</button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>{openMod.summary}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {openMod.points.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "11px 13px", borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
                  <span style={{ color: "var(--ls-bbc-lime)", flex: "none", fontWeight: 800 }}>•</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", textAlign: "center", marginTop: 14 }}>source · Notion Formation BBC {openMod.n}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
