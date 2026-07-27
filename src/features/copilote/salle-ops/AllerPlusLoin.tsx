// =============================================================================
// AllerPlusLoin — le bloc « apprendre » du cockpit La Base Académie.
//
// Chantier Simplification (2026-07-27) — LOT 4.
//
// Avant : la Formation distributeur Herbalife, la Boîte à outils (scripts) et
// le glossaire vivaient dans le hub « Mon développement ». Ce hub devient
// l'espace de Thomas → sans ce bloc, la pédagogie disparaissait pour les
// coachs. Elle est donc rattachée au cockpit, qui EST leur page d'accueil
// tant qu'ils ne sont pas activés.
//
// Constat qui a motivé le déplacement : 8 personnes seulement avaient ouvert
// la formation, et la Boîte à outils était verrouillée derrière « Academy à
// 50 % » — on cachait des scripts de vente derrière un tuto d'application.
//
// Le bouton « demander l'accès » écrit dans app_level_requests ; Thomas voit
// les demandes sur /users. Pas de push (cf. LOT 5, diète notifications).
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { useAppLevel } from "../../../hooks/useAppLevel";

const MONO: React.CSSProperties = { fontFamily: "var(--ls-ops-font-mono)" };

const LINKS: Array<{ emoji: string; label: string; hint: string; path: string }> = [
  {
    emoji: "📚",
    label: "Formation distributeur Herbalife",
    hint: "La méthode complète en 3 niveaux : Démarrer, Construire, Dupliquer.",
    path: "/formation",
  },
  {
    emoji: "🛠",
    label: "Boîte à outils",
    hint: "Scripts, checklists et modèles prêts à l'emploi.",
    path: "/formation/boite-a-outils",
  },
  {
    emoji: "📖",
    label: "Tous les mots-clés",
    hint: "PV, EBE, palier, royalty… le vocabulaire décodé en français simple.",
    path: "/formation/glossaire",
  },
];

export function AllerPlusLoin() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { isComplet } = useAppLevel();
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Une demande déjà en attente ? On désactive le bouton plutôt que de laisser
  // le coach cliquer dans le vide (l'index unique côté base refuserait de toute
  // façon un 2e envoi).
  useEffect(() => {
    let cancelled = false;
    if (!currentUser || isComplet) return;
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data } = await sb
        .from("app_level_requests")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("status", "pending")
        .maybeSingle();
      if (!cancelled && data) setRequestState("sent");
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isComplet]);

  async function askAccess() {
    if (!currentUser || requestState === "sending" || requestState === "sent") return;
    setRequestState("sending");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("indisponible");
      const { error } = await sb
        .from("app_level_requests")
        .insert({ user_id: currentUser.id });
      // 23505 = demande déjà en attente → c'est un succès du point de vue coach.
      if (error && error.code !== "23505") throw new Error(error.message);
      setRequestState("sent");
    } catch {
      setRequestState("error");
    }
  }

  return (
    <section style={{ marginTop: 8 }}>
      <div
        style={{
          ...MONO,
          fontSize: 10.5,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--ls-ops-muted)",
          marginBottom: 10,
        }}
      >
        Aller plus loin
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {LINKS.map((l) => (
          <button
            key={l.path}
            type="button"
            onClick={() => navigate(l.path)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              width: "100%",
              textAlign: "left",
              padding: "11px 13px",
              borderRadius: 12,
              cursor: "pointer",
              background: "var(--ls-ops-surface, rgba(255,255,255,0.03))",
              border: "1px solid var(--ls-ops-border-soft)",
              color: "var(--ls-ops-text, inherit)",
              fontFamily: "inherit",
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 19, flexShrink: 0 }}>
              {l.emoji}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 700, fontSize: 13.5 }}>{l.label}</span>
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--ls-ops-text3)",
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {l.hint}
              </span>
            </span>
            <span aria-hidden="true" style={{ color: "var(--ls-ops-muted)", flexShrink: 0 }}>
              →
            </span>
          </button>
        ))}
      </div>

      {/* Demander l'accès à l'espace complet — masqué si on l'a déjà. */}
      {!isComplet ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-ops-text3)", margin: "0 0 8px" }}>
            {requestState === "sent"
              ? "Demande envoyée. Thomas ouvrira ton accès quand il aura regardé."
              : "Il te manque un outil qui n'apparaît pas dans tes menus ? Demande l'accès à l'espace complet."}
          </p>
          <button
            type="button"
            onClick={() => void askAccess()}
            disabled={requestState === "sending" || requestState === "sent"}
            style={{
              ...MONO,
              fontSize: 12,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              padding: "9px 14px",
              borderRadius: 999,
              cursor: requestState === "sent" ? "default" : "pointer",
              background: "transparent",
              border: "1px solid var(--ls-ops-border-soft)",
              color: requestState === "sent" ? "var(--ls-ops-muted)" : "var(--ls-ops-text3)",
              opacity: requestState === "sending" ? 0.6 : 1,
            }}
          >
            {requestState === "sent"
              ? "✓ Demande envoyée"
              : requestState === "sending"
                ? "Envoi…"
                : "Demander l'accès complet →"}
          </button>
          {requestState === "error" ? (
            <div style={{ fontSize: 11.5, color: "var(--ls-ops-coral, #E24B4A)", marginTop: 6 }}>
              Envoi impossible pour l'instant. Réessaie plus tard.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
