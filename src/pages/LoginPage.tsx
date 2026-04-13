import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        throw error;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-[1100px] gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="lor-card overflow-hidden p-8 md:p-10">
          <div className="max-w-[520px]">
            <p className="eyebrow-label">Lor&apos;Squad Wellness</p>
            <h1 className="mt-5 text-[2.8rem] font-extrabold leading-[0.95]">
              Une refonte premium pour piloter chaque accompagnement.
            </h1>
            <p className="mt-5 text-base leading-8 text-[var(--lor-muted)]">
              Accède à ton dashboard, tes bilans, tes body scans et tes renouvellements produits dans
              un espace unique, sombre, lisible et pensé pour le rendez-vous terrain.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Dashboard live",
                "Fiches clients",
                "Bilans multi-étapes",
                "Suivi PV"
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-[var(--lor-text)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lor-card p-8 md:p-10">
          <p className="eyebrow-label">Connexion</p>
          <h2 className="mt-4 text-[2rem] font-bold">Ouvre ton espace coach</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--lor-muted)]">
            Utilise ton adresse Supabase et ton mot de passe pour accéder à l&apos;application.
          </p>

          {missingEnv ? (
            <div className="lor-danger-banner mt-6 rounded-[12px] px-4 py-3 text-sm">
              Variables manquantes: ajoute <code>VITE_SUPABASE_URL</code> et{" "}
              <code>VITE_SUPABASE_ANON_KEY</code> dans <code>.env</code>.
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="coach@lor-squad.com"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
              required
            />

            {error ? <div className="lor-danger-banner rounded-[12px] px-4 py-3 text-sm">{error}</div> : null}

            <Button type="submit" className="w-full" size="lg" loading={loading} disabled={missingEnv}>
              Se connecter
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
