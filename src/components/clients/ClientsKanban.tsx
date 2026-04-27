// =============================================================================
// ClientsKanban — vue kanban drag-and-drop (Chantier C.2 v2 premium, 2026-04-29)
// =============================================================================
//
// Vraie experience kanban a la Trello/Notion :
//   - 5 colonnes par lifecycle_status, scrollables horizontalement
//   - Drag-and-drop natif via @dnd-kit/core (souris + tactile)
//   - Au drop : appel a setClientLifecycleStatus pour persister
//   - Card hover lift + ghost pendant le drag + drop indicator visuel
//   - Click sur card -> navigate vers /clients/:id (sauf si on draggue)
//
// Accessibility : @dnd-kit fournit clavier + screen reader nativement.
// Mobile : pointer events fonctionnent sur touch (long-press pour grab).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDraggable,
  useDroppable,
  DragOverlay,
} from "@dnd-kit/core";
import type { Client, LifecycleStatus, User } from "../../types/domain";
import { isClientProgramStarted } from "../../lib/calculations";
import { formatRelativeShort } from "../../lib/formatRelative";

type KanbanColumn = {
  id: LifecycleStatus;
  label: string;
  emoji: string;
  tone: "gold" | "teal" | "purple" | "neutral" | "coral";
};

const COLUMNS: KanbanColumn[] = [
  { id: "not_started", label: "À démarrer", emoji: "📋", tone: "gold" },
  { id: "active", label: "En suivi actif", emoji: "🔥", tone: "teal" },
  { id: "paused", label: "En pause", emoji: "⏸", tone: "purple" },
  { id: "stopped", label: "Arrêté", emoji: "⛔", tone: "neutral" },
  { id: "lost", label: "Perdu", emoji: "💔", tone: "coral" },
];

function getToneColors(tone: KanbanColumn["tone"]) {
  switch (tone) {
    case "gold":
      return { bg: "color-mix(in srgb, var(--ls-gold) 6%, transparent)", border: "var(--ls-gold)", text: "var(--ls-gold)" };
    case "teal":
      return { bg: "color-mix(in srgb, var(--ls-teal) 6%, transparent)", border: "var(--ls-teal)", text: "var(--ls-teal)" };
    case "purple":
      return { bg: "color-mix(in srgb, var(--ls-purple) 6%, transparent)", border: "var(--ls-purple)", text: "var(--ls-purple)" };
    case "coral":
      return { bg: "color-mix(in srgb, var(--ls-coral) 6%, transparent)", border: "var(--ls-coral)", text: "var(--ls-coral)" };
    default:
      return { bg: "var(--ls-surface2)", border: "var(--ls-border)", text: "var(--ls-text-muted)" };
  }
}

function effectiveLifecycle(client: Client): LifecycleStatus {
  return client.lifecycleStatus ?? (isClientProgramStarted(client) ? "active" : "not_started");
}

function getLastContactDate(client: Client): string | null {
  if (!client.assessments?.length) return null;
  return [...client.assessments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    ?.date ?? null;
}

interface ClientsKanbanProps {
  clients: Client[];
  users: User[];
  onMoveClient: (clientId: string, status: LifecycleStatus) => void | Promise<void>;
}

export function ClientsKanban({ clients, users, onMoveClient }: ClientsKanbanProps) {
  const [activeClientId, setActiveClientId] = useState<string | null>(null);

  // Sensor : 5px movement threshold (evite de declencher drag sur simple click)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Group clients by effective lifecycle status
  const grouped = useMemo(() =>
    COLUMNS.reduce<Record<LifecycleStatus, Client[]>>((acc, col) => {
      acc[col.id] = clients.filter((c) => effectiveLifecycle(c) === col.id);
      return acc;
    }, { not_started: [], active: [], paused: [], stopped: [], lost: [] }),
    [clients]);

  const activeClient = activeClientId ? clients.find((c) => c.id === activeClientId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveClientId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveClientId(null);
    const { active, over } = event;
    if (!over) return;
    const clientId = String(active.id);
    const targetCol = String(over.id) as LifecycleStatus;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    if (effectiveLifecycle(client) === targetCol) return; // pas de change
    await onMoveClient(clientId, targetCol);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(240px, 1fr))",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
        }}
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            clients={grouped[column.id]}
            users={users}
            isAnyDragging={activeClientId !== null}
          />
        ))}
      </div>

      {/* Overlay rendu au-dessus de tout pendant le drag */}
      <DragOverlay dropAnimation={{ duration: 160, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
        {activeClient && (
          <ClientCardPresentation
            client={activeClient}
            owner={users.find((u) => u.id === activeClient.distributorId)}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Colonne droppable ──────────────────────────────────────────────────────

function KanbanColumn({
  column,
  clients,
  users,
  isAnyDragging,
}: {
  column: KanbanColumn;
  clients: Client[];
  users: User[];
  isAnyDragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const colors = getToneColors(column.tone);

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        background: isOver ? `color-mix(in srgb, ${colors.border} 12%, transparent)` : colors.bg,
        border: isOver ? `1.5px dashed ${colors.border}` : `1px solid ${colors.border}30`,
        borderRadius: 12,
        minHeight: 200,
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      {/* Header colonne */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          fontSize: 12,
          fontWeight: 600,
          color: colors.text,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <span style={{ fontSize: 14 }}>{column.emoji}</span>
        <span>{column.label}</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            padding: "1px 7px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${colors.border} 18%, transparent)`,
            color: colors.text,
            fontWeight: 600,
          }}
        >
          {clients.length}
        </span>
      </div>

      {/* Cards clients */}
      {clients.length === 0 ? (
        <div
          style={{
            padding: "16px 12px",
            textAlign: "center",
            fontSize: 11,
            color: "var(--ls-text-hint)",
            fontStyle: "italic",
            border: isAnyDragging ? `1.5px dashed ${colors.border}50` : "1.5px dashed transparent",
            borderRadius: 10,
            transition: "border-color 150ms ease",
          }}
        >
          {isAnyDragging ? "Déposer ici" : "Aucun client"}
        </div>
      ) : (
        clients.map((client) => (
          <DraggableClientCard
            key={client.id}
            client={client}
            owner={users.find((u) => u.id === client.distributorId)}
          />
        ))
      )}
    </div>
  );
}

// ─── Card draggable ──────────────────────────────────────────────────────────

function DraggableClientCard({ client, owner }: { client: Client; owner?: User }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: client.id,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.4 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <ClientCardPresentation
        client={client}
        owner={owner}
        onCardClick={() => {
          if (!isDragging) navigate(`/clients/${client.id}`);
        }}
      />
    </div>
  );
}

// ─── Card visuel pur (utilise dans la colonne ET dans le DragOverlay) ────────

function ClientCardPresentation({
  client,
  owner,
  isDragging = false,
  onCardClick,
}: {
  client: Client;
  owner?: User;
  isDragging?: boolean;
  onCardClick?: () => void;
}) {
  const lastContact = getLastContactDate(client);
  const now = new Date();

  return (
    <div
      onClick={onCardClick}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.04)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "";
        }
      }}
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 10,
        padding: "10px 12px",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        cursor: onCardClick ? "pointer" : "grabbing",
        boxShadow: isDragging ? "0 12px 28px rgba(0,0,0,0.18)" : "none",
        transform: isDragging ? "rotate(-2deg) scale(1.02)" : "none",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ls-text)", marginBottom: 4 }}>
        {client.firstName} {client.lastName}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 4, lineHeight: 1.3 }}>
        {client.currentProgram || "Pas de programme"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
          📅 {formatRelativeShort(lastContact, now)}
        </span>
        {owner && (
          <span
            style={{
              fontSize: 9,
              color: "var(--ls-text-hint)",
              padding: "1px 5px",
              borderRadius: 6,
              background: "var(--ls-surface2)",
            }}
          >
            {owner.name?.split(/\s+/)[0] ?? owner.name}
          </span>
        )}
      </div>
    </div>
  );
}
