// =============================================================================
// ClientFaqChatbot — Noaly, l'assistante IA de La Base 360 dans la PWA client
// (refonte Noaly-first, 2026-06-10).
//
// L'interface est désormais un CHAT avec Noaly (plus une liste de FAQ figée).
//   - Bulle ✨ flottante en bas à droite, sur tous les onglets.
//   - À l'ouverture : Noaly se présente + propose des « sujets fréquents »
//     (chips cliquables) → réponse INSTANTANÉE et GRATUITE (connaissance
//     embarquée, aucun appel API) pour les 6 cas courants.
//   - Question libre → edge `noaly` (mode client_chat) : Noaly connaît le
//     contexte du client (prénom, RDV, programme — construit côté serveur),
//     avec garde-fous santé + escalade coach + cap quotidien.
//   - Sans clé API : message doux « Noaly arrive bientôt », rien ne casse.
//   - « Écrire à <coach> » et « Faire le tour » restent en pied de modale.
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Props {
  token: string;
  coachFirstName?: string;
  /** Si fourni, ajoute un bouton "Faire le tour de l'app" dans le popup. */
  onLaunchTutorial?: () => void;
}

interface Topic {
  id: string;
  emoji: string;
  question: string;
  /** Réponse instantanée (connaissance de Noaly, sans appel API). */
  answer: string;
}

// Connaissance embarquée de Noaly : les sujets les plus fréquents, répondus
// instantanément et gratuitement. Le reste passe par l'IA.
const TOPICS: Topic[] = [
  {
    id: "missed-weighin",
    emoji: "⚖️",
    question: "J'ai oublié de me peser cette semaine",
    answer:
      "Aucun stress 🙂 Pèse-toi demain matin à jeun (avant le petit-déj, après les toilettes) — c'est la pesée la plus fiable. Une semaine sautée n'efface pas tes progrès, le suivi reprend dès la prochaine.",
  },
  {
    id: "order-product",
    emoji: "🛒",
    question: "Comment je commande un produit ?",
    answer:
      "Ton coach gère les commandes 👍 Va sur l'onglet Produits, repère ce qui t'intéresse, puis écris-lui un petit mot dans Messages. Il te répond avec le tarif et organise la livraison.",
  },
  {
    id: "what-is-body-fat",
    emoji: "💪",
    question: "C'est quoi la masse grasse ?",
    answer:
      "C'est le pourcentage de graisse dans ton corps (le reste = muscles, eau, os). Pour une femme, la zone idéale est 21-25 %, normale jusqu'à 33 %. Plus tu progresses, plus ce % baisse en gardant ta masse musculaire — c'est l'objectif 💪",
  },
  {
    id: "reschedule-rdv",
    emoji: "📅",
    question: "Je veux décaler mon RDV",
    answer:
      "Sur l'onglet Accueil, ta card RDV a un bouton « Modifier ». Clique dessus, écris ta proposition de créneau : ton coach reçoit ton message et te répond avec un nouveau créneau 📅",
  },
  {
    id: "cravings",
    emoji: "🍫",
    question: "J'ai une fringale, que faire ?",
    answer:
      "Premier réflexe : 1 grand verre d'eau (souvent c'est juste de la soif). Si la fringale reste après 10 min, prends ton snack autorisé : Hydrate, infusion Tea Mix ou barre protéinée. Évite le sucre rapide — tu vas re-craquer 1h plus tard 😉",
  },
  {
    id: "tired-program",
    emoji: "😴",
    question: "Je suis fatigué·e ces derniers jours",
    answer:
      "C'est fréquent au début (ton corps s'adapte) ou si l'apport calorique est trop bas. Vérifie 3 choses : tu bois ≥1,5 L d'eau ? Tu dors ≥7 h ? Ton petit-déj contient une vraie protéine ? Si oui et que ça dure, parles-en à ton coach 🌿",
  },
];

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function ClientFaqChatbot({ token, coachFirstName, onLaunchTutorial }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const coach = coachFirstName || "ton coach";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function openMessages() {
    setOpen(false);
    navigate(`/client/${token}?tab=messages`);
  }

  /** Sujet cliqué → réponse instantanée (gratuite, depuis la connaissance). */
  function pickTopic(t: Topic) {
    if (loading) return;
    setMessages((m) => [
      ...m,
      { role: "user", content: t.question },
      { role: "assistant", content: t.answer },
    ]);
  }

  /** Question libre → IA (edge noaly client_chat). */
  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("offline");
      const { data, error } = await sb.functions.invoke("noaly", {
        body: { mode: "client_chat", client_token: token, messages: next },
      });
      const payload = data as { message?: string } | null;
      const answer =
        !error && payload?.message
          ? payload.message
          : (payload as { message?: string } | null)?.message ??
            `Je ne suis pas encore tout à fait prête 🌿 En attendant, écris directement à ${coach} juste en dessous, il te répondra vite !`;
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Petit souci de connexion 🙈 Réessaie, ou écris directement à ${coach} en dessous.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* FAB toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer Noaly" : "Ouvrir Noaly, l'assistante du club"}
        style={{
          position: "fixed",
          right: 16,
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
          color: "white",
          border: "none",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(139,92,246,0.45), 0 2px 6px rgba(0,0,0,0.10)",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 200ms ease",
          animation: open ? "none" : "ls-noaly-fab-pulse 2.6s ease-in-out infinite",
        }}
      >
        <style>{`
          @keyframes ls-noaly-fab-pulse {
            0%, 100% { box-shadow: 0 8px 24px rgba(139,92,246,0.40), 0 2px 6px rgba(0,0,0,0.10); }
            50%      { box-shadow: 0 8px 30px rgba(16,185,129,0.55), 0 2px 6px rgba(0,0,0,0.10); }
          }
          @keyframes ls-noaly-modal-enter {
            0%   { opacity: 0; transform: translateY(12px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {open ? "×" : "✨"}
      </button>

      {/* Modal */}
      {open ? (
        <div
          role="presentation"
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
            zIndex: 9997,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stopPropagation only */}
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Noaly, l'assistante du club"
            style={{
              width: "100%",
              maxWidth: 520,
              height: "min(88vh, 680px)",
              background: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: "0 -10px 40px rgba(0,0,0,0.30)",
              fontFamily: "Inter, system-ui, sans-serif",
              animation: "ls-noaly-modal-enter 280ms cubic-bezier(0.2,0.8,0.2,1)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 18px",
                borderBottom: "0.5px solid rgba(15,23,42,0.08)",
                background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(139,92,246,0.06))",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10B981, #06B6D4 55%, #8B5CF6)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 19,
                  flexShrink: 0,
                }}
              >
                ✨
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Sora, system-ui, sans-serif", fontWeight: 800, fontSize: 16, color: "#0F172A" }}>
                  Noaly
                </div>
                <div style={{ fontSize: 11, color: "#6B6B62", marginTop: 1 }}>
                  Ton assistante La Base 360
                </div>
              </div>
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  aria-label="Nouvelle conversation"
                  title="Nouvelle conversation"
                  style={{
                    background: "transparent",
                    border: "0.5px solid rgba(15,23,42,0.15)",
                    borderRadius: 8,
                    width: 30,
                    height: 30,
                    fontSize: 14,
                    color: "#64748B",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  ↺
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 24,
                  color: "#64748B",
                  cursor: "pointer",
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Chat */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 14px 6px" }}>
              {/* Bulle d'accueil Noaly + sujets fréquents */}
              <div style={bubbleRow("assistant")}>
                <div style={bubble("assistant")}>
                  Salut 👋 Je suis <strong>Noaly</strong>, l'assistante du club. Pose-moi ta question —
                  je connais ton programme et ton prochain RDV. Ou choisis un sujet&nbsp;:
                </div>
              </div>
              {messages.length === 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "4px 2px 8px" }}>
                  {TOPICS.map((t) => (
                    <button key={t.id} type="button" onClick={() => pickTopic(t)} style={topicChip}>
                      {t.emoji} {t.question}
                    </button>
                  ))}
                </div>
              ) : null}

              {messages.map((m, i) => (
                <div key={i} style={bubbleRow(m.role)}>
                  <div style={bubble(m.role)}>{m.content}</div>
                </div>
              ))}

              {loading ? (
                <div style={bubbleRow("assistant")}>
                  <div style={{ ...bubble("assistant"), color: "#94A3B8", fontStyle: "italic" }}>
                    ✨ Noaly réfléchit…
                  </div>
                </div>
              ) : null}
            </div>

            {/* Saisie */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
              style={{ display: "flex", gap: 8, padding: "8px 12px", borderTop: "0.5px solid rgba(15,23,42,0.08)" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écris ta question à Noaly…"
                aria-label="Ta question pour Noaly"
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: "0.5px solid rgba(15,23,42,0.15)",
                  fontSize: 13,
                  outline: "none",
                  background: "white",
                  color: "#0F172A",
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Envoyer"
                style={{
                  width: 44,
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #10B981, #8B5CF6)",
                  color: "white",
                  fontSize: 16,
                  cursor: "pointer",
                  opacity: loading || !input.trim() ? 0.5 : 1,
                }}
              >
                ➤
              </button>
            </form>

            {/* Pied : escalade coach + tour */}
            <div style={{ display: "flex", gap: 8, padding: "0 12px 14px", flexWrap: "wrap" }}>
              <button type="button" onClick={openMessages} style={footerBtn}>
                ✏️ Écrire à {coach}
              </button>
              {onLaunchTutorial ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLaunchTutorial();
                  }}
                  style={footerBtn}
                >
                  🎓 Tour de l'app
                </button>
              ) : null}
            </div>
            <p style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", margin: "0 0 12px", fontStyle: "italic" }}>
              Noaly aide pour les questions du quotidien. Pour ton suivi perso, {coach} reste là 🌿
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ─── Styles helpers ───────────────────────────────────────────────────────────

function bubbleRow(role: ChatMsg["role"]): React.CSSProperties {
  return { display: "flex", justifyContent: role === "user" ? "flex-end" : "flex-start", marginBottom: 8 };
}

function bubble(role: ChatMsg["role"]): React.CSSProperties {
  return {
    maxWidth: "85%",
    padding: "10px 13px",
    borderRadius: 15,
    fontSize: 13,
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    ...(role === "user"
      ? {
          background: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(6,182,212,0.16))",
          color: "#0F172A",
          borderBottomRightRadius: 5,
        }
      : {
          background: "#F4F6FA",
          color: "#0F172A",
          border: "0.5px solid rgba(15,23,42,0.06)",
          borderBottomLeftRadius: 5,
        }),
  };
}

const topicChip: React.CSSProperties = {
  background: "white",
  border: "0.5px solid rgba(139,92,246,0.30)",
  color: "#0F172A",
  fontSize: 12,
  fontFamily: "Inter, system-ui, sans-serif",
  padding: "8px 12px",
  borderRadius: 999,
  cursor: "pointer",
  lineHeight: 1.3,
};

const footerBtn: React.CSSProperties = {
  flex: "1 1 auto",
  padding: "11px 14px",
  background: "white",
  color: "#0F172A",
  border: "0.5px solid rgba(16,185,129,0.45)",
  borderRadius: 12,
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: "Sora, system-ui, sans-serif",
  cursor: "pointer",
};
