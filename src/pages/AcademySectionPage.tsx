// Chantier Academy Phase 1 (2026-04-26).
// Page atteinte quand on clique sur une section depuis l overview. En
// Phase 1, c est un placeholder informatif — le tutoriel interactif
// arrive en Phase 2 (un chantier par section).

import { useNavigate, useParams } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { getAcademySectionById } from "../features/academy/sections";
import { TourRunner } from "../features/onboarding/TourRunner";

export function AcademySectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { markSectionDone } = useAcademyProgress();

  const section = sectionId ? getAcademySectionById(sectionId) : undefined;

  // Si la section a des steps, on lance le TourRunner. Sinon (Phase 1
  // sections vides), on retombe sur le placeholder ci-dessous.
  if (section && section.steps.length > 0) {
    return (
      <TourRunner
        steps={section.steps}
        onClose={(reason) => {
          if (reason === "completed") {
            markSectionDone(section.id);
          }
          navigate("/academy");
        }}
      />
    );
  }

  if (!section) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "#6B6B62",
          fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
        }}
      >
        Section introuvable.
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => navigate("/academy")}
            style={{
              background: "transparent",
              border: "0.5px solid #C9C2AB",
              color: "#6B6B62",
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Retour à l&apos;Academy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/academy")}
        style={{
          background: "transparent",
          border: "none",
          color: "#6B6B62",
          fontSize: 13,
          marginBottom: 16,
          cursor: "pointer",
          padding: 0,
        }}
      >
        ← Retour à l&apos;Academy
      </button>

      <div
        style={{
          background: "#FAF6E8",
          borderRadius: 16,
          padding: 32,
          border: "0.5px solid #E5DFCF",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12 }}>{section.icon}</div>
        <h1
          style={{
            fontFamily: "var(--ls-font-serif, Georgia, serif)",
            fontSize: 28,
            fontWeight: 500,
            margin: "0 0 12px 0",
            color: "#2C2C2A",
          }}
        >
          {section.title}
        </h1>
        <p style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.6, margin: "0 0 24px 0" }}>
          {section.description}
        </p>

        <div
          style={{
            background: "#FCF5E1",
            border: "1px solid #EFD9A1",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 24,
            fontSize: 13,
            color: "#5C4A0F",
          }}
        >
          <strong style={{ fontWeight: 500 }}>🚧 Phase 1</strong> — le tutoriel interactif de cette
          section sera disponible en Phase 2. Pour l&apos;instant, tu peux marquer cette section
          comme « vue » pour avancer dans ta progression.
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              markSectionDone(section.id);
              navigate("/academy");
            }}
            style={{
              background: "#B8922A",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            ✓ Marquer comme vue
          </button>
          <button
            type="button"
            onClick={() => navigate("/academy")}
            style={{
              background: "transparent",
              border: "0.5px solid #C9C2AB",
              color: "#6B6B62",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
