import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import ScoreBar from "../components/ui/ScoreBar";
import EvolutionChart from "../components/charts/EvolutionChart";
import { useClients } from "../hooks/useClients";
import { useBilans } from "../hooks/useBilans";
import { useBodyScans } from "../hooks/useBodyScans";
import { useSuivis } from "../hooks/useSuivis";
import { readClientProduits, writeClientProduits } from "../lib/localData";
import { hasSupabaseEnv, supabase } from "../lib/supabaseClient";
import type { ClientProduit } from "../lib/types";

type DetailTab = "profil" | "bilans" | "scan" | "suivis" | "products";

const emptyProgramForm = {
  produit_name: "",
  start_date: new Date().toISOString().slice(0, 10),
  duration_days: "30",
  pv: "",
  price_public: ""
};

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clients, loading: clientsLoading, updateClient } = useClients();
  const { bilans, loading: bilansLoading } = useBilans(id);
  const { scans, loading: scansLoading } = useBodyScans(id);
  const { suivis, loading: suivisLoading } = useSuivis(id);
  const client = clients.find((entry) => entry.id === id);
  const [activeTab, setActiveTab] = useState<DetailTab>("profil");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    objective: "",
    notes: ""
  });
  const [programs, setPrograms] = useState<ClientProduit[]>([]);
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [programForm, setProgramForm] = useState(emptyProgramForm);

  useEffect(() => {
    if (client) {
      setFormState({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email ?? "",
        phone: client.phone ?? "",
        objective: client.objective ?? "",
        notes: client.notes ?? ""
      });
    }
  }, [client]);

  useEffect(() => {
    async function fetchPrograms() {
      if (!id) {
        return;
      }

      if (!hasSupabaseEnv) {
        setPrograms(
          readClientProduits()
            .filter((program) => program.client_id === id)
            .sort((left, right) => right.start_date.localeCompare(left.start_date))
        );
        return;
      }

      const { data, error } = await supabase
        .from("client_produits")
        .select("*")
        .eq("client_id", id)
        .order("start_date", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setPrograms((data ?? []) as ClientProduit[]);
    }

    void fetchPrograms();
  }, [id]);

  const latestScan = scans[0];
  const bilansChart = useMemo(
    () =>
      [...bilans]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((bilan) => ({
          label: shortDate(bilan.date),
          value: bilan.energy_level ?? null,
          secondaryValue: bilan.sleep_quality ?? null
        })),
    [bilans]
  );

  const weightChart = useMemo(
    () =>
      [...scans]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((scan) => ({
          label: shortDate(scan.date),
          value: scan.weight_kg ?? null,
          secondaryValue: scan.fat_mass_percent ?? null
        })),
    [scans]
  );

  if (clientsLoading && !client) {
    return <div className="lor-skeleton h-[420px]" />;
  }

  if (!client) {
    return (
      <EmptyState
        icon="🔎"
        title="Client introuvable"
        subtitle="Ce dossier n'existe pas ou n'est plus accessible."
      />
    );
  }

  const clientId = client.id;

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    try {
      await updateClient(clientId, {
        first_name: formState.first_name.trim(),
        last_name: formState.last_name.trim(),
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        objective: formState.objective.trim() || undefined,
        notes: formState.notes.trim() || undefined
      });
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Sauvegarde impossible.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) {
      return;
    }

    if (!hasSupabaseEnv) {
      const endDate = new Date(programForm.start_date);
      endDate.setDate(endDate.getDate() + Number(programForm.duration_days));
      const created: ClientProduit = {
        id: crypto.randomUUID(),
        client_id: id,
        coach_id: "demo-user",
        produit_name: programForm.produit_name,
        start_date: programForm.start_date,
        expected_end_date: endDate.toISOString().slice(0, 10),
        pv: programForm.pv ? Number(programForm.pv) : undefined,
        price_public: programForm.price_public ? Number(programForm.price_public) : undefined,
        status: "actif",
        created_at: new Date().toISOString()
      };
      const next = [created, ...readClientProduits()];
      writeClientProduits(next);
      setPrograms((previous) => [created, ...previous]);
      setProgramModalOpen(false);
      setProgramForm(emptyProgramForm);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const endDate = new Date(programForm.start_date);
    endDate.setDate(endDate.getDate() + Number(programForm.duration_days));

    const { data, error } = await supabase
      .from("client_produits")
      .insert({
        client_id: id,
        coach_id: user.id,
        produit_name: programForm.produit_name,
        start_date: programForm.start_date,
        expected_end_date: endDate.toISOString().slice(0, 10),
        pv: programForm.pv ? Number(programForm.pv) : undefined,
        price_public: programForm.price_public ? Number(programForm.price_public) : undefined,
        status: "actif"
      })
      .select("*")
      .single();

    if (error) {
      setProfileError(error.message);
      return;
    }

    setPrograms((previous) => [data as ClientProduit, ...previous]);
    setProgramModalOpen(false);
    setProgramForm(emptyProgramForm);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow-label">Fiche client</p>
            <h2 className="mt-3 text-[2rem] font-bold">
              {client.first_name} {client.last_name}
            </h2>
            <p className="mt-2 text-sm text-[var(--lor-muted)]">
              {client.objective || "Objectif principal à préciser"}
            </p>
          </div>
          <Badge variant={client.status === "actif" ? "success" : client.status === "pause" ? "warning" : "default"}>
            {client.status}
          </Badge>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => navigate(`/clients/${clientId}/bilan/new`)}>Nouveau bilan</Button>
          <Button variant="secondary" onClick={() => navigate(`/clients/${clientId}/scan/new`)}>
            Body Scan
          </Button>
          <Button variant="secondary" onClick={() => navigate(`/clients/${clientId}/suivi/new`)}>
            Nouveau suivi
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {([
          ["profil", "Profil"],
          ["bilans", "Historique bilans"],
          ["scan", "Body Scan"],
          ["suivis", "Suivis"],
          ["products", "Produits / PV"]
        ] as [DetailTab, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="lor-tab-button"
            data-active={activeTab === value}
            onClick={() => setActiveTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profil" ? (
        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Prénom"
                value={formState.first_name}
                onChange={(event) => setFormState((current) => ({ ...current, first_name: event.target.value }))}
                required
              />
              <Input
                label="Nom"
                value={formState.last_name}
                onChange={(event) => setFormState((current) => ({ ...current, last_name: event.target.value }))}
                required
              />
              <Input
                label="Email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              />
              <Input
                label="Téléphone"
                value={formState.phone}
                onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>

            <label className="block">
              <span className="lor-label">Objectif</span>
              <textarea
                value={formState.objective}
                onChange={(event) => setFormState((current) => ({ ...current, objective: event.target.value }))}
                className="lor-textarea"
              />
            </label>

            <label className="block">
              <span className="lor-label">Notes</span>
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                className="lor-textarea"
              />
            </label>

            {profileError ? <div className="lor-danger-banner rounded-[12px] px-4 py-3 text-sm">{profileError}</div> : null}

            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile}>
                Sauvegarder les modifications
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {activeTab === "bilans" ? (
        <div className="space-y-6">
          {bilansLoading ? <div className="lor-skeleton h-[260px]" /> : null}
          {bilans.length > 1 ? (
            <EvolutionChart
              data={bilansChart}
              primaryLabel="Énergie"
              secondaryLabel="Sommeil"
              primaryColor="var(--lor-gold)"
              secondaryColor="var(--lor-purple)"
            />
          ) : null}

          {bilans.length === 0 && !bilansLoading ? (
            <EmptyState
              icon="📝"
              title="Aucun bilan enregistré"
              subtitle="Crée un premier bilan pour visualiser l'historique et les tendances."
            />
          ) : (
            bilans.map((bilan) => (
              <Card key={bilan.id} className="p-5">
                <details>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-medium text-[var(--lor-text)]">{formatDate(bilan.date)}</p>
                        <p className="mt-1 text-sm text-[var(--lor-muted)]">
                          Énergie {bilan.energy_level ?? "-"} · Sommeil {bilan.sleep_quality ?? "-"} · Hydratation{" "}
                          {bilan.water_liters ?? "-"}L
                        </p>
                      </div>
                      <Badge variant="gold">{bilan.main_objective || "Bilan"}</Badge>
                    </div>
                  </summary>
                  <div className="mt-4 grid gap-4 text-sm text-[var(--lor-muted)] md:grid-cols-2">
                    <p>Petit-déjeuner: {bilan.breakfast || "Non renseigné"}</p>
                    <p>Déjeuner: {bilan.lunch || "Non renseigné"}</p>
                    <p>Dîner: {bilan.dinner || "Non renseigné"}</p>
                    <p>Freins: {bilan.blockers || "Non renseigné"}</p>
                    <p>Stress: {bilan.stress_level ?? "-"}/5</p>
                    <p>Motivation: {bilan.motivation_level ?? "-"}/5</p>
                  </div>
                </details>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "scan" ? (
        <div className="space-y-6">
          {latestScan ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow-label">Dernier body scan</p>
                  <h3 className="mt-3 text-[1.6rem] font-bold">{formatDate(latestScan.date)}</h3>
                </div>
                <p className="text-sm text-[var(--lor-muted)]">Lecture complète des métriques</p>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <ScoreBar label="Poids" value={latestScan.weight_kg ?? 0} max={180} unit=" kg" color="var(--lor-gold)" />
                <ScoreBar
                  label="Masse grasse"
                  value={latestScan.fat_mass_percent ?? 0}
                  max={50}
                  unit="%"
                  color="var(--lor-coral)"
                />
                <ScoreBar
                  label="Masse musculaire"
                  value={latestScan.muscle_mass_kg ?? 0}
                  max={80}
                  unit=" kg"
                  color="var(--lor-teal)"
                />
                <ScoreBar
                  label="Hydratation"
                  value={latestScan.water_percent ?? 0}
                  max={100}
                  unit="%"
                  color="var(--lor-purple)"
                />
              </div>
              <div className="mt-6 grid gap-3 text-sm text-[var(--lor-muted)] md:grid-cols-2">
                <p>Masse grasse femme: normale 20-30%</p>
                <p>Masse grasse homme: normale 10-20%</p>
                <p>Graisse viscérale: normale 1-9</p>
                <p>Hydratation: normale &gt; 55%</p>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon="📊"
              title="Aucun body scan"
              subtitle="Ajoute un premier scan pour afficher les zones normales et l'évolution."
            />
          )}

          {scans.length > 1 ? (
            <EvolutionChart
              data={weightChart}
              primaryLabel="Poids"
              secondaryLabel="Masse grasse %"
              primaryColor="var(--lor-gold)"
              secondaryColor="var(--lor-coral)"
            />
          ) : null}

          {scansLoading ? <div className="lor-skeleton h-[220px]" /> : null}

          {scans.length > 0 ? (
            <Card className="p-5">
              <h3 className="text-lg font-bold">Historique des scans</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm text-[var(--lor-muted)]">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)] text-[var(--lor-text)]">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Poids</th>
                      <th className="pb-3 pr-4">MG %</th>
                      <th className="pb-3 pr-4">Muscle</th>
                      <th className="pb-3">Hydratation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((scan) => (
                      <tr key={scan.id} className="border-b border-[rgba(255,255,255,0.04)]">
                        <td className="py-3 pr-4">{formatDate(scan.date)}</td>
                        <td className="py-3 pr-4">{scan.weight_kg ?? "-"}</td>
                        <td className="py-3 pr-4">{scan.fat_mass_percent ?? "-"}</td>
                        <td className="py-3 pr-4">{scan.muscle_mass_kg ?? "-"}</td>
                        <td className="py-3">{scan.water_percent ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "suivis" ? (
        <div className="space-y-4">
          {suivisLoading ? <div className="lor-skeleton h-[220px]" /> : null}
          {suivis.length === 0 && !suivisLoading ? (
            <EmptyState
              icon="📅"
              title="Aucun suivi hebdomadaire"
              subtitle="Enregistre un premier check-in pour suivre l'énergie, le sommeil et les victoires."
            />
          ) : (
            suivis.map((suivi) => (
              <Card key={suivi.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-medium text-[var(--lor-text)]">
                      Semaine {suivi.week_number ?? "-"} · {formatDate(suivi.date)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--lor-muted)]">
                      Énergie {suivi.energy_level ?? "-"} · Sommeil {suivi.sleep_quality ?? "-"} · Eau{" "}
                      {suivi.water_liters ?? "-"}L
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/clients/${clientId}/suivi/new`)}>
                    Nouveau suivi
                  </Button>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--lor-muted)]">
                  Victoires: {suivi.small_victories || "Aucune"} · Blocages: {suivi.remaining_blockers || "Aucun"}
                </p>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "products" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setProgramModalOpen(true)}>Ajouter un produit</Button>
          </div>

          {programs.length === 0 ? (
            <EmptyState
              icon="🧴"
              title="Aucun produit actif"
              subtitle="Ajoute un programme pour suivre les jours restants et les renouvellements."
            />
          ) : (
            programs.map((program) => {
              const totalDays = Math.max(1, daysBetween(new Date(program.start_date), new Date(program.expected_end_date ?? program.start_date)));
              const elapsedDays = Math.max(0, daysBetween(new Date(program.start_date), new Date()));
              const remainingDays = Math.max(0, totalDays - elapsedDays);

              return (
                <Card key={program.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-medium text-[var(--lor-text)]">{program.produit_name}</p>
                      <p className="mt-1 text-sm text-[var(--lor-muted)]">
                        Début {formatDate(program.start_date)} · Jours écoulés {elapsedDays} · Jours restants {remainingDays}
                      </p>
                    </div>
                    {remainingDays < 7 ? (
                      <Badge variant="danger">Renouvellement imminent</Badge>
                    ) : remainingDays < 14 ? (
                      <Badge variant="warning">Renouvellement à prévoir</Badge>
                    ) : (
                      <Badge variant="success">Suivi actif</Badge>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : null}

      {programModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(11,13,17,0.78)] p-4 backdrop-blur-sm">
          <Card className="w-full max-w-[620px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow-label">Produit / PV</p>
                <h2 className="mt-3 text-[1.5rem] font-bold">Ajouter un produit</h2>
              </div>
              <Button variant="ghost" onClick={() => setProgramModalOpen(false)}>
                Fermer
              </Button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleAddProgram}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nom du produit"
                  value={programForm.produit_name}
                  onChange={(event) => setProgramForm((current) => ({ ...current, produit_name: event.target.value }))}
                  required
                />
                <Input
                  label="Date de début"
                  type="date"
                  value={programForm.start_date}
                  onChange={(event) => setProgramForm((current) => ({ ...current, start_date: event.target.value }))}
                  required
                />
                <Input
                  label="Durée (jours)"
                  type="number"
                  value={programForm.duration_days}
                  onChange={(event) => setProgramForm((current) => ({ ...current, duration_days: event.target.value }))}
                  required
                />
                <Input
                  label="PV"
                  type="number"
                  value={programForm.pv}
                  onChange={(event) => setProgramForm((current) => ({ ...current, pv: event.target.value }))}
                />
                <Input
                  label="Prix public"
                  type="number"
                  value={programForm.price_public}
                  onChange={(event) => setProgramForm((current) => ({ ...current, price_public: event.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Ajouter le produit</Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

function daysBetween(start: Date, end: Date) {
  const difference = end.getTime() - start.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

export default ClientDetailPage;
