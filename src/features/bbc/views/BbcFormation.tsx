// =============================================================================
// BbcFormation — l'échelle des 5 marches, le parcours 00→08, le glossaire.
//
// CE QUE CET ÉCRAN NE DOIT PLUS JAMAIS FAIRE (recette client 2026-07-28) :
//
//  · Affirmer une marche. « TU ES Coach stagiaire » était une constante servie
//    à tout le monde, propriétaire de club compris. Ici la marche vient de
//    `useBbcRole` (faits réels) et le bloc « tu es » ne s'affiche QUE si on la
//    connaît. Sinon : formulation neutre, on ne devine pas.
//
//  · Verrouiller à tort. `isAdmin || club actif` ⇒ rien n'est verrouillé, et
//    marche inconnue ⇒ rien n'est verrouillé non plus (`fullAccess`). Un module
//    lu trop tôt ne casse rien ; un module fermé à tort humilie.
//
//  · Mentir sur un cadenas. Avant, un module « verrouillé » s'ouvrait quand
//    même au clic : le cadenas était décoratif. Maintenant le bouton est
//    réellement `disabled` ET il dit à quelle marche il s'ouvre.
//
//  · Afficher une progression inventée. « 3 / 9 fait » était une chaîne de
//    caractères. Le compteur vient de `bbc_formation_progress` et ne s'affiche
//    pas du tout tant qu'on ne peut pas le lire (migration non poussée) — mieux
//    vaut aucun compteur qu'un compteur figé.
//
// L'état du lecteur (« tu es ici », « c'est ta marche ») est posé ICI, jamais
// dans les données : les définitions de marches se lisent à la 3e personne.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import {
  BBC_FORMATION_MODULES,
  BBC_ROLES,
  buildGlossary,
  getFormationModule,
  getModulePoints,
} from "../data/bbcFormation";
import { bbcRoleRank, useBbcRole } from "../useBbcRole";
import { useBbcFormationProgress } from "../useBbcFormationProgress";

const STAR = "M12 2l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.4 19.1l1.4-6.3L3 8.5l6.4-.6z";
const LOCK = "M6.5 10V7.5a5.5 5.5 0 0 1 11 0V10M5 10h14v10.5H5z";
const CHECK = "M20 6 9 17l-5-5";

/** Teinte d'un token BBC. Aucune COULEUR DE MARQUE en rgba() littéral : lime,
 *  teal et coral changent en thème clair (bbc-tokens.css), un rgba figé
 *  garderait la version néon prévue pour le fond noir.
 *  (Le voile noir des modales, lui, reste un rgba : il est identique dans les
 *  deux thèmes et ne dépend d'aucun token — même choix partout dans BBC.) */
function tint(token: string, pct: number): string {
  return `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;
}

export function BbcFormation() {
  const { role, source, loading, clubsOwned, hearts, fullAccess, clubSettings } = useBbcRole();
  const progress = useBbcFormationProgress();

  const rang = bbcRoleRank(role);
  const [sel, setSel] = useState(0);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const openMod = openModule ? getFormationModule(openModule) : null;

  // La marche courante n'est connue qu'après un aller-retour réseau : on aligne
  // le panneau de détail dessus UNE FOIS, et jamais après que le lecteur a
  // cliqué (sinon on lui reprendrait sa sélection sous les doigts).
  const alignee = useRef(false);
  useEffect(() => {
    if (alignee.current || rang < 0) return;
    alignee.current = true;
    setSel(rang);
  }, [rang]);
  /** Un clic sur une marche gèle l'alignement : sans ça, le lecteur qui ouvre
   *  une marche pendant le chargement se la ferait remplacer une seconde plus
   *  tard, sans comprendre pourquoi. */
  function choisirMarche(i: number) {
    alignee.current = true;
    setSel(i);
  }

  const glossaire = buildGlossary(clubSettings);
  const rungSel = BBC_ROLES[sel] ?? BBC_ROLES[0];

  // Statut de chaque module, CALCULÉ : plus aucun `st` écrit à la main.
  const modules = BBC_FORMATION_MODULES.map((m) => ({
    m,
    done: Boolean(progress.done[m.n]),
    // fullAccess couvre déjà l'admin, le propriétaire de club ET la marche
    // inconnue : dans ces trois cas on ne calcule même pas de verrou.
    locked: !fullAccess && bbcRoleRank(m.minRole) > rang,
  }));
  const faits = modules.filter((x) => x.done).length;
  // « à faire » = le premier module ni coché ni verrouillé. Un simple statut,
  // pas un bouton : l'ancien badge « reprendre » promettait de reprendre là où
  // on s'était arrêté et ouvrait en fait la même fiche que les 8 autres.
  const aFaire = progress.available ? modules.find((x) => !x.done && !x.locked)?.m.n ?? null : null;

  const rungCourante = rang >= 0 ? BBC_ROLES[rang] : null;
  const rungSuivante = rang >= 0 ? BBC_ROLES[rang + 1] ?? null : null;

  /** Pourquoi cette marche — l'écran doit pouvoir se justifier. */
  const pourquoi =
    source === "override"
      ? "marche posée par ton club owner"
      : source === "equipe"
        ? "un membre de ton équipe a ouvert son club"
        : source === "club"
          ? `tu as ${clubsOwned} club${clubsOwned > 1 ? "s" : ""} actif${clubsOwned > 1 ? "s" : ""}`
          : source === "prelancement"
            ? "ton pré-lancement est lancé"
            : source === "coeurs"
              ? `${hearts} cœurs validés dans ton club`
              : "";

  return (
    <div className="bbc-formation-grid">
      {/* ── Colonne gauche ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Statut du lecteur — affiché SEULEMENT si on sait qui lit. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: "var(--ls-bbc-s1)",
            border: `1px solid ${rungCourante ? tint("--ls-bbc-lime", 32) : "var(--ls-bbc-line)"}`,
            borderRadius: 20,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: rungCourante ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke={rungCourante ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={STAR} />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            {rungCourante ? (
              <>
                <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  tu es
                </div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{rungCourante.label}</div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 2 }}>
                  {rungSuivante ? `prochaine marche : ${rungSuivante.label.toLowerCase()}` : "dernière marche de l'échelle"}
                  {pourquoi ? <span style={{ color: "var(--ls-bbc-hint)" }}> · {pourquoi}</span> : null}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  l'échelle des rôles
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {loading ? "on regarde où tu en es…" : "on ne sait pas encore situer ta marche"}
                </div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2, lineHeight: 1.45 }}>
                  {loading ? " " : "Tant qu'on ne peut pas la déduire, on ne l'invente pas — et rien n'est verrouillé."}
                </div>
              </>
            )}
          </div>
        </div>

        {/* L'échelle : définitions neutres, position posée par la vue. */}
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />
            l'échelle des rôles
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 21, top: 22, bottom: 22, width: 2, background: "var(--ls-bbc-line)" }} />
            {BBC_ROLES.map((r, i) => {
              const passee = rang >= 0 && i < rang;
              const courante = rang >= 0 && i === rang;
              const nodeBg = passee ? "var(--ls-bbc-teal)" : courante ? "var(--ls-bbc-lime)" : "var(--ls-bbc-bg)";
              const numColor = passee || courante ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)";
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => choisirMarche(i)}
                  aria-current={courante ? "step" : undefined}
                  style={{
                    position: "relative",
                    display: "flex",
                    gap: 13,
                    alignItems: "flex-start",
                    padding: "9px 10px",
                    margin: "0 -10px",
                    borderRadius: 12,
                    cursor: "pointer",
                    width: "calc(100% + 20px)",
                    textAlign: "left",
                    border: 0,
                    background: i === sel ? "var(--ls-bbc-s2)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      flex: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--ls-bbc-font-mono)",
                      fontWeight: 700,
                      fontSize: 14,
                      background: nodeBg,
                      border: `2px solid ${passee ? "var(--ls-bbc-teal)" : courante ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`,
                      color: numColor,
                      zIndex: 1,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ls-bbc-text)" }}>{r.label}</span>
                      {passee ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-teal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d={CHECK} />
                        </svg>
                      ) : null}
                      {courante ? (
                        <span
                          style={{
                            fontFamily: "var(--ls-bbc-font-mono)",
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--ls-bbc-lime-ink)",
                            background: "var(--ls-bbc-lime)",
                            padding: "2px 7px",
                            borderRadius: 999,
                          }}
                        >
                          tu es ici
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11.5, color: courante ? "var(--ls-bbc-lime-text)" : passee ? "var(--ls-bbc-teal)" : "var(--ls-bbc-muted)", marginTop: 2 }}>
                      {r.criteria}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 14, padding: 16, borderRadius: 14, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ls-bbc-lime-text)", marginBottom: 6 }}>{rungSel.label}</div>
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-text)", lineHeight: 1.55 }}>{rungSel.description}</div>
            {/* La 2e personne n'apparaît QUE sur la marche réellement occupée. */}
            {rang >= 0 && sel === rang ? (
              <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 8, fontWeight: 600 }}>C'est ta marche.</div>
            ) : null}
            {rang >= 0 && sel < rang && rungSel.vuDenHaut ? (
              <div style={{ fontSize: 12, color: "var(--ls-bbc-teal)", marginTop: 8, lineHeight: 1.45 }}>{rungSel.vuDenHaut}</div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            background: tint("--ls-bbc-coral", 8),
            border: `1px solid ${tint("--ls-bbc-coral", 26)}`,
            borderRadius: 18,
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-coral)", textTransform: "uppercase" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={LOCK} />
            </svg>
            la règle qui gouverne tout
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>On ne modifie rien.</div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.5 }}>
            Mêmes prix, mêmes horaires, mêmes scripts, mêmes formulaires. Chaque « amélioration » perso casse la duplication.
          </div>
        </div>
      </div>

      {/* ── Colonne droite ───────────────────────────────────────────────── */}
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)", flex: "none" }} />
          <span style={{ flex: 1, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
            le parcours étape par étape
          </span>
          {/* Rien tant qu'on ne peut pas compter pour de vrai : un « 0 / 9 »
              qui clignote puis saute vaut moins que pas de compteur. */}
          {progress.available && !progress.loading ? (
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-lime-text)" }}>
              {faits} / {modules.length} fait
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 16 }}>
          {fullAccess
            ? "Tout est ouvert pour toi. Tu inventes rien, tu déroules."
            : "Les modules se débloquent à chaque marche. Tu inventes rien, tu déroules."}
        </div>

        {modules.map(({ m, done, locked }) => {
          const enCours = m.n === aFaire;
          const badge = done ? "var(--ls-bbc-teal)" : locked ? "var(--ls-bbc-hint)" : "var(--ls-bbc-lime)";
          const bBg = done ? tint("--ls-bbc-teal", 12) : enCours ? tint("--ls-bbc-lime", 12) : "transparent";
          const marcheRequise = BBC_ROLES.find((r) => r.role === m.minRole)?.label ?? m.minRole;
          return (
            <button
              key={m.n}
              type="button"
              disabled={locked}
              aria-disabled={locked}
              onClick={locked ? undefined : () => setOpenModule(m.n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 15,
                padding: "13px 8px",
                width: "100%",
                background: "transparent",
                border: "none",
                borderTop: "1px solid var(--ls-bbc-line)",
                cursor: locked ? "not-allowed" : "pointer",
                textAlign: "left",
                color: "var(--ls-bbc-text)",
                opacity: locked ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  flex: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--ls-bbc-font-mono)",
                  fontWeight: 800,
                  fontSize: 16,
                  background: bBg,
                  border: `1px solid ${badge}`,
                  color: badge,
                }}
              >
                {done ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-teal)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={CHECK} />
                  </svg>
                ) : (
                  m.n
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: locked ? "var(--ls-bbc-muted)" : "var(--ls-bbc-text)" }}>{m.title}</div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 2 }}>
                  {locked ? `se débloque à la marche « ${marcheRequise} »` : m.listLabel}
                </div>
              </div>
              {enCours ? (
                <span
                  style={{
                    fontFamily: "var(--ls-bbc-font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ls-bbc-lime-text)",
                    border: `1px solid ${tint("--ls-bbc-lime", 40)}`,
                    padding: "5px 10px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  à faire
                </span>
              ) : locked ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-hint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={LOCK} />
                </svg>
              ) : null}
              {locked ? null : (
                <span aria-hidden="true" style={{ fontSize: 16, color: "var(--ls-bbc-hint)" }}>
                  ›
                </span>
              )}
            </button>
          );
        })}

        <div style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--ls-bbc-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />
            le vocabulaire du club
          </div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 14 }}>
            Les mots qu'on emploie tous les matins, expliqués comme à un pote — du point de vue du coach.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {glossaire.map((g) => (
              <div key={g.t} style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ls-bbc-lime-text)" }}>{g.t}</div>
                <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 4, lineHeight: 1.5 }}>{g.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Fiche module ─────────────────────────────────────────────────── */}
      {openMod ? (
        <div
          onClick={() => setOpenModule(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bbc-mode"
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "var(--ls-bbc-s1)",
              border: "1px solid var(--ls-bbc-line2)",
              borderRadius: "24px 24px 0 0",
              padding: "20px 22px calc(24px + env(safe-area-inset-bottom))",
              color: "var(--ls-bbc-text)",
              fontFamily: "var(--ls-bbc-font-body)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, flex: "none", background: "var(--ls-bbc-lime)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 16, color: "var(--ls-bbc-lime-ink)" }}>
                {openMod.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, lineHeight: 1.1 }}>{openMod.title}</div>
                <div style={{ fontSize: 12, color: "var(--ls-bbc-lime-text)", marginTop: 2 }}>{openMod.subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModule(null)}
                aria-label="Fermer"
                style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15, flex: "none" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 14 }}>{openMod.summary}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {getModulePoints(openMod, clubSettings).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "11px 13px", borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
                  <span style={{ color: "var(--ls-bbc-lime)", flex: "none", fontWeight: 800 }}>•</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>

            {/* Ce qui manque, dit franchement : un module qui promet un déroulé
                qu'il n'a pas fait plus de dégâts qu'un module qui l'annonce. */}
            {openMod.todo ? (
              <div
                style={{
                  marginTop: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: tint("--ls-bbc-amber", 10),
                  border: `1px solid ${tint("--ls-bbc-amber", 30)}`,
                }}
              >
                <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-bbc-amber)", marginBottom: 5 }}>
                  à compléter
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ls-bbc-muted)" }}>{openMod.todo}</div>
              </div>
            ) : null}

            {/* « Fait » = le coach a coché, pas « la fiche a été ouverte » :
                ouvrir n'est pas dérouler, et c'est le même geste que le
                pré-lancement dans tout le mode BBC. */}
            {progress.available ? (
              <button
                type="button"
                onClick={() => void progress.toggle(openMod.n)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  marginTop: 14,
                  padding: "13px 15px",
                  borderRadius: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  background: progress.done[openMod.n] ? tint("--ls-bbc-lime", 7) : "var(--ls-bbc-s2)",
                  border: `1px solid ${progress.done[openMod.n] ? tint("--ls-bbc-lime", 28) : "var(--ls-bbc-line)"}`,
                  color: "var(--ls-bbc-text)",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: progress.done[openMod.n] ? "var(--ls-bbc-lime)" : "transparent",
                    border: `1px solid ${progress.done[openMod.n] ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
                    fontSize: 12,
                    fontWeight: 800,
                    color: progress.done[openMod.n] ? "var(--ls-bbc-lime-ink)" : "transparent",
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>J'ai déroulé ce module</span>
              </button>
            ) : null}

            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", textAlign: "center", marginTop: 14 }}>
              source · Notion Formation BBC {openMod.n}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
