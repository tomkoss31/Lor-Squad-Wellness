import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BrandSignature } from "../components/branding/BrandSignature";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { blasonLogo, lorSquadLogo } from "../data/visualContent";

export function LoginPage() {
  const { authReady, storageMode, users, loginWithCredentials } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const demoAccounts = useMemo(() => {
    const admin = users.find((user) => user.role === "admin");
    const distributor = users.find((user) => user.role === "distributor");

    return {
      admin,
      distributor
    };
  }, [users]);

  function fillDemoAccess(role: "admin" | "distributor") {
    const account = role === "admin" ? demoAccounts.admin : demoAccounts.distributor;
    if (!account) {
      return;
    }

    setEmail(account.email);
    setPassword("demo1234");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady) {
      return;
    }

    const success = await loginWithCredentials({ email, password });
    if (!success) {
      setError(
        storageMode === "supabase"
          ? "Email ou mot de passe invalides pour cet acces."
          : "Email ou mot de passe non reconnus pour cette version de demonstration."
      );
      return;
    }

    setError("");
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-hero-mesh px-4 py-8 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-panel order-2 relative flex flex-col justify-between overflow-hidden rounded-[36px] p-6 md:p-8 lg:order-1 lg:p-10">
          <div className="absolute right-[-90px] top-[-70px] h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="absolute bottom-[-110px] left-[-80px] h-72 w-72 rounded-full bg-rose-400/10 blur-3xl" />

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <img
                src={blasonLogo}
                alt="Lor'Squad Wellness"
                className="h-16 w-16 rounded-[24px] object-cover ring-1 ring-white/10 md:h-20 md:w-20 md:rounded-[28px]"
              />
              <div>
                <p className="font-display text-3xl leading-none sm:text-4xl md:text-6xl">
                  Lor&apos;Squad Wellness
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-slate-400 md:text-sm md:tracking-[0.32em]">
                  Plateforme rendez-vous et suivi client
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <StatusBadge label="Connexion" tone="amber" />
              <h1 className="max-w-2xl text-3xl leading-[1] sm:text-4xl md:text-6xl">
                Une entree claire pour lancer la journee et ouvrir les bons dossiers.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base md:leading-8">
                Lor&apos;Squad Wellness centralise le rendez-vous, la lecture client et le suivi
                dans une interface simple a ouvrir, simple a utiliser et simple a faire evoluer.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <MiniTag label="Rendez-vous" />
                <MiniTag label="Nutrition" />
                <MiniTag label="Suivi" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-1 md:space-y-6 md:pt-4">
            <div className="relative flex min-h-[140px] items-start justify-center md:min-h-[340px]">
              <img
                src={lorSquadLogo}
                alt="Lor'Squad"
                className="mt-0 max-h-[110px] w-full max-w-[760px] object-contain opacity-[0.98] md:max-h-[300px]"
              />
            </div>
            <BrandSignature variant="inline" />
          </div>
        </section>

        <section className="glass-panel order-1 rounded-[36px] p-6 md:p-8 lg:order-2 lg:p-10">
          <div className="space-y-7">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                Acces a la plateforme
              </p>
              <h2 className="mt-3 text-4xl">Connecte-toi pour ouvrir ton espace de travail</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                Une entree simple aujourd&apos;hui, avec une base deja propre pour les futurs
                acces admin et distributeur.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Identifiant</label>
                <input
                  type="email"
                  placeholder="Email professionnel"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <p className="text-xs text-slate-500">
                  L&apos;identifiant de connexion est l&apos;email professionnel du distributeur
                  ou de l&apos;admin.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Mot de passe</label>
                <input
                  type="password"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
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

            {storageMode === "local" ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Acces de demonstration</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">
                      Pour tester rapidement l&apos;interface, sans exposer de comptes nominatifs.
                    </p>
                  </div>
                  <StatusBadge label="Demo" tone="blue" />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccess("distributor")}
                    className="rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-semibold text-white">Acces distributeur</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">
                      Vue limitee a ses clients, ses bilans et ses suivis.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccess("admin")}
                    className="rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-semibold text-white">Acces admin</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">
                      Vue globale sur les clients, l&apos;activite et le pilotage d&apos;equipe.
                    </p>
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Mot de passe demo : demo1234</p>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Comment creer les acces
              </p>
              <div className="mt-4 space-y-3">
                <AccessStep
                  index="01"
                  title="Tu crees le compte depuis l&apos;admin"
                  text="Tu renseignes le nom, l&apos;email professionnel, le role et l&apos;etat actif du compte."
                />
                <AccessStep
                  index="02"
                  title="L&apos;email devient l&apos;identifiant"
                  text="On ne cree pas de pseudo separe. L&apos;identifiant de connexion sera simplement l&apos;email."
                />
                <AccessStep
                  index="03"
                  title="Le mot de passe sera defini a l&apos;activation"
                  text="Le nouvel utilisateur recevra un lien pour choisir son mot de passe et acceder directement au bon perimetre."
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniTag({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
      {label}
    </div>
  );
}

function AccessStep({
  index,
  title,
  text
}: {
  index: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/55 text-xs font-semibold tracking-[0.2em] text-slate-300">
        {index}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
      </div>
    </div>
  );
}
