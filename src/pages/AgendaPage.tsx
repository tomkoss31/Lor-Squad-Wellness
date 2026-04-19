// Stub AgendaPage — contenu complet en SC3 (chantier 2026-04-19).
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";

export function AgendaPage() {
  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Agenda"
        title="Agenda prospection"
        description="RDV prospection à venir, en cours et convertis."
      />
      <Card>
        <p className="text-sm text-[var(--ls-text-muted)]">Contenu en cours d'implémentation.</p>
      </Card>
    </div>
  );
}
