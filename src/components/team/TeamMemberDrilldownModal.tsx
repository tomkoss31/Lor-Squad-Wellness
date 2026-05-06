// =============================================================================
// TeamMemberDrilldownModal — vue détail d'un membre (2026-05-04)
//
// Modale plein écran (mobile) / centrée (desktop) qui affiche TOUTES les
// métriques d'un seul membre sur 1 vue : XP breakdown + Academy +
// Formation pyramide + Activité 7-30j + Engagement (last_seen, streak).
// CTA vers la fiche distri complète (DistributorPortfolioPage).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  STATUS_META,
  type TeamMemberEngagement,
} from "../../hooks/useTeamEngagement";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import {
  freezeUserAccount,
  unfreezeUserAccount,
  setUserPvBreakdown,
  setUserRankAdmin,
} from "../../services/supabaseService";
import {
  RANK_LABELS,
  RANK_ORDER,
  type HerbalifeRank,
  type User,
} from "../../types/domain";
import {
  COMMISSION_PCT_BY_TIER,
  PV_TO_EUR_RATIO,
  ROYALTY_OVERRIDE_PCT,
  computeQualifyingPersonalPv,
  computeOverrideEur,
  currentMonthIso,
  emptyBreakdown,
  rankProgression,
  totalPvFromBreakdown,
  type PvMonthlyBreakdown,
} from "../../lib/herbalifeFormulas";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";

interface TeamMemberDrilldownModalProps {
  member: TeamMemberEngagement | null;
  onClose: () => void;
}

function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Jamais connecté";
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
    if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
    return `Il y a ${Math.floor(days / 365)} an(s)`;
  } catch {
    return "—";
  }
}

export function TeamMemberDrilldownModal({ member, onClose }: TeamMemberDrilldownModalProps) {
  const navigate = useNavigate();
  const { currentUser, users, refreshAfterFreeze } = useAppContext();
  const { push: pushToast } = useToast();
  const [freezing, setFreezing] = useState(false);

  // ─── Lookup full user (depuis context.users) ───────────────────────────────
  // Doit etre AVANT tout return conditionnel — sinon les hooks suivants
  // (useState, useMemo) violent les regles React si member est null.
  const fullUser = users.find((u) => u.id === member?.user_id) ?? null;

  // ─── Edit Rang Herbalife (admin only, chantier 2026-11-07) ────────────────
  const [rankDraft, setRankDraft] = useState<HerbalifeRank>(
    (fullUser?.currentRank as HerbalifeRank | undefined) ?? "distributor_25",
  );
  const [savingRank, setSavingRank] = useState(false);

  // ─── Edit PV breakdown V2 (admin only, chantier 2026-11-07) ──────────────
  // Remplace l'ancien input unique par 5 inputs par tier de remise downline.
  // Le RPC sync automatiquement users.monthly_pv_override = somme.
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { getForUser: getBreakdownForUser, refetch: refetchBreakdowns } =
    usePvBreakdowns(monthIso);
  const existingBreakdown = member ? getBreakdownForUser(member.user_id) : null;
  const [pvDraft, setPvDraft] = useState<{
    pv15: string; pv25: string; pv35: string; pv42: string; pvRoyalty: string;
  }>({ pv15: "", pv25: "", pv35: "", pv42: "", pvRoyalty: "" });
  const [savingPv, setSavingPv] = useState(false);

  // Hydrate les inputs quand le breakdown arrive (fetch async).
  useMemo(() => {
    if (existingBreakdown) {
      setPvDraft({
        pv15: existingBreakdown.pv15 ? String(existingBreakdown.pv15) : "",
        pv25: existingBreakdown.pv25 ? String(existingBreakdown.pv25) : "",
        pv35: existingBreakdown.pv35 ? String(existingBreakdown.pv35) : "",
        pv42: existingBreakdown.pv42 ? String(existingBreakdown.pv42) : "",
        pvRoyalty: existingBreakdown.pvRoyalty ? String(existingBreakdown.pvRoyalty) : "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingBreakdown?.userId, existingBreakdown?.month]);

  // Calcul live du total + override estime depuis les inputs
  const draftBreakdown = useMemo<PvMonthlyBreakdown>(() => {
    const parse = (s: string) => {
      const n = Number(s.replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    return {
      ...(member ? emptyBreakdown(member.user_id, monthIso) : emptyBreakdown("", monthIso)),
      pv15: parse(pvDraft.pv15),
      pv25: parse(pvDraft.pv25),
      pv35: parse(pvDraft.pv35),
      pv42: parse(pvDraft.pv42),
      pvRoyalty: parse(pvDraft.pvRoyalty),
    };
  }, [pvDraft, member, monthIso]);
  const draftTotalPv = totalPvFromBreakdown(draftBreakdown);
  const draftOverrideEur = computeOverrideEur(draftBreakdown);

  // Jauge progression vers prochain rang (chantier 2026-11-07)
  // PV perso = somme breakdown courant ou monthly_pv_override
  const personalPvForProgress = useMemo(() => {
    if (existingBreakdown) return totalPvFromBreakdown(existingBreakdown);
    if (
      (fullUser as User & { monthlyPvOverrideMonth?: string | null })?.monthlyPvOverrideMonth ===
        monthIso &&
      typeof (fullUser as User & { monthlyPvOverride?: number | null })?.monthlyPvOverride ===
        "number"
    ) {
      return (fullUser as User & { monthlyPvOverride?: number | null }).monthlyPvOverride as number;
    }
    return 0;
  }, [existingBreakdown, fullUser, monthIso]);
  // PV qualifiant = perso + downline NON-Supervisor (recursif).
  // Tant que personne dans la chaine downstream n'est Supervisor, leurs PV
  // comptent comme PV perso du sponsor (regle Herbalife : qualif Supervisor
  // 4000 PV). Une branche s'arrete des qu'on rencontre un Supervisor 50%+
  // (sa branche bascule en Royalty pour les paliers superieurs).
  const { breakdowns: allBreakdowns } = usePvBreakdowns(monthIso);
  const qualifyingPersonalPv = useMemo(() => {
    if (!fullUser) return personalPvForProgress;
    return computeQualifyingPersonalPv(
      fullUser.id,
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
      allBreakdowns,
      (uid) => {
        const u = users.find((x) => x.id === uid);
        if (!u) return 0;
        const ux = u as User & {
          monthlyPvOverrideMonth?: string | null;
          monthlyPvOverride?: number | null;
        };
        if (ux.monthlyPvOverrideMonth === monthIso && typeof ux.monthlyPvOverride === "number") {
          return ux.monthlyPvOverride;
        }
        return 0;
      },
    );
  }, [fullUser, users, allBreakdowns, monthIso, personalPvForProgress]);
  const progression = useMemo(
    () => rankProgression(fullUser?.currentRank, personalPvForProgress, qualifyingPersonalPv),
    [fullUser?.currentRank, personalPvForProgress, qualifyingPersonalPv],
  );

  if (!member) return null;
  const status = STATUS_META[member.status];

  // engagement RPC ne renvoie pas frozenAt (et de toute facon les frozen
  // sont exclus du sub_tree, donc si on les voit ici c'est qu'ils sont actifs).
  const isFrozen = !!fullUser?.frozenAt;
  const isAdmin = currentUser?.role === "admin";
  const isSelf = currentUser?.id === member.user_id;
  const canToggleFreeze = isAdmin && !isSelf;
  const canEditRankPv = isAdmin && !isSelf;

  async function handleSaveRank() {
    if (!member || savingRank) return;
    setSavingRank(true);
    try {
      await setUserRankAdmin(member.user_id, rankDraft);
      pushToast({
        tone: "success",
        title: "Rang mis a jour",
        message: `${member.name} → ${RANK_LABELS[rankDraft]}`,
      });
      await refreshAfterFreeze?.();
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de mettre a jour le rang."));
    } finally {
      setSavingRank(false);
    }
  }

  async function handleSavePv() {
    if (!member || savingPv) return;
    setSavingPv(true);
    try {
      await setUserPvBreakdown({
        userId: member.user_id,
        month: monthIso,
        pv15: draftBreakdown.pv15,
        pv25: draftBreakdown.pv25,
        pv35: draftBreakdown.pv35,
        pv42: draftBreakdown.pv42,
        pvRoyalty: draftBreakdown.pvRoyalty,
      });
      const isCleared = draftTotalPv === 0;
      pushToast({
        tone: "success",
        title: isCleared ? "Breakdown efface" : "PV Bizworks enregistres",
        message: isCleared
          ? `${member.name} → calcul auto (commandes app)`
          : `${member.name} → ${draftTotalPv.toLocaleString("fr-FR")} PV · override estim. ${Math.round(draftOverrideEur).toLocaleString("fr-FR")} €`,
      });
      await refetchBreakdowns();
      await refreshAfterFreeze?.();
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible d'enregistrer le PV."));
    } finally {
      setSavingPv(false);
    }
  }

  async function handleToggleFreeze() {
    if (!member || freezing) return;
    setFreezing(true);
    try {
      if (isFrozen) {
        await unfreezeUserAccount(member.user_id);
        pushToast({
          tone: "success",
          title: "Compte réactivé",
          message: `${member.name} retrouve l'accès à l'app.`,
        });
      } else {
        await freezeUserAccount({
          userId: member.user_id,
          reason: "Gelé manuellement par admin",
        });
        pushToast({
          tone: "success",
          title: "Compte gelé",
          message: `${member.name} ne pourra plus accéder à l'app jusqu'à réactivation.`,
        });
      }
      await refreshAfterFreeze?.();
      onClose();
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Action impossible pour le moment."));
    } finally {
      setFreezing(false);
    }
  }

  const handleOpenFiche = () => {
    onClose();
    navigate(`/distributors/${member.user_id}`);
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fermer">
          ×
        </button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={avatarBigStyle}>{initialsOf(member.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={nameStyle}>{member.name}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
              <span style={subRoleStyle}>
                {member.role === "admin" ? "Admin" : member.role === "referent" ? "Référent" : "Distributeur"}
                {member.current_rank && ` · ${member.current_rank}`}
              </span>
              <span style={statusPillStyle(status.color)}>
                <span aria-hidden="true">{status.emoji}</span>
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* Big XP card */}
        <div style={xpBigCardStyle}>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Engagement total
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span style={xpTotalStyle}>{member.xp_total.toLocaleString("fr-FR")}</span>
            <span style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>XP</span>
            <span style={levelBadgeStyle}>Niveau {member.xp_level}</span>
          </div>

          {/* Breakdown XP */}
          <div style={breakdownGridStyle}>
            <BreakdownRow emoji="🎓" label="Academy" value={member.xp_academy} />
            <BreakdownRow emoji="📋" label="Bilans" value={member.xp_bilans} />
            <BreakdownRow emoji="📅" label="RDV" value={member.xp_rdv} />
            <BreakdownRow emoji="💬" label="Messages" value={member.xp_messages} />
            <BreakdownRow emoji="📚" label="Formation" value={member.xp_formation} />
            <BreakdownRow emoji="🔥" label="Connexions" value={member.xp_daily} />
          </div>
        </div>

        {/* Section Apprentissage */}
        <SectionTitle>🎓 Apprentissage</SectionTitle>
        <div style={twoColGrid}>
          <MetricCard
            title="Academy"
            primary={`${member.academy_step} / 12`}
            secondary={`${member.academy_percent}% complété`}
            color={member.academy_percent >= 100 ? "var(--ls-teal)" : "var(--ls-gold)"}
          />
          <MetricCard
            title="Formation"
            primary={`${member.formation_total_validated} validés`}
            secondary={`N1: ${member.formation_validated_n1} · N2: ${member.formation_validated_n2} · N3: ${member.formation_validated_n3}`}
            color="var(--ls-purple)"
            badge={member.formation_pending > 0 ? `${member.formation_pending} en attente` : undefined}
          />
        </div>

        {/* Section Activité */}
        <SectionTitle>📊 Activité récente</SectionTitle>
        <div style={threeColGrid}>
          <MetricCard
            title="Bilans 30j"
            primary={String(member.bilans_30d)}
            secondary="initiaux créés"
            color="var(--ls-teal)"
          />
          <MetricCard
            title="RDV 30j"
            primary={String(member.rdv_30d)}
            secondary="follow-ups planifiés"
            color="var(--ls-gold)"
          />
          <MetricCard
            title="Messages 7j"
            primary={String(member.messages_7d)}
            secondary="envoyés aux clients"
            color="var(--ls-coral)"
          />
        </div>

        {/* Section Engagement */}
        <SectionTitle>🔥 Engagement</SectionTitle>
        <div style={twoColGrid}>
          <MetricCard
            title="Dernière connexion"
            primary={formatRelative(member.last_seen_at)}
            secondary={member.last_seen_at ? new Date(member.last_seen_at).toLocaleDateString("fr-FR") : "—"}
            color="var(--ls-text-muted)"
          />
          <MetricCard
            title="Connexions cumulées"
            primary={String(member.lifetime_login_count)}
            secondary={`${member.lifetime_login_count * 5} XP daily`}
            color="var(--ls-coral)"
          />
        </div>

        {/* Bloc admin : Rang Herbalife (chantier 2026-11-07) */}
        {canEditRankPv ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ls-text)",
                letterSpacing: 0.3,
                marginBottom: 4,
              }}
            >
              🎖️ Rang Herbalife
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", lineHeight: 1.4, marginBottom: 10 }}>
              Ajuste le rang si le distri ne l'a pas fait lui-meme. Determine la marge retail
              dans les calculs FLEX / Rentabilite.
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={rankDraft}
                onChange={(e) => setRankDraft(e.target.value as HerbalifeRank)}
                style={{
                  flex: "1 1 200px",
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface)",
                  color: "var(--ls-text)",
                  fontSize: 13,
                  fontFamily: "Inter, system-ui, sans-serif",
                  cursor: "pointer",
                }}
              >
                {RANK_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {RANK_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleSaveRank()}
                disabled={savingRank || rankDraft === fullUser?.currentRank}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    savingRank || rankDraft === fullUser?.currentRank
                      ? "var(--ls-surface2)"
                      : "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                  color:
                    savingRank || rankDraft === fullUser?.currentRank
                      ? "var(--ls-text-muted)"
                      : "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "Sora, system-ui, sans-serif",
                  cursor:
                    savingRank || rankDraft === fullUser?.currentRank ? "default" : "pointer",
                }}
              >
                {savingRank ? "…" : "Appliquer"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Bloc progression vers prochain rang (chantier 2026-11-07) */}
        {canEditRankPv && progression ? (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 12,
              background: "var(--ls-surface2)",
              border: "1px solid var(--ls-border)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ls-text)",
                letterSpacing: 0.3,
                marginBottom: 4,
              }}
            >
              📈 Progression · {progression.currentLabel} → {progression.nextLabel}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", lineHeight: 1.4, marginBottom: 10 }}>
              {progression.pct >= 100
                ? `🎉 Seuil atteint ! ${progression.pvCurrent.toLocaleString("fr-FR")} / ${progression.pvNeeded.toLocaleString("fr-FR")} PV`
                : `${progression.pvCurrent.toLocaleString("fr-FR")} / ${progression.pvNeeded.toLocaleString("fr-FR")} PV · reste ${progression.remaining.toLocaleString("fr-FR")} PV`}
              <span style={{
                display: "inline-block",
                marginLeft: 6,
                padding: "1px 6px",
                borderRadius: 5,
                fontSize: 9,
                fontWeight: 700,
                background: progression.pvSource === "personal_extended"
                  ? "color-mix(in srgb, var(--ls-teal) 14%, transparent)"
                  : "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
                color: "var(--ls-teal)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}>
                {progression.pvSource === "personal_extended"
                  ? "PV perso · ventes directes + downline non-Sup"
                  : "PV perso · ventes directes"}
              </span>
            </div>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 10,
                borderRadius: 999,
                background: "color-mix(in srgb, var(--ls-text) 8%, transparent)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${progression.pct}%`,
                  background: progression.pct >= 100
                    ? "linear-gradient(90deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)"
                    : progression.pct >= 75
                      ? "linear-gradient(90deg, #10B981 0%, #06B6D4 100%)"
                      : "var(--ls-teal)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Bloc admin : PV breakdown V2 par tier (chantier RO 2026-11-07) */}
        {canEditRankPv ? (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              borderRadius: 12,
              background: existingBreakdown
                ? "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2))"
                : "var(--ls-surface2)",
              border: existingBreakdown
                ? "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)"
                : "1px solid var(--ls-border)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ls-text)",
                letterSpacing: 0.3,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span>📊 PV Bizworks · {monthIso} · breakdown par tier</span>
              {existingBreakdown ? (
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 6,
                    background: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
                    color: "var(--ls-teal)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Saisi
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", lineHeight: 1.4, marginBottom: 10 }}>
              Transcris depuis ta fiche RO Herbalife le PV de {member.name} par palier.
              Mid-month rank-up : si le distri etait a 25% puis a 35%, repartis. Tout a 0 = clear.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              <PvTierRow
                label="PV à 15% (Préféré)"
                tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv15 * 100)}%`}
                value={pvDraft.pv15}
                onChange={(v) => setPvDraft({ ...pvDraft, pv15: v })}
              />
              <PvTierRow
                label="PV à 25% (Distributor)"
                tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv25 * 100)}%`}
                value={pvDraft.pv25}
                onChange={(v) => setPvDraft({ ...pvDraft, pv25: v })}
              />
              <PvTierRow
                label="PV à 35% (Senior Consultant)"
                tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv35 * 100)}%`}
                value={pvDraft.pv35}
                onChange={(v) => setPvDraft({ ...pvDraft, pv35: v })}
              />
              <PvTierRow
                label="PV à 42% (Success Builder)"
                tip={`commission toi : ${Math.round(COMMISSION_PCT_BY_TIER.pv42 * 100)}%`}
                value={pvDraft.pv42}
                onChange={(v) => setPvDraft({ ...pvDraft, pv42: v })}
              />
              <PvTierRow
                label="PV Royalty (downline Supervisor 50%)"
                tip={`royalty toi : ${Math.round(ROYALTY_OVERRIDE_PCT * 100)}%`}
                value={pvDraft.pvRoyalty}
                onChange={(v) => setPvDraft({ ...pvDraft, pvRoyalty: v })}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--ls-surface)",
                marginBottom: 10,
                fontSize: 12,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: "var(--ls-text-muted)" }}>
                Total : <strong style={{ color: "var(--ls-text)" }}>{draftTotalPv.toLocaleString("fr-FR")} PV</strong>
              </span>
              <span style={{ color: "var(--ls-teal)", fontWeight: 700 }}>
                Override estim. ~{Math.round(draftOverrideEur).toLocaleString("fr-FR")} €
              </span>
            </div>
            <div style={{ fontSize: 10, color: "var(--ls-text-muted)", fontStyle: "italic", marginBottom: 8 }}>
              Ratio {PV_TO_EUR_RATIO} €/PV (calibre fiche RO 2026-03)
            </div>
            <button
              type="button"
              onClick={() => void handleSavePv()}
              disabled={savingPv}
              style={{
                width: "100%",
                padding: "9px 14px",
                borderRadius: 10,
                border: "none",
                background: savingPv
                  ? "var(--ls-surface2)"
                  : "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                color: savingPv ? "var(--ls-text-muted)" : "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Sora, system-ui, sans-serif",
                cursor: savingPv ? "wait" : "pointer",
              }}
            >
              {savingPv ? "…" : "Appliquer"}
            </button>
          </div>
        ) : null}

        {/* Bloc admin : toggle Geler / Reactiver le compte */}
        {canToggleFreeze ? (
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: isFrozen
                ? "color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface2))"
                : "var(--ls-surface2)",
              border: isFrozen
                ? "1px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)"
                : "1px solid var(--ls-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isFrozen ? "var(--ls-coral)" : "var(--ls-text)",
                  letterSpacing: 0.3,
                  marginBottom: 2,
                }}
              >
                {isFrozen ? "🧊 Compte gelé" : "🟢 Compte actif"}
              </div>
              <div style={{ fontSize: 11, color: "var(--ls-text-muted)", lineHeight: 1.4 }}>
                {isFrozen
                  ? "L'utilisateur ne peut plus accéder à l'app et n'apparaît plus dans les stats équipe."
                  : "Geler ce compte pour qu'il ne pollue plus stats / podium / agendas."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleFreeze()}
              disabled={freezing}
              role="switch"
              aria-checked={!isFrozen}
              style={{
                position: "relative",
                width: 56,
                height: 30,
                borderRadius: 999,
                border: "none",
                background: isFrozen ? "#475569" : "var(--ls-teal)",
                cursor: freezing ? "wait" : "pointer",
                transition: "background 0.2s ease",
                opacity: freezing ? 0.6 : 1,
                flexShrink: 0,
              }}
              title={isFrozen ? "Réactiver le compte" : "Geler le compte"}
            >
              <span
                style={{
                  position: "absolute",
                  top: 3,
                  left: isFrozen ? 3 : 29,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "white",
                  transition: "left 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        ) : null}

        {/* Footer CTAs */}
        <div style={ctaRowStyle}>
          <button type="button" onClick={handleOpenFiche} style={primaryBtnStyle}>
            Ouvrir la fiche complète →
          </button>
          <button type="button" onClick={onClose} style={ghostBtnStyle}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

function PvTierRow({
  label,
  tip,
  value,
  onChange,
}: {
  label: string;
  tip: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--ls-text)", fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500 }}>
          {label}
        </div>
        <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>{tip}</div>
      </div>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={{
          width: 90,
          padding: "7px 10px",
          borderRadius: 8,
          border: "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          color: "var(--ls-text)",
          fontSize: 13,
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "right",
        }}
      />
    </div>
  );
}

function BreakdownRow({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div style={breakdownRowStyle}>
      <span style={{ fontSize: 14 }} aria-hidden="true">{emoji}</span>
      <span style={{ fontSize: 11, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, flex: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--ls-text)" }}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({
  title,
  primary,
  secondary,
  color,
  badge,
}: {
  title: string;
  primary: string;
  secondary?: string;
  color: string;
  badge?: string;
}) {
  return (
    <div style={metricCardStyle(color)}>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ls-text)" }}>
        {primary}
      </div>
      {secondary && (
        <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>{secondary}</div>
      )}
      {badge && <div style={badgeStyle(color)}>{badge}</div>}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 16px",
  overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 600,
  maxHeight: "calc(100vh - 40px)",
  overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: "24px 22px",
  boxShadow: "0 24px 72px color-mix(in srgb, var(--ls-text) 20%, transparent)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 14,
  width: 32,
  height: 32,
  borderRadius: 10,
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontSize: 24,
  cursor: "pointer",
  lineHeight: 1,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginBottom: 18,
  paddingRight: 30,
};

const avatarBigStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 14,
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 800,
  color: "var(--ls-bg)",
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 22,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const subRoleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const statusPillStyle = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color,
  border: `0.5px solid ${color}`,
  fontFamily: "DM Sans, sans-serif",
});

const xpBigCardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
  borderRadius: 14,
  padding: "16px 18px",
  marginBottom: 18,
};

const xpTotalStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 32,
  fontWeight: 800,
  color: "var(--ls-gold)",
};

const levelBadgeStyle: React.CSSProperties = {
  marginLeft: "auto",
  padding: "4px 10px",
  borderRadius: 8,
  background: "var(--ls-gold)",
  color: "var(--ls-bg)",
  fontSize: 11,
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
};

const breakdownGridStyle: React.CSSProperties = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 6,
};

const breakdownRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 8px",
  borderRadius: 8,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 18,
};

const threeColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 8,
  marginBottom: 18,
};

const metricCardStyle = (color: string): React.CSSProperties => ({
  position: "relative",
  background: `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  borderRadius: 12,
  padding: "12px 14px",
});

const badgeStyle = (color: string): React.CSSProperties => ({
  display: "inline-block",
  marginTop: 6,
  fontSize: 9,
  padding: "2px 6px",
  borderRadius: 6,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const ctaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const primaryBtnStyle: React.CSSProperties = {
  flex: "1 1 auto",
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
};
