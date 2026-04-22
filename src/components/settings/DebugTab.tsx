// Chantier Paramètres Admin (2026-04-23) — commit 6/7.
//
// Onglet Debug : 4 sous-sections —
//   1. Notifications push (lien vers /debug/notifications existant)
//   2. Logs récents (50 dernières lignes activity_logs)
//   3. Edge Functions status (liste hardcodée + liens dashboard)
//   4. Santé DB (counts simples)

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface ActivityLogRow {
  id: string;
  created_at: string;
  action: string;
  actor_name: string | null;
  target_user_name: string | null;
  summary: string | null;
}

const EDGE_FUNCTIONS = [
  "send-push",
  "morning-suivis-digest",
  "rdv-imminent-notifier",
  "new-message-notifier",
  "new-coach-message-notifier",
  "validate-invitation-token",
  "consume-invitation-token",
];

const SUPABASE_PROJECT_REF = "gqxnndwrdbghxflwmfxy";

export function DebugTab() {
  const { clients, clientMessages, users, followUps } = useAppContext();

  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb
          .from("activity_logs")
          .select("id, created_at, action, actor_name, target_user_name, summary")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) {
          setLogsError(error.message);
          return;
        }
        setLogs((data as ActivityLogRow[] | null) ?? []);
      } finally {
        setLogsLoading(false);
      }
    })();
  }, []);

  const dbCounts = useMemo(
    () => [
      { label: "Utilisateurs", value: users.length },
      { label: "Clients", value: clients.length },
      { label: "Follow-ups", value: followUps.length },
      { label: "Messages", value: clientMessages.length },
    ],
    [users, clients, followUps, clientMessages],
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="eyebrow-label">Notifications push</p>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.6 }}>
          Test + diagnostic complet du circuit push (subscription, envoi
          test, historique des 10 dernières notifs).
        </p>
        <Link
          to="/debug/notifications"
          style={{
            display: "inline-flex",
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--ls-gold)",
            color: "#0B0D11",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            fontSize: 13,
            textDecoration: "none",
            width: "fit-content",
          }}
        >
          Ouvrir /debug/notifications →
        </Link>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Logs récents</p>
        {logsLoading ? (
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>Chargement…</p>
        ) : logsError ? (
          <p style={{ fontSize: 13, color: "#FBBFC8" }}>{logsError}</p>
        ) : logs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
            Aucune activité loggée pour l'instant.
          </p>
        ) : (
          <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {logs.map((l) => (
              <div
                key={l.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--ls-surface2)",
                  border: "1px solid var(--ls-border)",
                  fontSize: 12,
                  color: "var(--ls-text-muted)",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 10, color: "var(--ls-text-hint)", flexShrink: 0 }}>
                  {new Date(l.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 6,
                    background: "var(--ls-surface)",
                    color: "var(--ls-gold)",
                    fontSize: 10,
                    fontFamily: "DM Mono, monospace",
                  }}
                >
                  {l.action}
                </span>
                {l.actor_name ? (
                  <span style={{ fontSize: 11 }}>
                    par <strong style={{ color: "var(--ls-text)" }}>{l.actor_name}</strong>
                  </span>
                ) : null}
                {l.summary ? (
                  <span style={{ flex: 1, fontSize: 11 }}>{l.summary}</span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Edge Functions déployées</p>
        <p style={{ fontSize: 12, color: "var(--ls-text-hint)" }}>
          Clic sur une function pour ouvrir ses logs dans le Dashboard
          Supabase.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {EDGE_FUNCTIONS.map((fn) => (
            <a
              key={fn}
              href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/functions/${fn}/logs`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "9px 12px",
                borderRadius: 8,
                background: "var(--ls-surface2)",
                border: "1px solid var(--ls-border)",
                fontSize: 13,
                color: "var(--ls-text)",
                textDecoration: "none",
                fontFamily: "DM Mono, monospace",
              }}
            >
              <span style={{ marginRight: 10, color: "#2DD4BF" }}>●</span>
              <span style={{ flex: 1 }}>{fn}</span>
              <span style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>logs ↗</span>
            </a>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Santé DB (approximatif)</p>
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          }}
        >
          {dbCounts.map((c) => (
            <div
              key={c.label}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--ls-surface2)",
                border: "1px solid var(--ls-border)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--ls-text-hint)",
                  marginBottom: 4,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 500,
                  fontSize: 20,
                  color: "var(--ls-text)",
                }}
              >
                {c.value.toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "var(--ls-text-hint)", lineHeight: 1.5 }}>
          Ces comptes reflètent le cache local du contexte app (chargé au
          login). Pour une vue exacte en direct, consulte le Dashboard
          Supabase → Database → Tables.
        </p>
      </Card>
    </div>
  );
}
