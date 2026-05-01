// =============================================================================
// FormationTabContent — contenu onglet "Formation" dans MessagesPage (Phase C)
//
// Affiche :
//  1. Bandeau admin_relay (admin only) si modules escaladés >48h
//  2. File pending_review_sponsor du user (sa lignee)
//  3. Empty state si rien a valider
//
// Auto-refresh via les hooks (60s).
// =============================================================================

import { useAppContext } from "../../context/AppContext";
import { EmptyState } from "../ui/EmptyState";
import { FormationReviewCard } from "./FormationReviewCard";
import {
  useFormationAdminQueue,
  useFormationReviewQueue,
} from "../../features/formation";

export function FormationTabContent() {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const { queue: sponsorQueue, reload: reloadSponsor } = useFormationReviewQueue();
  const { queue: adminQueue, reload: reloadAdmin } = useFormationAdminQueue();

  const hasNothing = sponsorQueue.length === 0 && adminQueue.length === 0;

  function handleActionDone() {
    void reloadSponsor();
    if (isAdmin) void reloadAdmin();
  }

  if (hasNothing) {
    return (
      <EmptyState
        emoji="🎓"
        title="Tout est à jour côté Formation"
        description="Aucune validation de module en attente. Tu peux profiter pour relancer un client dormant ou féliciter une recrue."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Bandeau admin_relay (admin only) */}
      {isAdmin && adminQueue.length > 0 ? (
        <section>
          <SectionHeader
            icon="🟣"
            title="Admin relay"
            subtitle={`${adminQueue.length} module${adminQueue.length > 1 ? "s" : ""} escaladé${adminQueue.length > 1 ? "s" : ""} (>48h sans review sponsor)`}
            color="var(--ls-purple)"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {adminQueue.map((row) => (
              <FormationReviewCard
                key={row.progress_id}
                row={row}
                isAdminRelay
                onActionDone={handleActionDone}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* File sponsor (lignee descendante) */}
      {sponsorQueue.length > 0 ? (
        <section>
          <SectionHeader
            icon="🟡"
            title="À valider"
            subtitle={`${sponsorQueue.length} module${sponsorQueue.length > 1 ? "s" : ""} de ta lignée en attente`}
            color="var(--ls-gold)"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sponsorQueue.map((row) => (
              <FormationReviewCard
                key={row.progress_id}
                row={row}
                onActionDone={handleActionDone}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  color,
}: {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      <span style={{ fontSize: 18 }} aria-hidden="true">
        {icon}
      </span>
      <div>
        <h3
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 14,
            margin: 0,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            margin: "1px 0 0",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
