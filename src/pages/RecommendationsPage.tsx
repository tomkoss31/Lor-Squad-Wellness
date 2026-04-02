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

  const groupedByCoach = recommendationClients.reduce<Record<string, RecommendationClientItem[]>>(
    (groups, item) => {
      const key = currentUser?.role === "admin" ? item.distributorName : "Mes dossiers";
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    },
    {}
  );

  const coachEntries = Object.entries(groupedByCoach).sort(([first], [second]) =>
    first.localeCompare(second, "fr")
  );

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Recommandations"
        title="Recommandations"
        description="Les dossiers a reprendre, par coach et par bilan, sans texte inutile."
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.26),rgba(15,23,42,0.52))]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="eyebrow-label">A traiter aujourd&apos;hui</p>
              <h2 className="mt-3 text-3xl text-white">
                {pendingCount
                  ? `${pendingCount} recommandation${pendingCount > 1 ? "s" : ""} restent a contacter.`
                  : "Toutes les recommandations visibles sont deja reprises."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                L&apos;utile ici : voir vite quels dossiers ont deja ete repris et lesquels restent a relancer.
              </p>
            </div>
            <StatusBadge label={pendingCount ? "A reprendre" : "A jour"} tone={pendingCount ? "amber" : "green"} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <RecommendationMetricCard
              label="Dossiers avec recos"
              value={recommendationClients.length}
              hint="Bilans concernes"
              tone="blue"
            />
            <RecommendationMetricCard
              label="A contacter"
              value={pendingCount}
              hint="Contacts encore a reprendre"
              tone="amber"
            />
            <RecommendationMetricCard
              label="Contactees"
              value={contactedCount}
              hint="Contacts deja relus"
              tone="green"
            />
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="eyebrow-label">Aide terrain</p>
            <h2 className="mt-3 text-2xl text-white">Rester simple</h2>
          </div>
          <div className="grid gap-3">
            <CompactReminder
              title="Ouvrir simplement"
              text="Le sujet est deja pose pendant le smoothie. Ici, tu reprends juste ce qui a ete note."
            />
            <CompactReminder
              title="Noter puis rappeler"
              text="Un prenom et un contact suffisent. La page sert surtout a voir ce qui a deja ete repris."
            />
            <CompactReminder
              title="Sans pression"
              text="Le bon geste est de relancer proprement, pas d&apos;empiler des consignes."
            />
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
                    <StatusBadge
                      label={`${coachPending.length} a reprendre`}
                      tone={coachPending.length ? "amber" : "green"}
                    />
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
                              label={
                                item.recommendationsContacted
                                  ? "Recommandations contactees"
                                  : "Recommandations a contacter"
                              }
                              tone={item.recommendationsContacted ? "green" : "amber"}
                            />
                          </div>
                          <p className="text-sm text-slate-400">
                            {item.programTitle} - {item.objectiveFocus}
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <RecommendationFact
                            label="Bilan"
                            value={formatDate(item.assessmentDate)}
                          />
                          <RecommendationFact
                            label="Recommandations"
                            value={`${item.recommendationCount} notee${item.recommendationCount > 1 ? "s" : ""}`}
                          />
                        </div>

                        <div className="text-sm text-slate-400 xl:text-right">
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
          <p className="text-sm leading-6 text-slate-400">
            Les recommandations notees dans les bilans apparaitront ici, par coach et par dossier.
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
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <StatusBadge label={String(value)} tone={tone} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{hint}</p>
    </div>
  );
}

function CompactReminder({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[22px] bg-white/[0.03] px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function RecommendationFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-slate-950/24 px-4 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
