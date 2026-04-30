// =============================================================================
// ClientFaqChatbot — FAB + popup FAQ + routage messagerie (Tier B Module 3)
// =============================================================================
//
// Bouton flottant 💬 en bas a droite, visible sur tous les onglets de la
// PWA client. Click → modale popup avec :
//   1. 6 questions frequentes (FAQ instant)
//   2. Bouton "Écrire ta question" → ouvre messagerie
//
// Chaque FAQ a 2 actions :
//   - Voir la reponse (toggle inline, FAQ instant, pas d insert DB)
//   - "Demander à Thomas" → fill messagerie + naviguer
//
// L envoi d un message via "Demander à Thomas" trigger +15 XP via
// l action message_sent (cap 1×/jour cote SQL).
//
// V2 future : remplacer par vraie IA Claude qui repondra contextualisee.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../../services/supabaseClient";
import { recordClientXp } from "../../features/client-xp/useClientXp";

interface Props {
  token: string;
  coachFirstName?: string;
}

interface FaqEntry {
  id: string;
  emoji: string;
  question: string;
  answer: string;
  /** Message pre-redige envoye au coach si "Demander". */
  coachMessage: (coach: string) => string;
}

const FAQ: FaqEntry[] = [
  {
    id: "missed-weighin",
    emoji: "⚖️",
    question: "J'ai oublié de me peser cette semaine, je fais quoi ?",
    answer:
      "Aucun stress. Pèse-toi demain matin à jeun (avant le petit-déj, après les toilettes) — c'est la pesée la plus fiable. Une semaine sautée n'efface pas tes progrès, le suivi reprend dès la prochaine.",
    coachMessage: (coach) =>
      `Salut ${coach}, j'ai oublié de me peser cette semaine. Tu me confirmes quand je me pèse à nouveau ?`,
  },
  {
    id: "order-product",
    emoji: "🛒",
    question: "Comment je commande un produit ?",
    answer:
      "Ton coach gère les commandes. Va sur l'onglet Produits, repère ce qui t'intéresse, puis écris-lui un petit mot ici dans la messagerie. Il te répond avec le tarif et organise la livraison.",
    coachMessage: (coach) =>
      `Salut ${coach}, je voudrais commander un produit. Tu peux me dire les options ?`,
  },
  {
    id: "what-is-body-fat",
    emoji: "💪",
    question: "C'est quoi la masse grasse, exactement ?",
    answer:
      "C'est le pourcentage de graisse dans ton corps (le reste = muscles, eau, os). Pour une femme, la zone idéale est 21-25 %, normale jusqu'à 33 %. Plus tu progresses, plus ce % baisse en gardant ta masse musculaire — c'est l'objectif. Tu peux relancer le tutoriel ? en haut à droite pour revoir la jauge.",
    coachMessage: (coach) =>
      `Salut ${coach}, j'ai une question sur ma masse grasse. Tu peux m'expliquer ?`,
  },
  {
    id: "reschedule-rdv",
    emoji: "📅",
    question: "Je veux décaler mon RDV, comment je fais ?",
    answer:
      "Sur l'onglet Accueil, ta card RDV gold a un bouton « Modifier ». Click dessus, écris ta proposition de créneau, ton coach reçoit ton message et te répond avec un nouveau créneau.",
    coachMessage: (coach) =>
      `Salut ${coach}, je voudrais décaler mon prochain RDV. Tu as quoi de dispo ?`,
  },
  {
    id: "cravings",
    emoji: "🍫",
    question: "J'ai une fringale, que faire ?",
    answer:
      "Premier réflexe : 1 grand verre d'eau (souvent c'est juste de la soif). Si la fringale reste après 10 min, prends ton snack autorisé : Hydrate, infusion Tea Mix, ou barre protéinée. Évite le sucre rapide — tu vas re-craquer 1h plus tard.",
    coachMessage: (coach) =>
      `Salut ${coach}, j'ai une fringale qui revient souvent. Tu as une astuce ?`,
  },
  {
    id: "tired-program",
    emoji: "😴",
    question: "Je suis fatigué.e ces derniers jours, c'est normal ?",
    answer:
      "Oui c'est fréquent au début (ton corps s'adapte) ou en cas d'apport calorique trop bas. Vérifie 3 choses : tu bois ≥1.5L d'eau ? Tu dors ≥7h ? Ton petit-déj contient une vraie protéine (Formula 1 Sport ou autre) ? Si oui et que ça dure, parle-en à ton coach.",
    coachMessage: (coach) =>
      `Salut ${coach}, je me sens un peu fatigué.e ces derniers jours. Tu peux me conseiller ?`,
  },
];

export function ClientFaqChatbot({ token, coachFirstName }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const coach = coachFirstName || "Coach";

  async function askCoach(faq: FaqEntry) {
    if (sendingId) return;
    setSendingId(faq.id);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const message = faq.coachMessage(coach);
      const { error } = await sb.rpc("insert_client_message_by_token", {
        p_token: token,
        p_message: message,
        p_message_type: "general",
      });
      if (error) throw error;
      // +15 XP message_sent (cap 1×/jour cote SQL)
      void recordClientXp(token, "message_sent");
      // Navigate vers messagerie pour voir l envoi
      setOpen(false);
      navigate(`/client/${token}?tab=messages`);
    } catch (err) {
      console.warn("[FAQ Chatbot] askCoach failed:", err);
    } finally {
      setSendingId(null);
    }
  }

  function openMessages() {
    setOpen(false);
    navigate(`/client/${token}?tab=messages`);
  }

  return (
    <>
      {/* FAB toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ouvrir le chat d'aide"
        style={{
          position: "fixed",
          right: 16,
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          width: 54,
          height: 54,
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
          color: "white",
          border: "none",
          fontSize: 26,
          cursor: "pointer",
          boxShadow:
            "0 8px 24px rgba(186,117,23,0.45), 0 2px 6px rgba(0,0,0,0.10)",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 200ms ease",
          animation: open ? "none" : "ls-faq-fab-pulse 2.6s ease-in-out infinite",
        }}
      >
        <style>{`
          @keyframes ls-faq-fab-pulse {
            0%, 100% { box-shadow: 0 8px 24px rgba(186,117,23,0.45), 0 2px 6px rgba(0,0,0,0.10); }
            50%      { box-shadow: 0 8px 28px rgba(239,159,39,0.65), 0 2px 6px rgba(0,0,0,0.10); }
          }
          @keyframes ls-faq-modal-enter {
            0%   { opacity: 0; transform: translateY(12px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {open ? "×" : "💬"}
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
            padding: 0,
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Aide rapide"
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "white",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 18,
              boxShadow: "0 -10px 40px rgba(0,0,0,0.30)",
              fontFamily: "DM Sans, sans-serif",
              animation:
                "ls-faq-modal-enter 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                💬
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#111827",
                  }}
                >
                  Aide rapide
                </div>
                <div style={{ fontSize: 11, color: "#6B6B62", marginTop: 2 }}>
                  Une question ? Choisis un sujet ou écris à {coach} directement.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 22,
                  color: "#888",
                  cursor: "pointer",
                  padding: 4,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* FAQ list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {FAQ.map((faq) => {
                const isExpanded = expandedId === faq.id;
                return (
                  <div
                    key={faq.id}
                    style={{
                      border: "0.5px solid rgba(184,146,42,0.25)",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: isExpanded
                        ? "rgba(252,245,225,0.6)"
                        : "white",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : faq.id)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        width: "100%",
                        padding: "12px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                        {faq.emoji}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#111827",
                            lineHeight: 1.3,
                          }}
                        >
                          {faq.question}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#888",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>
                    {isExpanded ? (
                      <div
                        style={{
                          padding: "0 14px 12px",
                          fontSize: 12,
                          color: "#374151",
                          lineHeight: 1.55,
                        }}
                      >
                        {faq.answer}
                        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => void askCoach(faq)}
                            disabled={sendingId === faq.id}
                            style={{
                              padding: "7px 14px",
                              background:
                                "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "Syne, serif",
                              cursor: sendingId === faq.id ? "wait" : "pointer",
                            }}
                          >
                            {sendingId === faq.id ? "Envoi…" : `💬 Demander à ${coach}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedId(null)}
                            style={{
                              padding: "7px 12px",
                              background: "transparent",
                              color: "#888",
                              border: "0.5px solid rgba(0,0,0,0.10)",
                              borderRadius: 8,
                              fontSize: 11,
                              cursor: "pointer",
                              fontFamily: "DM Sans, sans-serif",
                            }}
                          >
                            Refermer
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* CTA "Écrire question libre" */}
            <button
              type="button"
              onClick={openMessages}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "white",
                color: "#5C4A0F",
                border: "0.5px solid rgba(184,146,42,0.50)",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              ✏️ Écrire une autre question à {coach}
            </button>

            <p
              style={{
                fontSize: 10,
                color: "#888",
                textAlign: "center",
                margin: "10px 0 0",
                fontStyle: "italic",
              }}
            >
              {coach} reçoit une notif et te répond généralement sous 24h.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
