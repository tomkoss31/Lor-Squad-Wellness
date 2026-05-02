// =============================================================================
// FormationMyTeamPage — /formation/mon-equipe (Phase C)
//
// Liste les recrues de la lignee descendante du user courant avec leur
// progression Formation. Visible uniquement si le user a au moins 1 recrue.
//
// Phase 2 (data) : modules vides → progressions toutes a 0. Sera vivant
// en Phase F quand le contenu Notion sera importe.
// =============================================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { EmptyState } from "../components/ui/EmptyState";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import { RecruteFormationCard } from "../components/formation/RecruteFormationCard";
import { useFormationReviewQueue } from "../features/formation";
import type { FormationProgressRow } from "../features/formation/types-db";
import type { User } from "../types/domain";

export function FormationMyTeamPage() {
  const { currentUser, users } = useAppContext();
  const { queue: pendingQueue } = useFormationReviewQueue();
  const [progressByUser, setProgressByUser] = useState<Map<string, FormationProgressRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recrues = users avec parent_user_id = currentUser.id (lignee directe N+1)
  // Phase C : on prend uniquement N+1 pour focus coaching. Lignee complete
  // (N+2+) reservee a /team standard et a /formation/admin.
  const myDirectRecruits: User[] =
    users?.filter((u) => u.sponsorId === currentUser?.id && u.id !== currentUser?.id) ?? [];

  // Charge les progressions de chaque recrue (RLS laisse passer car lignee)
  useEffect(() => {
    if (!currentUser || myDirectRecruits.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Supabase indisponible");
        const ids = myDirectRecruits.map((r) => r.id);
        const { data, error: fetchErr } = await sb
          .from("formation_user_progress")
          .select("*")
          .in("user_id", ids);
        if (fetchErr) throw fetchErr;
        if (cancelled) return;
        const map = new Map<string, FormationProgressRow[]>();
        for (const row of (data ?? []) as FormationProgressRow[]) {
          const list = map.get(row.user_id) ?? [];
          list.push(row);
          map.set(row.user_id, list);
        }
        setProgressByUser(map);
      } catch (err) {
        console.warn("[FormationMyTeamPage] load failed:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, myDirectRecruits.length]);

  if (!currentUser) return null;

  // Empty state si aucune recrue
  if (myDirectRecruits.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <PageHeading
          eyebrow="Formation · ma lignée"
          title="Mon équipe Formation"
          description="Suis la progression de tes recrues directes et valide leurs modules."
        />
        <EmptyState
          emoji="🌱"
          title="Bientôt ton équipe"
          description="Tes premières recrues apparaîtront ici dès que tu en parraineras une. C'est le moment où tu passes de coach à leader : faire AVEC, laisser FAIRE, corriger."
          ctaLabel="Inviter ma première recrue"
          ctaHref="/parametres?tab=equipe"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Formation · ma lignée"
        title="Mon équipe Formation"
        description={`${myDirectRecruits.length} recrue${myDirectRecruits.length > 1 ? "s" : ""} directe${myDirectRecruits.length > 1 ? "s" : ""}. Suis leur progression et valide leurs modules.`}
      />

      {/* Bandeau alerte si modules en attente */}
      {pendingQueue.length > 0 ? (
        <Link
          to="/messages?tab=formation"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface))",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
            borderLeft: "3px solid var(--ls-gold)",
            borderRadius: 14,
            textDecoration: "none",
            color: "var(--ls-text)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <span style={{ fontSize: 22 }} aria-hidden="true">⚡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {pendingQueue.length} module{pendingQueue.length > 1 ? "s" : ""} en attente de ta validation
            </div>
            <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
              Va dans la messagerie · onglet Formation pour valider
            </div>
          </div>
          <span style={{ color: "var(--ls-gold)", fontSize: 18 }}>→</span>
        </Link>
      ) : null}

      {/* Liste des recrues */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ls-text-muted)" }}>
          Chargement…
        </div>
      ) : error ? (
        <div
          style={{
            padding: 12,
            background: "color-mix(in srgb, var(--ls-coral) 6%, transparent)",
            border: "0.5px solid color-mix(in srgb, var(--ls-coral) 30%, transparent)",
            borderRadius: 10,
            fontSize: 12,
            color: "var(--ls-coral)",
          }}
        >
          ⚠ {error}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {myDirectRecruits.map((recrue) => {
            const recrueProgresses = progressByUser.get(recrue.id) ?? [];
            const pendingForMe = pendingQueue.filter((p) => p.user_id === recrue.id).length;
            return (
              <RecruteFormationCard
                key={recrue.id}
                recrue={recrue}
                progressRows={recrueProgresses}
                pendingForMe={pendingForMe}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
