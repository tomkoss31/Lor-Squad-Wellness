// Chantier Academy Phase 1 — popup auto-trigger (2026-04-26).
// Pattern modal maison (cf. BirthdayMessageDialog, ClientAccessModal) :
// div fixed avec backdrop + content centre, pas de portal.
//
// Le popup propose au distri de demarrer / reprendre la formation Academy.
// Anti-spam 1×/jour via markReminderDismissedToday() qui inscrit une ligne
// dans user_tour_reminder_dismissals.

import { useNavigate } from "react-router-dom";
import { useAcademyProgress } from "../hooks/useAcademyProgress";
import { APP_NAME_ACADEMY } from "../../../lib/branding";

type AcademyView = ReturnType<typeof useAcademyProgress>["view"];

export function AcademyReminderDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { view, markReminderDismissedToday } = useAcademyProgress();

  const handleStart = () => {
    // Marque dismissed today AVANT de naviguer : evite que le popup re-pop
    // si le user revient sur /co-pilote dans la meme session apres avoir
    // commence la formation.
    markReminderDismissedToday();
    onClose();
    navigate("/academy");
  };

  const handleLater = () => {
    markReminderDismissedToday();
    onClose();
  };

  const isFirstTime = !view.hasStarted && view.completedCount === 0;

  return (
    <div
      onClick={handleLater}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="academy-reminder-title"
        style={{
          background: "#FAF6E8",
          borderRadius: 18,
          maxWidth: 460,
          width: "100%",
          padding: "32px 28px",
          border: "0.5px solid #E5DFCF",
          fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={handleLater}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            fontSize: 22,
            color: "#888780",
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <ProgressRing percent={view.percentComplete} />
        </div>

        <h2
          id="academy-reminder-title"
          style={{
            fontFamily: "var(--ls-font-serif, Georgia, serif)",
            fontSize: 24,
            fontWeight: 500,
            margin: "0 0 10px 0",
            color: "#2C2C2A",
            textAlign: "center",
          }}
        >
          {isFirstTime ? `Bienvenue dans ${APP_NAME_ACADEMY}` : "On continue ta formation ?"}
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "#5F5E5A",
            textAlign: "center",
            lineHeight: 1.5,
            margin: "0 0 24px 0",
          }}
        >
          {renderSubtitle(view, isFirstTime)}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={handleStart}
            style={{
              background: "#B8922A",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              width: "100%",
            }}
          >
            {isFirstTime ? "C'est parti (1 minute)" : "Reprendre la formation"}
          </button>
          <button
            type="button"
            onClick={handleLater}
            style={{
              background: "transparent",
              border: "none",
              color: "#888780",
              fontSize: 13,
              cursor: "pointer",
              padding: "8px",
              width: "100%",
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

function renderSubtitle(view: AcademyView, isFirstTime: boolean): string {
  if (isFirstTime) {
    const total = view.remainingMinutes;
    const minuteWord = total > 1 ? "minutes" : "minute";
    return `Apprends à utiliser l'app en ${view.totalCount} sections rapides. Environ ${total} ${minuteWord} au total.`;
  }
  const sectionWord = view.completedCount > 1 ? "sections" : "section";
  const completedSuffix = view.completedCount > 1 ? "terminées" : "terminée";
  const minuteWord = view.remainingMinutes > 1 ? "minutes" : "minute";
  return `${view.completedCount} ${sectionWord} sur ${view.totalCount} ${completedSuffix}. Il te reste environ ${view.remainingMinutes} ${minuteWord}.`;
}

function ProgressRing({ percent }: { percent: number }) {
  const ringRadius = 32;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashoffset = ringCircumference * (1 - percent / 100);

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={ringRadius} fill="none" stroke="#E5DFCF" strokeWidth="6" />
      <circle
        cx="40"
        cy="40"
        r={ringRadius}
        fill="none"
        stroke="#B8922A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={ringCircumference}
        strokeDashoffset={ringDashoffset}
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="46"
        textAnchor="middle"
        fontFamily="var(--ls-font-serif, Georgia, serif)"
        fontSize="18"
        fontWeight="500"
        fill="#5C4A0F"
      >
        {percent}%
      </text>
    </svg>
  );
}
