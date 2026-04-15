import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { formatDate } from "../lib/calculations";

type RecommendationClientItem = {
  id: string;
  assessmentId: string;
  clientName: string;
  distributorName: string;
  programTitle: string;
  assessmentDate: string;
  recommendationCount: number;
  recommendationsContacted: boolean;
  objectiveFocus: string;
};

export function RecommendationsPage() {
  const { currentUser, visibleClients } = useAppContext();

  const recommendationClients: RecommendationClientItem[] = visibleClients
    .flatMap((client) =>
      (client.assessments ?? [])
        .filter((assessment) => (assessment.questionnaire?.recommendations?.length ?? 0) > 0)
        .map((assessment) => ({
          id: client.id,
          assessmentId: assessment.id,
          clientName: `${client.firstName} ${client.lastName}`,
          distributorName: client.distributorName,
          programTitle: assessment.programTitle,
          assessmentDate: assessment.date,
          recommendationCount: assessment.questionnaire?.recommendations?.length ?? 0,
          recommendationsContacted: assessment.questionnaire.recommendationsContacted ?? false,
          objectiveFocus:
            assessment.questionnaire.objectiveFocus ||
            (client.objective === "sport" ? "Prise de masse" : "Perte de poids")
        }))
    )
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());

  const pendingClients = recommendationClients.filter((item) => !item.recommendationsContacted);
  const contactedClients = recommendationClients.filter((item) => item.recommendationsContacted);
  const pendingCount = pendingClients.reduce((sum, item) => sum + item.recommendationCount, 0);
  const contactedCount = contactedClients.reduce((sum, item) => sum + item.recommendationCount, 0);

  const groupedByCoach = recommendationClients.reduce<Record<string, RecommendationClientItem[]>>((groups, item) => {
    const key = currentUser?.role === "admin" ? item.distributorName : "Mes dossiers";
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});

  const coachEntries = Object.entries(groupedByCoach).sort(([first], [second]) => first.localeCompare(second, "fr"));

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Recommandations"
        title="Recommandations"
        description="Les dossiers à reprendre, les noms à relancer et l’état du suivi, sans surcharger l’écran."
      />

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.26),rgba(15,23,42,0.52))]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="eyebrow-label">À traiter aujourd’hui</p>
              <h2 className="mt-3 text-3xl text-white">
                {pendingCount
                  ? `${pendingCount} recommandation${pendingCount > 1 ? "s" : ""} restent à reprendre.`
                  : "Les recommandations visibles sont déjà reprises."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#B0B4C4]">
                Tu ouvres le dossier, tu vois ce qui reste à faire, puis tu repars sur l’action.
              </p>
            </div>
            <StatusBadge label={pendingCount ? "À reprendre" : "À jour"} tone={pendingCount ? "amber" : "green"} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <RecommendationMetricCard label="Dossiers avec recos" value={recommendationClients.length} hint="Bilans concernés" tone="blue" />
            <RecommendationMetricCard label="À contacter" value={pendingCount} hint="Contacts encore à reprendre" tone="amber" />
            <RecommendationMetricCard label="Contactées" value={contactedCount} hint="Contacts déjà relus" tone="green" />
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="eyebrow-label">Aide terrain</p>
            <h2 className="mt-3 text-2xl text-white">Garder le bon ton</h2>
          </div>
          <div className="grid gap-3">
            <CompactReminder title="Ouvrir simplement" text="Tu relis le dossier, puis tu reprends le contact sans en faire trop." />
            <CompactReminder title="Relancer proprement" text="Un prénom, un contact, une suite claire. L’écran sert surtout à ne rien laisser dormir." />
            <CompactReminder title="Rester léger" text="Le but est d’avancer, pas de rajouter des couches de consignes." />
          </div>
        </Card>
      </div>

      {coachEntries.length ? (
        <div className="space-y-5">
          {coachEntries.map(([coachName, items]) => {
            const coachPending = items.filter((item) => !item.recommendationsContacted);

            return (
              <Card key={coachName} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow-label">Coach</p>
                    <h2 className="mt-3 text-2xl text-white">{coachName}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={`${items.length} dossier${items.length > 1 ? "s" : ""}`} tone="blue" />
                    <StatusBadge label={`${coachPending.length} à reprendre`} tone={coachPending.length ? "amber" : "green"} />
                  </div>
                </div>

                <div className="grid gap-3">
                  {items.map((item) => (
                    <Link
                      key={`${item.id}-${item.assessmentId}`}
                      to={`/clients/${item.id}`}
                      className="rounded-[24px] bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
                    >
                      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.7fr] xl:items-center">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-xl font-semibold text-white">{item.clientName}</p>
                            <StatusBadge
                              label={item.recommendationsContacted ? "Recommandations contactées" : "Recommandations à contacter"}
                              tone={item.recommendationsContacted ? "green" : "amber"}
                            />
                          </div>
                          <p className="text-sm text-[var(--ls-text-muted)]">
                            {item.programTitle} · {item.objectiveFocus}
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <RecommendationFact label="Bilan" value={formatDate(item.assessmentDate)} />
                          <RecommendationFact
                            label="Recommandations"
                            value={`${item.recommendationCount} notée${item.recommendationCount > 1 ? "s" : ""}`}
                          />
                        </div>

                        <div className="text-sm text-[var(--ls-text-muted)] xl:text-right">
                          <p>{item.recommendationsContacted ? "Suivi relu" : "Rappel en attente"}</p>
                          <p className="mt-1">
                            {currentUser?.role === "admin" ? `Coach : ${item.distributorName}` : "Voir le dossier"}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="space-y-3">
          <p className="text-2xl text-white">Aucune recommandation visible</p>
          <p className="text-sm leading-6 text-[var(--ls-text-muted)]">
            Les recommandations notées dans les bilans apparaîtront ici, par coach et par dossier.
          </p>
        </Card>
      )}
    </div>
  );
}

function RecommendationMetricCard({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: number;
  hint: string;
  tone: "blue" | "green" | "amber";
}) {
  return (
    <div className="rounded-[24px] bg-white/[0.03] px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ls-text-hint)]">{label}</p>
        <StatusBadge label={String(value)} tone={tone} />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#B0B4C4]">{hint}</p>
    </div>
  );
}

function CompactReminder({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] bg-white/[0.03] px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">{text}</p>
    </div>
  );
}

function RecommendationFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[var(--ls-bg)]/60 px-4 py-3">
      <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
