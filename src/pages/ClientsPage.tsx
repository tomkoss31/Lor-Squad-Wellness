import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";
import { useClients } from "../hooks/useClients";
import { readBilans } from "../lib/localData";
import { hasSupabaseEnv, supabase } from "../lib/supabaseClient";
import type { Bilan, Client } from "../lib/types";

type SortMode = "created_at" | "name" | "last_bilan";

const pageSize = 12;
const emptyClientForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  birth_date: "",
  gender: "",
  height_cm: "",
  objective: ""
};

export function ClientsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients, loading, error, createClient } = useClients();
  const [lastBilans, setLastBilans] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Client["status"]>("all");
  const [sortMode, setSortMode] = useState<SortMode>("created_at");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(searchParams.get("new") === "1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState(emptyClientForm);

  useEffect(() => {
    setModalOpen(searchParams.get("new") === "1");
  }, [searchParams]);

  useEffect(() => {
    async function fetchBilans() {
      if (!hasSupabaseEnv) {
        const map: Record<string, string> = {};
        readBilans()
          .sort((left, right) => right.date.localeCompare(left.date))
          .forEach((bilan) => {
            if (!map[bilan.client_id]) {
              map[bilan.client_id] = bilan.date;
            }
          });
        setLastBilans(map);
        return;
      }

      const { data, error } = await supabase.from("bilans").select("client_id, date").order("date", { ascending: false });
      if (error) {
        console.error(error);
        return;
      }

      const map: Record<string, string> = {};
      ((data ?? []) as Pick<Bilan, "client_id" | "date">[]).forEach((bilan) => {
        if (!map[bilan.client_id]) {
          map[bilan.client_id] = bilan.date;
        }
      });
      setLastBilans(map);
    }

    void fetchBilans();
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return clients
      .filter((client) => {
        if (statusFilter !== "all" && client.status !== statusFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return `${client.first_name} ${client.last_name}`.toLowerCase().includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (sortMode === "name") {
          return `${left.first_name} ${left.last_name}`.localeCompare(`${right.first_name} ${right.last_name}`, "fr");
        }

        if (sortMode === "last_bilan") {
          return (lastBilans[right.id] ?? "").localeCompare(lastBilans[left.id] ?? "");
        }

        return right.created_at.localeCompare(left.created_at);
      });
  }, [clients, lastBilans, search, sortMode, statusFilter]);

  const paginatedClients = filteredClients.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortMode]);

  function updateSearchParam(open: boolean) {
    if (open) {
      setSearchParams({ new: "1" });
    } else {
      setSearchParams({});
    }
  }

  async function handleCreateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const created = await createClient({
        first_name: formState.first_name.trim(),
        last_name: formState.last_name.trim(),
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        birth_date: formState.birth_date || undefined,
        gender: (formState.gender || undefined) as Client["gender"],
        height_cm: formState.height_cm ? Number(formState.height_cm) : undefined,
        objective: formState.objective.trim() || undefined,
        status: "actif"
      });

      setFormState(emptyClientForm);
      updateSearchParam(false);
      navigate(`/clients/${created.id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_220px_auto]">
          <Input
            label="Recherche"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom ou prénom"
          />

          <label className="block">
            <span className="lor-label">Statut</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | Client["status"])}
              className="lor-select"
            >
              <option value="all">Tous</option>
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="pause">Pause</option>
            </select>
          </label>

          <label className="block">
            <span className="lor-label">Tri</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="lor-select">
              <option value="created_at">Date de création</option>
              <option value="name">Nom</option>
              <option value="last_bilan">Dernier bilan</option>
            </select>
          </label>

          <div className="flex items-end">
            <Button className="w-full" onClick={() => updateSearchParam(true)}>
              Nouveau client
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="lor-skeleton h-[210px]" />
          ))}
        </div>
      ) : error ? (
        <div className="lor-danger-banner rounded-[12px] px-5 py-4 text-sm">{error}</div>
      ) : paginatedClients.length === 0 ? (
        <EmptyState
          icon="🧘"
          title="Aucun client trouvé"
          subtitle="Ajuste la recherche ou crée un nouveau dossier client pour démarrer un accompagnement."
          action={<Button onClick={() => updateSearchParam(true)}>Créer un client</Button>}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {paginatedClients.map((client) => (
              <Card key={client.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${client.first_name} ${client.last_name}`} />
                    <div>
                      <h3 className="text-lg font-bold">
                        {client.first_name} {client.last_name}
                      </h3>
                      <p className="text-sm text-[var(--lor-muted)]">{client.objective || "Objectif à définir"}</p>
                    </div>
                  </div>
                  <Badge variant={statusToVariant(client.status)}>{client.status}</Badge>
                </div>

                <div className="mt-5 space-y-2 text-sm text-[var(--lor-muted)]">
                  <p>Dernier bilan: {lastBilans[client.id] ? formatDate(lastBilans[client.id]) : "Aucun"}</p>
                  <p>Créé le {formatDate(client.created_at)}</p>
                </div>

                <Button
                  variant="secondary"
                  className="mt-6 w-full"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  Voir fiche
                </Button>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--lor-muted)]">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Précédent
              </Button>
              <Button
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(11,13,17,0.78)] p-4 backdrop-blur-sm">
          <Card className="w-full max-w-[640px] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow-label">Nouveau client</p>
                <h2 className="mt-3 text-[1.6rem] font-bold">Créer un dossier client</h2>
              </div>
              <Button variant="ghost" onClick={() => updateSearchParam(false)}>
                Fermer
              </Button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateClient}>
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
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                />
                <Input
                  label="Téléphone"
                  value={formState.phone}
                  onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                />
                <Input
                  label="Date de naissance"
                  type="date"
                  value={formState.birth_date}
                  onChange={(event) => setFormState((current) => ({ ...current, birth_date: event.target.value }))}
                />
                <label className="block">
                  <span className="lor-label">Genre</span>
                  <select
                    value={formState.gender}
                    onChange={(event) => setFormState((current) => ({ ...current, gender: event.target.value }))}
                    className="lor-select"
                  >
                    <option value="">Sélectionner</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                    <option value="autre">Autre</option>
                  </select>
                </label>
                <Input
                  label="Taille (cm)"
                  type="number"
                  value={formState.height_cm}
                  onChange={(event) => setFormState((current) => ({ ...current, height_cm: event.target.value }))}
                />
              </div>

              <label className="block">
                <span className="lor-label">Objectif principal</span>
                <textarea
                  value={formState.objective}
                  onChange={(event) => setFormState((current) => ({ ...current, objective: event.target.value }))}
                  className="lor-textarea"
                />
              </label>

              {formError ? <div className="lor-danger-banner rounded-[12px] px-4 py-3 text-sm">{formError}</div> : null}

              <div className="flex justify-end">
                <Button type="submit" loading={submitting}>
                  Créer le client
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function statusToVariant(status: Client["status"]) {
  if (status === "actif") {
    return "success";
  }

  if (status === "pause") {
    return "warning";
  }

  return "default";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default ClientsPage;
