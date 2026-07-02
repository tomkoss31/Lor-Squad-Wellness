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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { PvOverrideBlock, PvBizworksBlock } from "../distributor-blocks";
import { RANK_LABELS } from "../../types/domain";
import { currentMonthIso } from "../../lib/herbalifeFormulas";

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
  const navigate = useNavigate();
  // Ciblage d'un distri précis via ?member=<id> (raccourci depuis fiche distri /
  // drill-down) : on ouvre sa carte d'emblée + scroll dessus.
  const targetMember =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("member")
      : null;
  const [openId, setOpenId] = useState<string | null>(targetMember);

  // Sélecteur de mois : par défaut le mois passé en prop (= mois courant),
  // mais on peut remonter pour SAISIR un mois passé (ex. clôturer juin le 1er
  // juillet). Le breakdown par tier est stocké PAR MOIS → rétroactif propre.
  const nowMonth = currentMonthIso();
  const [selectedMonth, setSelectedMonth] = useState(monthIso || nowMonth);
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opts;
  }, []);
  const isPastMonth = selectedMonth !== nowMonth;

  // Consolidation 2026-07-02 : les distris HORS-APP (users.isExternal) sont
  // désormais éditables ICI, en ligne, avec le MÊME breakdown que les distris
  // de l'app (même table pv_monthly_breakdown, même RPC). Fini le saut vers
  // l'Arborescence pour saisir un PV → un seul endroit pour toute l'équipe.
  // L'Arborescence ne sert plus qu'à CONSTRUIRE la structure (créer/déplacer).
  const externals = useMemo(
    () =>
      users
        .filter((u) => u.isExternal)
        .map((u) => ({ user_id: u.id, name: u.name, current_rank: u.currentRank ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  );

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

      {/* Sélecteur de mois — SAISIR un mois passé (ex. clôturer juin le 1er juillet). */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label htmlFor="pv-team-month" style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text-muted)" }}>
          📅 Mois à saisir
        </label>
        <select
          id="pv-team-month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            flex: "0 1 220px",
            padding: "9px 12px",
            borderRadius: 10,
            background: "var(--ls-surface)",
            border: `1px solid ${isPastMonth ? "var(--ls-teal)" : "var(--ls-border)"}`,
            color: "var(--ls-text)",
            fontSize: 13.5,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {isPastMonth ? (
          <span style={{ fontSize: 12, color: "var(--ls-teal)", fontWeight: 700 }}>· mois passé (rétroactif)</span>
        ) : null}
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
                u.monthlyPvOverrideMonth === selectedMonth;
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
                      {u?.currentRank?.endsWith("_50") && u.rankSetAt && (
                        <span style={{ display: "block", fontSize: 11, color: "var(--ls-gold)", marginTop: 2 }}>
                          👑 {RANK_LABELS[u.currentRank] ?? "Superviseur"} depuis le{" "}
                          {new Date(u.rankSetAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
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
                      {isPastMonth ? (
                        // L'override pilote la jauge Co-pilote du MOIS COURANT
                        // uniquement → inutile/trompeur pour un mois passé. Pour
                        // clôturer un mois passé, on utilise le breakdown ci-dessous
                        // (stocké par mois, il alimente rang + qualif + commission).
                        <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", lineHeight: 1.5, padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2))", border: "1px solid var(--ls-border)" }}>
                          📅 Mois passé — saisis directement le <strong style={{ color: "var(--ls-text)" }}>breakdown / PV réel Bizworks</strong> ci-dessous (c'est lui qui est stocké par mois). L'« override jauge » ne concerne que le mois en cours.
                        </div>
                      ) : (
                        <PvOverrideBlock
                          memberId={m.user_id}
                          memberName={m.name}
                          initialOverride={u?.monthlyPvOverride ?? null}
                          initialOverrideMonth={u?.monthlyPvOverrideMonth ?? null}
                          onApplied={onApplied}
                        />
                      )}
                      <PvBizworksBlock
                        memberId={m.user_id}
                        memberName={m.name}
                        monthIso={selectedMonth}
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

      {/* ── Distributeurs hors-app — ÉDITABLES ICI (consolidation 2026-07-02)
          Même breakdown, même table que les distris de l'app. Plus besoin
          d'aller dans l'Arborescence pour saisir un PV. */}
      <section>
        <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700, margin: "0 2px 10px" }}>
          Distributeurs hors-app
        </div>
        {externals.length === 0 ? (
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
            Aucun distri hors-app pour l'instant. Ajoute-les via l'Arborescence ci-dessous.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {externals.map((m) => {
              const isOpen = openId === m.user_id;
              return (
                <div
                  key={m.user_id}
                  id={`pv-member-${m.user_id}`}
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--ls-border)",
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
                        <span style={{ fontSize: 10.5, color: "var(--ls-text-hint)", marginLeft: 7, fontWeight: 500 }}>hors-app</span>
                      </span>
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
                      <PvBizworksBlock
                        memberId={m.user_id}
                        memberName={m.name}
                        monthIso={selectedMonth}
                        onApplied={onApplied}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Arborescence démote en « construire la structure » (pas de saisie PV ici). */}
        <button
          type="button"
          onClick={() => navigate("/parametres/arborescence-herbalife")}
          style={{
            width: "100%",
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            textAlign: "left",
            padding: "11px 14px",
            borderRadius: 12,
            background: "transparent",
            border: "1px dashed var(--ls-border)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18 }}>🌳</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontWeight: 600, color: "var(--ls-text)", fontSize: 13 }}>
              Ajouter / déplacer un distri hors-app
            </span>
            <span style={{ display: "block", fontSize: 12, color: "var(--ls-text-muted)", marginTop: 1 }}>
              Construire l'arborescence (créer Virgile, Aurélie…, rattacher un parrain). La saisie PV, elle, se fait ici.
            </span>
          </span>
          <span aria-hidden="true" style={{ color: "var(--ls-text-muted)", fontWeight: 700 }}>→</span>
        </button>
      </section>
    </div>
  );
}
