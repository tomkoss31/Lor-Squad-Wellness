// Chantier Centre de Formation V1 (2026-04-23).
// Footer affiché en bas des 2 guides existants (GuidePage et
// FollowUpGuidePage). Au clic, marque la ressource correspondante comme
// vue dans training_progress puis redirige vers la catégorie "basics".
//
// La ressource est identifiée par son slug dans training_resources (seed
// data). On ne dépend pas de l'id en dur : on resolve via le slug pour
// rester robuste aux ré-exécutions de la migration.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useAppContext } from "../../context/AppContext";

export function GuideCompletionFooter({
  resourceSlug,
  title = "J'ai terminé ce guide",
  returnCategorySlug = "basics",
}: {
  resourceSlug: string;
  title?: string;
  returnCategorySlug?: string;
}) {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  async function handleComplete() {
    setError(null);
    setSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");

      // Resolve resource_id via le slug.
      const { data: resource, error: lookupErr } = await sb
        .from("training_resources")
        .select("id")
        .eq("slug", resourceSlug)
        .maybeSingle();
      if (lookupErr) throw new Error(lookupErr.message);
      if (!resource) {
        // Pas encore seedée → on ne crash pas, on redirige quand même.
        navigate(`/formation/${returnCategorySlug}`);
        return;
      }

      const { error: upsertErr } = await sb
        .from("training_progress")
        .upsert(
          { user_id: currentUser!.id, resource_id: resource.id },
          { onConflict: "user_id,resource_id" },
        );
      if (upsertErr) throw new Error(upsertErr.message);

      setDone(true);
      setTimeout(() => {
        navigate(`/formation/${returnCategorySlug}`);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3" style={{ marginTop: 32 }}>
      <p className="eyebrow-label">Progression formation</p>
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        Marque ce guide comme vu pour mettre à jour ta progression dans le
        Centre de formation.
      </p>

      {error ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(251,113,133,0.12)",
            color: "#FBBFC8",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {done ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(15,110,86,0.1)",
            color: "#0F6E56",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ✓ Bien noté — retour au Centre de formation…
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={() => void handleComplete()} disabled={saving}>
            {saving ? "Enregistrement…" : title}
          </Button>
          <Button variant="secondary" onClick={() => navigate("/formation")}>
            Retour au Centre de formation
          </Button>
        </div>
      )}
    </Card>
  );
}
