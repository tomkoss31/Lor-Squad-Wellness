// =============================================================================
// leadDateFormat — petits helpers de formatage de date pour les leads CRM.
// Extraits de CrmPage.tsx (chantier refonte CRM Liste/Pipeline 2026-07) pour
// être partagés entre la vue Pipeline (LeadCard) et la vue Liste
// (CrmLeadsListView) sans dépendance page → composant.
// =============================================================================

export function formatLeadDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function relativeLeadDays(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days}j`;
}
