// Chantier Academy Phase 1 — vue admin progression (2026-04-26).
// Reproduit le Mockup C valide visuellement par Thomas. Affiche la
// progression Academy d un user (passe en prop) cote fiche distri.
// Reserve aux admins via le check fait par la RPC sous-jacente.

import { useAcademyAdminView } from "../hooks/useAcademyAdminView";
import type { AcademySection } from "../sections";

export interface AcademyAdminPanelProps {
  /** UUID du distri/user dont on veut voir la progression Academy. */
  userId: string;
  /** Nom affiche dans le header (prenom + nom). */
  displayName: string;
}

export function AcademyAdminPanel({ userId, displayName }: AcademyAdminPanelProps) {
  const view = useAcademyAdminView(userId);

  if (view.loading) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "#6B6B62",
          fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
        }}
      >
        Chargement de la progression…
      </div>
    );
  }

  if (view.error) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "#993556",
          fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
        }}
      >
        Impossible de charger la progression Academy.
      </div>
    );
  }

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const firstName = displayName.split(" ")[0] ?? displayName;

  return (
    <div
      style={{
        background: "#FAF6E8",
        borderRadius: 14,
        padding: 24,
        border: "0.5px solid #E5DFCF",
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#7F77DD",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {initials || "?"}
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "var(--ls-font-serif, Georgia, serif)",
              fontSize: 20,
              fontWeight: 500,
              margin: 0,
              color: "#2C2C2A",
            }}
          >
            {displayName}
          </h3>
          <p style={{ fontSize: 12, color: "#6B6B62", margin: "2px 0 0 0" }}>
            Progression Lor&apos;Squad Academy · vue admin
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Sections finies"
          value={`${view.completedCount} / ${view.totalCount}`}
          accentColor="#1D9E75"
        />
        <StatCard label="Dernière connexion" value={renderRelativeTime(view.lastAccessAt)} />
        {view.isStuck ? (
          <StatCard
            label="Bloqué depuis"
            value={`${view.daysStuckOnCurrent} jours`}
            background="#FAEEDA"
            border="#EFD9A1"
            accentColor="#854F0B"
          />
        ) : view.isCompleted ? (
          <StatCard
            label="Statut"
            value="Terminé"
            background="#E1F5EE"
            border="#9FE1CB"
            accentColor="#0F6E56"
          />
        ) : view.isSkipped ? (
          <StatCard label="Statut" value="Skippé" accentColor="#888780" />
        ) : !view.hasStarted ? (
          <StatCard label="Statut" value="Pas commencé" accentColor="#888780" />
        ) : (
          <StatCard label="En cours" value={view.currentSection.shortLabel} accentColor="#B8922A" />
        )}
      </div>

      {/* Sections list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {view.sectionsView.map(({ section, state }, idx) => {
          const isCurrentAndStuck = state === "current" && view.isStuck;

          if (isCurrentAndStuck) {
            return (
              <div
                key={section.id}
                style={{
                  background: "#FAEEDA",
                  padding: 14,
                  borderRadius: 10,
                  border: "1.5px solid #BA7517",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <SectionBadge state="current" index={idx} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>
                      {section.title}
                    </p>
                    <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#854F0B" }}>
                      En cours
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "0.5px solid #EFD9A1",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="#BA7517"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  >
                    <path d="M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.74V18h8v-3.26A7 7 0 0 0 12 2zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 12, color: "#5C3A05", lineHeight: 1.5 }}>
                    {firstName} semble bloqué·e ici depuis {view.daysStuckOnCurrent} jours.
                    C&apos;est peut-être le moment d&apos;un message ou d&apos;un appel.
                  </p>
                </div>
              </div>
            );
          }

          return <SectionRowCompact key={section.id} index={idx} section={section} state={state} />;
        })}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  accentColor?: string;
  background?: string;
  border?: string;
}

function StatCard({
  label,
  value,
  accentColor = "#2C2C2A",
  background = "white",
  border = "#E5DFCF",
}: StatCardProps) {
  return (
    <div
      style={{
        background,
        padding: "12px 14px",
        borderRadius: 10,
        border: `0.5px solid ${border}`,
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: accentColor === "#854F0B" ? "#854F0B" : "#6B6B62",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--ls-font-serif, Georgia, serif)",
          fontSize: 22,
          fontWeight: 500,
          margin: "4px 0 0 0",
          color: accentColor,
        }}
      >
        {value}
      </p>
    </div>
  );
}

interface SectionRowCompactProps {
  index: number;
  section: AcademySection;
  state: "done" | "current" | "todo";
}

function SectionRowCompact({ index, section, state }: SectionRowCompactProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "white",
        padding: "10px 14px",
        borderRadius: 10,
        border: "0.5px solid #E5DFCF",
        opacity: state === "todo" ? 1 : 0.95,
      }}
    >
      <SectionBadge state={state} index={index} />
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: state === "done" ? "#5F5E5A" : "#2C2C2A",
          flex: 1,
        }}
      >
        {section.title}
      </p>
      <span style={{ fontSize: 11, color: "#888780" }}>
        {section.estimatedDurationMinutes} min
        {state === "done" && " · ✓"}
        {state === "current" && " · en cours"}
        {state === "todo" && " · à faire"}
      </span>
    </div>
  );
}

function SectionBadge({ state, index }: { state: "done" | "current" | "todo"; index: number }) {
  if (state === "done") {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#1D9E75",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 14 14">
          <path
            d="M3 7L6 10L11 4"
            stroke="white"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (state === "current") {
    return (
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#BA7517",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "transparent",
        border: "1.5px solid #C9C2AB",
        color: "#888780",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {index + 1}
    </div>
  );
}

function renderRelativeTime(date: Date | null): string {
  if (!date) return "jamais";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} j`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`;
  return `il y a ${Math.floor(diffDays / 30)} mois`;
}
