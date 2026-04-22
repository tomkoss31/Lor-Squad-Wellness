// Chantier Messagerie finalisée (2026-04-23) — commit 3/5.
// Barre de filtres horizontale : statut + tri + recherche + persist URL.

export type MessageStatusFilter = "all" | "unread" | "replied" | "resolved" | "archived";
export type MessageSortOrder = "recent" | "oldest";

export interface MessageFiltersState {
  status: MessageStatusFilter;
  sort: MessageSortOrder;
  query: string;
}

const STATUS_PILLS: Array<{ key: MessageStatusFilter; label: string }> = [
  { key: "unread", label: "Non lus" },
  { key: "replied", label: "Répondu" },
  { key: "resolved", label: "Traités" },
  { key: "archived", label: "Archivés" },
  { key: "all", label: "Tous" },
];

export function MessageFilters({
  state,
  onChange,
  unreadCount,
}: {
  state: MessageFiltersState;
  onChange: (patch: Partial<MessageFiltersState>) => void;
  unreadCount: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <input
          type="search"
          value={state.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Rechercher un client, un message…"
          style={{
            width: "100%",
            padding: "10px 14px 10px 36px",
            borderRadius: 12,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface)",
            color: "var(--ls-text)",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ls-text-hint)"
          strokeWidth="1.8"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* Statuts pills + tri */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_PILLS.map((p) => {
            const active = state.status === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onChange({ status: p.key })}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: active ? "1px solid var(--ls-text)" : "1px solid var(--ls-border)",
                  background: active ? "var(--ls-text)" : "transparent",
                  color: active ? "var(--ls-bg)" : "var(--ls-text-muted)",
                  fontSize: 12,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {p.label}
                {p.key === "unread" && unreadCount > 0 ? (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: 8,
                      background: active ? "rgba(255,255,255,0.2)" : "#A32D2D",
                      color: active ? "var(--ls-bg)" : "#FFFFFF",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>Tri :</span>
          <select
            value={state.sort}
            onChange={(e) => onChange({ sort: e.target.value as MessageSortOrder })}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--ls-border)",
              background: "var(--ls-surface)",
              color: "var(--ls-text)",
              fontSize: 12,
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
            }}
          >
            <option value="recent">Plus récent</option>
            <option value="oldest">Plus ancien</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── URL sync helpers ────────────────────────────────────────────────────
export function readFiltersFromSearch(search: string): MessageFiltersState {
  const p = new URLSearchParams(search);
  const status = p.get("status");
  const sort = p.get("sort");
  const query = p.get("q") ?? "";
  return {
    status:
      status === "unread" || status === "replied" || status === "resolved" || status === "archived" || status === "all"
        ? status
        : "unread",
    sort: sort === "oldest" ? "oldest" : "recent",
    query,
  };
}

export function writeFiltersToSearch(state: MessageFiltersState): string {
  const p = new URLSearchParams();
  if (state.status !== "unread") p.set("status", state.status);
  if (state.sort !== "recent") p.set("sort", state.sort);
  if (state.query.trim()) p.set("q", state.query.trim());
  const s = p.toString();
  return s ? `?${s}` : "";
}
