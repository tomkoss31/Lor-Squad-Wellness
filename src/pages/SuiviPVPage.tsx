import { useEffect, useMemo, useState, type FormEvent } from "react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import { supabase } from "../lib/supabaseClient";
import type { Client, ClientProduit } from "../lib/types";

const defaultProgramForm = {
  client_id: "",
  produit_name: "",
  start_date: new Date().toISOString().slice(0, 10),
  duration_days: "30",
  pv: "",
  price_public: ""
};

export function SuiviPVPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [programs, setPrograms] = useState<ClientProduit[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState(defaultProgramForm);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [{ data: clients }, { data: products }] = await Promise.all([
        supabase.from("clients").select("*").order("last_name", { ascending: true }),
        supabase.from("client_produits").select("*").order("start_date", { ascending: false })
      ]);

      setClients((clients ?? []) as Client[]);
      setPrograms((products ?? []) as ClientProduit[]);
      setLoading(false);
    }

    void loadData();
  }, []);

  const activePrograms = useMemo(
    () => programs.filter((program) => program.status === "actif" || program.status === "pause"),
    [programs]
  );

  const overview = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const activeThisMonth = activePrograms.filter((program) => {
      const start = new Date(program.start_date);
      return start.getMonth() === month && start.getFullYear() === year;
    });
    const renewalsThisWeek = activePrograms.filter((program) => {
      if (!program.expected_end_date) {
        return false;
      }

      const diff = daysBetween(now, new Date(program.expected_end_date));
      return diff >= 0 && diff <= 7;
    });

    return {
      totalPv: activeThisMonth.reduce((sum, program) => sum + (program.pv ?? 0), 0),
      clientsCount: new Set(activePrograms.map((program) => program.client_id)).size,
      renewalsThisWeek: renewalsThisWeek.length
    };
  }, [activePrograms]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Non authentifié");
      }

      const expectedEndDate = new Date(formState.start_date);
      expectedEndDate.setDate(expectedEndDate.getDate() + Number(formState.duration_days));

      const { data, error } = await supabase
        .from("client_produits")
        .insert({
          client_id: formState.client_id,
          coach_id: user.id,
          produit_name: formState.produit_name,
          start_date: formState.start_date,
          expected_end_date: expectedEndDate.toISOString().slice(0, 10),
          pv: formState.pv ? Number(formState.pv) : undefined,
          price_public: formState.price_public ? Number(formState.price_public) : undefined,
          status: "actif"
        })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setPrograms((previous) => [data as ClientProduit, ...previous]);
      setFormState(defaultProgramForm);
      setModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Ajout impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total PV du mois" value={overview.totalPv.toFixed(2)} />
        <MetricCard label="Clients avec produits actifs" value={overview.clientsCount} />
        <MetricCard label="Renouvellements cette semaine" value={overview.renewalsThisWeek} />
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow-label">Programmes actifs</p>
            <h2 className="mt-3 text-[1.4rem] font-bold">Suivi des programmes et renouvellements</h2>
          </div>
          <Button onClick={() => setModalOpen(true)}>Ajouter un programme</Button>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <div key={index} className="lor-skeleton h-[118px]" />)
          ) : activePrograms.length === 0 ? (
            <EmptyState
              icon="📦"
              title="Aucun programme actif"
              subtitle="Ajoute un programme client pour démarrer le suivi PV et les alertes de renouvellement."
            />
          ) : (
            activePrograms.map((program) => {
              const totalDays = daysBetween(new Date(program.start_date), new Date(program.expected_end_date ?? program.start_date)) || 1;
              const elapsedDays = Math.max(0, daysBetween(new Date(program.start_date), new Date()));
              const remainingDays = Math.max(0, totalDays - elapsedDays);
              const progress = Math.min((elapsedDays / totalDays) * 100, 100);
              const clientName = clients.find((client) => client.id === program.client_id);

              return (
                <div
                  key={program.id}
                  className="rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-medium text-[var(--lor-text)]">
                        {clientName ? `${clientName.first_name} ${clientName.last_name}` : "Client"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--lor-muted)]">{program.produit_name}</p>
                    </div>
                    {remainingDays < 7 ? (
                      <Badge variant="danger">Renouvellement imminent</Badge>
                    ) : remainingDays < 14 ? (
                      <Badge variant="warning">Renouvellement à prévoir</Badge>
                    ) : (
                      <Badge variant="success">En cours</Badge>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-[var(--lor-muted)] md:grid-cols-4">
                    <p>Début: {formatDate(program.start_date)}</p>
                    <p>Jours écoulés: {elapsedDays}</p>
                    <p>Jours restants: {remainingDays}</p>
                    <p>PV: {program.pv ?? "-"}</p>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-[var(--lor-surface2)]">
                    <div
                      className="h-2 rounded-full bg-[var(--lor-gold)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(11,13,17,0.78)] p-4 backdrop-blur-sm">
          <Card className="w-full max-w-[640px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow-label">Ajout programme</p>
                <h2 className="mt-3 text-[1.6rem] font-bold">Créer un suivi produit</h2>
              </div>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Fermer
              </Button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="lor-label">Client</span>
                <select
                  value={formState.client_id}
                  onChange={(event) => setFormState((current) => ({ ...current, client_id: event.target.value }))}
                  className="lor-select"
                  required
                >
                  <option value="">Sélectionner</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nom du produit"
                  value={formState.produit_name}
                  onChange={(event) => setFormState((current) => ({ ...current, produit_name: event.target.value }))}
                  required
                />
                <Input
                  label="Date de début"
                  type="date"
                  value={formState.start_date}
                  onChange={(event) => setFormState((current) => ({ ...current, start_date: event.target.value }))}
                  required
                />
                <Input
                  label="Durée (jours)"
                  type="number"
                  value={formState.duration_days}
                  onChange={(event) => setFormState((current) => ({ ...current, duration_days: event.target.value }))}
                  required
                />
                <Input
                  label="PV"
                  type="number"
                  value={formState.pv}
                  onChange={(event) => setFormState((current) => ({ ...current, pv: event.target.value }))}
                />
                <Input
                  label="Prix public"
                  type="number"
                  value={formState.price_public}
                  onChange={(event) => setFormState((current) => ({ ...current, price_public: event.target.value }))}
                />
              </div>

              {formError ? <div className="lor-danger-banner rounded-[12px] px-4 py-3 text-sm">{formError}</div> : null}

              <div className="flex justify-end">
                <Button type="submit" loading={submitting}>
                  Enregistrer le programme
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="eyebrow-label">{label}</p>
      <p className="mt-4 text-[2rem] font-bold">{value}</p>
    </Card>
  );
}

function daysBetween(start: Date, end: Date) {
  const difference = end.getTime() - start.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default SuiviPVPage;
