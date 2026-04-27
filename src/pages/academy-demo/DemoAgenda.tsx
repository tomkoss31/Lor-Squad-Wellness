// Chantier Academy pages démo (2026-04-28).
// Agenda mockup pour la section Academy "agenda". 5 RDV fictifs répartis
// sur la semaine (clients + prospects + suivis), filtres entité au-dessus.
//
// Spotlights ciblables :
//   - data-tour-id="agenda-filters" sur les pills entité
//   - data-tour-id="agenda-new-rdv" sur le CTA gold
//   - data-tour-id="agenda-upcoming" sur la liste

import { useMemo, useState } from "react";
import { DemoBanner } from "../../features/academy/components/DemoBanner";

type Entity = "all" | "clients" | "prospects" | "followups";

interface DemoEvent {
  id: string;
  type: "client" | "prospect" | "followup";
  title: string;
  client: string;
  date: string; // ISO
  duration: string;
}

function todayPlus(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "ev-1",
    type: "client",
    title: "Bilan initial",
    client: "Sarah Martin",
    date: todayPlus(0, 14, 30),
    duration: "1 h",
  },
  {
    id: "ev-2",
    type: "prospect",
    title: "1er contact prospection",
    client: "Lucas Dubois",
    date: todayPlus(1, 10, 0),
    duration: "30 min",
  },
  {
    id: "ev-3",
    type: "followup",
    title: "Suivi J+7 — VIP",
    client: "Emma Rousseau",
    date: todayPlus(2, 16, 0),
    duration: "20 min",
  },
  {
    id: "ev-4",
    type: "client",
    title: "Re-bilan 30 jours",
    client: "Karim Benali",
    date: todayPlus(3, 11, 30),
    duration: "45 min",
  },
  {
    id: "ev-5",
    type: "client",
    title: "Bilan initial",
    client: "Julie Lambert",
    date: todayPlus(5, 18, 0),
    duration: "1 h",
  },
];

const ENTITY_DOTS: Record<Entity, string | null> = {
  all: null,
  clients: "var(--ls-gold)",
  prospects: "var(--ls-purple)",
  followups: "var(--ls-teal)",
};

const TYPE_LABELS: Record<DemoEvent["type"], { label: string; color: string }> = {
  client: { label: "Client", color: "var(--ls-gold)" },
  prospect: { label: "Prospect", color: "var(--ls-purple)" },
  followup: { label: "Suivi", color: "var(--ls-teal)" },
};

export function DemoAgenda() {
  const [entity, setEntity] = useState<Entity>("all");

  const counts = useMemo(
    () => ({
      all: DEMO_EVENTS.length,
      clients: DEMO_EVENTS.filter((e) => e.type === "client").length,
      prospects: DEMO_EVENTS.filter((e) => e.type === "prospect").length,
      followups: DEMO_EVENTS.filter((e) => e.type === "followup").length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    if (entity === "all") return DEMO_EVENTS;
    if (entity === "clients") return DEMO_EVENTS.filter((e) => e.type === "client");
    if (entity === "prospects") return DEMO_EVENTS.filter((e) => e.type === "prospect");
    return DEMO_EVENTS.filter((e) => e.type === "followup");
  }, [entity]);

  return (
    <div className="space-y-4" style={{ paddingBottom: 40 }}>
      <DemoBanner label="Agenda démo — 5 RDV fictifs sur la semaine" />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: "var(--ls-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            Mode démo
          </p>
          <h1
            style={{
              fontFamily: "Syne, serif",
              fontSize: 24,
              fontWeight: 500,
              color: "var(--ls-text)",
              margin: "4px 0 0",
            }}
          >
            Ton agenda
          </h1>
        </div>
        <button
          type="button"
          data-tour-id="agenda-new-rdv"
          style={{
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 2px 6px rgba(186,117,23,0.25)",
          }}
        >
          + Nouveau RDV
        </button>
      </div>

      {/* Filtres entité */}
      <div
        data-tour-id="agenda-filters"
        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
      >
        {(["all", "clients", "prospects", "followups"] as Entity[]).map((e) => (
          <FilterPill
            key={e}
            label={
              e === "all"
                ? "Tous"
                : e === "clients"
                  ? "Clients"
                  : e === "prospects"
                    ? "Prospects"
                    : "Suivis"
            }
            count={counts[e]}
            active={entity === e}
            dot={ENTITY_DOTS[e]}
            onClick={() => setEntity(e)}
          />
        ))}
      </div>

      {/* Liste des RDV */}
      <div
        data-tour-id="agenda-upcoming"
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 12px",
          }}
        >
          {filtered.length} rendez-vous à venir
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
          {filtered.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                textAlign: "center",
                padding: "20px 0",
                fontStyle: "italic",
              }}
            >
              Aucun RDV pour ce filtre.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  dot,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  dot: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        border: active ? "1.5px solid var(--ls-gold)" : "1px solid var(--ls-border)",
        background: active ? "rgba(201,168,76,0.08)" : "var(--ls-surface)",
        color: active ? "var(--ls-text)" : "var(--ls-text-muted)",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {dot ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dot,
            display: "inline-block",
          }}
        />
      ) : null}
      <span>{label}</span>
      <span
        style={{
          fontSize: 11,
          color: active ? "#B8922A" : "var(--ls-text-hint)",
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function EventCard({ event }: { event: DemoEvent }) {
  const date = new Date(event.date);
  const dateLabel = date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeLabel = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const meta = TYPE_LABELS[event.type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 14px",
        borderRadius: 12,
        background: "var(--ls-surface2)",
        border: "0.5px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          width: 4,
          alignSelf: "stretch",
          minHeight: 32,
          borderRadius: 2,
          background: meta.color,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              background: meta.color,
              color: "white",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {meta.label}
          </span>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--ls-text)", margin: 0 }}>
            {event.title}
          </p>
        </div>
        <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: "4px 0 0" }}>
          {event.client} · {event.duration}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p
          style={{
            fontFamily: "Syne, serif",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ls-text)",
            margin: 0,
          }}
        >
          {dateLabel}
        </p>
        <p style={{ fontSize: 12, color: "#B8922A", margin: 0, fontWeight: 500 }}>{timeLabel}</p>
      </div>
    </div>
  );
}
