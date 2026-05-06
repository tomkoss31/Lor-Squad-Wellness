// =============================================================================
// RentabilityDetailModal — popup détail rentabilité V3 (2026-11-07)
//
// Refonte V3 : les 3 cards (Publics / VIP / Distributeurs) deviennent des
// onglets cliquables qui filtrent la section "arborescence" en bas :
//   - Tous (défaut)   → top clients tels quels
//   - Clients publics → ne garde que les non-VIP
//   - Clients VIP     → ne garde que les VIP
//   - Distributeurs   → affiche le downline du user (sponsor=this) avec
//                       leur rang + PV mensuel (override Bizworks si saisi)
//                       + estimation override €. Visible uniquement si le
//                       user est admin/référent et a un downline.
//
// V2 (2026-05-05) : Top CLIENTS au lieu de produits + Split Public vs VIP.
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  rentabilityZone,
  type RentabilityData,
  type RentabilityTopClient,
} from "../../hooks/useUserRentability";
import { RentabilityGauge } from "./RentabilityGauge";
import {
  RANK_LABELS,
  type HerbalifeRank,
  type User,
} from "../../types/domain";
import {
  PV_TO_EUR_RATIO,
  computeSponsorCutOnDownstream,
  currentMonthIso,
  tierPctForRank,
  totalPvFromBreakdown,
  type PvMonthlyBreakdown,
} from "../../lib/herbalifeFormulas";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";

interface RentabilityDetailModalProps {
  data: RentabilityData;
  onClose: () => void;
}

type FilterTab = "all" | "public" | "vip" | "distri";

const ZONE_COLOR: Record<string, string> = {
  red: "var(--ls-coral)",
  orange: "var(--ls-gold)",
  green: "var(--ls-teal)",
};

const VIP_META: Record<string, { label: string; color: string; emoji: string; discount: number }> = {
  bronze: { label: "Bronze", color: "#A87132", emoji: "🥉", discount: 15 },
  silver: { label: "Silver", color: "#9CA3AF", emoji: "🥈", discount: 25 },
  gold: { label: "Gold", color: "var(--ls-gold)", emoji: "🥇", discount: 35 },
  ambassador: { label: "Ambassadeur", color: "var(--ls-purple)", emoji: "👑", discount: 42 },
};

function formatEur(n: number): string {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

function monthLabel(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00Z");
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
  } catch {
    return "";
  }
}

interface DownlineEntry {
  user: User;
  rankLabel: string;
  rankMarginPct: number;
  /** Profondeur dans l arbre du viewer (1 = downline directe, 2 = grandchild, ...). */
  depth: number;
  /** Chemin lisible du viewer vers Y, ex "Mandy → Victoria" pour L2. */
  chainLabel: string;
  /** Si dispo : breakdown precis par tier (V2 fiche RO). */
  breakdown: PvMonthlyBreakdown | null;
  /** PV total ce mois (somme breakdown OU monthly_pv_override OU null). */
  monthlyPv: number | null;
  /** Override EUR pour le viewer — calcul chaine compression V2.1. */
  overrideEur: number;
  /** True si la valeur d override est calculee depuis le breakdown V2. */
  overrideIsExact: boolean;
}

export function RentabilityDetailModal({ data, onClose }: RentabilityDetailModalProps) {
  const { users, currentUser } = useAppContext();
  const zone = rentabilityZone(data.margin_eur);
  const zoneColor = ZONE_COLOR[zone];

  const delta = data.margin_eur - data.prev_month_eur;
  const deltaPct =
    data.prev_month_eur > 0 ? Math.round((delta / data.prev_month_eur) * 100) : null;

  const hasVipClients = data.clients_vip_count > 0;

  // ─── Onglet de filtrage (chantier V3 2026-11-07) ───────────────────────────
  const [tab, setTab] = useState<FilterTab>("all");

  // ─── Tree walk V2.1 — chaine compression Herbalife (chantier 2026-11-07) ──
  // Walk recursif de l arbre downline du viewer pour calculer son override
  // exact a chaque niveau, en appliquant la regle de compression :
  //   cut% = max(0, viewer_tier - max(Y_tier, ...intermediates))
  const ownerIds = useMemo(() => new Set(data.scope_user_ids), [data.scope_user_ids]);
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { getForUser: getBreakdownForUser } = usePvBreakdowns(monthIso);

  const downline = useMemo<DownlineEntry[]>(() => {
    if (!currentUser) return [];
    // Affiche la downline pour QUI QUE CE SOIT que l app autorise a ouvrir
    // cette rentab (la RPC get_users_rentability fait deja le check d acces).
    // Avant : on bloquait si scope!=viewer ; ce qui empechait l admin de voir
    // la downline d un membre d equipe (cas Thomas viewing Mandy 2026-11-07).
    const viewerIsAdminOrRef = currentUser.role === "admin" || currentUser.role === "referent";
    const scopeIsViewer = ownerIds.has(currentUser.id);
    if (!viewerIsAdminOrRef && !scopeIsViewer) return [];

    // Viewer tier = max des tiers du scope (couple agrege : on prend le plus haut).
    const viewerTierPct = Math.max(
      ...data.scope_user_ids.map((uid) => {
        const u = users.find((x) => x.id === uid);
        return tierPctForRank(u?.currentRank);
      }),
    );

    // Index sponsor -> children pour walk efficace
    const childrenBySponsor = new Map<string, User[]>();
    for (const u of users) {
      if (u.frozenAt) continue;
      if (!u.sponsorId) continue;
      const arr = childrenBySponsor.get(u.sponsorId) ?? [];
      arr.push(u);
      childrenBySponsor.set(u.sponsorId, arr);
    }

    const result: DownlineEntry[] = [];

    // Pile de walk : { user, depth, intermediateTiers, chainLabels }
    interface WalkFrame {
      user: User;
      depth: number;
      intermediateTiers: number[];
      chainLabels: string[];
    }
    const queue: WalkFrame[] = [];
    // Bootstrap : enfants directs des owners (Thomas + Melanie si couple)
    for (const ownerId of data.scope_user_ids) {
      const directs = childrenBySponsor.get(ownerId) ?? [];
      for (const u of directs) {
        queue.push({ user: u, depth: 1, intermediateTiers: [], chainLabels: [] });
      }
    }

    while (queue.length > 0) {
      const frame = queue.shift()!;
      const { user: u, depth, intermediateTiers, chainLabels } = frame;
      const rankKey = (u.currentRank ?? "distributor_25") as HerbalifeRank;
      const breakdown = getBreakdownForUser(u.id);
      let monthlyPv: number | null = null;
      let overrideEur = 0;
      let overrideIsExact = false;

      if (breakdown) {
        monthlyPv = totalPvFromBreakdown(breakdown);
        overrideEur = computeSponsorCutOnDownstream(breakdown, viewerTierPct, intermediateTiers);
        overrideIsExact = true;
      } else {
        // Fallback : monthly_pv_override + estimation tier final + chain compression
        const isOverrideActive =
          (u as User & { monthlyPvOverrideMonth?: string | null }).monthlyPvOverrideMonth ===
            monthIso &&
          typeof (u as User & { monthlyPvOverride?: number | null }).monthlyPvOverride ===
            "number";
        monthlyPv = isOverrideActive
          ? ((u as User & { monthlyPvOverride?: number | null }).monthlyPvOverride as number)
          : null;
        if (monthlyPv != null) {
          const yTierPct = tierPctForRank(u.currentRank);
          const maxUpstream = Math.max(yTierPct, ...intermediateTiers);
          const cutPct = Math.max(0, viewerTierPct - maxUpstream) / 100;
          overrideEur = monthlyPv * cutPct * PV_TO_EUR_RATIO;
        }
      }

      result.push({
        user: u,
        rankLabel: RANK_LABELS[rankKey] ?? "Distributor (25%)",
        rankMarginPct: 0,
        depth,
        chainLabel: chainLabels.length > 0 ? chainLabels.join(" → ") : "direct",
        breakdown,
        monthlyPv,
        overrideEur,
        overrideIsExact,
      });

      // Recurse : push children of u
      const yTierPct = tierPctForRank(u.currentRank);
      const childList = childrenBySponsor.get(u.id) ?? [];
      for (const child of childList) {
        queue.push({
          user: child,
          depth: depth + 1,
          intermediateTiers: [...intermediateTiers, yTierPct],
          chainLabels: [...chainLabels, u.name],
        });
      }
    }

    return result.sort((a, b) => (b.overrideEur ?? 0) - (a.overrideEur ?? 0));
  }, [users, currentUser, data.scope_user_ids, ownerIds, monthIso, getBreakdownForUser]);

  const downlineCount = downline.length;
  const downlineTotalOverride = downline.reduce((s, d) => s + d.overrideEur, 0);

  // ─── Top clients filtrés par onglet ────────────────────────────────────────
  const filteredTopClients = useMemo<RentabilityTopClient[]>(() => {
    if (!data.top_clients) return [];
    if (tab === "public") return data.top_clients.filter((c) => !c.is_vip);
    if (tab === "vip") return data.top_clients.filter((c) => c.is_vip);
    return data.top_clients;
  }, [data.top_clients, tab]);

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={closeBtnStyle} aria-label="Fermer">×</button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={eyebrowStyle}>💎 Ma rentabilité · {monthLabel(data.month_start)}</div>
          <h2 style={titleStyle}>{data.scope_label}</h2>
          <div style={rankPillStyle}>
            👑 {data.rank_label} · marge perso <strong>{data.margin_pct}%</strong>
          </div>
        </div>

        {/* Big jauge */}
        <div data-stealth style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <RentabilityGauge data={data} size="hero" delay={100} />
        </div>

        {/* Calcul détaillé */}
        <SectionTitle>📊 Le calcul</SectionTitle>
        <div data-stealth style={calcGridStyle}>
          <CalcRow
            label="Chiffre d'affaires brut"
            value={formatEur(data.revenue_brut)}
            sub={`${data.products_count} programme${data.products_count > 1 ? "s" : ""} vendu${data.products_count > 1 ? "s" : ""} ce mois`}
            color="var(--ls-text)"
          />
          <CalcRow
            label="× marge perso (rang)"
            value={`${data.margin_pct} %`}
            sub={data.rank_label}
            color="var(--ls-text-muted)"
          />
          <CalcRow
            label="= Marge brute nette"
            value={formatEur(data.margin_eur)}
            sub={data.products_count > 0 ? "ton revenu net du mois (clients VIP inclus)" : "aucune vente trackée"}
            color={zoneColor}
            highlight
          />
        </div>

        {/* Onglets cliquables : Publics / VIP / Distributeurs */}
        <SectionTitle>🎯 Split par type · clique pour filtrer</SectionTitle>
        <div data-stealth style={tabsRowStyle}>
          <FilterTabCard
            label="Clients publics"
            emoji="👥"
            count={data.clients_public_count}
            primary={formatEur(data.margin_public_eur)}
            sub={`sur ${formatEur(data.revenue_public)} de CA`}
            note={`Marge complète : ${data.margin_pct}%`}
            color="var(--ls-teal)"
            active={tab === "public"}
            onClick={() => setTab(tab === "public" ? "all" : "public")}
          />
          <FilterTabCard
            label="Clients VIP"
            emoji="💎"
            count={data.clients_vip_count}
            primary={formatEur(data.margin_vip_eur)}
            sub={`sur ${formatEur(data.revenue_vip)} de CA`}
            note={
              hasVipClients
                ? "Marge nette = marge perso − remise VIP"
                : "Aucun VIP ce mois"
            }
            color="var(--ls-gold)"
            active={tab === "vip"}
            onClick={() => setTab(tab === "vip" ? "all" : "vip")}
            disabled={!hasVipClients}
          />
          {downlineCount > 0 ? (
            <FilterTabCard
              label="Distributeurs"
              emoji="🤝"
              count={downlineCount}
              primary={formatEur(downlineTotalOverride)}
              sub="estimation override €"
              note="Détail par distri ci-dessous"
              color="var(--ls-purple)"
              active={tab === "distri"}
              onClick={() => setTab(tab === "distri" ? "all" : "distri")}
            />
          ) : null}
        </div>
        {tab !== "all" ? (
          <button
            type="button"
            onClick={() => setTab("all")}
            style={resetFilterBtnStyle}
          >
            ✕ Retirer le filtre
          </button>
        ) : null}
        {hasVipClients && (
          <div style={vipNoteStyle}>
            ℹ️ Les clients VIP paient moins cher (remise selon tier : bronze 15 % → ambassadeur 42 %).
            Ta marge nette = ta marge perso ({data.margin_pct} %) − remise VIP du client.
          </div>
        )}

        {/* Projection vs mois précédent */}
        <SectionTitle>📈 Projection & comparaison</SectionTitle>
        <div data-stealth style={twoColStyle}>
          <ProjectionCard
            title="Fin de mois"
            value={formatEur(data.projection_eur)}
            sub={
              data.days_elapsed < data.days_in_month
                ? `Au rythme actuel (jour ${data.days_elapsed}/${data.days_in_month})`
                : "Mois écoulé"
            }
            color={zoneColor}
          />
          <ProjectionCard
            title="Mois précédent"
            value={formatEur(data.prev_month_eur)}
            sub={
              deltaPct !== null
                ? delta >= 0
                  ? `📈 +${formatEur(delta)} (+${deltaPct}%)`
                  : `📉 ${formatEur(delta)} (${deltaPct}%)`
                : "—"
            }
            color={delta >= 0 ? "var(--ls-teal)" : "var(--ls-coral)"}
          />
        </div>

        {/* Arborescence : top clients filtrés OU downline distri */}
        {tab === "distri" ? (
          downlineCount > 0 ? (
            <>
              <SectionTitle>🤝 Mes distributeurs · contributions</SectionTitle>
              <ul data-stealth style={clientsListStyle}>
                {downline.map((d, i) => (
                  <DownlineRow key={d.user.id} entry={d} rank={i} />
                ))}
              </ul>
              <div style={methodoStyle}>
                ℹ️ <strong>Chaîne compression Herbalife</strong> : pour chaque distri en
                downline (L1, L2, L3...), ta cut = (ton % − max(% downstream)) × PV × {PV_TO_EUR_RATIO} €/PV.
                Ex : Thomas 50%, Mandy 42%, Victoria 35% → tu touches <strong>8%</strong> sur Mandy
                ET sur Victoria (différentiel Thomas−Mandy). Mandy touche les 7% Mandy−Victoria à part.
                Override exact si breakdown saisi, sinon estimation rang final.
                Calibré fiche RO Herbalife 2026-03.
              </div>
            </>
          ) : null
        ) : data.top_clients && data.top_clients.length > 0 ? (
          <>
            <SectionTitle>
              🏆 Top clients ce mois
              {tab === "public" ? " · publics" : tab === "vip" ? " · VIP" : ""}
            </SectionTitle>
            {filteredTopClients.length > 0 ? (
              <ul data-stealth style={clientsListStyle}>
                {filteredTopClients.map((c, i) => (
                  <TopClientRow key={c.client_id} client={c} rank={i} />
                ))}
              </ul>
            ) : (
              <div style={emptyFilterStyle}>
                Aucun client {tab === "vip" ? "VIP" : "public"} dans le top ce mois.
              </div>
            )}
          </>
        ) : null}

        {/* Note méthodologie */}
        <div style={methodoStyle}>
          ℹ️ Calcul basé sur les programmes trackés dans l'app La Base 360 (commandes via fiche client).
          Les commandes hors-fiche (perso, club, Bizworks direct) ne sont pas incluses dans cette V1.
        </div>

        <button type="button" onClick={onClose} style={ghostBtnStyle}>
          Fermer
        </button>
      </div>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={sectionTitleStyle}>{children}</h3>;
}

function CalcRow({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color: string; highlight?: boolean }) {
  return (
    <div style={highlight ? calcRowHighlightStyle(color) : calcRowStyle}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--ls-text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: highlight ? 800 : 700, fontSize: highlight ? 22 : 16, color }}>
        {value}
      </div>
    </div>
  );
}

function FilterTabCard({
  label,
  emoji,
  count,
  primary,
  sub,
  note,
  color,
  active,
  onClick,
  disabled,
}: {
  label: string;
  emoji: string;
  count: number;
  primary: string;
  sub: string;
  note: string;
  color: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const isEmpty = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={tabCardStyle(color, isEmpty, active, !!disabled)}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--ls-text)" }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
          · {count}
        </span>
      </div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color, marginBottom: 4 }}>
        {primary}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 4 }}>
        {sub}
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", fontStyle: "italic" }}>{note}</div>
      {active ? (
        <div style={activeBadgeStyle(color)}>✓ filtre actif</div>
      ) : null}
    </button>
  );
}

function ProjectionCard({ title, value, sub, color }: { title: string; value: string; sub: string; color: string }) {
  return (
    <div style={projectionCardStyle(color)}>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>{title}</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function TopClientRow({ client, rank }: { client: RentabilityTopClient; rank: number }) {
  const vipMeta = client.vip_status && client.vip_status !== "none" ? VIP_META[client.vip_status] : null;
  const products = client.products?.slice(0, 2).join(" · ") ?? "";
  const moreProducts = (client.products?.length ?? 0) > 2 ? ` (+${client.products.length - 2})` : "";

  return (
    <li style={clientRowStyle(rank)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={rankBadgeStyle(rank)}>#{rank + 1}</span>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", flex: 1 }}>
          {client.client_name}
        </span>
        {vipMeta && (
          <span style={vipBadgeStyle(vipMeta.color)}>
            {vipMeta.emoji} {vipMeta.label} −{vipMeta.discount}%
          </span>
        )}
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", whiteSpace: "nowrap" }}>
          {formatEur(client.revenue)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", paddingLeft: 32 }}>
        {client.items_count} produit{client.items_count > 1 ? "s" : ""}
        {products && ` · ${products}${moreProducts}`}
        {" · "}
        <strong style={{ color: "var(--ls-gold)" }}>marge {formatEur(client.margin)}</strong>
      </div>
    </li>
  );
}

function DownlineRow({ entry, rank }: { entry: DownlineEntry; rank: number }) {
  const { user, rankLabel, monthlyPv, overrideEur, overrideIsExact, breakdown, depth, chainLabel } = entry;
  const depthBadge = depth === 1 ? "L1 direct" : `L${depth} via ${chainLabel}`;
  const breakdownDetail = breakdown
    ? [
        breakdown.pv15 > 0 ? `${breakdown.pv15} PV @15%` : null,
        breakdown.pv25 > 0 ? `${breakdown.pv25} PV @25%` : null,
        breakdown.pv35 > 0 ? `${breakdown.pv35} PV @35%` : null,
        breakdown.pv42 > 0 ? `${breakdown.pv42} PV @42%` : null,
        breakdown.pvRoyalty > 0 ? `${breakdown.pvRoyalty} PV royalty` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <li style={clientRowStyle(rank)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={rankBadgeStyle(rank)}>#{rank + 1}</span>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", flex: 1 }}>
          {user.name}
        </span>
        <span style={vipBadgeStyle("var(--ls-purple)")}>
          {rankLabel}
        </span>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-purple)", whiteSpace: "nowrap" }}>
          {overrideIsExact ? "" : "~"}{formatEur(overrideEur)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", paddingLeft: 32 }}>
        <span style={{
          display: "inline-block",
          padding: "1px 6px",
          borderRadius: 5,
          background: depth === 1 ? "color-mix(in srgb, var(--ls-teal) 14%, transparent)" : "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
          color: depth === 1 ? "var(--ls-teal)" : "var(--ls-purple)",
          fontWeight: 700,
          marginRight: 6,
          fontSize: 9,
        }}>
          {depthBadge}
        </span>
        {breakdownDetail ? (
          <>
            <strong>{(monthlyPv ?? 0).toLocaleString("fr-FR")} PV</strong> · {breakdownDetail}
            <span style={{ color: "var(--ls-teal)", fontWeight: 700, marginLeft: 6 }}>· exact</span>
          </>
        ) : monthlyPv != null ? (
          <>
            <strong>{monthlyPv.toLocaleString("fr-FR")} PV</strong> ce mois (estim. compression chaine)
          </>
        ) : (
          <em>PV non saisi · clique fiche distri pour saisir le breakdown</em>
        )}
      </div>
    </li>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0,
  background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
  padding: "20px 16px", overflowY: "auto",
};

const modalStyle: React.CSSProperties = {
  position: "relative", width: "100%", maxWidth: 580,
  maxHeight: "calc(100vh - 40px)", overflowY: "auto",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 22, padding: "26px 24px",
  boxShadow: "0 24px 80px color-mix(in srgb, var(--ls-text) 24%, transparent)",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute", top: 12, right: 14,
  width: 36, height: 36, borderRadius: 12,
  background: "transparent", border: "none",
  color: "var(--ls-text-muted)", fontSize: 26, cursor: "pointer", lineHeight: 1,
};

const headerStyle: React.CSSProperties = {
  textAlign: "center", marginBottom: 18, paddingRight: 30,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10, color: "var(--ls-gold)", textTransform: "uppercase",
  letterSpacing: 1.4, fontWeight: 700, marginBottom: 4,
};

const titleStyle: React.CSSProperties = {
  margin: 0, fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ls-text)",
};

const rankPillStyle: React.CSSProperties = {
  display: "inline-block", marginTop: 6,
  fontSize: 11, padding: "3px 10px", borderRadius: 9,
  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
  color: "var(--ls-gold)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
  fontFamily: "DM Sans, sans-serif", fontWeight: 600,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "20px 0 10px", fontFamily: "Syne, sans-serif",
  fontSize: 14, fontWeight: 700, color: "var(--ls-text)",
};

const calcGridStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 6,
};

const calcRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "10px 12px", background: "var(--ls-surface2)",
  borderRadius: 10, gap: 10,
};

const calcRowHighlightStyle = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "14px 14px", borderRadius: 12, gap: 10,
  background: `color-mix(in srgb, ${color} 8%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  boxShadow: `0 6px 20px color-mix(in srgb, ${color} 14%, transparent)`,
});

const tabsRowStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10,
};

const twoColStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
};

const tabCardStyle = (
  color: string,
  isEmpty: boolean,
  active: boolean,
  disabled: boolean,
): React.CSSProperties => ({
  position: "relative",
  textAlign: "left",
  background: active
    ? `color-mix(in srgb, ${color} 14%, var(--ls-surface))`
    : isEmpty
      ? "var(--ls-surface2)"
      : `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: active
    ? `1px solid ${color}`
    : isEmpty
      ? "0.5px dashed var(--ls-border)"
      : `0.5px solid ${color}`,
  borderRadius: 12,
  padding: "12px 14px 22px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : isEmpty ? 0.6 : 1,
  fontFamily: "inherit",
  transition: "transform 0.15s, box-shadow 0.15s, background 0.15s",
  boxShadow: active ? `0 4px 14px color-mix(in srgb, ${color} 18%, transparent)` : "none",
});

const activeBadgeStyle = (color: string): React.CSSProperties => ({
  position: "absolute",
  bottom: 6,
  right: 8,
  fontSize: 9,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 700,
  padding: "2px 7px",
  borderRadius: 6,
  background: color,
  color: "var(--ls-bg)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const resetFilterBtnStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "7px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  cursor: "pointer",
};

const projectionCardStyle = (color: string): React.CSSProperties => ({
  background: `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
  border: `0.5px solid ${color}`,
  borderRadius: 12, padding: "14px 16px",
});

const vipNoteStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "8px 12px",
  background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, transparent)",
  borderRadius: 10,
  fontSize: 11, color: "var(--ls-text-muted)",
  lineHeight: 1.5,
};

const clientsListStyle: React.CSSProperties = {
  margin: 0, padding: 0, listStyle: "none",
  display: "flex", flexDirection: "column", gap: 6,
};

const clientRowStyle = (idx: number): React.CSSProperties => ({
  padding: "10px 12px",
  background: idx === 0
    ? "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))"
    : "var(--ls-surface2)",
  borderRadius: 10,
  border: idx === 0 ? "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)" : "none",
});

const rankBadgeStyle = (idx: number): React.CSSProperties => {
  const colors = ["var(--ls-gold)", "#9CA3AF", "#A87132", "var(--ls-text-muted)", "var(--ls-text-muted)"];
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 22,
    fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 11,
    color: colors[Math.min(idx, 4)],
  };
};

const vipBadgeStyle = (color: string): React.CSSProperties => ({
  fontSize: 9,
  fontFamily: "DM Sans, sans-serif", fontWeight: 700,
  padding: "2px 7px",
  borderRadius: 6,
  background: `color-mix(in srgb, ${color} 14%, transparent)`,
  color, border: `0.5px solid ${color}`,
  whiteSpace: "nowrap",
});

const emptyFilterStyle: React.CSSProperties = {
  padding: "16px 14px",
  background: "var(--ls-surface2)",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontStyle: "italic",
  textAlign: "center",
};

const methodoStyle: React.CSSProperties = {
  marginTop: 18, padding: "10px 12px",
  background: "var(--ls-surface2)", border: "0.5px solid var(--ls-border)",
  borderRadius: 10, fontSize: 11, color: "var(--ls-text-muted)",
  lineHeight: 1.5, fontStyle: "italic",
};

const ghostBtnStyle: React.CSSProperties = {
  width: "100%", marginTop: 16,
  padding: "12px 18px", borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent", color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
