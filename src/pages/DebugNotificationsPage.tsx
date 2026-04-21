// Chantier Notifications push (2026-04-21) — commit 5/5
// Page /debug/notifications : diagnostic rapide pour Thomas.
// - Statut de la souscription push du user connecté
// - Bouton "Envoyer une notif test" (appel Edge Function send-push)
// - Historique des 10 dernières notifs envoyées (push_notifications_sent)
// - Accès admin uniquement (protection via RoleRoute dans App.tsx)

import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";

interface SentLog {
  id: string;
  entity_id: string;
  entity_type: string;
  sent_at: string;
}

interface SubscriptionInfo {
  endpoint: string;
  updated_at?: string;
}

export function DebugNotificationsPage() {
  const { currentUser } = useAppContext();
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [logs, setLogs] = useState<SentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<string>("");
  const [feedbackTone, setFeedbackTone] = useState<"ok" | "err" | "">("");

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }

      // Chantier hotfix 2026-04-21 : on accepte >1 lignes (unique index
      // peut manquer selon l'état de la DB). Les colonnes réelles sont
      // endpoint / updated_at (pas created_at).
      const [subRes, logsRes] = await Promise.all([
        sb
          .from("push_subscriptions")
          .select("endpoint, updated_at")
          .eq("user_id", currentUser.id)
          .order("updated_at", { ascending: false }),
        sb
          .from("push_notifications_sent")
          .select("id, entity_id, entity_type, sent_at")
          .eq("user_id", currentUser.id)
          .order("sent_at", { ascending: false })
          .limit(10),
      ]);

      setSubscriptions((subRes.data as SubscriptionInfo[] | null) ?? []);
      setLogs((logsRes.data as SentLog[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function sendTest() {
    if (!currentUser) return;
    setTesting(true);
    setFeedback("");
    setFeedbackTone("");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");

      const { error } = await sb.functions.invoke("send-push", {
        body: {
          user_id: currentUser.id,
          title: "🧪 Notification test",
          body: "Si tu vois ça, le circuit push est OK.",
          url: "/debug/notifications",
          type: "test",
        },
      });

      if (error) throw error;
      setFeedback("Notif test envoyée. Check ton device.");
      setFeedbackTone("ok");
      setTimeout(() => void refresh(), 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setFeedback(`Échec : ${message}`);
      setFeedbackTone("err");
    } finally {
      setTesting(false);
    }
  }

  const subscriptionCount = subscriptions.length;
  const hasSubscription = subscriptionCount > 0;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Debug"
        title="Notifications push"
        description="Diagnostic du circuit push pour l'utilisateur connecté. Admin uniquement."
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow-label">Souscriptions</p>
            <p className="mt-2 text-lg text-white">
              {loading
                ? "Chargement…"
                : hasSubscription
                  ? `${subscriptionCount} device${subscriptionCount > 1 ? "s" : ""} abonné${subscriptionCount > 1 ? "s" : ""}`
                  : "Aucune souscription sur ce compte"}
            </p>
            {subscriptions.map((sub, i) => (
              <p
                key={`${sub.endpoint.slice(0, 20)}-${i}`}
                className="mt-2 break-all text-xs text-[var(--ls-text-muted)]"
              >
                #{i + 1} · {sub.endpoint.slice(0, 80)}…
              </p>
            ))}
          </div>
          <StatusBadge
            label={hasSubscription ? "Abonné" : "Non abonné"}
            tone={hasSubscription ? "green" : "amber"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void sendTest()} disabled={testing || !hasSubscription}>
            {testing ? "Envoi…" : "Envoyer une notif test"}
          </Button>
          <Button variant="secondary" onClick={() => void refresh()}>
            Rafraîchir
          </Button>
        </div>

        {feedback ? (
          <div
            className={`rounded-[18px] border px-4 py-3 text-sm ${
              feedbackTone === "ok"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                : "border-rose-400/30 bg-rose-400/10 text-rose-100"
            }`}
          >
            {feedback}
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Historique (10 dernières notifs)</p>
        {loading ? (
          <p className="text-sm text-[var(--ls-text-muted)]">Chargement…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-[var(--ls-text-muted)]">
            Aucune notif loggée pour l'instant. Utilise le bouton test au-dessus.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {LABELS[log.entity_type] ?? log.entity_type}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ls-text-muted)] truncate">
                    {log.entity_id}
                  </p>
                </div>
                <p className="flex-shrink-0 text-xs text-[var(--ls-text-hint)]">
                  {formatDateTime(log.sent_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Aide diagnostique</p>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--ls-text-muted)]">
          <li>
            Si « Non abonné » : ouvre les paramètres et clique sur « Activer
            les notifications ».
          </li>
          <li>
            Si la notif test ne s'affiche pas alors que l'envoi est OK : le
            navigateur / l'OS bloque peut-être les notifications (iOS exige
            l'ajout à l'écran d'accueil, Windows a le Focus Assist).
          </li>
          <li>
            Debug Service Worker : <code>chrome://inspect/#service-workers</code>.
          </li>
          <li>
            Les crons serveurs (digest matinal + RDV 1h avant) utilisent la
            même table <code>push_notifications_sent</code>. Les entrées
            apparaissent ici.
          </li>
        </ul>
      </Card>
    </div>
  );
}

const LABELS: Record<string, string> = {
  morning_digest: "🌅 Digest matinal",
  followup: "⏰ RDV client imminent",
  prospect_meeting: "⏰ RDV prospect imminent",
  client_message: "💬 Message client",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}
