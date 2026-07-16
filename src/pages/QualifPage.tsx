// =============================================================================
// QualifPage — chantier Qualif, parcours d'onboarding post-paiement
// (2026-07-16). Route publique /qualif/:token (même token que
// /resultat-bilan/:token — online_bilans.result_token).
//
// Phase 1 : bootstrap (vérifie le paiement côté serveur, encaisse
// nom/sexe/consentement, crée la fiche client de façon idempotente via
// l'edge qualif-bootstrap) + écran de bienvenue. Les étapes saveur / scan
// app / pesée-mensurations / Telegram arrivent en Phase 2-3 (state machine
// déjà prête via `step`, il suffira de brancher les composants).
// =============================================================================

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { PublicShell, PUBLIC_TOKENS, PUBLIC_FONTS, publicGradText } from "../components/public/PublicShell";
import { getSupabaseClient } from "../services/supabaseClient";

interface QualifStep {
  consentAt: string | null;
  flavorProductId: string | null;
  flavorSkipped: boolean;
  appOpenedAt: string | null;
  telegramAt: string | null;
  completedAt: string | null;
}

interface BootstrapDTO {
  ok: boolean;
  registered?: boolean;
  error?: string;
  firstName?: string;
  coachName?: string;
  programId?: string;
  programName?: string;
  clientId?: string;
  clientToken?: string | null;
  step?: QualifStep;
}

type Status = "loading" | "not_found" | "not_paid" | "error" | "form" | "welcome";

export function QualifPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<BootstrapDTO | null>(null);

  async function callBootstrap(payload: Record<string, unknown>): Promise<BootstrapDTO | null> {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data } = await sb.functions.invoke("qualif-bootstrap", { body: { token, ...payload } });
    return (data as BootstrapDTO | null) ?? null;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await callBootstrap({});
      if (!alive) return;
      if (!res || !res.ok) {
        setStatus(res?.error === "not_found" ? "not_found" : res?.error === "not_paid" ? "not_paid" : "error");
        return;
      }
      setInfo(res);
      setStatus(res.registered ? "welcome" : "form");
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "loading") {
    return (
      <PublicShell defaultTheme="dark">
        <Centered>On vérifie ton paiement…</Centered>
      </PublicShell>
    );
  }

  if (status === "not_found" || status === "error") {
    return (
      <PublicShell defaultTheme="dark">
        <Centered title="Ce lien n'est plus valide">
          Demande à ton coach de te renvoyer ton lien de résultat.
        </Centered>
      </PublicShell>
    );
  }

  if (status === "not_paid") {
    return (
      <PublicShell defaultTheme="dark">
        <Centered title="Paiement introuvable">
          On ne trouve pas encore de paiement confirmé pour ce bilan. Si tu viens de payer,
          patiente quelques secondes et recharge la page.{" "}
          {token ? (
            <a href={`/resultat-bilan/${token}`} style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>
              Retour à ta page résultat →
            </a>
          ) : null}
        </Centered>
      </PublicShell>
    );
  }

  if (status === "welcome" && info) {
    return (
      <PublicShell defaultTheme="dark">
        <Centered title={`Bienvenue, ${info.firstName || "toi"} !`}>
          Ta fiche est créée. {info.coachName} va bientôt te contacter pour la suite —
          on prépare la suite du parcours (saveur, appli, point de départ) juste ici.
        </Centered>
      </PublicShell>
    );
  }

  if (status === "form" && info) {
    return (
      <PublicShell defaultTheme="dark">
        <QualifIdentityConsentForm
          firstName={info.firstName ?? ""}
          coachName={info.coachName ?? "ton coach"}
          onSubmit={async (lastName, sex) => {
            const res = await callBootstrap({ mode: "register", lastName, sex, consent: true });
            if (res?.ok && res.registered) {
              setInfo(res);
              setStatus("welcome");
              return null;
            }
            return res?.error === "missing_fields"
              ? "Merci de compléter les 2 champs."
              : "Une erreur est survenue — réessaie dans un instant.";
          }}
        />
      </PublicShell>
    );
  }

  return null;
}

function Centered({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "90px 24px", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      {title ? (
        <h1 style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 24, color: "var(--cream)", marginBottom: 12 }}>
          {title}
        </h1>
      ) : null}
      <p style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 14, color: "var(--cream-muted)", lineHeight: 1.6 }}>
        {children}
      </p>
    </div>
  );
}

function QualifIdentityConsentForm({
  firstName,
  coachName,
  onSubmit,
}: {
  firstName: string;
  coachName: string;
  onSubmit: (lastName: string, sex: "male" | "female") => Promise<string | null>;
}) {
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<"male" | "female" | "">("");
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!lastName.trim() || !sex || !checked) {
      setError("Merci de compléter les 2 champs et de cocher la case.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const err = await onSubmit(lastName.trim(), sex);
    setSubmitting(false);
    if (err) setError(err);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 22px 90px" }}>
      <div style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: PUBLIC_TOKENS.teal, marginBottom: 12 }}>
        Dernière étape avant de démarrer
      </div>
      <h1 style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 800, fontSize: "clamp(26px,5vw,34px)", lineHeight: 1.15, color: "var(--cream)", marginBottom: 10 }}>
        On finalise ta fiche, <span style={publicGradText}>{firstName || "toi"}</span>
      </h1>
      <p style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 14, color: "var(--cream-muted)", lineHeight: 1.6, marginBottom: 26 }}>
        2 infos rapides pour créer ton espace, puis {coachName} prend le relais.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          <span style={fieldLabel}>Nom de famille</span>
          <input
            style={fieldInput}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Ton nom"
            autoComplete="family-name"
            required
          />
        </label>

        <div>
          <span style={fieldLabel}>Sexe</span>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            {(["female", "male"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSex(s)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 12,
                  border: `1px solid ${sex === s ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
                  background: sex === s ? "color-mix(in srgb, " + PUBLIC_TOKENS.teal + " 14%, transparent)" : "transparent",
                  color: sex === s ? PUBLIC_TOKENS.teal : "var(--cream-muted)",
                  fontFamily: PUBLIC_FONTS.body,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {s === "female" ? "Femme" : "Homme"}
              </button>
            ))}
          </div>
        </div>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: 14,
            borderRadius: 12,
            border: "1px solid var(--hair)",
            cursor: "pointer",
            marginTop: 6,
          }}
        >
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 3 }} />
          <span style={{ fontSize: 12.5, color: "var(--cream-muted)", lineHeight: 1.5 }}>
            Je certifie avoir été informé·e du traitement de mes données de santé (poids,
            mensurations, body scan) dans le cadre de mon accompagnement, hébergées par Supabase
            (UE), accessibles uniquement à mon coach — et j'y consens expressément.
          </span>
        </label>

        {error ? <div style={{ fontSize: 12.5, color: "#FCA5A5" }}>{error}</div> : null}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 6,
            padding: "14px 16px",
            borderRadius: 12,
            border: "none",
            background: PUBLIC_TOKENS.gradCta,
            color: "#06241f",
            fontFamily: PUBLIC_FONTS.display,
            fontWeight: 800,
            fontSize: 15,
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Création de ta fiche…" : "Continuer →"}
        </button>
      </form>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontFamily: PUBLIC_FONTS.body,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  color: "var(--cream-muted)",
  marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--hair)",
  background: "color-mix(in srgb, var(--cream) 4%, transparent)",
  color: "var(--cream)",
  fontFamily: PUBLIC_FONTS.body,
  fontSize: 14,
  outline: "none",
};
