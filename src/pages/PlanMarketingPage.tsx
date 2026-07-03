// =============================================================================
// PlanMarketingPage — « Plan Marketing » (chantier 2026-06-24)
//
// 1. L'échelle des rangs Herbalife (Distributor → President's Team), grande +
//    zoomable, visible par TOUS les distri, avec une flèche « Tu es là »
//    auto-positionnée sur le rang courant (users.currentRank).
// 2. (admin / référent) Ton organisation : l'arbre d'équipe avec le pin de
//    rang de chaque distributeur, zoomable.
//
// Réutilise RankPinBadge + RANK_ORDER/RANK_LABELS + les pièces d'arbre
// exportées par TeamPage (buildTreeFromRows, TreeLevel).
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { RankPinBadge } from "../components/rank/RankPinBadge";
import { RANK_ORDER, RANK_LABELS } from "../types/domain";
import type { HerbalifeRank } from "../types/domain";
import { useTeamTree } from "../hooks/useTeamData";
import { buildTreeFromRows, TreeLevel } from "./TeamPage";

// Critères clés (factuels, condensés) par rang — repère de progression.
// Seuils alignés sur docs/HERBALIFE_PALIERS_REGLES.md (MAJ 2026-06-09).
const RANK_REQ: Record<HerbalifeRank, string> = {
  distributor_25: "Ton point de départ · 25 % de remise.",
  senior_consultant_35: "250 PV sur 2 mois glissants.",
  success_builder_42: "1 000 PV / 3 mois (ou QP : 2 500 PV / 6 mois).",
  supervisor_50: "2 500 PV perso / 3 mois (rapide), ou 4 000 PV / 3–12 mois.",
  active_supervisor_50: "Superviseur avec volume maintenu sur 3 mois.",
  world_team_50: "2 500 PV ×4 mois, ou 10 000 / 1 mois, ou 500 RO.",
  active_world_team_50: "Volume d'organisation soutenu + 500 RO / mois.",
  get_team_50: "1 000 points de Royalty / 3 mois consécutifs.",
  get_team_2500_50: "2 500 points de Royalty / 3 mois consécutifs.",
  millionaire_50: "4 000 points de Royalty / 3 mois consécutifs.",
  millionaire_7500_50: "7 500 points de Royalty / 3 mois consécutifs.",
  presidents_50: "10 000 points de Royalty / 3 mois consécutifs.",
};

// Fiche éducative par rang (texte rédigé maison, factuel) pour la pop-up.
interface RankDetail { what: string; how: string; reward: string; tip?: string; royalty?: boolean; }
const RANK_DETAIL: Record<HerbalifeRank, RankDetail> = {
  distributor_25: {
    what: "Ton point d'entrée. Tu achètes tes produits à -25 % et tu peux déjà revendre au prix public.",
    how: "Automatique dès l'inscription — aucun volume requis.",
    reward: "25 % de marge sur chaque vente au prix conseillé.",
    tip: "Consomme tes produits + fais 1-2 ventes pour viser vite le 35 %.",
  },
  senior_consultant_35: {
    what: "Premier vrai palier de distributeur actif : 35 % de remise.",
    how: "250 PV cumulés sur 2 mois glissants consécutifs.",
    reward: "35 % de marge retail (au lieu de 25 %).",
    tip: "À requalifier chaque mois — garde un volume régulier.",
  },
  success_builder_42: {
    what: "Tu construis : 42 % de remise, le palier qui prépare le Superviseur.",
    how: "1 000 PV sur 3 mois glissants. Voie alternative : Qualified Producer = 2 500 PV sur 6 mois (donne aussi le 42 %).",
    reward: "42 % de marge + tu commences à gagner sur tes filleuls (écart de paliers).",
    tip: "La vitesse décide : 2 500 PV en 3 mois → Superviseur ; en 6 mois → seulement QP 42 %.",
  },
  supervisor_50: {
    what: "Le palier clé : 50 % de remise + entrée dans la TAB Team (Royalty Override sur ton organisation).",
    how: "Voie rapide : 2 500 PV perso sur 3 mois. Voie étendue : 4 000 PV sur 3 à 12 mois glissants (4 000 en 1 mois = méthode TAB).",
    reward: "50 % de marge + 5 % de Royalty Override sur 3 niveaux de Superviseurs en downline.",
    tip: "Statut annuel : à requalifier (4 000 PV / 12 mois) pour rester Superviseur.",
    royalty: true,
  },
  active_supervisor_50: {
    what: "Superviseur actif : ton volume est maintenu, tu ouvres les bonus d'organisation.",
    how: "Rester Superviseur avec un volume d'activité maintenu sur 3 mois.",
    reward: "Tu restes éligible aux Royalty Override et tu prépares les Production Bonus.",
    royalty: true,
  },
  world_team_50: {
    what: "Premier palier de reconnaissance d'organisation : World Team.",
    how: "2 500 PV ×4 mois, OU 10 000 PV en 1 mois, OU 500 points de Royalty en 1 mois.",
    reward: "Reconnaissance, accès aux événements, base pour les Production Bonus.",
    tip: "Vise la régularité du volume d'équipe pour enchaîner vers le G.E.T.",
    royalty: true,
  },
  active_world_team_50: {
    what: "World Team actif : volume d'organisation soutenu dans la durée.",
    how: "Volume soutenu (ex. 2 500 PV ×2 mois, 5 000 / 2 mois, ou 10 000 / 1 mois) + 500 points de Royalty / mois.",
    reward: "Éligibilité Production Bonus et montée vers le G.E.T.",
    royalty: true,
  },
  get_team_50: {
    what: "Global Expansion Team (G.E.T.) : tu débloques 2 % de Production Bonus sur ton organisation mondiale.",
    how: "1 000 points de Royalty sur 3 mois consécutifs.",
    reward: "+2 % de Production Bonus, en plus des 5 % de Royalty Override.",
    tip: "Développe des Superviseurs leaders dans ta downline — ce sont eux qui font monter tes points de Royalty.",
    royalty: true,
  },
  get_team_2500_50: {
    what: "G.E.T. 2500 : palier intermédiaire vers le Millionaire (toujours 2 % de bonus).",
    how: "2 500 points de Royalty sur 3 mois consécutifs.",
    reward: "2 % de Production Bonus consolidé sur un volume plus important.",
    royalty: true,
  },
  millionaire_50: {
    what: "Millionaire Team : 4 % de Production Bonus. Tu pilotes une organisation à fort volume.",
    how: "4 000 points de Royalty sur 3 mois consécutifs.",
    reward: "+4 % de Production Bonus + revenus récurrents significatifs.",
    tip: "Duplique des Superviseurs et des G.E.T. dans ta downline pour faire grimper les RO.",
    royalty: true,
  },
  millionaire_7500_50: {
    what: "Millionaire 7500 : 4 % de bonus sur un très gros volume, avant-dernière marche.",
    how: "7 500 points de Royalty sur 3 mois consécutifs.",
    reward: "4 % de Production Bonus sur une organisation majeure.",
    royalty: true,
  },
  presidents_50: {
    what: "Le sommet : President's Team. 6 % de Production Bonus — l'élite Herbalife.",
    how: "10 000 points de Royalty sur 3 mois consécutifs.",
    reward: "+6 % de Production Bonus + accès aux cercles supérieurs (Chairman's Club, Founder's Circle).",
    tip: "Construis plusieurs lignes de Millionaires : les points de Royalty se cumulent sur toute l'organisation.",
    royalty: true,
  },
};

// Explication transverse des points de Royalty (affichée pour les paliers ≥ Sup).
const ROYALTY_NOTE =
  "Les points de Royalty (Royalty Override) viennent du volume mensuel de tes Superviseurs en downline (jusqu'à 3 niveaux). Plus tu développes de Superviseurs actifs, plus tes points de Royalty montent — ce sont eux qui ouvrent les paliers G.E.T. → Millionaire → President's.";

function ZoomBar({ zoom, setZoom }: { zoom: number; setZoom: (z: number) => void }) {
  const clamp = (z: number) => Math.min(1.6, Math.max(0.6, Math.round(z * 10) / 10));
  const btn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 10, border: "1px solid var(--ls-border)",
    background: "var(--ls-surface)", color: "var(--ls-text)", cursor: "pointer",
    fontSize: 18, lineHeight: 1, fontFamily: "Syne, sans-serif", fontWeight: 700,
  };
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" aria-label="Dézoomer" style={btn} onClick={() => setZoom(clamp(zoom - 0.1))}>−</button>
      <span style={{ minWidth: 46, textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif" }}>{Math.round(zoom * 100)}%</span>
      <button type="button" aria-label="Zoomer" style={btn} onClick={() => setZoom(clamp(zoom + 0.1))}>＋</button>
      <button type="button" style={{ ...btn, width: "auto", padding: "0 12px", fontSize: 12.5 }} onClick={() => setZoom(1)}>Reset</button>
    </div>
  );
}

export function PlanMarketingPage() {
  const { currentUser, users } = useAppContext();
  // « Ma lignée » : visible par les distri / référents (ils n'ont pas « Mon
  // équipe »), masquée pour l'admin qui a déjà l'arbre complet dans Mon équipe.
  const showLineage = currentUser != null && currentUser.role !== "admin";

  const myRank: HerbalifeRank = currentUser?.currentRank ?? "distributor_25";
  const myIndex = RANK_ORDER.indexOf(myRank);

  const [ladderZoom, setLadderZoom] = useState(1);
  const [treeZoom, setTreeZoom] = useState(1);
  const [openRank, setOpenRank] = useState<HerbalifeRank | null>(null);

  // Échelle affichée du plus haut (en haut) au plus bas (on grimpe).
  const ladder = useMemo(() => [...RANK_ORDER].reverse(), []);

  // Ma lignée : arbre enraciné sur le user courant + map des rangs pour les pins.
  const { rows, loading: treeLoading } = useTeamTree(showLineage && currentUser ? currentUser.id : null);
  const tree = useMemo(
    () => (currentUser && rows.length ? buildTreeFromRows(rows, currentUser.id) : null),
    [rows, currentUser],
  );
  const rankByUserId = useMemo(() => {
    const m = new Map<string, HerbalifeRank | null | undefined>();
    for (const u of users) m.set(u.id, u.currentRank ?? null);
    return m;
  }, [users]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "4px 4px 90px" }}>
      <style>{`
        .team-tree {
          --ls-tree-line: color-mix(in srgb, var(--ls-teal) 34%, var(--ls-border));
          padding: 30px 18px 24px; border-radius: 18px;
          background:
            radial-gradient(130% 70% at 50% -8%, color-mix(in srgb, var(--ls-gold) 7%, transparent), transparent 58%),
            radial-gradient(70% 60% at 100% 112%, color-mix(in srgb, var(--ls-purple) 6%, transparent), transparent 60%),
            radial-gradient(70% 60% at 0% 112%, color-mix(in srgb, var(--ls-teal) 6%, transparent), transparent 60%);
        }
        .team-tree .ls-org-root { display: flex; flex-direction: column; align-items: center; width: max-content; min-width: 100%; }
        .team-tree .ls-org-row { display: flex; justify-content: center; padding-top: 28px; position: relative; }
        .team-tree .ls-org-row::before { content: ""; position: absolute; top: 0; left: 50%; transform: translateX(-1px); width: 2px; height: 28px; background: linear-gradient(to bottom, color-mix(in srgb, var(--ls-teal) 55%, transparent), var(--ls-tree-line)); border-radius: 2px; }
        .team-tree .ls-org-item { position: relative; padding: 28px 10px 0; display: flex; flex-direction: column; align-items: center; }
        .team-tree .ls-org-item::before, .team-tree .ls-org-item::after { content: ""; position: absolute; top: 0; right: 50%; width: 50%; height: 28px; border-top: 2px solid var(--ls-tree-line); }
        .team-tree .ls-org-item::after { right: auto; left: 50%; border-left: 2px solid var(--ls-tree-line); }
        .team-tree .ls-org-item:only-child { padding-top: 0; }
        .team-tree .ls-org-item:only-child::before, .team-tree .ls-org-item:only-child::after { display: none; }
        .team-tree .ls-org-item:first-child::before, .team-tree .ls-org-item:last-child::after { border: 0 none; }
        .team-tree .ls-org-item:first-child::after { border-radius: 9px 0 0 0; }
        .team-tree .ls-org-item:last-child::before { border-right: 2px solid var(--ls-tree-line); border-radius: 0 9px 0 0; }
      `}</style>

      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.4, textTransform: "uppercase", color: "var(--ls-text-muted)" }}>
        La Base 360 · Herbalife
      </div>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.02, letterSpacing: "-1.5px", margin: "6px 0 0", color: "var(--ls-text)" }}>
        <span style={{ background: "linear-gradient(100deg, var(--ls-gold), var(--ls-teal))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>Plan Marketing</span>
      </h1>
      <p style={{ margin: "8px 0 24px", color: "var(--ls-text-muted)", fontSize: 15, maxWidth: 560, fontFamily: "DM Sans, sans-serif" }}>
        Le chemin des rangs Herbalife, du Distributor au President's Team. Repère où tu en es et le prochain palier à viser.
      </p>

      {/* ── SECTION A : l'échelle ───────────────────────────────────────── */}
      <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 22, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "var(--ls-text)" }}>🏔️ L'échelle des rangs</div>
            <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Tu es <b style={{ color: "var(--ls-gold)" }}>{RANK_LABELS[myRank]}</b>
              {myIndex < RANK_ORDER.length - 1 ? <> · prochain : <b>{RANK_LABELS[RANK_ORDER[myIndex + 1]]}</b></> : " · sommet atteint 🏆"}
            </div>
          </div>
          <ZoomBar zoom={ladderZoom} setZoom={setLadderZoom} />
        </div>

        <div style={{ overflow: "auto", padding: "8px 2px 4px" }}>
          <div style={{ transform: `scale(${ladderZoom})`, transformOrigin: "top center", transition: "transform 160ms ease-out", display: "flex", flexDirection: "column", gap: 10, maxWidth: 640, margin: "0 auto" }}>
            {ladder.map((rank) => {
              const idx = RANK_ORDER.indexOf(rank);
              const isCurrent = idx === myIndex;
              const achieved = idx < myIndex;
              const tone = isCurrent ? "var(--ls-gold)" : achieved ? "var(--ls-teal)" : "var(--ls-border)";
              return (
                <button
                  key={rank}
                  type="button"
                  onClick={() => setOpenRank(rank)}
                  title={`En savoir plus : ${RANK_LABELS[rank]}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, textAlign: "left", width: "100%", cursor: "pointer",
                    padding: "10px 14px", borderRadius: 16,
                    background: isCurrent
                      ? "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface))"
                      : achieved ? "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface))" : "var(--ls-surface2)",
                    border: `1px solid ${isCurrent ? "color-mix(in srgb, var(--ls-gold) 55%, transparent)" : "var(--ls-border)"}`,
                    boxShadow: isCurrent ? "0 10px 26px -10px color-mix(in srgb, var(--ls-gold) 55%, transparent)" : "none",
                    opacity: achieved || isCurrent ? 1 : 0.72,
                    transition: "transform 140ms ease-out, box-shadow 140ms ease-out",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 20px -10px rgba(0,0,0,0.28)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = isCurrent ? "0 10px 26px -10px color-mix(in srgb, var(--ls-gold) 55%, transparent)" : "none"; }}
                >
                  <RankPinBadge rank={rank} size={isCurrent ? "lg" : "md"} glow={isCurrent} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: isCurrent ? 17 : 14.5, color: "var(--ls-text)" }}>{RANK_LABELS[rank]}</span>
                      {isCurrent ? (
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: "#1a1407", background: "var(--ls-gold)", padding: "2px 10px", borderRadius: 999 }}>⬅ Tu es là</span>
                      ) : achieved ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-teal)" }}>✓ atteint</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 3, lineHeight: 1.4 }}>{RANK_REQ[rank]}</div>
                  </div>
                  <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 700, color: "var(--ls-teal)", whiteSpace: "nowrap" }}>En savoir + ›</span>
                  <div aria-hidden="true" style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: tone, minHeight: 40 }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION B : ma lignée (distri / référents — pas l'admin) ─────── */}
      {showLineage ? (
        <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 22, padding: 20, marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "var(--ls-text)" }}>🌳 Ma lignée · pins de rang</div>
              <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 2 }}>Ton organisation à toi. Le pin en haut de chaque card = son rang dans le plan.</div>
            </div>
            <ZoomBar zoom={treeZoom} setZoom={setTreeZoom} />
          </div>

          {treeLoading && !tree ? (
            <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>Chargement de ta lignée…</div>
          ) : tree && tree.children.length > 0 ? (
            <div style={{ overflow: "auto" }}>
              <div className="team-tree" style={{ transform: `scale(${treeZoom})`, transformOrigin: "top center", transition: "transform 160ms ease-out" }}>
                <TreeLevel node={tree} isRoot rankByUserId={rankByUserId} selectedId={null} onSelect={() => {}} />
              </div>
            </div>
          ) : (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13, lineHeight: 1.5 }}>
              🌱 Tu n'as pas encore de filleuls dans ton organisation.<br />Recrute ton 1er distributeur pour faire grandir ta lignée.
            </div>
          )}
        </div>
      ) : null}

      {/* ── Pop-up éducatif d'un rang ───────────────────────────────────── */}
      {openRank ? (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          role="dialog"
          aria-modal="true"
          aria-label={RANK_LABELS[openRank]}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenRank(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9000, background: "color-mix(in srgb, var(--ls-bg) 72%, transparent)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 12px", fontFamily: "DM Sans, sans-serif" }}
        >
          <div style={{ width: "100%", maxWidth: 480, maxHeight: "90dvh", overflowY: "auto", background: "var(--ls-surface)", border: "1px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))", borderRadius: 24, boxShadow: "0 28px 70px -20px rgba(0,0,0,0.55)" }}>
            {/* En-tête : gros pin + nom */}
            <div style={{ position: "relative", textAlign: "center", padding: "26px 20px 20px", background: "radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--ls-gold) 16%, transparent), transparent 60%)", borderRadius: "24px 24px 0 0" }}>
              <button type="button" onClick={() => setOpenRank(null)} aria-label="Fermer" style={{ position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: 999, border: "1px solid var(--ls-border)", background: "var(--ls-surface2)", color: "var(--ls-text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RankPinBadge rank={openRank} size="xl" glow />
              </div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: "var(--ls-text)", marginTop: 12, letterSpacing: "-0.02em" }}>{RANK_LABELS[openRank]}</div>
              {openRank === myRank ? (
                <span style={{ display: "inline-block", marginTop: 6, fontSize: 11.5, fontWeight: 800, color: "#1a1407", background: "var(--ls-gold)", padding: "3px 12px", borderRadius: 999 }}>⬅ Ton rang actuel</span>
              ) : null}
            </div>

            <div style={{ padding: "4px 22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {([
                ["🎯 C'est quoi ?", RANK_DETAIL[openRank].what],
                ["🧗 Comment l'atteindre ?", RANK_DETAIL[openRank].how],
                ["💰 Ce que ça t'apporte", RANK_DETAIL[openRank].reward],
                ...(RANK_DETAIL[openRank].tip ? [["💡 Astuce", RANK_DETAIL[openRank].tip as string]] : []),
              ] as Array<[string, string]>).map(([title, body]) => (
                <div key={title}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13.5, color: "var(--ls-text)", marginBottom: 4 }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: "var(--ls-text-muted)", lineHeight: 1.55 }}>{body}</div>
                </div>
              ))}

              {RANK_DETAIL[openRank].royalty ? (
                <div style={{ padding: "12px 14px", borderRadius: 14, background: "color-mix(in srgb, var(--ls-purple) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-purple) 28%, transparent)" }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12.5, color: "var(--ls-purple)", marginBottom: 4 }}>📈 Les points de Royalty</div>
                  <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>{ROYALTY_NOTE}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
