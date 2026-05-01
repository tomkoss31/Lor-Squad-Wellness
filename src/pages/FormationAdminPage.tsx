// =============================================================================
// FormationAdminPage — pilotage Formation admin (Phase D, 2026-11-01)
//
// Route /formation/admin. Admin only. 4 zones empilees :
//   1. KPIs globaux (5 cards : actifs / pending / relay / validated total / today)
//   2. File admin_relay (FormationReviewCard avec isAdminRelay=true)
//   3. Sponsors decrocheées (>=1 recrue en relay)
//   4. Lien rapide vers /team pour la vue arborescence complete
// =============================================================================

import { Link, Navigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { EmptyState } from "../components/ui/EmptyState";
import { useAppContext } from "../context/AppContext";
import {
  useFormationAdminKpis,
  useFormationAdminQueue,
} from "../features/formation";
import { FormationAdminKPIs } from "../components/formation/FormationAdminKPIs";
import { FormationReviewCard } from "../components/formation/FormationReviewCard";
import { FormationSponsorDropoffSection } from "../components/formation/FormationSponsorDropoffSection";

export function FormationAdminPage() {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "admin";
  const { data, loading: kpisLoading, error: kpisError, reload: reloadKpis } = useFormationAdminKpis();
  const { queue: relayQueue, loading: relayLoading, reload: reloadRelay } = useFormationAdminQueue();

  // Garde de route : non-admin → redirect /formation
  if (!isAdmin) {
    return <Navigate to="/formation" replace />;
  }

  function handleActionDone() {
    void reloadKpis();
    void reloadRelay();
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Formation · pilotage admin"
        title="📊 Cockpit Formation du club"
        description="Vue admin de la progression Formation. KPIs club, modules en relay, sponsors décrochés."
      />

      {/* Zone 1 : KPIs */}
      <FormationAdminKPIs data={data} loading={kpisLoading} />

      {kpisError ? (
        <div
          style={{
            padding: "10px 12px",
            background: "color-mix(in srgb, var(--ls-coral) 6%, transparent)",
            border: "0.5px solid color-mix(in srgb, var(--ls-coral) 30%, transparent)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--ls-coral)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ⚠ {kpisError}
        </div>
      ) : null}

      {/* Zone 2 : File admin_relay */}
      <section>
        <SectionHeader
          icon="🟣"
          title="File admin relay"
          subtitle={
            relayQueue.length === 0
              ? "Aucun module escaladé — les sponsors sont réactifs."
              : `${relayQueue.length} module${relayQueue.length > 1 ? "s" : ""} en attente de ton arbitrage (sponsor absent >48h)`
          }
          color="var(--ls-purple)"
        />
        {relayLoading && relayQueue.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>
            Chargement…
          </div>
        ) : relayQueue.length === 0 ? (
          <EmptyState
            emoji="🌿"
            title="File vide"
            description="Personne n'attend de relais admin. Tes sponsors gèrent bien leurs validations."
            compact
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {relayQueue.map((row) => (
              <FormationReviewCard
                key={row.progress_id}
                row={row}
                isAdminRelay
                onActionDone={handleActionDone}
              />
            ))}
          </div>
        )}
      </section>

      {/* Zone 3 : Sponsors decrocheées */}
      <section>
        <SectionHeader
          icon="📉"
          title="Sponsors décrochés"
          subtitle={
            data && data.sponsor_dropoffs.length === 0
              ? "Tous les sponsors sont réactifs."
              : `${data?.sponsor_dropoffs.length ?? 0} sponsor${(data?.sponsor_dropoffs.length ?? 0) > 1 ? "s" : ""} avec recrue${(data?.sponsor_dropoffs.length ?? 0) > 1 ? "s" : ""} bloquée${(data?.sponsor_dropoffs.length ?? 0) > 1 ? "s" : ""}`
          }
          color="var(--ls-coral)"
        />
        <FormationSponsorDropoffSection dropoffs={data?.sponsor_dropoffs ?? []} />
      </section>

      {/* Zone 4 : Lien arborescence */}
      <Link
        to="/team"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderLeft: "3px solid var(--ls-teal)",
          borderRadius: 14,
          textDecoration: "none",
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 16px -8px color-mix(in srgb, var(--ls-teal) 30%, transparent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <span style={{ fontSize: 22 }} aria-hidden="true">🌳</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Arborescence complète du club</div>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
            Voir tout l'arbre de lignée + KPIs distri par distri sur la page /team
          </div>
        </div>
        <span style={{ color: "var(--ls-teal)", fontSize: 18 }}>→</span>
      </Link>
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
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      <span style={{ fontSize: 18 }} aria-hidden="true">
        {icon}
      </span>
      <div>
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 15,
            margin: 0,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 11.5,
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
