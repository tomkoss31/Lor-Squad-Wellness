// =============================================================================
// Liste100ShortcutCard — raccourci direct Co-pilote → Liste 100 Cahier de bord
// (Phase 0.8 brainstorm Égypte 2026-05)
// =============================================================================
//
// Constat Thomas : « Le processus est peut-être trop long compliqué à
// trouver. » Aujourd'hui Bilan → Mon développement → Cahier de bord →
// onglet Liste 100 = 3-4 clics. Idéal : 1 clic depuis Co-pilote.
//
// Card minimaliste avec compteur live (X / 100 noms) qui navigue vers
// `/cahier-de-bord?tab=liste`. Le query param est lu par CahierDeBordPage
// pour ouvrir directement le bon onglet.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useCahierDeBord } from "../../hooks/useCahierDeBord";

export function Liste100ShortcutCard() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const cahier = useCahierDeBord(currentUser?.id ?? null);

  // Pas de rendu si le user n'est pas un distributeur / référent (admin pur n'a
  // pas vocation à tenir sa liste 100).
  if (!currentUser) return null;

  const count = cahier.contacts.length;
  const target = 100;
  const progress = Math.min(100, Math.round((count / target) * 100));

  return (
    <button
      type="button"
      onClick={() => navigate("/cahier-de-bord?tab=liste")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        textAlign: "left",
        padding: "14px 18px",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface)) 100%)",
        border: "1px solid color-mix(in srgb, var(--ls-purple) 22%, var(--ls-border))",
        borderRadius: 14,
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        transition: "transform 120ms ease, background 120ms ease",
      }}
      title="Ouvrir directement ta Liste 100 connaissances (méthode FRANK)"
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "color-mix(in srgb, var(--ls-purple) 16%, var(--ls-surface))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        📒
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ls-text)",
            letterSpacing: "-0.005em",
          }}
        >
          Ma liste 100
        </div>
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
          {count} / {target} noms — méthode FRANK
        </div>
        {/* Mini barre de progression */}
        <div
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 999,
            background: "color-mix(in srgb, var(--ls-purple) 14%, transparent)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--ls-purple)",
              transition: "width 240ms ease",
            }}
          />
        </div>
      </div>
      <span
        aria-hidden="true"
        style={{
          fontSize: 18,
          color: "var(--ls-text-muted)",
          flexShrink: 0,
        }}
      >
        →
      </span>
    </button>
  );
}
