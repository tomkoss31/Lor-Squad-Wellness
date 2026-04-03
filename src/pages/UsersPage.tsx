import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Button } from "../components/ui/Button";
import { useAppContext } from "../context/AppContext";
import {
  canSponsorDistributors,
  getRoleLabel,
  isAdmin
} from "../lib/auth";
import { formatDate } from "../lib/calculations";
import { getPortfolioIdentity, getPortfolioMetrics } from "../lib/portfolio";
import type { Client, FollowUp, User } from "../types/domain";

export function UsersPage() {
  const {
    users,
    clients,
    followUps,
    storageMode,
    createUserAccess,
    updateUserAccess,
    updateUserStatus,
    resetAccessData,
    clearBusinessData,
    importLocalBusinessData
  } = useAppContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("distributor");
  const [sponsorId, setSponsorId] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importStatus, setImportStatus] = useState("");

  const sponsorOptions = useMemo(
    () => users.filter((user) => user.active && canSponsorDistributors(user)),
    [users]
  );

  const userStats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      referents: users.filter((user) => user.role === "referent").length,
      distributors: users.filter((user) => user.role === "distributor").length,
      active: users.filter((user) => user.active).length
    };
  }, [users]);

  function resetForm() {
    setName("");
    setEmail("");
    setRole("distributor");
    setSponsorId("");
    setPassword("");
    setActive(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createUserAccess({
      name,
      email,
      role,
      sponsorId: role === "distributor" ? sponsorId || undefined : undefined,
      active,
      mockPassword: password
    });

    if (!result.ok) {
      setError(result.error ?? "Impossible de creer cet acces pour le moment.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess(`Acces cree pour ${name.trim()} avec l'identifiant ${email.trim().toLowerCase()}.`);
    resetForm();
  }

  async function handleImportLocalData() {
    try {
      const result = await importLocalBusinessData();
      setImportStatus(
        result.imported
          ? `${result.imported} dossier(s) importe(s) dans la base distante.`
          : result.skipped
            ? `Aucun nouveau dossier importe. ${result.skipped} deja present(s).`
            : "Aucune donnee locale a importer."
      );
    } catch (importError) {
      setImportStatus(
        importError instanceof Error
          ? importError.message
          : "Impossible d'importer les dossiers locaux."
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Utilisateurs"
        title="Acces equipe"
        description="Creer, activer et structurer les admins, referents et distributeurs."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="Acces actifs" value={userStats.active} />
        <StatCard label="Total comptes" value={userStats.total} />
        <StatCard label="Admins" value={userStats.admins} />
        <StatCard label="Referents" value={userStats.referents} />
        <StatCard label="Distributeurs" value={userStats.distributors} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Creer un acces</p>
            <h2 className="mt-3 text-3xl">Nouveau compte equipe</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              L&apos;email devient l&apos;identifiant. Tu peux rattacher un distributeur a un
              referent ou directement a un admin via le sponsor d&apos;equipe.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nom affiche</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Exemple : Camille Martin"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email professionnel</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="camille@lorsquadwellness.app"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Role</label>
                <select
                  value={role}
                  onChange={(event) => {
                    const nextRole = event.target.value as User["role"];
                    setRole(nextRole);
                    if (nextRole !== "distributor") {
                      setSponsorId("");
                    }
                  }}
                >
                  <option value="distributor">Distributeur</option>
                  <option value="referent">Referent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Mot de passe provisoire
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Choisir un mot de passe"
                />
              </div>
            </div>

            {role === "distributor" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Sponsor d'equipe</label>
                <select value={sponsorId} onChange={(event) => setSponsorId(event.target.value)}>
                  <option value="">Aucun sponsor precis</option>
                  {sponsorOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {getRoleLabel(user.role)}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-6 text-slate-400">
                  Ce sponsor pourra suivre les bilans de ce distributeur sans voir les autres equipes.
                </p>
              </div>
            ) : null}

            <label className="flex items-center gap-3 rounded-[20px] bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4"
              />
              Compte actif des sa creation
            </label>

            {error ? (
              <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {success}
              </div>
            ) : null}

            <Button className="w-full">Creer cet acces</Button>
          </form>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Repere de fonctionnement</p>
            <h2 className="mt-3 text-3xl">La hierarchie est claire</h2>
          </div>

          <div className="space-y-3">
            <StepCard
              index="01"
              title="Admin"
              text="Voit toute la base et pilote l'ensemble des equipes."
            />
            <StepCard
              index="02"
              title="Referent"
              text="Voit ses clients et ceux des distributeurs rattaches a son equipe."
            />
            <StepCard
              index="03"
              title="Distributeur"
              text="Voit uniquement ses clients. Il peut etre promu referent plus tard."
            />
          </div>

          {storageMode === "local" ? (
            <>
              <div className="surface-soft rounded-[24px] p-4">
                <p className="text-sm font-semibold text-white">Mode local actuel</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Les acces sont encore enregistres localement dans le navigateur pour la beta.
                </p>
              </div>

              <div className="rounded-[24px] bg-amber-400/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Nettoyage beta</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Repars sur les acces par defaut et ferme la session actuelle pour retrouver
                      une base locale propre.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={resetAccessData}>
                    Reinitialiser les acces
                  </Button>
                </div>
              </div>

              <div className="rounded-[24px] bg-rose-400/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Base clients</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Vide les dossiers clients et les suivis en local pour repartir d&apos;une
                      base propre avec un premier bilan vierge.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={clearBusinessData}>
                    Vider les dossiers
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[24px] bg-emerald-400/10 p-4">
                <p className="text-sm font-semibold text-white">Base distante active</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Les acces et les dossiers sont maintenant penses pour une vraie base partagee.
                </p>
              </div>

              <div className="rounded-[24px] bg-sky-400/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Importer les anciens dossiers</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Si des clients existaient encore dans l&apos;ancienne beta locale, tu peux
                      les pousser maintenant dans la base distante.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={() => void handleImportLocalData()}>
                    Importer la base locale
                  </Button>
                </div>
                {importStatus ? <p className="mt-3 text-sm text-white">{importStatus}</p> : null}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Comptes existants</p>
            <h2 className="mt-3 text-3xl">Utilisateurs de la plateforme</h2>
          </div>
          <StatusBadge label={`${users.length} comptes`} tone="blue" />
        </div>

        <div className="grid gap-3">
          {users.map((user) => (
            <UserAccessCard
              key={user.id}
              user={user}
              users={users}
              clients={clients}
              followUps={followUps}
              onSaveAccess={(payload) => updateUserAccess(user.id, payload)}
              onToggleStatus={() => void updateUserStatus(user.id, !user.active)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function UserAccessCard({
  user,
  users,
  clients,
  followUps,
  onSaveAccess,
  onToggleStatus
}: {
  user: User;
  users: User[];
  clients: Client[];
  followUps: FollowUp[];
  onSaveAccess: (payload: {
    role: User["role"];
    sponsorId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onToggleStatus: () => void;
}) {
  const metrics = getPortfolioMetrics(
    user,
    clients,
    followUps,
    users,
    user.role === "referent" ? "network" : "personal"
  );
  const identity = getPortfolioIdentity(user);
  const sponsorOptions = users.filter(
    (item) => item.active && item.id !== user.id && canSponsorDistributors(item)
  );
  const [selectedRole, setSelectedRole] = useState<User["role"]>(user.role);
  const [selectedSponsorId, setSelectedSponsorId] = useState(user.sponsorId ?? "");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedRole(user.role);
    setSelectedSponsorId(user.sponsorId ?? "");
    setFeedback("");
  }, [user.role, user.sponsorId]);

  const roleTone =
    user.role === "admin" ? "blue" : user.role === "referent" ? "amber" : "green";
  const perimeterLabel =
    user.role === "admin"
      ? "Toute la base"
      : user.role === "referent"
        ? "Ses clients + son equipe"
        : "Clients attribues";
  const hasPendingChanges =
    selectedRole !== user.role ||
    (selectedRole === "distributor" ? selectedSponsorId !== (user.sponsorId ?? "") : user.role === "distributor");

  async function handleSaveAccess() {
    setSaving(true);
    const result = await onSaveAccess({
      role: selectedRole,
      sponsorId: selectedRole === "distributor" ? selectedSponsorId || undefined : undefined
    });
    setSaving(false);

    if (!result.ok) {
      setFeedback(result.error ?? "Impossible de mettre a jour ce compte.");
      return;
    }

    setFeedback("Acces mis a jour.");
  }

  return (
    <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 xl:grid-cols-[1.1fr_0.95fr_auto]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <DistributorBadge
            user={user}
            detail={`${metrics.clients.length} clients - cible ${identity.target}`}
          />
          <StatusBadge label={getRoleLabel(user.role)} tone={roleTone} />
          <StatusBadge label={user.active ? "Actif" : "Inactif"} tone={user.active ? "green" : "amber"} />
        </div>
        <p className="text-sm text-slate-400">{user.email}</p>
        {user.sponsorName ? (
          <p className="text-sm text-sky-100/80">Sponsor d'equipe : {user.sponsorName}</p>
        ) : null}
        <p className="text-xs text-slate-500">
          Cree le {user.createdAt ? formatDate(user.createdAt) : "Date non renseignee"}
        </p>
      </div>

      <div className="grid gap-3 text-sm text-slate-300">
        <div className="rounded-[18px] bg-slate-950/24 px-3 py-3">
          <span className="text-slate-500">Portefeuille</span>
          <p className="mt-1 font-medium text-white">
            {metrics.clients.length} clients - {metrics.relanceFollowUps.length} relances
          </p>
        </div>
        <div className="rounded-[18px] bg-slate-950/24 px-3 py-3">
          <span className="text-slate-500">Perimetre</span>
          <p className="mt-1 font-medium text-white">{perimeterLabel}</p>
        </div>

        {!isAdmin(user) ? (
          <div className="grid gap-3 rounded-[18px] bg-slate-950/24 px-3 py-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500">Role de travail</label>
              <select
                value={selectedRole}
                onChange={(event) => {
                  const nextRole = event.target.value as User["role"];
                  setSelectedRole(nextRole);
                  if (nextRole !== "distributor") {
                    setSelectedSponsorId("");
                  }
                }}
              >
                <option value="distributor">Distributeur</option>
                <option value="referent">Referent</option>
              </select>
            </div>

            {selectedRole === "distributor" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500">Sponsor d'equipe</label>
                <select
                  value={selectedSponsorId}
                  onChange={(event) => setSelectedSponsorId(event.target.value)}
                >
                  <option value="">Aucun sponsor precis</option>
                  {sponsorOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {getRoleLabel(item.role)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col items-stretch gap-3 xl:items-end">
        <Link
          to={`/distributors/${user.id}`}
          className="inline-flex min-h-[46px] items-center justify-center rounded-[18px] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
        >
          Voir portefeuille
        </Link>
        {!isAdmin(user) ? (
          <Button
            variant="secondary"
            onClick={() => void handleSaveAccess()}
            disabled={!hasPendingChanges || saving}
          >
            {saving ? "Mise a jour..." : "Enregistrer le role"}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onToggleStatus}>
          {user.active ? "Desactiver" : "Reactiver"}
        </Button>
        {feedback ? <p className="text-xs text-slate-400 xl:text-right">{feedback}</p> : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="space-y-2 rounded-[24px] p-5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
    </Card>
  );
}

function StepCard({
  index,
  title,
  text
}: {
  index: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-[20px] bg-white/[0.04] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950/35 text-xs font-semibold tracking-[0.08em] text-slate-300">
        {index}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
      </div>
    </div>
  );
}
