export function getTeamHierarchySetupError(error: { message?: string } | null | undefined) {
  const message = String(error?.message ?? "").toLowerCase();

  if (!message) {
    return null;
  }

  if (message.includes("sponsor_id") || message.includes("sponsor_name")) {
    return "Le rattachement d'equipe n'est pas encore active sur cette base Supabase. Lance le fichier supabase/fix-team-hierarchy.sql dans SQL Editor, puis recharge l'application.";
  }

  return null;
}
