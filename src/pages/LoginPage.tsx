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
    return { admin, distributor };
  }, [users]);

  function fillDemoAccess(role: "admin" | "distributor") {
    const account = role === "admin" ? demoAccounts.admin : demoAccounts.distributor;
    if (!account) return;
    setEmail(account.email);
    setPassword("demo1234");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady) return;

    try {
      const result = await loginWithCredentials({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });
      if (!result.ok) {
        setError(
          result.error ??
            (storageMode === "supabase"
              ? "Email ou mot de passe invalides pour cet accès."
              : "Email ou mot de passe non reconnus pour cette version de démonstration.")
        );
        return;
      }
      setError("");
      navigate("/dashboard");
    } catch (submitError) {
      console.error("Soumission du login impossible.", submitError);
      setError(
        storageMode === "supabase"
          ? "La connexion sécurisée ne répond pas correctement pour le moment."
          : "La version de démonstration ne répond pas correctement pour le moment."
      );
    }
  }

  async function handleInstallClick() {
    await promptInstall();
  }

  return (
    <div className="min-h-screen bg-hero-mesh font-body">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[10%] top-[-8%] h-[480px] w-[480px] rounded-full bg-[rgba(89,183,255,0.07)] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[5%] h-[400px] w-[400px] rounded-full bg-[rgba(239,197,141,0.06)] blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(84,64,104,0.08)] blur-[160px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1560px] px-4 py-6 md:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5 lg:py-8">

        {/* ── Left panel — Branding ── */}
        <section className="glass-panel order-2 relative flex flex-col justify-between overflow-hidden rounded-[36px] p-7 md:p-10 lg:order-1 lg:p-14">
          <div className="relative z-10 flex h-full flex-col justify-between gap-16">

            {/* Top: logo + tagline */}
            <div className="space-y-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-glow-amber">
                  Lor&apos;Squad Wellness
                </span>
              </div>

              <div className="space-y-6">
                <img
                  src={lorSquadLogo}
                  alt="Lor'Squad Wellness"
                  className="w-full max-w-[420px] object-contain drop-shadow-[0_32px_80px_rgba(0,0,0,0.4)] sm:max-w-[520px] lg:max-w-[660px]"
                />

                <h1 className="font-display max-w-[14ch] text-balance text-[2.2rem] font-bold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.8rem] lg:text-[3.4rem]">
                  Pilote tes bilans, tes rendez-vous et ton équipe.
                </h1>

                <p className="max-w-[38rem] text-[15px] leading-[1.75] text-slate-300/80 md:text-base">
                  Lor&apos;Squad Wellness rassemble le bilan guidé, la lecture client, le suivi terrain
                  et l&apos;activité d&apos;équipe dans un seul espace fluide et simple à rouvrir en rendez-vous.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {["Bilans guidés", "Rendez-vous", "Suivi client", "Équipe"].map((label) => (
                    <span
                      key={label}
                      className="rounded-[14px] border border-white/[0.07] bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-slate-200/90 shadow-soft backdrop-blur-sm"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: identity + brand */}
            <div className="space-y-5 border-t border-white/[0.06] pt-6">
              <div className="flex items-center gap-4">
                <img
                  src={blasonLogo}
                  alt="Blason Lor'Squad"
                  className="h-11 w-11 rounded-[16px] object-cover ring-1 ring-white/10 shadow-soft"
                />
                <div>
                  <p className="text-[13px] font-semibold text-white">Lor&apos;Squad Wellness</p>
                  <p className="text-[11px] text-slate-500">Bilans guidés · Suivi terrain · Lecture d&apos;équipe</p>
                </div>
              </div>
              <BrandSignature variant="inline" />
            </div>
          </div>
        </section>

        {/* ── Right panel — Form ── */}
        <section className="glass-panel order-1 flex flex-col rounded-[36px] p-7 md:p-10 lg:order-2 lg:p-11">
          <div className="flex flex-1 flex-col gap-8">

            {/* Heading */}
            <div className="space-y-3">
              <p className="eyebrow-label">Connexion</p>
              <h2 className="font-display max-w-[12ch] text-balance text-[1.9rem] font-bold leading-[1.1] tracking-[-0.03em] text-white md:text-[2.2rem]">
                Accède à ton espace.
              </h2>
              <p className="max-w-sm text-[14px] leading-[1.8] text-slate-400">
                Retrouve tes rendez-vous, tes suivis et tes dossiers en quelques secondes.
              </p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-300">Identifiant</label>
                <input
                  type="email"
                  placeholder="E-mail professionnel"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  inputMode="email"
                  spellCheck={false}
                />
                <p className="text-[11px] text-slate-500">Utilise l&apos;e-mail professionnel associé à ton accès.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-slate-300">Mot de passe</label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="current-password"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[11px] font-medium text-slate-500 transition hover:text-slate-200"
                >
                  {showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                </button>
              </div>

              {error ? (
                <div className="rounded-[18px] bg-rose-400/10 px-4 py-3 text-[13px] leading-[1.6] text-rose-200">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={!authReady}>
                Ouvrir mon espace
              </Button>
            </form>

            {/* Install banner */}
            {!isStandalone ? (
              <div className="surface-soft rounded-[22px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow-label">Installer l&apos;app</p>
                    <p className="mt-2.5 text-[15px] font-semibold text-white">
                      Ajoute Lor&apos;Squad Wellness à ton écran d&apos;accueil.
                    </p>
                    <p className="mt-1.5 text-[13px] leading-[1.7] text-slate-400">
                      Plus rapide à rouvrir en rendez-vous, surtout sur tablette et mobile.
                    </p>
                  </div>
                  <StatusBadge label="Accès direct" tone="green" />
                </div>

                {canPromptInstall ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[13px] text-slate-400">L&apos;installation directe est disponible sur ce navigateur.</p>
                    <Button variant="secondary" onClick={() => void handleInstallClick()}>
                      Installer l&apos;app
                    </Button>
                  </div>
                ) : isIos ? (
                  <p className="mt-3 rounded-[14px] bg-white/[0.03] px-4 py-3 text-[13px] leading-[1.7] text-slate-400">
                    Sur iPhone / iPad : ouvre dans <strong className="text-white">Safari</strong>, puis
                    touche <strong className="text-white">Partager</strong> → <strong className="text-white">Sur l&apos;écran d&apos;accueil</strong>.
                  </p>
                ) : isMobile ? (
                  <p className="mt-3 rounded-[14px] bg-white/[0.03] px-4 py-3 text-[13px] leading-[1.7] text-slate-400">
                    Sur Android : ouvre dans <strong className="text-white">Chrome</strong> puis utilise le menu
                    pour <strong className="text-white">Installer l&apos;app</strong>.
                  </p>
                ) : (
                  <p className="mt-3 rounded-[14px] bg-white/[0.03] px-4 py-3 text-[13px] leading-[1.7] text-slate-400">
                    Sur ordinateur, utilise l&apos;icône d&apos;installation dans la barre d&apos;adresse de Chrome ou Edge.
                  </p>
                )}
              </div>
            ) : null}

            {/* Demo access */}
            {storageMode === "local" ? (
              <div className="surface-soft rounded-[22px] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-white">Accès de démonstration</p>
                    <p className="mt-1 text-[11px] leading-[1.7] text-slate-500">
                      Pour tester rapidement l&apos;interface sans exposer de comptes nominatifs.
                    </p>
                  </div>
                  <StatusBadge label="Démo" tone="blue" />
                </div>
                <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                  <DemoButton
                    title="Accès distributeur"
                    description="Vue limitée à ses clients, bilans et suivis."
                    onClick={() => fillDemoAccess("distributor")}
                  />
                  <DemoButton
                    title="Accès admin"
                    description="Vue globale sur les clients, l'activité et l'équipe."
                    onClick={() => fillDemoAccess("admin")}
                  />
                </div>
                <p className="mt-3 text-[11px] text-slate-600">Mot de passe démo : demo1234</p>
              </div>
            ) : null}

            {/* How to create access */}
            <div className="surface-soft rounded-[22px] p-5">
              <p className="eyebrow-label">Comment créer les accès</p>
              <div className="mt-4 space-y-2.5">
                <AccessStep
                  index="01"
                  title="Tu crées le compte depuis l'admin"
                  text="Tu renseignes le nom, l'email professionnel, le rôle et l'état actif du compte."
                />
                <AccessStep
                  index="02"
                  title="L'email devient l'identifiant"
                  text="On ne crée pas de pseudo séparé. L'identifiant de connexion sera simplement l'email."
                />
                <AccessStep
                  index="03"
                  title="Le mot de passe est défini par l'admin"
                  text="Le mot de passe saisi à la création devient le mot de passe initial. Il peut ensuite être redéfini depuis la page équipe."
                />
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}

function DemoButton({
  title,
  description,
  onClick
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[18px] bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.07]"
    >
      <p className="text-[13px] font-semibold text-white">{title}</p>
      <p className="mt-1 text-[11px] leading-[1.7] text-slate-500">{description}</p>
    </button>
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
    <div className="flex gap-3 rounded-[18px] bg-white/[0.03] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-bold tracking-[0.08em] text-glow-amber">
        {index}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[12px] leading-[1.7] text-slate-500">{text}</p>
      </div>
    </div>
  );
}
