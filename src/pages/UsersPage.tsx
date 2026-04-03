import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
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
    updateUserStatus,
    resetAccessData,
    clearBusinessData,
    importLocalBusinessData
  } = useAppContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "distributor">("distributor");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importStatus, setImportStatus] = useState("");

  const userStats = useMemo(() => {
    const admins = users.filter((user) => user.role === "admin");
    const distributors = users.filter((user) => user.role === "distributor");

    return {
      total: users.length,
      admins: admins.length,
      distributors: distributors.length,
      active: users.filter((user) => user.active).length
    };
  }, [users]);

  function resetForm() {
    setName("");
    setEmail("");
    setRole("distributor");
    setPassword("");
    setActive(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createUserAccess({
      name,
      email,
      role,
      active,
      mockPassword: password
    });

    if (!result.ok) {
      setError(result.error ?? "Impossible de creer cet acces pour le moment.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess(
      `Accès créé pour ${name.trim()} avec l'identifiant ${email.trim().toLowerCase()}.`
    );
    resetForm();
  }

  async function handleImportLocalData() {
    try {
      const result = await importLocalBusinessData();
      setImportStatus(
        result.imported
          ? `${result.imported} dossier(s) importé(s) dans la base distante.`
          : result.skipped
            ? `Aucun nouveau dossier importé. ${result.skipped} déjà présent(s).`
            : "Aucune donnée locale à importer."
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
        title="Accès équipe"
        description="Créer, activer et suivre les accès admin et distributeur."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Accès actifs" value={userStats.active} />
        <StatCard label="Total comptes" value={userStats.total} />
        <StatCard label="Admins" value={userStats.admins} />
        <StatCard label="Distributeurs" value={userStats.distributors} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Créer un accès</p>
            <h2 className="mt-3 text-3xl">Nouveau compte équipe</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              L&apos;email devient l&apos;identifiant de connexion. Le mot de passe saisi ici sert
              de mot de passe provisoire pour cette première version connectée.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Nom affiché</label>
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
                <label className="text-sm font-medium text-slate-300">Rôle</label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as "admin" | "distributor")}
                >
                  <option value="distributor">Distributeur</option>
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

            <label className="flex items-center gap-3 rounded-[20px] bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4"
              />
              Compte actif dès sa création
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

            <Button className="w-full">Créer cet accès</Button>
          </form>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Repère de fonctionnement</p>
            <h2 className="mt-3 text-3xl">Le parcours est déjà posé</h2>
          </div>

          <div className="space-y-3">
            <StepCard
              index="01"
              title="Tu crées le compte"
              text="Nom, email, rôle et statut actif suffisent pour ouvrir un accès."
            />
            <StepCard
              index="02"
              title="L'email devient l'identifiant"
              text="On garde une logique simple : pas de pseudo séparé, seulement un email pro."
            />
            <StepCard
              index="03"
              title="Le rôle définit le périmètre"
              text="Un distributeur ne voit que ses clients. Un admin voit l'ensemble."
            />
          </div>

          {storageMode === "local" ? (
            <>
              <div className="surface-soft rounded-[24px] p-4">
                <p className="text-sm font-semibold text-white">Mode local actuel</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  Les accès sont encore enregistrés localement dans le navigateur pour la bêta.
                </p>
              </div>

              <div className="rounded-[24px] bg-amber-400/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Nettoyage beta</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      Repars sur les accès par défaut et ferme la session actuelle pour retrouver
                      une base locale propre.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={resetAccessData}>
                    Réinitialiser les accès
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
                  Les accès et les dossiers sont maintenant pensés pour une vraie base partagée.
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
                {importStatus ? (
                  <p className="mt-3 text-sm text-white">{importStatus}</p>
                ) : null}
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
              clients={clients}
              followUps={followUps}
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
  clients,
  followUps,
  onToggleStatus
}: {
  user: User;
  clients: Client[];
  followUps: FollowUp[];
  onToggleStatus: () => void;
}) {
  const metrics = getPortfolioMetrics(user.id, clients, followUps);
  const identity = getPortfolioIdentity(user);

  return (
    <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[1.2fr_1fr_auto]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <DistributorBadge
            user={user}
            detail={`${metrics.clients.length} clients - cible ${identity.target}`}
          />
          <StatusBadge
            label={user.role === "admin" ? "Admin" : "Distributeur"}
            tone={user.role === "admin" ? "blue" : "green"}
          />
          <StatusBadge
            label={user.active ? "Actif" : "Inactif"}
            tone={user.active ? "green" : "amber"}
          />
        </div>
        <p className="text-sm text-slate-400">{user.email}</p>
        <p className="text-xs text-slate-500">
          Créé le {user.createdAt ? formatDate(user.createdAt) : "Date non renseignée"}
        </p>
      </div>

      <div className="grid gap-2 text-sm text-slate-300">
        <div className="rounded-[18px] bg-slate-950/24 px-3 py-3">
          <span className="text-slate-500">Portefeuille</span>
          <p className="mt-1 font-medium text-white">
            {metrics.clients.length} clients - {metrics.relanceFollowUps.length} relances
          </p>
        </div>
        <div className="rounded-[18px] bg-slate-950/24 px-3 py-3">
          <span className="text-slate-500">Périmètre</span>
          <p className="mt-1 font-medium text-white">
            {user.role === "admin" ? "Tous les clients" : "Clients attribués"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 lg:items-end">
        <Link
          to={`/distributors/${user.id}`}
          className="inline-flex min-h-[46px] items-center justify-center rounded-[18px] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
        >
          Voir portefeuille
        </Link>
        <Button variant="secondary" onClick={onToggleStatus}>
          {user.active ? "Désactiver" : "Réactiver"}
        </Button>
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
