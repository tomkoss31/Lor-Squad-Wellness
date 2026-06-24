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
const RANK_REQ: Record<HerbalifeRank, string> = {
  distributor_25: "Ton point de départ · 25 % de remise.",
  senior_consultant_35: "500 PV cumulés (1 à 2 mois).",
  success_builder_42: "1 000 PV / 3 mois (ou Qualified Producer 2 500).",
  supervisor_50: "4 000 PV en 1 mois, ou 2 500 ×2 mois consécutifs.",
  active_supervisor_50: "2 500 PV de volume total sur 3 mois.",
  world_team_50: "2 500 PV ×4 mois, ou 10 000 / 1 mois, ou 500 RO.",
  active_world_team_50: "Volume soutenu + 500 points de Royalty / mois.",
  get_team_50: "1 000 points de Royalty / 3 mois consécutifs.",
  get_team_2500_50: "2 500 points de Royalty / 3 mois.",
  millionaire_50: "4 000 points de Royalty / 3 mois.",
  millionaire_7500_50: "7 500 points de Royalty / 3 mois.",
  presidents_50: "10 000 points de Royalty / 3 mois consécutifs.",
};

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
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "referent";

  const myRank: HerbalifeRank = currentUser?.currentRank ?? "distributor_25";
  const myIndex = RANK_ORDER.indexOf(myRank);

  const [ladderZoom, setLadderZoom] = useState(1);
  const [treeZoom, setTreeZoom] = useState(1);

  // Échelle affichée du plus haut (en haut) au plus bas (on grimpe).
  const ladder = useMemo(() => [...RANK_ORDER].reverse(), []);

  // Org admin : arbre enraciné sur le user courant + map des rangs pour les pins.
  const { rows, loading: treeLoading } = useTeamTree(isAdmin && currentUser ? currentUser.id : null);
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
      <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.02, letterSpacing: "-1.5px", margin: "6px 0 0", color: "var(--ls-text)" }}>
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
                <div
                  key={rank}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "10px 14px", borderRadius: 16,
                    background: isCurrent
                      ? "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface))"
                      : achieved ? "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface))" : "var(--ls-surface2)",
                    border: `1px solid ${isCurrent ? "color-mix(in srgb, var(--ls-gold) 55%, transparent)" : "var(--ls-border)"}`,
                    boxShadow: isCurrent ? "0 10px 26px -10px color-mix(in srgb, var(--ls-gold) 55%, transparent)" : "none",
                    opacity: achieved || isCurrent ? 1 : 0.72,
                  }}
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
                  <div aria-hidden="true" style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: tone, minHeight: 40 }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION B : mon organisation (admin / référent) ─────────────── */}
      {isAdmin ? (
        <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 22, padding: 20, marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "var(--ls-text)" }}>🌳 Mon organisation · pins de rang</div>
              <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 2 }}>Visible par les admins. Le pin en haut de chaque card = son rang dans le plan.</div>
            </div>
            <ZoomBar zoom={treeZoom} setZoom={setTreeZoom} />
          </div>

          {treeLoading && !tree ? (
            <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>Chargement de l'organisation…</div>
          ) : tree ? (
            <div style={{ overflow: "auto" }}>
              <div className="team-tree" style={{ transform: `scale(${treeZoom})`, transformOrigin: "top center", transition: "transform 160ms ease-out" }}>
                <TreeLevel node={tree} isRoot rankByUserId={rankByUserId} selectedId={null} onSelect={() => {}} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>Organisation indisponible pour l'instant.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
