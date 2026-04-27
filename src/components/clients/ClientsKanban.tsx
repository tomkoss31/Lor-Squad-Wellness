// =============================================================================
// ClientsKanban — vue kanban de /clients (Chantier C.2, 2026-04-29)
// =============================================================================
//
// Alternative a la vue liste : 5 colonnes par lifecycle_status, chaque
// client devient une mini-card. Pas de drag-and-drop pour eviter la dep
// dnd-kit ; on a un menu "deplacer vers" sur chaque card a la place.
//
// Architecture :
//   - 5 colonnes scrollables horizontalement sur mobile (CSS overflow-x)
//   - Cards compactes : nom + programme + dernier contact + menu deplacer
//   - Click card -> navigate vers la fiche client
//   - Click menu -> ouvre un dropdown avec les 4 autres statuts
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Client, LifecycleStatus, User } from "../../types/domain";
import { isClientProgramStarted } from "../../lib/calculations";

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

function formatRelative(dateStr: string | null, now: Date): string {
  if (!dateStr) return "—";
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return "—";
  const diffDays = Math.floor((now.getTime() - t) / 86_400_000);
  if (diffDays < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return "Aujourd'hui";
    if (futureDays === 1) return "Demain";
    if (futureDays < 7) return `Dans ${futureDays}j`;
    return `Dans ${Math.floor(futureDays / 7)}sem`;
  }
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)}sem`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? "s" : ""}`;
}

interface ClientsKanbanProps {
  clients: Client[];
  users: User[];
  onMoveClient: (clientId: string, status: LifecycleStatus) => void | Promise<void>;
}

export function ClientsKanban({ clients, users, onMoveClient }: ClientsKanbanProps) {
  const navigate = useNavigate();
  const now = new Date();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Group clients by effective lifecycle status
  const grouped = COLUMNS.reduce<Record<LifecycleStatus, Client[]>>((acc, col) => {
    acc[col.id] = clients.filter((c) => effectiveLifecycle(c) === col.id);
    return acc;
  }, { not_started: [], active: [], paused: [], stopped: [], lost: [] });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(240px, 1fr))",
        gap: 12,
        overflowX: "auto",
        paddingBottom: 8,
      }}
    >
      {COLUMNS.map((column) => {
        const clientsInCol = grouped[column.id];
        const colors = getToneColors(column.tone);
        return (
          <div
            key={column.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 10,
              background: colors.bg,
              border: `1px solid ${colors.border}30`,
              borderRadius: 12,
              minHeight: 200,
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
                {clientsInCol.length}
              </span>
            </div>

            {/* Cards clients */}
            {clientsInCol.length === 0 ? (
              <div
                style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--ls-text-hint)",
                  fontStyle: "italic",
                }}
              >
                Aucun client
              </div>
            ) : (
              clientsInCol.map((client) => {
                const owner = users.find((u) => u.id === client.distributorId);
                const lastContact = getLastContactDate(client);
                const isMenuOpen = openMenuId === client.id;
                const otherColumns = COLUMNS.filter((c) => c.id !== column.id);
                return (
                  <div
                    key={client.id}
                    style={{
                      background: "var(--ls-surface)",
                      border: "0.5px solid var(--ls-border)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      position: "relative",
                      transition: "transform 120ms ease, box-shadow 120ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "";
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${client.id}`)}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                        width: "100%",
                        fontFamily: "DM Sans, sans-serif",
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
                          📅 {formatRelative(lastContact, now)}
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
                    </button>

                    {/* Bouton menu deplacer */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : client.id);
                      }}
                      aria-label="Déplacer ce client"
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: "none",
                        background: isMenuOpen ? "var(--ls-surface2)" : "transparent",
                        color: "var(--ls-text-muted)",
                        cursor: "pointer",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ⋯
                    </button>

                    {isMenuOpen && (
                      <>
                        {/* Backdrop pour fermer en cliquant ailleurs */}
                        <div
                          onClick={() => setOpenMenuId(null)}
                          style={{ position: "fixed", inset: 0, zIndex: 10 }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: 32,
                            right: 6,
                            zIndex: 11,
                            background: "var(--ls-surface)",
                            border: "0.5px solid var(--ls-border)",
                            borderRadius: 10,
                            padding: 6,
                            boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                            minWidth: 160,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              letterSpacing: 1.5,
                              textTransform: "uppercase",
                              color: "var(--ls-text-hint)",
                              padding: "4px 8px",
                              fontWeight: 600,
                            }}
                          >
                            Déplacer vers
                          </div>
                          {otherColumns.map((target) => {
                            const targetColors = getToneColors(target.tone);
                            return (
                              <button
                                key={target.id}
                                type="button"
                                onClick={async () => {
                                  setOpenMenuId(null);
                                  await onMoveClient(client.id, target.id);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "7px 10px",
                                  background: "transparent",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  fontSize: 12,
                                  color: targetColors.text,
                                  fontFamily: "DM Sans, sans-serif",
                                  fontWeight: 500,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = targetColors.bg;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                }}
                              >
                                <span>{target.emoji}</span>
                                <span>{target.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
