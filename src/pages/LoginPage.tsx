import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BrandSignature } from "../components/branding/BrandSignature";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { blasonLogo, laBaseLogo, lorSquadLogo } from "../data/visualContent";
import {
  getAccessBoundary,
  getAccessSummary,
  getRoleLabel
} from "../lib/auth";

export function LoginPage() {
  const { authReady, users, loginWithCredentials } = useAppContext();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [email, setEmail] = useState(users[0]?.email ?? "");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady) {
      return;
    }

    const success = loginWithCredentials({ userId: selectedUserId, email, password });
    if (!success) {
      setError("Impossible d'ouvrir la session avec ce profil pour le moment.");
      return;
    }

    setError("");
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-hero-mesh px-4 py-8 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel relative flex flex-col justify-between overflow-hidden rounded-[36px] p-6 md:p-8 lg:p-10">
          <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="absolute bottom-[-90px] left-[-90px] h-72 w-72 rounded-full bg-rose-400/10 blur-3xl" />

          <div className="space-y-8">
            <div className="relative flex flex-wrap items-center gap-4">
              <img
                src={blasonLogo}
                alt="Lor'Squad Wellness"
                className="h-20 w-20 rounded-[28px] object-cover ring-1 ring-white/10"
              />
              <div>
                <p className="font-display text-5xl leading-none md:text-6xl">
                  Lor&apos;Squad Wellness
                </p>
                <p className="mt-2 text-sm uppercase tracking-[0.32em] text-slate-400">
                  Plateforme rendez-vous et suivi client
                </p>
              </div>
            </div>

            <div className="relative space-y-4">
              <StatusBadge label="Acces equipe" tone="amber" />
              <h1 className="max-w-2xl text-5xl leading-[0.96] md:text-6xl">
                Un acces simple pour lancer les rendez-vous de la journee.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300">
                Lor&apos;Squad Wellness garde une entree fluide pour l&apos;equipe, tout en posant
                deja une base propre pour les roles, les acces et la suite du produit.
              </p>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <BrandSignature variant="inline" />
              </div>
            </div>
          </div>

          <div className="relative pt-2 md:pt-4">
            <div className="relative flex min-h-[260px] items-start justify-center md:min-h-[340px]">
              <img
                src={lorSquadLogo}
                alt="Lor'Squad"
                className="mt-0 max-h-[210px] w-full max-w-[760px] object-contain opacity-[0.98] md:max-h-[300px]"
              />
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[36px] p-6 md:p-8 lg:p-10">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Acces interne</p>
              <h2 className="mt-3 text-4xl">Connexion a l&apos;espace Lor&apos;Squad Wellness</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                Pour l&apos;instant, l&apos;acces reste simple et local. La structure est deja prete
                pour evoluer plus tard vers une vraie authentification propre.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <RoleAccessCard
                title="Espace distributeur"
                tone="green"
                bullets={[
                  "Voit uniquement ses propres clients",
                  "Voit uniquement ses bilans et suivis",
                  "Ne peut pas ouvrir les dossiers d'un autre distributeur"
                ]}
              />
              <RoleAccessCard
                title="Espace admin"
                tone="blue"
                bullets={[
                  "Voit tous les clients",
                  "Voit tous les bilans et suivis",
                  "Pilote l'activite de l'equipe"
                ]}
              />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Structure prete
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <SecurityPoint
                  title="Session"
                  text="Session locale aujourd'hui, evolutive vers une vraie session securisee."
                />
                <SecurityPoint
                  title="Mot de passe"
                  text="La vraie version ne stockera jamais un mot de passe en clair."
                />
                <SecurityPoint
                  title="Controle"
                  text="Chaque distributeur restera limite a ses propres dossiers."
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center gap-3">
                <img src={laBaseLogo} alt="La Base" className="h-11 w-11 rounded-2xl object-cover" />
                <div>
                  <p className="text-sm font-semibold text-white">La Base Shakes &amp; Drinks</p>
                  <p className="text-xs text-slate-400">
                    Lor&apos;Squad Wellness reste la marque principale de l&apos;application.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(user.id);
                    setEmail(user.email);
                  }}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    selectedUserId === user.id
                      ? "border-amber-300/35 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{user.name}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                      <p className="mt-2 text-xs text-slate-500">{getAccessSummary(user)}</p>
                      <p className="mt-1 text-xs text-slate-500">{getAccessBoundary(user)}</p>
                    </div>
                    <StatusBadge
                      label={getRoleLabel(user.role)}
                      tone={user.role === "admin" ? "blue" : "green"}
                    />
                  </div>
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm leading-6 text-slate-300">
                Cible finale : une connexion simple, puis un acces automatique aux bons clients,
                aux bons suivis et aux bons bilans selon chaque profil.
              </div>
              {error ? (
                <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
              <Button className="w-full" disabled={!authReady}>
                Ouvrir la plateforme
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function SecurityPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function RoleAccessCard({
  title,
  bullets,
  tone
}: {
  title: string;
  bullets: string[];
  tone: "blue" | "green";
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold text-white">{title}</p>
        <StatusBadge label={tone === "blue" ? "Vue large" : "Vue limitee"} tone={tone} />
      </div>
      <div className="mt-4 space-y-2">
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className="rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3 text-sm text-slate-300"
          >
            {bullet}
          </div>
        ))}
      </div>
    </div>
  );
}
