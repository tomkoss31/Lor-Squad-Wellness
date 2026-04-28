// =============================================================================
// PvKanban — vue Kanban /pv (2026-04-29)
// =============================================================================
//
// 4 colonnes priorité décroissante :
//   1. 🔴 En retard   - record.status restock | inconsistent
//   2. 🟡 À relancer  - record.status watch | follow-up + top dormants du plan
//   3. 💜 Silencieux  - silent_active du plan, pas déjà dans col 1/2
//   4. 🟢 OK          - tout le reste
//
// Cards cliquables (vers fiche client). Pas de drag-and-drop : le statut
// est calculé, pas modifiable manuellement (contrairement au lifecycle
// kanban de /clients).
// =============================================================================

import { useMemo } from "react";
import type { PvClientTrackingRecord } from "../../types/pv";
import type { PvActionPlan } from "../../hooks/usePvActionPlan";

interface Props {
  records: PvClientTrackingRecord[];
  plan: PvActionPlan | null;
  isAdmin: boolean;
  currentUserId: string | null;
  /** Callback au clic sur une card -> ouvre la fiche PvClientFullPage
      (meme comportement que le clic dans la vue liste). 2026-04-29. */
  onSelectClient: (clientId: string) => void;
}

interface KanbanCard {
  clientId: string;
  clientName: string;
  responsibleName: string;
  responsibleId: string;
  reasonBadges: { label: string; tone: "coral" | "gold" | "purple" | "teal" }[];
  pvCumulative: number;
  daysSinceStart: number;
}

type ColumnKey = "overdue" | "watch" | "silent" | "ok";

interface Column {
  key: ColumnKey;
  label: string;
  emoji: string;
  color: string;
  bgTint: string;
  cards: KanbanCard[];
}

export function PvKanban({ records, plan, isAdmin, currentUserId, onSelectClient }: Props) {

  const columns: Column[] = useMemo(() => {
    const overdueIds = new Set(plan?.restock_due?.map((r) => r.client_id) ?? []);
    const dormantIds = new Set(plan?.top_dormant?.map((r) => r.client_id) ?? []);
    const silentIds = new Set(plan?.silent_active?.map((r) => r.client_id) ?? []);

    const overdue: KanbanCard[] = [];
    const watch: KanbanCard[] = [];
    const silent: KanbanCard[] = [];
    const ok: KanbanCard[] = [];

    for (const r of records) {
      const isOverdueStatus = r.status === "restock" || r.status === "inconsistent";
      const isWatchStatus = r.status === "watch" || r.status === "follow-up";
      const isInRestockPlan = overdueIds.has(r.clientId);
      const isInDormantPlan = dormantIds.has(r.clientId);
      const isInSilentPlan = silentIds.has(r.clientId);

      const reasonBadges: KanbanCard["reasonBadges"] = [];

      if (isOverdueStatus) {
        reasonBadges.push({ label: "En retard cure", tone: "coral" });
      }
      if (isInRestockPlan) {
        const restockEntry = plan?.restock_due?.find((x) => x.client_id === r.clientId);
        const days = restockEntry?.days_left ?? 0;
        reasonBadges.push({
          label: days <= 0 ? "Cure finie" : `Cure ${days}j`,
          tone: "coral",
        });
      }
      if (isWatchStatus && !isOverdueStatus) {
        reasonBadges.push({ label: "À surveiller", tone: "gold" });
      }
      if (isInDormantPlan) {
        const dormantEntry = plan?.top_dormant?.find((x) => x.client_id === r.clientId);
        reasonBadges.push({
          label: `${dormantEntry?.days_since ?? 0}j sans cmd`,
          tone: "gold",
        });
      }
      if (isInSilentPlan) {
        reasonBadges.push({ label: "Silencieux", tone: "purple" });
      }

      const card: KanbanCard = {
        clientId: r.clientId,
        clientName: r.clientName,
        responsibleName: r.responsibleName,
        responsibleId: r.responsibleId,
        reasonBadges,
        pvCumulative: r.pvCumulative ?? 0,
        daysSinceStart: r.daysSinceStart ?? 0,
      };

      // Routage prioritaire (un client = une colonne)
      if (isOverdueStatus || isInRestockPlan) {
        overdue.push(card);
      } else if (isWatchStatus || isInDormantPlan) {
        watch.push(card);
      } else if (isInSilentPlan) {
        silent.push(card);
      } else {
        ok.push(card);
      }
    }

    // Ajout des silent_active qui ne sont pas dans records (clients sans
    // produit actif mais quand meme silencieux — cas rare mais possible).
    if (plan?.silent_active) {
      const knownIds = new Set(records.map((r) => r.clientId));
      for (const s of plan.silent_active) {
        if (knownIds.has(s.client_id)) continue;
        silent.push({
          clientId: s.client_id,
          clientName: s.client_name,
          responsibleName: "—",
          responsibleId: "",
          reasonBadges: [{ label: `${s.days_silent}j sans msg`, tone: "purple" }],
          pvCumulative: 0,
          daysSinceStart: 0,
        });
      }
    }

    return [
      {
        key: "overdue",
        label: "En retard",
        emoji: "🔴",
        color: "var(--ls-coral)",
        bgTint: "color-mix(in srgb, var(--ls-coral) 6%, var(--ls-surface))",
        cards: overdue,
      },
      {
        key: "watch",
        label: "À relancer",
        emoji: "🟡",
        color: "var(--ls-gold)",
        bgTint: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
        cards: watch,
      },
      {
        key: "silent",
        label: "Silencieux",
        emoji: "💜",
        color: "var(--ls-purple)",
        bgTint: "color-mix(in srgb, var(--ls-purple) 6%, var(--ls-surface))",
        cards: silent,
      },
      {
        key: "ok",
        label: "OK",
        emoji: "🟢",
        color: "var(--ls-teal)",
        bgTint: "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface))",
        cards: ok,
      },
    ];
  }, [records, plan]);

  return (
    <div
      className="pv-kanban"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        alignItems: "start",
      }}
    >
      {columns.map((col) => (
        <div
          key={col.key}
          style={{
            background: col.bgTint,
            border: "0.5px solid var(--ls-border)",
            borderTop: `2px solid ${col.color}`,
            borderRadius: 14,
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minHeight: 200,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 4px 8px",
              borderBottom: "0.5px dashed var(--ls-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "Syne, serif",
                fontWeight: 700,
                fontSize: 13,
                color: col.color,
              }}
            >
              <span style={{ fontSize: 14 }}>{col.emoji}</span>
              {col.label}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                color: col.color,
                background: "var(--ls-surface)",
                padding: "2px 8px",
                borderRadius: 999,
                border: `0.5px solid ${col.color}`,
              }}
            >
              {col.cards.length}
            </span>
          </div>

          {col.cards.length === 0 ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--ls-text-hint)",
                fontStyle: "italic",
                textAlign: "center",
                padding: "20px 8px",
              }}
            >
              Aucun client dans cette colonne
            </div>
          ) : (
            col.cards.map((card) => (
              <PvKanbanCard
                key={card.clientId}
                card={card}
                isMine={isAdmin && card.responsibleId === currentUserId}
                onClick={() => onSelectClient(card.clientId)}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function PvKanbanCard({
  card,
  isMine,
  onClick,
}: {
  card: KanbanCard;
  isMine: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 10,
        padding: "10px 12px",
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "DM Sans, sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--ls-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {card.clientName}
        </div>
        {isMine ? (
          <span
            title="Ton client"
            style={{
              padding: "1px 5px",
              borderRadius: 6,
              fontSize: 8,
              fontWeight: 700,
              background: "rgba(239,159,39,0.14)",
              color: "#BA7517",
              flexShrink: 0,
              letterSpacing: "0.04em",
            }}
          >
            MIEN
          </span>
        ) : null}
      </div>

      {card.reasonBadges.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {card.reasonBadges.map((b, i) => (
            <span
              key={`${b.label}-${i}`}
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 6,
                background: toneBg(b.tone),
                color: toneColor(b.tone),
                whiteSpace: "nowrap",
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 6,
          fontSize: 10,
          color: "var(--ls-text-hint)",
        }}
      >
        <span>
          {card.pvCumulative > 0
            ? `${card.pvCumulative.toFixed(0)} PV cumul`
            : "Pas de PV cumul"}
        </span>
        {card.daysSinceStart > 0 ? <span>{card.daysSinceStart}j</span> : null}
      </div>
    </div>
  );
}

function toneBg(tone: "coral" | "gold" | "purple" | "teal"): string {
  switch (tone) {
    case "coral":
      return "rgba(220,38,38,0.10)";
    case "gold":
      return "rgba(184,146,42,0.12)";
    case "purple":
      return "rgba(124,58,237,0.10)";
    case "teal":
      return "rgba(13,148,136,0.10)";
  }
}

function toneColor(tone: "coral" | "gold" | "purple" | "teal"): string {
  switch (tone) {
    case "coral":
      return "var(--ls-coral)";
    case "gold":
      return "var(--ls-gold)";
    case "purple":
      return "var(--ls-purple)";
    case "teal":
      return "var(--ls-teal)";
  }
}
