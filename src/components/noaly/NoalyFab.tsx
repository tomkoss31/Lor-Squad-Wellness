// =============================================================================
// NoalyFab — Noaly, l'assistante IA de La Base 360, côté coach (chantier
// Noaly N-1 + N-3, 2026-06-10).
//
// Bulle ✨ flottante en bas à droite de toutes les pages coach (montée dans
// AppLayout). Click → panneau de chat multi-tours avec :
//   - contexte automatique (route courante + fiche client ouverte)
//   - suggestions rapides selon la page
//   - OUTILS exécutés côté front (agentic loop, max 3 itérations) :
//       chercher_client   → recherche dans AppContext.clients
//       clients_inactifs  → clients sans bilan depuis N jours
//       ouvrir_page       → navigation (chemins whitelist)
//
// Sans clé API : l'edge renvoie 503 ai_not_configured → bulle « Noaly arrive
// très bientôt » (aucune casse). Cap mensuel coach géré côté edge (429).
// Tokens var(--ls-*) uniquement.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Client } from "../../types/domain";

// ─── Types protocole (format messages Anthropic, simplifié) ─────────────────

interface ApiContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  [k: string]: unknown;
}

interface ApiMessage {
  role: "user" | "assistant";
  content: string | ApiContentBlock[];
}

interface UiMessage {
  role: "user" | "assistant" | "tool";
  text: string;
}

const ALLOWED_ROUTES = new Set([
  "/co-pilote",
  "/flex",
  "/agenda",
  "/messages",
  "/clients",
  "/crm",
  "/pv",
  "/outils-prospection",
  "/developpement",
  "/routine-du-jour",
  "/cahier-de-bord",
  "/parametres",
]);

function suggestionsForRoute(path: string): string[] {
  if (path.startsWith("/crm")) {
    return [
      "Quel lead je devrais traiter en premier ?",
      "Rédige une relance douce pour un lead silencieux",
    ];
  }
  if (path.startsWith("/clients/")) {
    return [
      "Résume cette fiche client en 3 points",
      "Rédige un message de félicitations pour ce client",
    ];
  }
  if (path.startsWith("/clients")) {
    return ["Quels clients sont inactifs depuis 30 jours ?", "Ouvre la fiche de…"];
  }
  if (path.startsWith("/flex")) {
    return ["Explique-moi la formule 5-3-1", "Je suis en retard sur mes cibles, je fais quoi ?"];
  }
  return [
    "Quels clients je devrais relancer ?",
    "Rédige un message de relance douce",
    "C'est quoi la priorité du jour ?",
  ];
}

function lastAssessmentDate(c: Client): number {
  let max = 0;
  for (const a of c.assessments ?? []) {
    const t = new Date(a.date).getTime();
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max;
}

export function NoalyFab() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, clients } = useAppContext();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uiLog, setUiLog] = useState<UiMessage[]>([]);
  const apiMessagesRef = useRef<ApiMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [uiLog, open]);

  const clientSummary = useMemo(() => {
    const m = location.pathname.match(/^\/clients\/([^/]+)/);
    if (!m) return undefined;
    const c = (clients ?? []).find((x) => x.id === m[1]);
    if (!c) return undefined;
    const last = lastAssessmentDate(c);
    return `${c.firstName} ${c.lastName ?? ""} (objectif ${c.objective ?? "?"}, statut ${c.lifecycleStatus ?? "?"}, dernier bilan ${last ? new Date(last).toLocaleDateString("fr-FR") : "aucun"})`;
  }, [location.pathname, clients]);

  // ─── Outils exécutés côté front ────────────────────────────────────────────

  function runTool(name: string, toolInput: Record<string, unknown>): string {
    if (name === "chercher_client") {
      const q = String(toolInput.query ?? "").trim().toLowerCase();
      if (q.length < 2) return "Requête trop courte.";
      const found = (clients ?? [])
        .filter((c) => `${c.firstName} ${c.lastName ?? ""}`.toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => {
          const last = lastAssessmentDate(c);
          return {
            id: c.id,
            nom: `${c.firstName} ${c.lastName ?? ""}`.trim(),
            statut: c.lifecycleStatus ?? "?",
            dernier_bilan: last ? new Date(last).toLocaleDateString("fr-FR") : "aucun",
            chemin_fiche: `/clients/${c.id}`,
          };
        });
      return found.length > 0 ? JSON.stringify(found) : "Aucun client trouvé avec ce nom.";
    }
    if (name === "clients_inactifs") {
      const jours = Math.max(7, Math.min(365, Number(toolInput.jours ?? 30)));
      const cutoff = Date.now() - jours * 86_400_000;
      const found = (clients ?? [])
        .filter((c) => c.lifecycleStatus !== "lost")
        .map((c) => ({ c, last: lastAssessmentDate(c) }))
        .filter(({ last }) => last > 0 && last < cutoff)
        .sort((a, b) => a.last - b.last)
        .slice(0, 10)
        .map(({ c, last }) => ({
          nom: `${c.firstName} ${c.lastName ?? ""}`.trim(),
          dernier_bilan: new Date(last).toLocaleDateString("fr-FR"),
          chemin_fiche: `/clients/${c.id}`,
        }));
      return found.length > 0
        ? JSON.stringify(found)
        : `Aucun client inactif depuis plus de ${jours} jours. 👏`;
    }
    if (name === "ouvrir_page") {
      const chemin = String(toolInput.chemin ?? "").trim();
      const isClientFiche = /^\/clients\/[A-Za-z0-9-]+$/.test(chemin);
      if (ALLOWED_ROUTES.has(chemin) || isClientFiche) {
        navigate(chemin);
        return `Page ouverte : ${chemin}`;
      }
      return `Chemin non autorisé : ${chemin}`;
    }
    return `Outil inconnu : ${name}`;
  }

  // ─── Boucle agentique (le front exécute les tool_use) ─────────────────────

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    setLoading(true);
    setUiLog((l) => [...l, { role: "user", text: trimmed }]);
    apiMessagesRef.current = [...apiMessagesRef.current, { role: "user", content: trimmed }];

    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      for (let iter = 0; iter < 3; iter++) {
        const { data, error } = await sb.functions.invoke("noaly", {
          body: {
            mode: "coach_chat",
            coachUserId: currentUser?.id,
            coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0],
            context: { route: location.pathname, clientSummary },
            messages: apiMessagesRef.current,
          },
        });

        const payload = data as {
          content?: ApiContentBlock[];
          stop_reason?: string;
          error?: string;
          message?: string;
        } | null;

        if (error || payload?.error) {
          const friendly =
            payload?.message ??
            "Noaly est momentanément indisponible — réessaie dans un instant 🌿";
          setUiLog((l) => [...l, { role: "assistant", text: friendly }]);
          // Retire le dernier user message du protocole pour pouvoir réessayer.
          apiMessagesRef.current = apiMessagesRef.current.slice(0, -1);
          return;
        }

        const blocks = payload?.content ?? [];
        const textOut = blocks
          .filter((b) => b.type === "text")
          .map((b) => b.text ?? "")
          .join("")
          .trim();
        if (textOut) setUiLog((l) => [...l, { role: "assistant", text: textOut }]);

        apiMessagesRef.current = [...apiMessagesRef.current, { role: "assistant", content: blocks }];

        if (payload?.stop_reason !== "tool_use") return;

        // Exécute chaque tool_use côté front, renvoie les résultats.
        const toolUses = blocks.filter((b) => b.type === "tool_use");
        const results: ApiContentBlock[] = toolUses.map((tu) => {
          const label =
            tu.name === "chercher_client"
              ? `🔍 Recherche « ${String((tu.input as Record<string, unknown>)?.query ?? "")} »…`
              : tu.name === "clients_inactifs"
                ? "📋 Analyse des clients inactifs…"
                : `📂 Ouverture de ${String((tu.input as Record<string, unknown>)?.chemin ?? "la page")}…`;
          setUiLog((l) => [...l, { role: "tool", text: label }]);
          return {
            type: "tool_result",
            tool_use_id: tu.id,
            content: runTool(tu.name ?? "", (tu.input as Record<string, unknown>) ?? {}),
          };
        });
        apiMessagesRef.current = [...apiMessagesRef.current, { role: "user", content: results }];
      }
      setUiLog((l) => [
        ...l,
        { role: "assistant", text: "Je m'arrête là pour cette action — reformule si besoin 🙂" },
      ]);
    } catch (e) {
      setUiLog((l) => [
        ...l,
        {
          role: "assistant",
          text: e instanceof Error ? e.message : "Erreur inattendue — réessaie.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setUiLog([]);
    apiMessagesRef.current = [];
  }

  if (!currentUser) return null;

  return (
    <>
      <style>{`
        .noaly-fab { position: fixed; right: 16px; bottom: 88px; z-index: 60; }
        @media (min-width: 900px) { .noaly-fab { bottom: 24px; right: 24px; } }
        .noaly-panel { position: fixed; right: 12px; bottom: 150px; z-index: 61; width: min(380px, calc(100vw - 24px)); }
        @media (min-width: 900px) { .noaly-panel { bottom: 86px; right: 24px; } }
        @keyframes noaly-pop { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .noaly-panel { animation: noaly-pop 0.18s ease; }
        @media (prefers-reduced-motion: reduce) { .noaly-panel { animation: none; } }
      `}</style>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="noaly-fab"
        aria-label={open ? "Fermer Noaly" : "Ouvrir Noaly, l'assistante IA"}
        style={fabStyle(open)}
      >
        {open ? "✕" : "✨"}
      </button>

      {/* Panneau chat */}
      {open ? (
        <div className="noaly-panel" style={panelStyle} role="dialog" aria-label="Chat avec Noaly">
          <div style={panelHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={avatarStyle} aria-hidden="true">✨</span>
              <div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 14, color: "var(--ls-text)" }}>
                  Noaly
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ls-text-muted)" }}>
                  L'assistante IA de La Base 360
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {uiLog.length > 0 ? (
                <button type="button" onClick={resetChat} style={resetBtn} title="Nouvelle conversation">
                  ↺
                </button>
              ) : null}
              {/* Bouton fermer explicite (le FAB ✕ est masqué par la bottom-nav
                  sur iPhone — fix mobile 2026-06-12). */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={resetBtn}
                title="Fermer Noaly"
                aria-label="Fermer Noaly"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={scrollRef} style={chatScroll}>
            {uiLog.length === 0 ? (
              <div style={emptyIntro}>
                <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "var(--ls-text-muted)" }}>
                  Salut {((currentUser.name ?? "").split(/\s+/)[0]) || "coach"} ! 👋 Pose-moi une
                  question, demande-moi de retrouver un client, de rédiger un message ou de t'ouvrir
                  une page.
                </p>
                {suggestionsForRoute(location.pathname).map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} style={suggestionChip}>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              uiLog.map((m, i) => (
                <div key={i} style={bubbleWrap(m.role)}>
                  <div style={bubble(m.role)}>{m.text}</div>
                </div>
              ))
            )}
            {loading ? (
              <div style={bubbleWrap("assistant")}>
                <div style={{ ...bubble("assistant"), color: "var(--ls-text-muted)" }}>✨ Noaly réfléchit…</div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            style={inputRow}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Demande à Noaly…"
              style={inputStyle}
              aria-label="Ton message pour Noaly"
            />
            <button type="submit" disabled={loading || !input.trim()} style={sendBtn} aria-label="Envoyer">
              ➤
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const fabStyle = (open: boolean): React.CSSProperties => ({
  width: 52,
  height: 52,
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  fontSize: 22,
  color: "#04231a",
  background: open
    ? "var(--ls-surface2)"
    : "linear-gradient(135deg, var(--ls-teal), var(--ls-purple))",
  boxShadow: "0 10px 28px color-mix(in srgb, var(--ls-purple) 35%, transparent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const panelStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  boxShadow: "0 24px 64px color-mix(in srgb, var(--ls-text) 22%, transparent)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  maxHeight: "min(560px, calc(100vh - 180px))",
};

const panelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: "0.5px solid var(--ls-border)",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)), color-mix(in srgb, var(--ls-purple) 10%, var(--ls-surface)))",
};

const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--ls-teal), var(--ls-purple))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
};

const resetBtn: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text-muted)",
  width: 28,
  height: 28,
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
};

const chatScroll: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 12px 4px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minHeight: 180,
};

const emptyIntro: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "4px 2px",
};

const suggestionChip: React.CSSProperties = {
  textAlign: "left",
  background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
  color: "var(--ls-text)",
  fontSize: 12.5,
  fontFamily: "DM Sans, sans-serif",
  padding: "9px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

const bubbleWrap = (role: UiMessage["role"]): React.CSSProperties => ({
  display: "flex",
  justifyContent: role === "user" ? "flex-end" : "flex-start",
});

const bubble = (role: UiMessage["role"]): React.CSSProperties => ({
  maxWidth: "85%",
  padding: role === "tool" ? "5px 10px" : "9px 12px",
  borderRadius: 14,
  fontSize: role === "tool" ? 11.5 : 13,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  fontFamily: "DM Sans, sans-serif",
  ...(role === "user"
    ? {
        background: "color-mix(in srgb, var(--ls-teal) 16%, var(--ls-surface2))",
        color: "var(--ls-text)",
        borderBottomRightRadius: 4,
      }
    : role === "tool"
      ? {
          background: "transparent",
          color: "var(--ls-text-hint)",
          fontStyle: "italic",
          padding: "2px 4px",
        }
      : {
          background: "var(--ls-surface2)",
          color: "var(--ls-text)",
          border: "0.5px solid var(--ls-border)",
          borderBottomLeftRadius: 4,
        }),
});

const inputRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  padding: 10,
  borderTop: "0.5px solid var(--ls-border)",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
};

const sendBtn: React.CSSProperties = {
  width: 40,
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-teal), var(--ls-purple))",
  color: "#fff",
  fontSize: 15,
  cursor: "pointer",
};
