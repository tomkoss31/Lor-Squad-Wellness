// =============================================================================
// RentabilityPvTeamTab — onglet « PV équipe » de /rentabilite (2026-06-14).
//
// Chantier consolidation PV (décision Thomas) : UN seul endroit pour mettre à
// jour les PV de toute l'équipe, au lieu des 4 portes éclatées (fiche distri,
// drill-down équipe, Paramètres > Équipe, saisie manuelle).
//
// ⚠️ 100 % PRÉSENTATION : ce composant ne fait QUE réassembler des briques
// existantes — `PvOverrideBlock`, `PvBizworksBlock` (distri de l'app) et
// `ManualPvEntriesSection` (distri hors-app). AUCUNE logique de calcul PV /
// paliers / qualification n'est touchée (formules Herbalife inchangées).
// =============================================================================

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { PvOverrideBlock, PvBizworksBlock } from "../distributor-blocks";
import { ManualPvEntriesSection } from "./ManualPvEntriesSection";

interface PvTeamMember {
  user_id: string;
  name: string;
  current_rank?: string | null;
}

export function RentabilityPvTeamTab({
  members,
  monthIso,
  onApplied,
}: {
  members: PvTeamMember[];
  monthIso: string;
  onApplied?: () => void;
}) {
  const { users } = useAppContext();
  // Ciblage d'un distri précis via ?member=<id> (raccourci depuis fiche distri /
  // drill-down) : on ouvre sa carte d'emblée + scroll dessus.
  const targetMember =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("member")
      : null;
  const [openId, setOpenId] = useState<string | null>(targetMember);

  useEffect(() => {
    if (!targetMember) return;
    const el = document.getElementById(`pv-member-${targetMember}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [targetMember]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Intro */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 16,
          background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
          border: "1px solid color-mix(in srgb, var(--ls-teal) 28%, var(--ls-border))",
        }}
      >
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ls-text)", marginBottom: 4 }}>
          📊 Gestion des PV de l'équipe
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
          Le seul endroit pour mettre à jour les PV : <strong style={{ color: "var(--ls-text)" }}>distri de l'app</strong> (override
          Bizworks par membre) et <strong style={{ color: "var(--ls-text)" }}>distri hors-app</strong> (saisie manuelle + remise selon
          le rang). Les ventes in-app remontent automatiquement.
        </div>
      </div>

      {/* ── Distributeurs de l'app ─────────────────────────────────────── */}
      <section>
        <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700, margin: "0 2px 10px" }}>
          Distributeurs de l'app
        </div>
        {members.length === 0 ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: "var(--ls-text-muted)",
              fontSize: 13,
              fontStyle: "italic",
              background: "var(--ls-surface2)",
              borderRadius: 12,
              border: "1px dashed var(--ls-border)",
            }}
          >
            Aucun distributeur dans ton équipe (app) ce mois.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => {
              const u = users.find((x) => x.id === m.user_id);
              const isOpen = openId === m.user_id;
              const isTarget = targetMember === m.user_id;
              const hasOverride =
                typeof u?.monthlyPvOverride === "number" &&
                u.monthlyPvOverrideMonth === monthIso;
              return (
                <div
                  key={m.user_id}
                  id={`pv-member-${m.user_id}`}
                  style={{
                    borderRadius: 14,
                    border: isTarget
                      ? "1px solid color-mix(in srgb, var(--ls-teal) 55%, transparent)"
                      : "1px solid var(--ls-border)",
                    background: "var(--ls-surface)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : m.user_id)}
                    aria-expanded={isOpen}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
                        {m.name}
                      </span>
                      {hasOverride && (
                        <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-teal)", marginTop: 2 }}>
                          Override ce mois : {u?.monthlyPvOverride} PV
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{ fontSize: 12, color: "var(--ls-text-muted)", transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "none" }}
                    >
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 14px 14px" }}>
                      <PvOverrideBlock
                        memberId={m.user_id}
                        memberName={m.name}
                        initialOverride={u?.monthlyPvOverride ?? null}
                        initialOverrideMonth={u?.monthlyPvOverrideMonth ?? null}
                        onApplied={onApplied}
                      />
                      <PvBizworksBlock
                        memberId={m.user_id}
                        memberName={m.name}
                        monthIso={monthIso}
                        onApplied={onApplied}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Distributeurs hors-app (saisie manuelle + remise) ──────────── */}
      <section>
        <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700, margin: "0 2px 10px" }}>
          Distributeurs hors-app
        </div>
        <ManualPvEntriesSection />
      </section>
    </div>
  );
}
