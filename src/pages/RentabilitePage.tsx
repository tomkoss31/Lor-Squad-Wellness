// =============================================================================
// RentabilitePage — Refonte Premium V2 (chantier 2026-05-20)
//
// Architecture éditoriale numérotée selon design Claude :
//   - Top bar : breadcrumb + Mode RDV + "Analyse détaillée"
//   - HERO : WalletCard premium en hero + 3 stats cards (Ce mois / Projection / Best)
//   - Section 01 — Le calcul : flowchart CA × Marge = Directe + 2 OverrideCard + Total net (border-gradient)
//   - Section 02 — Mon équipe : grid TeamCard avec MiniBar contribution
//   - Section 03 — Top clients : podium #1/#2/#3 + ClientRow #4/#5
//
// Tokens : namespace `.lr` (rentabilite.css) — indépendant de la palette
// principale --ls-*. Light/dark adaptatif via html.theme-light.
//
// Rollback : `git show HEAD~1:src/pages/RentabilitePage.tsx` pour l'ancien.
// =============================================================================

import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useUserRentability } from "../hooks/useUserRentability";
import { useTeamEngagement } from "../hooks/useTeamEngagement";
import { RentabilityDetailModal } from "../components/rentability/RentabilityDetailModal";
import { RentabilityWalletCard } from "../components/rentability/RentabilityWalletCard";
import { RentabilitySankeyFlow } from "../components/rentability/RentabilitySankeyFlow";
import { resolveCoupleUserIds } from "../config/teamConfig";
import { usePvBreakdowns } from "../hooks/usePvBreakdowns";
import { useManualPvEntries } from "../hooks/useManualPvEntries";
import { useStealthMode } from "../hooks/useStealthMode";
import { ManualPvEntriesSection } from "../components/rentability/ManualPvEntriesSection";
import {
  computeManualEntriesOverride,
  computeOwnSelfMargin,
  computeViewerDownlineOverride,
  computeViewerOverridePerMember,
  currentMonthIso,
  tierPctForRank,
} from "../lib/herbalifeFormulas";
import { Avatar, avatarHue, initialsOf } from "../components/rentability/shared/Avatar";
import { Sparkline } from "../components/rentability/shared/Sparkline";
import { useCountUp } from "../components/rentability/shared/useCountUp";
import type { RentabilityTopClient } from "../hooks/useUserRentability";

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    const f = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    return f.charAt(0).toUpperCase() + f.slice(1);
  } catch {
    return "";
  }
}

function prevMonthShort(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() - 1);
    return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(d).replace(".", "");
  } catch {
    return "M-1";
  }
}

function computeOwnMargin(
  data: { scope_user_ids: string[]; margin_eur: number } | null,
  breakdowns: import("../lib/herbalifeFormulas").PvMonthlyBreakdown[],
  users: Array<{ id: string; currentRank?: import("../types/domain").HerbalifeRank }>,
): number {
  if (!data) return 0;
  let total = 0;
  let any = false;
  for (const ownerId of data.scope_user_ids) {
    const b = breakdowns.find((br) => br.userId === ownerId);
    if (b) {
      const owner = users.find((u) => u.id === ownerId);
      total += computeOwnSelfMargin(b, tierPctForRank(owner?.currentRank));
      any = true;
    }
  }
  return any ? Math.max(total, data.margin_eur) : data.margin_eur;
}

export function RentabilitePage() {
  const navigate = useNavigate();
  const { currentUser, users, pvClientProducts } = useAppContext();
  const { data: ownData, loading: ownLoading, isCoupleAggregated } = useUserRentability(currentUser?.id ?? null);
  const { members } = useTeamEngagement(currentUser?.id ?? null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { data: selectedData } = useUserRentability(selectedMemberId);
  const [detailOpen, setDetailOpen] = useState(false);
  const [calcView, setCalcView] = useState<"classic" | "flow">("classic");
  const { stealthOn, toggle: toggleStealth } = useStealthMode();

  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns } = usePvBreakdowns(monthIso);

  // ─── PV app réel par membre (mois courant) ───────────────────────────────
  // Source : pvClientProducts — LA MÊME table (pv_client_products) que la RPC
  // get_users_rentability qui produit la marge affichée (les 119€). Mêmes
  // filtres : produit actif + start_date dans le mois courant. PV = pv_per_unit
  // × quantité. Sert de fallback au calcul d'override quand aucun breakdown
  // Bizworks manuel n'a été saisi → les ventes app remontent automatiquement
  // dans les royalties de l'upline, génériquement pour tout l'arbre.
  const memberPvMonthMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pvClientProducts) {
      if (!p.active) continue;
      if ((p.startDate ?? "").slice(0, 7) !== monthIso) continue;
      const pv = (p.pvPerUnit || 0) * (p.quantityStart || 0);
      if (pv <= 0) continue;
      map.set(p.responsibleId, (map.get(p.responsibleId) ?? 0) + pv);
    }
    return map;
  }, [pvClientProducts, monthIso]);

  const fallbackOverrideForUser = useCallback(
    (uid: string): { totalPv: number; tierPct: number } | null => {
      const pv = memberPvMonthMap.get(uid) ?? 0;
      if (pv <= 0) return null;
      const u = users.find((x) => x.id === uid);
      return { totalPv: pv, tierPct: tierPctForRank(u?.currentRank) };
    },
    [memberPvMonthMap, users],
  );

  // Override du viewer ventilé par membre (multi-niveaux correct). Le total
  // est la somme des contributions ; chaque card lit sa propre part.
  const ownOverridePerMember = useMemo(() => {
    if (!ownData || !currentUser) return new Map<string, number>();
    return computeViewerOverridePerMember(
      ownData.scope_user_ids,
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
      breakdowns,
      fallbackOverrideForUser,
    );
  }, [ownData, currentUser, users, breakdowns, fallbackOverrideForUser]);

  const ownDownlineOverride = useMemo(() => {
    let sum = 0;
    for (const v of ownOverridePerMember.values()) sum += v;
    return sum;
  }, [ownOverridePerMember]);

  const ownSelfMargin = useMemo(
    () => computeOwnMargin(ownData, breakdowns, users),
    [ownData, breakdowns, users],
  );

  const { entries: manualEntries } = useManualPvEntries(
    ownData?.scope_user_ids ?? null,
    monthIso,
  );
  const ownManualOverride = useMemo(() => {
    if (!currentUser) return 0;
    return computeManualEntriesOverride(manualEntries, tierPctForRank(currentUser.currentRank));
  }, [manualEntries, currentUser]);

  const totalMargin = ownSelfMargin + ownDownlineOverride + ownManualOverride;
  const ownDataWithOverride = useMemo(() => {
    if (!ownData) return null;
    if (totalMargin === ownData.margin_eur) return ownData;
    const ratio = ownData.margin_eur > 0 ? totalMargin / ownData.margin_eur : 1;
    return {
      ...ownData,
      margin_eur: totalMargin,
      projection_eur: ownData.projection_eur * ratio,
    };
  }, [ownData, totalMargin]);

  // Sélection membre équipe (admin viewing other)
  const selectedDownlineOverride = useMemo(() => {
    if (!selectedData || !currentUser) return 0;
    return computeViewerDownlineOverride(
      selectedData.scope_user_ids,
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
      breakdowns,
      fallbackOverrideForUser,
    );
  }, [selectedData, currentUser, users, breakdowns, fallbackOverrideForUser]);
  const selectedSelfMargin = useMemo(
    () => computeOwnMargin(selectedData, breakdowns, users),
    [selectedData, breakdowns, users],
  );
  const selectedDataWithOverride = useMemo(() => {
    if (!selectedData) return null;
    const newMargin = selectedSelfMargin + selectedDownlineOverride;
    if (newMargin === selectedData.margin_eur) return selectedData;
    const ratio = selectedData.margin_eur > 0 ? newMargin / selectedData.margin_eur : 1;
    return {
      ...selectedData,
      margin_eur: newMargin,
      projection_eur: selectedData.projection_eur * ratio,
    };
  }, [selectedData, selectedSelfMargin, selectedDownlineOverride]);

  const isAdminOrRef = currentUser?.role === "admin" || currentUser?.role === "referent";
  const otherMembers = useMemo(() => {
    if (!isAdminOrRef || !currentUser) return [];
    const coupleIds = isCoupleAggregated ? resolveCoupleUserIds(users) : [currentUser.id];
    const excludeSet = new Set(coupleIds);
    const fromEngagement = members.filter((m) => !excludeSet.has(m.user_id));
    // Chantier "frozen contributifs" 2026-05-22 : un distri gelé (Prisca/Alex)
    // n'apparaît pas dans get_team_engagement (RPC filtre les inactifs) mais
    // s'il a un breakdown PV saisi ce mois, ses royalties remontent à Thomas.
    // On le réintègre côté front pour qu'il soit visible dans la grid team.
    const knownIds = new Set(fromEngagement.map((m) => m.user_id));
    const frozenContrib = users
      .filter((u) =>
        !excludeSet.has(u.id) &&
        !knownIds.has(u.id) &&
        u.frozenAt &&
        breakdowns.some((b) =>
          b.userId === u.id &&
          ((b.pv15 ?? 0) + (b.pv25 ?? 0) + (b.pv35 ?? 0) + (b.pv42 ?? 0) + (b.pvRoyalty ?? 0)) > 0,
        ),
      )
      .map((u) => ({
        user_id: u.id,
        name: u.name,
        role: u.role,
        current_rank: u.currentRank ?? null,
        parent_id: u.sponsorId ?? null,
        depth: 1,
        xp_total: 0, xp_level: 0, xp_academy: 0, xp_bilans: 0, xp_rdv: 0, xp_messages: 0, xp_formation: 0, xp_daily: 0,
        academy_step: 0, academy_total_sections: 0, academy_percent: 0, academy_completed_at: null,
        formation_validated_n1: 0, formation_validated_n2: 0, formation_validated_n3: 0,
        formation_pending: 0, formation_total_validated: 0,
        bilans_30d: 0, rdv_30d: 0, messages_7d: 0,
        last_seen_at: null, lifetime_login_count: 0,
        status: "decroche" as const,
      }));
    return [...fromEngagement, ...frozenContrib];
  }, [members, isAdminOrRef, currentUser, isCoupleAggregated, users, breakdowns]);

  // ─── Count-up values pour les 3 stats hero ─────────────────────────────
  const animTotal = useCountUp(Math.round(totalMargin), { duration: 900 });
  const animProj = useCountUp(Math.round((ownDataWithOverride?.projection_eur ?? totalMargin) || 0), { delay: 200 });

  if (!currentUser) return null;

  const monthIsoStr = ownData?.month_start ?? "";
  const month = monthLabel(monthIsoStr);
  const prevMonth = prevMonthShort(monthIsoStr);
  const delta = Math.round(totalMargin - (ownData?.prev_month_eur ?? 0));
  const deltaPct =
    ownData && ownData.prev_month_eur > 0
      ? Math.round((delta / ownData.prev_month_eur) * 100)
      : 0;
  const daysLeft = ownData ? ownData.days_in_month - ownData.days_elapsed : 0;
  const projAhead = (ownDataWithOverride?.projection_eur ?? 0) > (ownData?.prev_month_eur ?? 0);

  // Spark fake (à brancher quand RPC history dispo) — 6 derniers mois,
  // approx via prev_month_eur et progression linéaire.
  const sparkData = useMemo(() => {
    const last = Math.round(ownData?.prev_month_eur ?? 0);
    const cur = Math.round(totalMargin);
    if (last === 0 && cur === 0) return [0, 0, 0, 0, 0, 0];
    return [last * 0.7, last * 0.85, last * 0.9, last, cur * 0.6, cur];
  }, [ownData, totalMargin]);

  return (
    <div className={`lr ${stealthOn ? "lr-stealth-on" : ""}`} style={pageWrapStyle}>
      <style>{`
        /* Mobile fit /rentabilite — chantier #13 polish 2026-05-22 */
        @media (max-width: 720px) {
          .lr-rentab-page-top { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .lr-rentab-hero { padding: 22px 18px 18px !important; border-radius: 22px !important; }
          .lr-rentab-stats-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .lr-rentab-calc-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .lr-rentab-override-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .lr-rentab-team-grid { grid-template-columns: 1fr !important; }
          .lr .lr-section-h { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>
      {/* ─── Top bar ──────────────────────────────────────────────────── */}
      <div className="lr-rentab-page-top" style={topBarStyle}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "var(--ls-rentab-ink-3)" }}>
          <button
            type="button"
            onClick={() => navigate("/co-pilote")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--ls-rentab-ink-2)",
              fontWeight: 600,
              padding: 0,
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          >
            La Base 360
          </button>
          <span aria-hidden="true">›</span>
          <span>Rentabilité</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={toggleStealth}
            className="lr-cta"
            aria-pressed={stealthOn}
            style={{ height: 34, padding: "0 12px", fontSize: 12.5 }}
          >
            <span aria-hidden="true">{stealthOn ? "🙈" : "👁️"}</span>
            Mode RDV
          </button>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="lr-cta lr-cta--solid"
            style={{ height: 34, padding: "0 14px", fontSize: 12.5 }}
          >
            <span aria-hidden="true">⚡</span>
            Analyse détaillée
          </button>
        </div>
      </div>

      {/* ─── HERO ──────────────────────────────────────────────────────── */}
      <section className="lr-rentab-hero" style={heroStyle}>
        <div className="lr-mesh" />
        <div style={{ position: "absolute", right: -10, bottom: 0, opacity: 0.22, pointerEvents: "none" }}>
          <Sparkline
            data={sparkData}
            width={620}
            height={140}
            color="var(--ls-rentab-teal)"
            fill
            strokeWidth={1.5}
            uid="hero"
          />
        </div>

        <div style={{ position: "relative", display: "grid", gap: 24 }}>
          <div className="lr-fadeup">
            <span className="lr-eyebrow">
              <span aria-hidden="true">◆</span>
              Ma rentabilité
              <span style={{ color: "var(--ls-rentab-ink-3)" }}>· {month}</span>
              {isCoupleAggregated && (
                <span className="lr-chip" style={{ height: 22, padding: "0 8px", fontSize: 10.5, marginLeft: 4 }}>
                  Agrégé · 2 comptes
                </span>
              )}
            </span>
          </div>

          {/* Wallet Card — format compact en rappel visuel (validé Thomas
              2026-05-20). Click = flip 3D vers le breakdown. */}
          <div className="lr-fadeup lr-d-1" style={{ display: "flex", justifyContent: "center" }}>
            <RentabilityWalletCard
              interaction="flip"
              variant="compact"
              onOpenDetail={() => setDetailOpen(true)}
            />
          </div>

          {/* 3 colonnes stats */}
          {ownData && (
            <div className="lr-fadeup lr-d-2 lr-rentab-stats-grid" style={statsGridStyle}>
              <StatBlock
                label="Ce mois"
                big={`${Math.round(animTotal).toLocaleString("fr-FR")} €`}
                accent={
                  ownData.prev_month_eur > 0 ? (
                    <span className={`lr-chip ${delta >= 0 ? "lr-chip--teal" : "lr-chip--coral"}`}>
                      <span aria-hidden="true">{delta >= 0 ? "↑" : "↓"}</span>
                      {delta >= 0 ? "+" : ""}{delta}€ · {delta >= 0 ? "+" : ""}{deltaPct}% vs {prevMonth}
                    </span>
                  ) : (
                    <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)" }}>—</span>
                  )
                }
              />
              <StatBlock
                label="Projection fin de mois"
                big={`${Math.round(animProj).toLocaleString("fr-FR")} €`}
                accent={
                  daysLeft > 0 ? (
                    <span className={`lr-chip ${projAhead ? "lr-chip--gold" : "lr-chip--coral"}`}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: projAhead ? "var(--ls-rentab-gold)" : "var(--ls-rentab-coral)" }} />
                      {projAhead ? "en avance" : "à booster"} · {daysLeft} j restants
                    </span>
                  ) : (
                    <span className="lr-chip">Mois écoulé</span>
                  )
                }
                sparkline={
                  <Sparkline
                    data={sparkData}
                    width={120}
                    height={28}
                    color="var(--ls-rentab-purple)"
                    strokeWidth={1.6}
                    uid="proj"
                  />
                }
              />
              <StatBlock
                label="Mois précédent"
                big={`${Math.round(ownData.prev_month_eur).toLocaleString("fr-FR")} €`}
                accent={
                  <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)" }}>
                    {prevMonth} {new Date(monthIsoStr || Date.now()).getFullYear()}
                  </span>
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* ─── SECTION 01 — Le calcul ──────────────────────────────────── */}
      {ownData && (
        <>
          <SectionHeader
            index="01"
            title="Le calcul"
            hint={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span>D'où vient chaque euro</span>
                <span style={viewToggleWrapStyle}>
                  <button
                    type="button"
                    onClick={() => setCalcView("classic")}
                    style={viewToggleBtnStyle(calcView === "classic")}
                  >
                    Vue classique
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcView("flow")}
                    style={viewToggleBtnStyle(calcView === "flow")}
                  >
                    Vue flux
                  </button>
                </span>
              </span>
            }
          />

          {calcView === "flow" ? (
            <RentabilitySankeyFlow
              caBrut={ownData.revenue_brut}
              marginPct={ownData.margin_pct}
              margeDirecte={ownSelfMargin}
              overrideTeam={ownDownlineOverride}
              overrideExt={ownManualOverride}
              productsCount={ownData.products_count}
              teamCount={otherMembers.length}
              externalCount={manualEntries.length}
              month={month}
            />
          ) : (
          <>
          <div className="lr-rentab-calc-grid" style={calcGridStyle}>
            <CalcBlock
              label="CA brut"
              value={`${Math.round(ownData.revenue_brut).toLocaleString("fr-FR")} €`}
              sub={`${ownData.products_count} programme${ownData.products_count > 1 ? "s" : ""} vendu${ownData.products_count > 1 ? "s" : ""}`}
            />
            <CalcBlock
              label="Marge perso"
              value={`${Math.round(ownData.margin_pct)} %`}
              sub={ownData.rank_label}
              op="×"
            />
            <CalcBlock
              label="Marge directe"
              value={`${Math.round(ownSelfMargin).toLocaleString("fr-FR")} €`}
              sub="ta part directe"
              op="="
              emphasis
            />
          </div>

          <div className="lr-rentab-override-grid" style={overrideGridStyle}>
            <OverrideCard
              icon="👥"
              title="Override équipe app"
              amount={Math.round(ownDownlineOverride)}
              chipLabel="L1 direct"
              footer={`${otherMembers.length} distri actif${otherMembers.length > 1 ? "s" : ""} ce mois`}
              right={
                <div style={{ display: "flex" }}>
                  {otherMembers.slice(0, 3).map((m, idx) => (
                    <span key={m.user_id} style={{ marginLeft: idx === 0 ? 0 : -8 }}>
                      <Avatar initials={initialsOf(m.name)} hue={avatarHue(m.name)} size={28} ring />
                    </span>
                  ))}
                </div>
              }
            />
            <OverrideCard
              icon="➕"
              title="Override hors-app"
              amount={Math.round(ownManualOverride)}
              chipLabel="saisi manuellement"
              footer={`${manualEntries.length} distri saisi${manualEntries.length > 1 ? "s" : ""}`}
              right={
                <div
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: 32,
                    color: "var(--ls-rentab-purple)",
                  }}
                >
                  {manualEntries.length}
                </div>
              }
            />
          </div>

          </>
          )}

          {/* Total net border-gradient (toujours visible, indépendamment de la vue) */}
          <div className="lr-border-gradient" style={{ marginBottom: 48 }}>
            <div style={totalRowStyle}>
              <div>
                <div style={totalLabelStyle}>Total net · {month}</div>
                <div style={totalSubStyle}>Marge directe + overrides équipe + hors-app</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span data-stealth className="lr-display lr-num" style={{ fontSize: 56 }}>
                  {Math.round(totalMargin).toLocaleString("fr-FR")}
                  <span style={{ fontSize: 32, marginLeft: 2 }}>€</span>
                </span>
                {ownData.prev_month_eur > 0 && (
                  <span className={`lr-chip ${delta >= 0 ? "lr-chip--teal" : "lr-chip--coral"}`}>
                    <span aria-hidden="true">{delta >= 0 ? "↑" : "↓"}</span>
                    {delta >= 0 ? "+" : ""}{deltaPct}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── SECTION 02 — Mon équipe ──────────────────────────────────── */}
      {isAdminOrRef && otherMembers.length > 0 && ownData && (
        <>
          <SectionHeader index="02" title="Mon équipe" hint="Tri par contribution · clic pour ouvrir la fiche" />
          <div className="lr-rentab-team-grid" style={teamGridStyle}>
            {otherMembers.map((m, i) => (
              <TeamMemberCard
                key={m.user_id}
                userId={m.user_id}
                name={m.name}
                rankLabel={m.current_rank ?? "Distri"}
                viewerOverride={ownOverridePerMember.get(m.user_id) ?? 0}
                totalDownlineOverride={ownDownlineOverride}
                fallbackOverrideForUser={fallbackOverrideForUser}
                animDelay={120 + i * 60}
                onClick={() => setSelectedMemberId(m.user_id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ─── SECTION 03 — Top clients ─────────────────────────────────── */}
      {ownData && ownData.top_clients && ownData.top_clients.length > 0 && (
        <>
          <SectionHeader index="03" title="Top clients" hint="Survol pour voir les produits" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
            {ownData.top_clients.slice(0, 3).map((c, i) => (
              <PodiumRow key={c.client_id} client={c} rank={i + 1} />
            ))}
          </div>
          {ownData.top_clients.length > 3 && (
            <div style={clientRowGridStyle}>
              {ownData.top_clients.slice(3, 5).map((c, i) => (
                <ClientRow key={c.client_id} client={c} rank={i + 4} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── V3 — distri hors-app saisie manuelle ─────────────────────── */}
      <div style={{ marginTop: 48 }}>
        <ManualPvEntriesSection />
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────── */}
      {detailOpen && ownData && (
        <RentabilityDetailModal
          data={ownDataWithOverride ?? ownData}
          onClose={() => setDetailOpen(false)}
          directMargin={ownSelfMargin}
          downlineOverride={ownDownlineOverride}
          manualOverride={ownManualOverride}
        />
      )}
      {selectedMemberId && selectedData && (
        <RentabilityDetailModal
          data={selectedDataWithOverride ?? selectedData}
          onClose={() => setSelectedMemberId(null)}
          directMargin={selectedSelfMargin}
          downlineOverride={selectedDownlineOverride}
          manualOverride={0}
        />
      )}

      {ownLoading && (
        <div style={loadingStyle}>Chargement…</div>
      )}
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function SectionHeader({ index, title, hint }: { index: string; title: string; hint?: React.ReactNode }) {
  return (
    <div className="lr-section-h">
      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
        <span className="lr-section-num">{index}</span>
        <span className="lr-section-title">{title}</span>
      </div>
      {hint && <span className="lr-section-hint">{hint}</span>}
    </div>
  );
}

function StatBlock({
  label,
  big,
  accent,
  sparkline,
}: {
  label: string;
  big: string;
  accent: React.ReactNode;
  sparkline?: React.ReactNode;
}) {
  return (
    <div style={statBlockStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span data-stealth className="lr-num" style={statBigStyle}>{big}</span>
        {sparkline}
      </div>
      <div>{accent}</div>
    </div>
  );
}

function CalcBlock({
  label,
  value,
  sub,
  op,
  emphasis,
}: {
  label: string;
  value: string;
  sub: string;
  op?: string;
  emphasis?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      {op && (
        <div style={calcOpStyle}>{op}</div>
      )}
      <div
        style={{
          ...calcBlockStyle,
          background: emphasis
            ? "linear-gradient(180deg, color-mix(in oklab, var(--ls-rentab-teal) 6%, var(--ls-rentab-bg-1)), var(--ls-rentab-bg-1))"
            : "var(--ls-rentab-bg-1)",
        }}
      >
        <div style={statLabelStyle}>{label}</div>
        <div
          data-stealth
          className="lr-num"
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: emphasis ? 700 : 600,
            fontStyle: emphasis ? "italic" : "normal",
            fontSize: emphasis ? 40 : 34,
            color: emphasis ? "var(--ls-rentab-teal)" : "var(--ls-rentab-ink)",
            marginTop: 6,
            letterSpacing: "-0.01em",
          }}
        >
          {value}
        </div>
        <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)", marginTop: 4 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function OverrideCard({
  icon,
  title,
  amount,
  chipLabel,
  footer,
  right,
}: {
  icon: string;
  title: string;
  amount: number;
  chipLabel: string;
  footer: string;
  right: React.ReactNode;
}) {
  return (
    <div style={overrideCardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={overrideIconStyle} aria-hidden="true">{icon}</span>
          <div>
            <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13.5, fontWeight: 600, color: "var(--ls-rentab-ink)" }}>
              {title}
            </div>
            <div style={{ marginTop: 2 }}>
              <span className="lr-chip lr-chip--purple">{chipLabel}</span>
            </div>
          </div>
        </div>
        {right}
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span
          data-stealth
          className="lr-num"
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: 40,
            color: "var(--ls-rentab-purple)",
            letterSpacing: "-0.01em",
          }}
        >
          {amount >= 0 ? "+" : ""}{amount}<span style={{ fontSize: 22, marginLeft: 2 }}>€</span>
        </span>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-rentab-ink-3)" }}>
          {footer}
        </span>
      </div>
    </div>
  );
}

function PodiumRow({ client, rank }: { client: RentabilityTopClient; rank: number }) {
  const accents: Record<number, string> = { 1: "var(--ls-rentab-gold)", 2: "#A8A29E", 3: "#B06B3F" };
  const labels: Record<number, string> = { 1: "or", 2: "argent", 3: "bronze" };
  const accent = accents[rank];
  const [hover, setHover] = useState(false);
  const products = client.products?.slice(0, 6) ?? [];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: "var(--ls-rentab-bg-1)",
        border: "1px solid var(--ls-rentab-line)",
        borderRadius: 22,
        padding: "18px 22px 18px 26px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 18,
        cursor: "pointer",
        transition: "transform .2s, border-color .2s, box-shadow .2s",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? "var(--ls-rentab-shadow-md)" : "none",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: `color-mix(in oklab, ${accent} 14%, var(--ls-rentab-bg-2))`,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: 22,
            border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
          }}
        >
          #{rank}
        </div>
        <Avatar
          initials={initialsOf(client.client_name)}
          hue={avatarHue(client.client_name)}
          size={44}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 16, color: "var(--ls-rentab-ink)" }}>
            {client.client_name}
          </span>
          {client.is_vip && (
            <span className="lr-chip lr-chip--gold" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>
              VIP {client.vip_status} −{client.vip_discount_pct}%
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12.5,
            color: "var(--ls-rentab-ink-3)",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            maxHeight: hover ? 60 : 0,
            opacity: hover ? 1 : 0,
            overflow: "hidden",
            transition: "max-height .25s var(--ls-rentab-ease), opacity .2s",
          }}
        >
          {products.map((p) => (
            <span key={p} className="lr-chip" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>
              {p}
            </span>
          ))}
        </div>
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12.5,
            color: "var(--ls-rentab-ink-3)",
            maxHeight: hover ? 0 : 24,
            opacity: hover ? 0 : 1,
            marginTop: 4,
            overflow: "hidden",
            transition: "max-height .2s, opacity .15s",
          }}
        >
          {labels[rank]} · {client.items_count} produit{client.items_count > 1 ? "s" : ""} · marge {Math.round(client.margin)} €
        </div>
      </div>
      <div
        data-stealth
        className="lr-num"
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontStyle: "italic",
          fontSize: 30,
          color: "var(--ls-rentab-ink)",
        }}
      >
        {Math.round(client.revenue)}<span style={{ fontSize: 18, marginLeft: 2 }}>€</span>
      </div>
    </div>
  );
}

function ClientRow({ client, rank }: { client: RentabilityTopClient; rank: number }) {
  return (
    <div
      style={{
        background: "var(--ls-rentab-bg-1)",
        border: "1px solid var(--ls-rentab-line)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 11, color: "var(--ls-rentab-ink-3)", width: 22 }}>
        #{rank}
      </span>
      <Avatar initials={initialsOf(client.client_name)} hue={avatarHue(client.client_name)} size={32} />
      <span style={{ flex: 1, fontFamily: "DM Sans, sans-serif", fontSize: 13.5, color: "var(--ls-rentab-ink)" }}>
        {client.client_name}
      </span>
      <span
        data-stealth
        className="lr-num"
        style={{
          fontFamily: "Syne, sans-serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 18,
          color: "var(--ls-rentab-ink)",
        }}
      >
        {Math.round(client.revenue)} €
      </span>
    </div>
  );
}

// ─── TeamMemberCard ────────────────────────────────────────────────────────
function TeamMemberCard({
  userId,
  name,
  rankLabel,
  viewerOverride,
  totalDownlineOverride,
  fallbackOverrideForUser,
  animDelay,
  onClick,
}: {
  userId: string;
  name: string;
  rankLabel: string;
  /** Ce que le viewer (couple admin) touche en override grâce à CE membre. */
  viewerOverride: number;
  totalDownlineOverride: number;
  fallbackOverrideForUser: (userId: string) => { totalPv: number; tierPct: number } | null;
  animDelay: number;
  onClick: () => void;
}) {
  const { users } = useAppContext();
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns } = usePvBreakdowns(monthIso);
  // Marge retail réelle du membre sur ses propres clients (ventes app).
  const { data: memberData } = useUserRentability(userId);

  // Gain propre du membre sur SA downline (ex : Mandy touche l'override sur
  // Victoria). Même moteur que l'admin, mais viewer = ce membre.
  const memberOwnDownlineOverride = useMemo(() => {
    return computeViewerDownlineOverride(
      [userId],
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
      breakdowns,
      fallbackOverrideForUser,
    );
  }, [userId, users, breakdowns, fallbackOverrideForUser]);

  // Gain réel total du membre = marge retail directe + override sur sa downline.
  const memberGain = (memberData?.margin_eur ?? 0) + memberOwnDownlineOverride;
  const contribRatio = totalDownlineOverride > 0 ? viewerOverride / totalDownlineOverride : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="lr-fadeup"
      style={{
        ...teamCardStyle,
        animationDelay: `${animDelay}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "color-mix(in oklab, var(--ls-rentab-purple) 30%, transparent)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--ls-rentab-shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ls-rentab-line)";
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar initials={initialsOf(name)} hue={avatarHue(name)} size={40} />
        <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--ls-rentab-ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div style={{ marginTop: 2 }}>
            <span className="lr-chip" style={{ height: 22, padding: "0 8px", fontSize: 11 }}>{rankLabel}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            data-stealth
            className="lr-num"
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontStyle: "italic",
              fontSize: 22,
              color: "var(--ls-rentab-ink)",
              lineHeight: 1.1,
            }}
          >
            {Math.round(memberGain).toLocaleString("fr-FR")}€
          </div>
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 10.5,
              color: "var(--ls-rentab-ink-3)",
              marginTop: 1,
            }}
          >
            gain {name.split(" ")[0]}
          </div>
          <div
            data-stealth
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontWeight: 700,
              fontSize: 12.5,
              color: "var(--ls-rentab-purple)",
              marginTop: 4,
            }}
          >
            +{Math.round(viewerOverride).toLocaleString("fr-FR")}€ <span style={{ fontWeight: 500, color: "var(--ls-rentab-ink-3)" }}>ton override</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={miniBarBgStyle}>
          <div
            style={{
              ...miniBarFillStyle,
              width: `${Math.round(contribRatio * 100)}%`,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11,
            color: "var(--ls-rentab-ink-3)",
          }}
        >
          <span>contribution</span>
          <span>{Math.round(contribRatio * 100)}%</span>
        </div>
      </div>
    </button>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrapStyle: React.CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "28px 22px 60px",
  background: "var(--ls-rentab-bg)",
  minHeight: "100%",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 22,
  gap: 12,
  flexWrap: "wrap",
};

const heroStyle: React.CSSProperties = {
  position: "relative",
  background: "var(--ls-rentab-bg-1)",
  border: "1px solid var(--ls-rentab-line)",
  borderRadius: 28,
  padding: "32px 32px 28px",
  overflow: "hidden",
  boxShadow: "var(--ls-rentab-shadow-md)",
  marginBottom: 40,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 20,
  paddingTop: 8,
  borderTop: "1px solid var(--ls-rentab-line)",
  marginTop: 8,
};

const statBlockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingTop: 16,
};

const statLabelStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-rentab-ink-3)",
};

const statBigStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 38,
  color: "var(--ls-rentab-ink)",
  letterSpacing: "-0.02em",
  lineHeight: 1,
};

const calcGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 16,
};

const calcBlockStyle: React.CSSProperties = {
  border: "1px solid var(--ls-rentab-line)",
  borderRadius: 22,
  padding: "20px 22px",
  height: "100%",
};

const calcOpStyle: React.CSSProperties = {
  position: "absolute",
  left: -16,
  top: "50%",
  transform: "translateY(-50%)",
  width: 28,
  height: 28,
  borderRadius: 999,
  background: "var(--ls-rentab-bg-1)",
  border: "1px solid var(--ls-rentab-line-2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 600,
  fontSize: 13,
  color: "var(--ls-rentab-ink-2)",
  zIndex: 1,
};

const overrideGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  marginBottom: 18,
};

const overrideCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(140deg, var(--ls-rentab-purple-tint), transparent 60%), var(--ls-rentab-bg-1)",
  border: "1px solid color-mix(in oklab, var(--ls-rentab-purple) 18%, transparent)",
  borderRadius: 22,
  padding: "18px 22px 16px",
  position: "relative",
};

const overrideIconStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "color-mix(in oklab, var(--ls-rentab-purple) 14%, transparent)",
  color: "var(--ls-rentab-purple)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
};

const totalRowStyle: React.CSSProperties = {
  padding: "22px 28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 24,
  flexWrap: "wrap",
};

const totalLabelStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-rentab-ink-3)",
};

const totalSubStyle: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  color: "var(--ls-rentab-ink-2)",
  marginTop: 4,
};

const teamGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  marginBottom: 48,
};

const teamCardStyle: React.CSSProperties = {
  background: "var(--ls-rentab-bg-1)",
  border: "1px solid var(--ls-rentab-line)",
  borderRadius: 22,
  padding: 16,
  cursor: "pointer",
  textAlign: "left",
  transition: "transform .2s var(--ls-rentab-ease), border-color .2s, box-shadow .2s",
  fontFamily: "inherit",
};

const miniBarBgStyle: React.CSSProperties = {
  height: 6,
  background: "var(--ls-rentab-bg-2)",
  borderRadius: 999,
  overflow: "hidden",
};

const miniBarFillStyle: React.CSSProperties = {
  height: "100%",
  background:
    "linear-gradient(90deg, var(--ls-rentab-teal), var(--ls-rentab-purple))",
  borderRadius: 999,
  transition: "width 600ms var(--ls-rentab-ease-out)",
};

const clientRowGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
  marginBottom: 48,
};

const loadingStyle: React.CSSProperties = {
  textAlign: "center",
  padding: 40,
  color: "var(--ls-rentab-ink-3)",
};

const viewToggleWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: 3,
  gap: 2,
  background: "var(--ls-rentab-bg-2)",
  borderRadius: 999,
  border: "1px solid var(--ls-rentab-line)",
};

function viewToggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    height: 24,
    padding: "0 12px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: active ? "var(--ls-rentab-bg-1)" : "transparent",
    color: active ? "var(--ls-rentab-ink)" : "var(--ls-rentab-ink-3)",
    fontFamily: "DM Sans, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    boxShadow: active ? "var(--ls-rentab-shadow-sm)" : "none",
    transition: "all .15s",
  };
}
