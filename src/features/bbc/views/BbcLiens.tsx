// =============================================================================
// BbcLiens — les liens rapides du club (module 5 du modèle BBC).
// 1 tap = le message pré-rédigé + le lien, copiés ou envoyés sur WhatsApp.
// Les liens publics dérivent du slug coach ; les liens du club (Zoom, avis
// Google) viennent des réglages — jamais en dur.
// =============================================================================

import { useState, type CSSProperties } from "react";
import type { ClubSettings } from "../../../types/domain";

function slugify(name?: string) {
  return (name ?? "")
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

interface QuickLink {
  key: string;
  icon: string;
  title: string;
  hint: string;
  url: string;
  message: (url: string) => string;
  missing?: boolean;
}

interface BbcLiensProps {
  coachName?: string;
  settings?: ClubSettings | null;
  clubName?: string;
}

export function BbcLiens({ coachName, settings, clubName }: BbcLiensProps) {
  const [copied, setCopied] = useState<string>("");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.labase360.fr";
  const slug = slugify(coachName);
  const club = clubName || "le club";
  const links = settings?.links ?? {};

  const LINKS: QuickLink[] = [
    {
      key: "bilan",
      icon: "📋",
      title: "Bilan bien-être offert",
      hint: "la porte d'entrée · à envoyer à un cobaye",
      url: `${origin}/bilan-online/${slug}`,
      message: (u) =>
        `Coucou 😊 Je t'offre un bilan bien-être + scan corporel (valeur 50 €) pour m'entraîner. Tu remplis en 2 min ici : ${u}`,
    },
    {
      key: "rdv",
      icon: "📅",
      title: "Réserver un créneau",
      hint: "quand la personne est chaude",
      url: `${origin}/rdv/${slug}`,
      message: (u) => `Super ! Choisis directement ton créneau ici, ça me bloque le rendez-vous : ${u}`,
    },
    {
      key: "coach",
      icon: "🪪",
      title: "Ma page coach",
      hint: "à mettre en bio réseaux",
      url: `${origin}/coach/${slug}`,
      message: (u) => `Voilà ma page si tu veux voir ce que je fais 🌿 ${u}`,
    },
    {
      key: "zoom_appel",
      icon: "🎙️",
      title: "Zoom · Appel Ambassadeur",
      hint: "à envoyer aux inscrits le jour J",
      url: links.zoom_appel ?? "",
      missing: !links.zoom_appel,
      message: (u) =>
        `C'est ce soir ! Voici le lien pour rejoindre l'Appel Ambassadeur : ${u}\nPas besoin de micro, tu peux juste écouter 🙂`,
    },
    {
      key: "zoom_atelier",
      icon: "❤️",
      title: "Zoom · Atelier Cœurs",
      hint: "à envoyer aux inscrits le jour J",
      url: links.zoom_atelier ?? "",
      missing: !links.zoom_atelier,
      message: (u) => `On se retrouve ce soir à l'Atelier Cœurs 🧡 Le lien : ${u}`,
    },
    {
      key: "google",
      icon: "⭐",
      title: "Avis Google",
      hint: "au bilan des 10, quand il est content",
      url: links.google_review ?? "",
      missing: !links.google_review,
      message: (u) =>
        `Si ${club} t'apporte des résultats, ça m'aiderait énormément que tu laisses un avis ⭐ Ça prend 30 secondes : ${u}`,
    },
  ];

  function copy(key: string, text: string) {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? "" : c)), 1600);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 0 2px" }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 8px var(--ls-bbc-teal)" }} />
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
          liens rapides
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", margin: "-6px 0 0 2px" }}>
        1 tap = le message + le lien, prêts à envoyer.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        {LINKS.map((l) => {
          const msg = l.message(l.url);
          return (
            <div
              key={l.key}
              style={{
                background: "var(--ls-bbc-s1)",
                border: "1px solid var(--ls-bbc-line)",
                borderLeft: `3px solid ${l.missing ? "var(--ls-bbc-hint)" : "var(--ls-bbc-teal)"}`,
                borderRadius: 16,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                opacity: l.missing ? 0.75 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span aria-hidden="true" style={{ fontSize: 18 }}>{l.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{l.title}</div>
                  <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)" }}>{l.hint}</div>
                </div>
              </div>

              {l.missing ? (
                <div style={{ fontSize: 11.5, color: "var(--ls-bbc-hint)", background: "var(--ls-bbc-s2)", border: "1px dashed var(--ls-bbc-line2)", borderRadius: 10, padding: "10px 12px", lineHeight: 1.45 }}>
                  Lien pas encore renseigné — ajoute-le dans <b style={{ color: "var(--ls-bbc-text)" }}>Réglages → les liens du club</b>.
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-hint)", wordBreak: "break-all" }}>{l.url}</div>
                  <div style={{ background: "var(--ls-bbc-s2)", borderRadius: 10, padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => copy(`${l.key}-msg`, msg)} style={btnFill}>
                      {copied === `${l.key}-msg` ? "copié ✓" : "copier le message"}
                    </button>
                    <button type="button" onClick={() => copy(`${l.key}-url`, l.url)} style={btnGhost}>
                      {copied === `${l.key}-url` ? "copié ✓" : "lien seul"}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                    >
                      WhatsApp
                    </a>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnFill: CSSProperties = {
  border: 0,
  cursor: "pointer",
  fontSize: 11.5,
  fontWeight: 700,
  padding: "9px 13px",
  borderRadius: 10,
  background: "var(--ls-bbc-lime)",
  color: "var(--ls-bbc-lime-ink)",
  fontFamily: "var(--ls-bbc-font-body)",
};

const btnGhost: CSSProperties = {
  border: "1px solid var(--ls-bbc-line2)",
  cursor: "pointer",
  fontSize: 11.5,
  fontWeight: 600,
  padding: "9px 13px",
  borderRadius: 10,
  background: "transparent",
  color: "var(--ls-bbc-muted)",
  fontFamily: "var(--ls-bbc-font-body)",
};
