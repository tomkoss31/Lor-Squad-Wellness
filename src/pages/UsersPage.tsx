import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DistributorBadge } from "../components/client/DistributorBadge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { PushNotificationSettings } from "../components/settings/PushNotificationSettings";
import { canSponsorDistributors, getRoleLabel, isAdmin } from "../lib/auth";
import { formatDate, formatDateTime } from "../lib/calculations";
import { getPortfolioMetrics } from "../lib/portfolio";
import type { ActivityLog, Client, FollowUp, User } from "../types/domain";

type TeamViewMode = "tree" | "all" | "admins" | "referents" | "distributors";

function normalizeSearchValue(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function matchesSearch(user: User, query: string) {
  if (!query) {
    return true;
  }

  const haystack = normalizeSearchValue(
    [user.name, user.email, user.title, user.sponsorName ?? "", user.id].join(" ")
  );

  return haystack.includes(normalizeSearchValue(query));
}

function buildTeamGroups(users: User[]) {
  const activeUsers = users.filter((user) => user.active);
  const admins = activeUsers.filter((user) => user.role === "admin");
  const referents = activeUsers.filter((user) => user.role === "referent");
  const distributors = activeUsers.filter((user) => user.role === "distributor");

  return {
    admins,
    referentGroups: referents.map((referent) => ({
      referent,
      distributors: distributors.filter((user) => user.sponsorId === referent.id)
    })),
    orphanDistributors: distributors.filter(
      (user) => !user.sponsorId || !activeUsers.some((item) => item.id === user.sponsorId)
    )
  };
}

export function UsersPage() {
  const {
    users,
    clients,
    followUps,
    activityLogs,
    storageMode,
    createUserAccess,
    repairUserAccess,
    updateUserAccess,
    updateUserPassword,
    updateUserStatus,
    resetAccessData,
    clearBusinessData,
    importLocalBusinessData
  } = useAppContext();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<TeamViewMode>("tree");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("distributor");
  const [sponsorId, setSponsorId] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [repairUserId, setRepairUserId] = useState("");
  const [repairEmail, setRepairEmail] = useState("");
  const [repairName, setRepairName] = useState("");
  const [repairRole, setRepairRole] = useState<User["role"]>("referent");
  const [repairSponsorId, setRepairSponsorId] = useState("");
  const [repairActive, setRepairActive] = useState(true);
  const [repairError, setRepairError] = useState("");
  const [repairSuccess, setRepairSuccess] = useState("");
  const [importStatus, setImportStatus] = useState("");

  const sponsorOptions = useMemo(
    () => users.filter((user) => user.active && canSponsorDistributors(user)),
    [users]
  );

  const userStats = useMemo(
    () => ({
      active: users.filter((user) => user.active).length,
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      referents: users.filter((user) => user.role === "referent").length,
      distributors: users.filter((user) => user.role === "distributor").length
    }),
    [users]
  );

  const filteredUsers = useMemo(
    () => users.filter((user) => matchesSearch(user, search)),
    [search, users]
  );

  const visibleUsers = useMemo(() => {
    if (viewMode === "admins") {
      return filteredUsers.filter((user) => user.role === "admin");
    }
    if (viewMode === "referents") {
      return filteredUsers.filter((user) => user.role === "referent");
    }
    if (viewMode === "distributors") {
      return filteredUsers.filter((user) => user.role === "distributor");
    }
    return filteredUsers;
  }, [filteredUsers, viewMode]);

  const teamGroups = useMemo(() => buildTeamGroups(filteredUsers), [filteredUsers]);

  useEffect(() => {
    if (role !== "distributor") {
      setSponsorId("");
    }
  }, [role]);

  useEffect(() => {
    if (repairRole !== "distributor") {
      setRepairSponsorId("");
    }
  }, [repairRole]);

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
      setError(result.error ?? "Impossible de creer cet accès pour le moment.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess(`Acces cree pour ${name.trim()} avec l'identifiant ${email.trim().toLowerCase()}.`);
    setName("");
    setEmail("");
    setRole("distributor");
    setSponsorId("");
    setPassword("");
    setActive(true);
  }

  async function handleRepairSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await repairUserAccess({
      userId: repairUserId.trim() || undefined,
      email: repairEmail.trim(),
      name: repairName.trim() || undefined,
      role: repairRole,
      sponsorId: repairRole === "distributor" ? repairSponsorId || undefined : undefined,
      active: repairActive
    });

    if (!result.ok) {
      setRepairError(result.error ?? "Impossible de recreer ce profil.");
      setRepairSuccess("");
      return;
    }

    setRepairError("");
    setRepairSuccess(`Profil recree pour ${repairEmail.trim().toLowerCase()}.`);
    setRepairUserId("");
    setRepairEmail("");
    setRepairName("");
    setRepairRole("referent");
    setRepairSponsorId("");
    setRepairActive(true);
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
        eyebrow="Equipe"
        title="Structure et acces"
        description="Retrouve les comptes, rattache un distributeur et repare un profil Auth sans repasser dans Supabase."
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="Actifs" value={userStats.active} />
        <StatCard label="Total comptes" value={userStats.total} />
        <StatCard label="Admins" value={userStats.admins} />
        <StatCard label="Referents" value={userStats.referents} />
        <StatCard label="Distributeurs" value={userStats.distributors} />
      </div>

      {/* Notifications push */}
      <PushNotificationSettings userId={users[0]?.id} userName={users[0]?.name} />

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="eyebrow-label">Lecture simple</p>
            <h2 className="mt-3 text-3xl">Arborescence equipe</h2>
          </div>

          <div className="grid gap-3 xl:w-[720px] xl:grid-cols-[1.2fr_repeat(4,minmax(0,0.7fr))]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Recherche nom, email, sponsor ou identifiant..."
            />
            <FilterPill label="Arborescence" active={viewMode === "tree"} onClick={() => setViewMode("tree")} />
            <FilterPill label="Tous" active={viewMode === "all"} onClick={() => setViewMode("all")} />
            <FilterPill label="Referents" active={viewMode === "referents"} onClick={() => setViewMode("referents")} />
            <FilterPill label="Distributeurs" active={viewMode === "distributors"} onClick={() => setViewMode("distributors")} />
          </div>
        </div>
      </Card>

      {viewMode === "tree" ? (
        <div className="grid gap-4">
          <OrganizationTreeCard
            title="Admins"
            users={teamGroups.admins}
            usersIndex={users}
            clients={clients}
            followUps={followUps}
            emptyMessage="Aucun admin visible avec ce filtre."
          />

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-label">Referents</p>
                <h2 className="mt-3 text-3xl">Equipes rattachees</h2>
              </div>
              <StatusBadge label={`${teamGroups.referentGroups.length} equipe${teamGroups.referentGroups.length > 1 ? "s" : ""}`} tone="amber" />
            </div>

            <div className="grid gap-4">
              {teamGroups.referentGroups.length ? (
                teamGroups.referentGroups.map((group) => (
                  <OrganizationCluster
                    key={group.referent.id}
                    referent={group.referent}
                    distributors={group.distributors}
                    users={users}
                    clients={clients}
                    followUps={followUps}
                  />
                ))
              ) : (
                <EmptyState text="Aucun referent visible avec ce filtre." />
              )}
            </div>
          </Card>

          <OrganizationTreeCard
            title="Distributeurs sans rattachement"
            users={teamGroups.orphanDistributors}
            usersIndex={users}
            clients={clients}
            followUps={followUps}
            emptyMessage="Tout le monde est deja rattache."
          />
        </div>
      ) : null}

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow-label">Edition directe</p>
            <h2 className="mt-3 text-3xl">Comptes de l'equipe</h2>
          </div>
          <StatusBadge label={`${visibleUsers.length} visible${visibleUsers.length > 1 ? "s" : ""}`} tone="blue" />
        </div>

        <div className="grid gap-3">
          {visibleUsers.length ? (
            visibleUsers.map((user) => (
              <UserAccessCard
                key={user.id}
                user={user}
                users={users}
                clients={clients}
                followUps={followUps}
                onSaveAccess={(payload) => updateUserAccess(user.id, payload)}
                onResetPassword={(nextPassword) => updateUserPassword(user.id, nextPassword)}
                onToggleStatus={() => void updateUserStatus(user.id, !user.active)}
              />
            ))
          ) : (
            <EmptyState text="Aucun compte ne correspond a cette recherche." />
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Creer un acces</p>
            <h2 className="mt-3 text-3xl">Nouveau compte equipe</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#B0B4C4]">Nom affiche</label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Exemple : Camille Martin" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#B0B4C4]">Email professionnel</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="camille@lorsquadwellness.app" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">Role</label>
                <select value={role} onChange={(event) => setRole(event.target.value as User["role"])}>
                  <option value="distributor">Distributeur</option>
                  <option value="referent">Referent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">Mot de passe initial</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Choisir un mot de passe" />
              </div>
            </div>

            {role === "distributor" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">Rattachement referent / sponsor</label>
                <select value={sponsorId} onChange={(event) => setSponsorId(event.target.value)}>
                  <option value="">Aucun rattachement pour l'instant</option>
                  {sponsorOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {getRoleLabel(user.role)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <label className="flex items-center gap-3 rounded-[20px] bg-white/[0.04] px-4 py-3 text-sm text-[#B0B4C4]">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4" />
              Compte actif des sa creation
            </label>

            {error ? <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            {success ? <div className="rounded-[20px] border border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.1)] px-4 py-3 text-sm text-[#2DD4BF]">{success}</div> : null}

            <Button className="w-full">Creer cet acces</Button>
          </form>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="eyebrow-label">Reparer un compte existant</p>
            <h2 className="mt-3 text-3xl">Profil Auth deja cree</h2>
          </div>

          <form className="space-y-4" onSubmit={handleRepairSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">Email Auth</label>
                <input type="email" value={repairEmail} onChange={(event) => setRepairEmail(event.target.value)} placeholder="priscalexnutrition@gmail.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">ID Supabase (optionnel)</label>
                <input value={repairUserId} onChange={(event) => setRepairUserId(event.target.value)} placeholder="2c6653c6-525a-48b7-8965-ee8439bf1798" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">Nom affiche (optionnel)</label>
                <input value={repairName} onChange={(event) => setRepairName(event.target.value)} placeholder="Prisca et Alex" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">Role</label>
                <select value={repairRole} onChange={(event) => setRepairRole(event.target.value as User["role"])}>
                  <option value="referent">Referent</option>
                  <option value="distributor">Distributeur</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {repairRole === "distributor" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#B0B4C4]">Rattachement referent / sponsor</label>
                <select value={repairSponsorId} onChange={(event) => setRepairSponsorId(event.target.value)}>
                  <option value="">Aucun rattachement pour l'instant</option>
                  {sponsorOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {getRoleLabel(user.role)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <label className="flex items-center gap-3 rounded-[20px] bg-white/[0.04] px-4 py-3 text-sm text-[#B0B4C4]">
              <input type="checkbox" checked={repairActive} onChange={(event) => setRepairActive(event.target.checked)} className="h-4 w-4" />
              Profil applicatif actif
            </label>

            {repairError ? <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{repairError}</div> : null}
            {repairSuccess ? <div className="rounded-[20px] border border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.1)] px-4 py-3 text-sm text-[#2DD4BF]">{repairSuccess}</div> : null}

            <Button className="w-full">Reparer ce profil</Button>
          </form>

          {storageMode === "supabase" ? (
            <div className="rounded-[20px] bg-[rgba(45,212,191,0.1)] px-4 py-4 text-sm leading-7 text-[#F0EDE8]">
              Si le compte existe dans Authentication mais pas ici, repare-le depuis ce bloc.
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div>
            <p className="eyebrow-label">Base et securite</p>
            <h2 className="mt-3 text-3xl">Actions de maintenance</h2>
          </div>

          {storageMode === "local" ? (
            <div className="space-y-3">
              <div className="rounded-[22px] bg-amber-400/10 px-4 py-4">
                <p className="text-sm font-semibold text-white">Reinitialiser les accès beta</p>
                <p className="mt-2 text-sm leading-7 text-[#B0B4C4]">Repars sur les accès par defaut et ferme la session actuelle.</p>
                <Button className="mt-4" variant="secondary" onClick={resetAccessData}>Reinitialiser les acces</Button>
              </div>
              <div className="rounded-[22px] bg-rose-400/10 px-4 py-4">
                <p className="text-sm font-semibold text-white">Vider la base clients locale</p>
                <p className="mt-2 text-sm leading-7 text-[#B0B4C4]">Supprime les dossiers et les suivis locaux pour repartir proprement.</p>
                <Button className="mt-4" variant="secondary" onClick={clearBusinessData}>Vider les dossiers</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[22px] bg-[rgba(45,212,191,0.1)] px-4 py-4">
                <p className="text-sm font-semibold text-white">Base distante active</p>
                <p className="mt-2 text-sm leading-7 text-[#B0B4C4]">Les comptes et l'arborescence equipe sont lus depuis Supabase.</p>
              </div>
              <div className="rounded-[22px] bg-[rgba(45,212,191,0.1)] px-4 py-4">
                <p className="text-sm font-semibold text-white">Importer les anciens dossiers</p>
                <p className="mt-2 text-sm leading-7 text-[#B0B4C4]">Si l'ancienne beta locale contient encore des dossiers, pousse-les ici.</p>
                <Button className="mt-4" variant="secondary" onClick={() => void handleImportLocalData()}>Importer la base locale</Button>
                {importStatus ? <p className="mt-3 text-sm text-white">{importStatus}</p> : null}
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">Activite recente</p>
              <h2 className="mt-3 text-3xl">Ce qui a bouge</h2>
            </div>
            <StatusBadge label={`${Math.min(activityLogs.length, 8)} visibles`} tone="blue" />
          </div>

          <div className="space-y-3">
            {activityLogs.slice(0, 8).map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
            {!activityLogs.length ? <EmptyState text="Les prochaines creations, corrections et changements d'accès apparaitront ici." /> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[46px] rounded-full border px-4 text-sm font-semibold transition ${
        active
          ? "border-white/25 bg-white/12 text-white shadow-[0_10px_30px_rgba(8,15,30,0.24)]"
          : "border-white/10 bg-white/[0.03] text-[#B0B4C4] hover:border-white/16 hover:bg-white/[0.06]"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[22px] bg-white/[0.03] px-4 py-4 text-sm leading-7 text-[#7A8099]">{text}</div>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="space-y-2 rounded-[24px] p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#4A5068]">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
    </Card>
  );
}

function OrganizationTreeCard({
  title,
  users,
  usersIndex,
  clients,
  followUps,
  emptyMessage
}: {
  title: string;
  users: User[];
  usersIndex: User[];
  clients: Client[];
  followUps: FollowUp[];
  emptyMessage: string;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">{title}</p>
          <h2 className="mt-3 text-3xl">{title}</h2>
        </div>
        <StatusBadge label={`${users.length} compte${users.length > 1 ? "s" : ""}`} tone="blue" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {users.length ? (
          users.map((user) => (
            <OrganizationUserCard
              key={user.id}
              user={user}
              users={usersIndex}
              clients={clients}
              followUps={followUps}
            />
          ))
        ) : (
          <EmptyState text={emptyMessage} />
        )}
      </div>
    </Card>
  );
}

function OrganizationCluster({
  referent,
  distributors,
  users,
  clients,
  followUps
}: {
  referent: User;
  distributors: User[];
  users: User[];
  clients: Client[];
  followUps: FollowUp[];
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{referent.name}</p>
          <p className="mt-1 text-sm text-[#7A8099]">{referent.email}</p>
        </div>
        <StatusBadge
          label={`${distributors.length} distributeur${distributors.length > 1 ? "s" : ""}`}
          tone="amber"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <OrganizationUserCard
          user={referent}
          users={users}
          clients={clients}
          followUps={followUps}
          highlighted
        />

        <div className="grid gap-3 md:grid-cols-2">
          {distributors.length ? (
            distributors.map((user) => (
              <OrganizationUserCard
                key={user.id}
                user={user}
                users={users}
                clients={clients}
                followUps={followUps}
              />
            ))
          ) : (
            <EmptyState text="Aucun distributeur rattache pour l'instant." />
          )}
        </div>
      </div>
    </div>
  );
}

function OrganizationUserCard({
  user,
  users,
  clients,
  followUps,
  highlighted = false
}: {
  user: User;
  users: User[];
  clients: Client[];
  followUps: FollowUp[];
  highlighted?: boolean;
}) {
  const metrics = getPortfolioMetrics(
    user,
    clients,
    followUps,
    users,
    user.role === "referent" ? "network" : "personal"
  );

  return (
    <div
      className={`rounded-[22px] px-4 py-4 ${
        highlighted ? "bg-amber-400/[0.08] ring-1 ring-amber-400/12" : "bg-[#0B0D11]/60"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{user.name}</p>
          <p className="mt-1 text-sm text-[#7A8099]">{getRoleLabel(user.role)}</p>
        </div>
        <StatusBadge
          label={`${metrics.clients.length} clients`}
          tone={user.role === "referent" ? "amber" : "blue"}
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <MiniMetric label="RDV" value={metrics.scheduledFollowUps.length} />
        <MiniMetric label="Relances" value={metrics.relanceFollowUps.length} />
        <MiniMetric label="Clients" value={metrics.clients.length} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] bg-white/[0.03] px-3 py-3 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#4A5068]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function UserAccessCard({
  user,
  users,
  clients,
  followUps,
  onSaveAccess,
  onResetPassword,
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
  onResetPassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  onToggleStatus: () => void;
}) {
  const metrics = getPortfolioMetrics(
    user,
    clients,
    followUps,
    users,
    user.role === "referent" ? "network" : "personal"
  );
  const sponsorOptions = users.filter(
    (item) => item.active && item.id !== user.id && canSponsorDistributors(item)
  );
  const [selectedRole, setSelectedRole] = useState<User["role"]>(user.role);
  const [selectedSponsorId, setSelectedSponsorId] = useState(user.sponsorId ?? "");
  const [nextPassword, setNextPassword] = useState("");
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
    (selectedRole === "distributor"
      ? selectedSponsorId !== (user.sponsorId ?? "")
      : user.role === "distributor");

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

    setFeedback("Rattachement mis a jour.");
  }

  async function handleResetPassword() {
    if (!nextPassword.trim()) {
      setFeedback("Saisis d'abord un nouveau mot de passe.");
      return;
    }

    setSaving(true);
    const result = await onResetPassword(nextPassword);
    setSaving(false);

    if (!result.ok) {
      setFeedback(result.error ?? "Impossible de redefinir ce mot de passe.");
      return;
    }

    setNextPassword("");
    setFeedback("Mot de passe redefini.");
  }

  return (
    <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 xl:grid-cols-[1.05fr_1fr_auto]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <DistributorBadge
            user={user}
            detail={`${metrics.clients.length} clients - ${metrics.relanceFollowUps.length} relances`}
          />
          <StatusBadge label={getRoleLabel(user.role)} tone={roleTone} />
          <StatusBadge label={user.active ? "Actif" : "Inactif"} tone={user.active ? "green" : "amber"} />
        </div>
        <p className="text-sm text-[#7A8099]">{user.email}</p>
        <p className="break-all text-xs text-[#4A5068]">{user.id}</p>
        {user.sponsorName ? (
          <p className="text-sm text-[#2DD4BF]/80">Rattachement actuel : {user.sponsorName}</p>
        ) : null}
        <p className="text-xs text-[#4A5068]">
          Cree le {user.createdAt ? formatDate(user.createdAt) : "Date non renseignee"}
        </p>
      </div>

      <div className="grid gap-3 text-sm text-[#B0B4C4]">
        <div className="rounded-[18px] bg-[#0B0D11]/60 px-3 py-3">
          <span className="text-[#4A5068]">Portefeuille</span>
          <p className="mt-1 font-medium text-white">
            {metrics.clients.length} clients - {metrics.relanceFollowUps.length} relances
          </p>
        </div>
        <div className="rounded-[18px] bg-[#0B0D11]/60 px-3 py-3">
          <span className="text-[#4A5068]">Perimetre</span>
          <p className="mt-1 font-medium text-white">{perimeterLabel}</p>
        </div>

        {!isAdmin(user) ? (
          <div className="grid gap-3 rounded-[18px] bg-[#0B0D11]/60 px-3 py-3">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.14em] text-[#4A5068]">
                Role
              </label>
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
                <label className="text-xs font-medium uppercase tracking-[0.14em] text-[#4A5068]">
                  Rattachement referent / sponsor
                </label>
                <select
                  value={selectedSponsorId}
                  onChange={(event) => setSelectedSponsorId(event.target.value)}
                >
                  <option value="">Aucun rattachement</option>
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

        <div className="grid gap-2 rounded-[18px] bg-[#0B0D11]/60 px-3 py-3">
          <label className="text-xs font-medium uppercase tracking-[0.14em] text-[#4A5068]">
            Redefinir le mot de passe
          </label>
          <input
            type="password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            placeholder="Nouveau mot de passe"
          />
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 xl:min-w-[220px] xl:items-end">
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
            {saving ? "Mise a jour..." : "Enregistrer le rattachement"}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={() => void handleResetPassword()}
          disabled={!nextPassword.trim() || saving}
        >
          {saving ? "Mise a jour..." : "Redefinir le mot de passe"}
        </Button>
        <Button variant="secondary" onClick={onToggleStatus}>
          {user.active ? "Desactiver" : "Reactiver"}
        </Button>
        {feedback ? <p className="text-xs text-[#7A8099] xl:text-right">{feedback}</p> : null}
      </div>
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityLog }) {
  return (
    <div className="rounded-[22px] bg-white/[0.03] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{entry.summary}</p>
          {entry.detail ? <p className="mt-1 text-sm leading-6 text-[#7A8099]">{entry.detail}</p> : null}
        </div>
        <p className="text-xs text-[#4A5068]">{formatDateTime(entry.createdAt)}</p>
      </div>
      <p className="mt-3 text-xs text-[#4A5068]">
        {entry.actorName}
        {entry.targetUserName ? ` - ${entry.targetUserName}` : ""}
        {entry.clientName ? ` - ${entry.clientName}` : ""}
      </p>
    </div>
  );
}
