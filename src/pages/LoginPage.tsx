import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BrandSignature } from "../components/branding/BrandSignature";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { useInstallPrompt } from "../context/InstallPromptContext";
import { blasonLogo, lorSquadLogo } from "../data/visualContent";

export function LoginPage() {
  const { authReady, storageMode, users, loginWithCredentials } = useAppContext();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    try {
      const result = await loginWithCredentials({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });
      if (!result.ok) {
        setError(
          result.error ??
            (storageMode === "supabase"
              ? "Email ou mot de passe invalides pour cet acces."
              : "Email ou mot de passe non reconnus pour cette version de demonstration.")
        );
        return;
      }

      setError("");
      navigate("/dashboard");
    } catch (error) {
      console.error("Soumission du login impossible.", error);
      setError(
        storageMode === "supabase"
          ? "La connexion securisee ne repond pas correctement pour le moment."
          : "La version de demonstration ne repond pas correctement pour le moment."
      );
    }
  }

  async function handleInstallClick() {
    await promptInstall();
  }

  return (
    <div className="min-h-screen bg-hero-mesh px-4 py-8 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1500px] gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-panel order-2 relative flex flex-col justify-between overflow-hidden rounded-[38px] p-6 md:p-8 lg:order-1 lg:p-12">
          <div className="absolute right-[-90px] top-[-70px] h-64 w-64 rounded-full bg-[rgba(239,197,141,0.10)] blur-3xl" />
          <div className="absolute bottom-[-110px] left-[-80px] h-72 w-72 rounded-full bg-[rgba(89,183,255,0.10)] blur-3xl" />
          <div className="absolute left-1/2 top-[24%] h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[rgba(89,183,255,0.08)] blur-[120px]" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="space-y-10 md:space-y-12">
              <div>
                <StatusBadge label="Lor'Squad Wellness" tone="amber" />
              </div>

              <div className="space-y-7 md:space-y-9">
                <div className="flex justify-center lg:justify-start">
                  <img
                    src={lorSquadLogo}
                    alt="Lor'Squad Wellness"
                    className="w-full max-w-[430px] object-contain opacity-[0.99] drop-shadow-[0_28px_70px_rgba(0,0,0,0.36)] sm:max-w-[520px] lg:max-w-[640px]"
                  />
                </div>

                <div className="space-y-4 md:space-y-5">
                  <h1 className="max-w-[9ch] text-balance text-[2.4rem] leading-[0.95] tracking-[-0.055em] sm:text-[3.2rem] md:text-[3.85rem]">
                    Ton espace, prêt à suivre.
                  </h1>
                  <p className="max-w-[34rem] text-base leading-7 text-slate-300/92 md:text-[18px] md:leading-8">
                    Bilans, rendez-vous, relances et suivi client dans une ouverture simple, fluide
                    et premium.
                  </p>
                  <div className="grid gap-3 pt-2 sm:grid-cols-3">
                    <MiniTag label="Bilans guidés" />
                    <MiniTag label="Suivi terrain" />
                    <MiniTag label="Lecture équipe" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5 pt-8">
              <div className="flex items-center gap-4 text-slate-500">
                <img
                  src={blasonLogo}
                  alt="Blason Lor'Squad"
                  className="h-12 w-12 rounded-[18px] object-cover ring-1 ring-white/10"
                />
                <div>
                  <p className="text-sm font-medium text-white">Lor&apos;Squad Wellness</p>
                  <p className="text-[12px] text-slate-500">
                    Bilans guidés, suivi terrain et lecture d&apos;équipe
                  </p>
                </div>
              </div>
              <BrandSignature variant="inline" />
            </div>
          </div>
        </section>

        <section className="glass-panel order-1 rounded-[38px] p-6 md:p-8 lg:order-2 lg:p-10">
          <div className="space-y-8">
            <div>
              <p className="eyebrow-label">Connexion</p>
              <h2 className="mt-4 max-w-[10ch] text-balance text-4xl">
                Accède à ton espace.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-300/92">
                Retrouve tes rendez-vous, tes suivis et tes dossiers en quelques secondes.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Identifiant</label>
                <input
                  type="email"
                  placeholder="E-mail professionnel"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  inputMode="email"
                  spellCheck={false}
                />
                <p className="text-xs text-slate-500">
                  Utilise l&apos;e-mail professionnel associé à ton accès.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Mot de passe</label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="current-password"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="text-xs font-medium text-slate-400 transition hover:text-white"
                >
                  {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                </button>
              </div>

              {error ? (
                <div className="rounded-[22px] bg-rose-400/10 px-4 py-3 text-sm text-rose-100 shadow-soft">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={!authReady}>
                Ouvrir mon espace
              </Button>
            </form>

            {!isStandalone ? (
              <div className="surface-soft rounded-[24px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow-label">Installer l&apos;app</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      Ajoute Lor&apos;Squad Wellness à ton écran d&apos;accueil.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Plus rapide à rouvrir en rendez-vous, surtout sur tablette et mobile.
                    </p>
                  </div>
                  <StatusBadge label="Acces direct" tone="green" />
                </div>

                {canPromptInstall ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-300">
                      L&apos;installation directe est disponible sur ce navigateur.
                    </p>
                    <Button variant="secondary" onClick={() => void handleInstallClick()}>
                      Installer l&apos;app
                    </Button>
                  </div>
                ) : isIos ? (
                  <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                    Sur iPhone / iPad : ouvre ce lien dans <span className="font-semibold text-white">Safari</span>,
                    puis touche <span className="font-semibold text-white">Partager</span> et choisis{" "}
                    <span className="font-semibold text-white">Sur l&apos;écran d&apos;accueil</span>.
                  </div>
                ) : isMobile ? (
                  <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                    Sur Android : ouvre ce lien dans <span className="font-semibold text-white">Chrome</span>,
                    puis utilise le menu du navigateur pour{" "}
                    <span className="font-semibold text-white">Installer l&apos;app</span> ou{" "}
                    <span className="font-semibold text-white">Ajouter à l&apos;écran d&apos;accueil</span>.
                  </div>
                ) : (
                  <div className="mt-4 rounded-[18px] bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-300">
                    Sur ordinateur, utilise l&apos;icone d&apos;installation dans la barre d&apos;adresse
                    de Chrome ou Edge pour ajouter l&apos;app.
                  </div>
                )}
              </div>
            ) : null}

            {storageMode === "local" ? (
              <div className="surface-soft rounded-[24px] p-5">
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
                    className="rounded-[22px] bg-slate-950/26 px-4 py-4 text-left transition hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-semibold text-white">Acces distributeur</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">
                      Vue limitée à ses clients, ses bilans et ses suivis.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccess("admin")}
                    className="rounded-[22px] bg-slate-950/26 px-4 py-4 text-left transition hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-semibold text-white">Acces admin</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">
                      Vue globale sur les clients, l&apos;activité et le pilotage d&apos;équipe.
                    </p>
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-500">Mot de passe démo : demo1234</p>
              </div>
            ) : null}

            <div className="surface-soft rounded-[24px] p-5">
              <p className="eyebrow-label">Comment creer les acces</p>
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
    <div className="surface-soft rounded-[18px] px-4 py-3 text-sm font-medium text-slate-200 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
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
    <div className="flex gap-3 rounded-[22px] bg-white/[0.03] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold tracking-[0.08em] text-slate-200">
        {index}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-400/90">{text}</p>
      </div>
    </div>
  );
}
