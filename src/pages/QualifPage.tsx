// =============================================================================
// QualifPage — chantier Qualif, parcours d'onboarding post-paiement
// (2026-07-16). Route publique /qualif/:token (même token que
// /resultat-bilan/:token — online_bilans.result_token).
//
// Parcours complet après paiement :
//   register (identité + RGPD → crée la fiche, idempotent) → intro →
//   saveur (si le programme a une Formula 1) → scan de l'appli →
//   point de départ (pesée / mensurations, ClientBaselineStep) →
//   Telegram → écran final « Ouvrir mon espace ».
//
// La state machine se RÉHYDRATE au chargement depuis l'état serveur (step) :
// un client qui recharge en cours de route reprend là où il en était.
// =============================================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { PublicShell, PUBLIC_TOKENS, PUBLIC_FONTS, publicGradText } from "../components/public/PublicShell";
import { getSupabaseClient } from "../services/supabaseClient";
import { getProgramFlavorGroups, flavorChoiceLabel } from "../data/flavorGroups";
import { QualifFlavorStep } from "../components/qualif/QualifFlavorStep";
import { QualifScanAppStep } from "../components/qualif/QualifScanAppStep";
import { QualifTelegramStep } from "../components/qualif/QualifTelegramStep";
import { ClientBaselineStep } from "../components/client-app/ClientBaselineStep";

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

type Status = "loading" | "not_found" | "not_paid" | "error" | "form" | "flow";
type Stage = "intro" | "flavor" | "scan" | "baseline" | "telegram" | "done";

/** Étape de reprise à partir de l'état serveur (client qui recharge la page). */
function initialStage(step: QualifStep | undefined): Stage {
  if (!step) return "intro";
  if (step.completedAt || step.telegramAt) return "done";
  if (step.appOpenedAt) return "baseline";
  if (step.flavorProductId || step.flavorSkipped) return "scan";
  return "intro"; // rien de fait encore → on démarre par l'intro
}

export function QualifPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<BootstrapDTO | null>(null);
  const [stage, setStage] = useState<Stage>("intro");

  const flavorGroups = useMemo(() => getProgramFlavorGroups(info?.programId), [info?.programId]);
  const firstRealStage: Stage = flavorGroups.length > 0 ? "flavor" : "scan";

  async function callBootstrap(payload: Record<string, unknown>): Promise<BootstrapDTO | null> {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data } = await sb.functions.invoke("qualif-bootstrap", { body: { token, ...payload } });
    return (data as BootstrapDTO | null) ?? null;
  }

  async function callUpdate(payload: Record<string, unknown>): Promise<void> {
    const sb = await getSupabaseClient();
    if (!sb) return;
    await sb.functions.invoke("qualif-update", { body: { token, ...payload } });
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
      if (res.registered) {
        setStage(initialStage(res.step));
        setStatus("flow");
      } else {
        setStatus("form");
      }
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
              setStage("intro");
              setStatus("flow");
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

  if (status === "flow" && info) {
    const firstName = info.firstName ?? "";
    const clientToken = info.clientToken ?? "";
    const clientId = info.clientId ?? "";

    // Point de départ : réutilise l'écran de l'app client (thème clair, layout
    // plein écran autonome) → rendu HORS PublicShell.
    if (stage === "baseline") {
      return (
        <ClientBaselineStep
          token={clientToken}
          clientId={clientId}
          firstName={firstName}
          coachFirstName={info.coachName}
          onDone={() => setStage("telegram")}
        />
      );
    }

    return (
      <PublicShell defaultTheme="dark">
        {stage === "intro" && (
          <QualifIntro
            firstName={firstName}
            onStart={() => setStage(firstRealStage)}
          />
        )}

        {stage === "flavor" && flavorGroups.length > 0 && (
          <QualifFlavorStep
            firstName={firstName}
            groups={flavorGroups}
            onSubmit={async (choices) => {
              const labels = Object.entries(choices)
                .map(([groupKey, optionId]) => flavorChoiceLabel(groupKey, optionId))
                .filter((l): l is string => Boolean(l));
              await callUpdate({ mode: "flavor", choices, productLabels: labels });
              setStage("scan");
            }}
            onSkip={async () => {
              await callUpdate({ mode: "skip_flavor" });
              setStage("scan");
            }}
          />
        )}

        {stage === "scan" && (
          <QualifScanAppStep
            firstName={firstName}
            clientToken={clientToken}
            onNext={async () => {
              await callUpdate({ mode: "app_opened" });
              setStage("baseline");
            }}
          />
        )}

        {stage === "telegram" && (
          <QualifTelegramStep
            firstName={firstName}
            onNext={async () => {
              await callUpdate({ mode: "telegram" });
              setStage("done");
            }}
          />
        )}

        {stage === "done" && (
          <QualifDone
            firstName={firstName}
            onOpen={async () => {
              await callUpdate({ mode: "complete" });
              window.location.href = `/client/${clientToken}`;
            }}
          />
        )}
      </PublicShell>
    );
  }

  return null;
}

// ─── Intro ────────────────────────────────────────────────────────────────────
function QualifIntro({ firstName, onStart }: { firstName: string; onStart: () => void }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "70px 22px 90px", textAlign: "center" }}>
      <div style={{ fontSize: 46 }} aria-hidden="true">
        🎉
      </div>
      <h1
        style={{
          fontFamily: PUBLIC_FONTS.display,
          fontWeight: 800,
          fontSize: "clamp(28px,6vw,38px)",
          lineHeight: 1.12,
          color: "var(--cream)",
          margin: "14px 0 12px",
        }}
      >
        Bienvenue, <span style={publicGradText}>{firstName || "toi"}</span> !
      </h1>
      <p style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 15, color: "var(--cream-muted)", lineHeight: 1.6 }}>
        Ta place est réservée, ton programme est validé. Encore 4 petites étapes (2 minutes) pour tout
        mettre en place et bien démarrer.
      </p>
      <button type="button" onClick={onStart} style={{ ...ctaPrimary, marginTop: 28 }}>
        C'est parti →
      </button>
    </div>
  );
}

// ─── Écran final ──────────────────────────────────────────────────────────────
function QualifDone({ firstName, onOpen }: { firstName: string; onOpen: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "70px 22px 90px", textAlign: "center" }}>
      <div style={{ fontSize: 46 }} aria-hidden="true">
        🌿
      </div>
      <h1
        style={{
          fontFamily: PUBLIC_FONTS.display,
          fontWeight: 800,
          fontSize: "clamp(26px,5vw,34px)",
          lineHeight: 1.15,
          color: "var(--cream)",
          margin: "14px 0 12px",
        }}
      >
        Tout est prêt, <span style={publicGradText}>{firstName || "toi"}</span>
      </h1>
      <p style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 15, color: "var(--cream-muted)", lineHeight: 1.6 }}>
        Bienvenue dans La Base 360. Ton espace personnel t'attend — programme, conseils, progression et
        ta messagerie avec ton coach.
      </p>
      <button
        type="button"
        onClick={() => {
          if (busy) return;
          setBusy(true);
          void onOpen();
        }}
        disabled={busy}
        style={{ ...ctaPrimary, marginTop: 28 }}
      >
        {busy ? "Ouverture…" : "Ouvrir mon espace →"}
      </button>
    </div>
  );
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
      <div
        style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: PUBLIC_TOKENS.teal,
          marginBottom: 12,
        }}
      >
        Dernière étape avant de démarrer
      </div>
      <h1
        style={{
          fontFamily: PUBLIC_FONTS.display,
          fontWeight: 800,
          fontSize: "clamp(26px,5vw,34px)",
          lineHeight: 1.15,
          color: "var(--cream)",
          marginBottom: 10,
        }}
      >
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

        <button type="submit" disabled={submitting} style={{ ...ctaPrimary, opacity: submitting ? 0.7 : 1, cursor: submitting ? "wait" : "pointer" }}>
          {submitting ? "Création de ta fiche…" : "Continuer →"}
        </button>
      </form>
    </div>
  );
}

const ctaPrimary: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 12,
  border: "none",
  background: PUBLIC_TOKENS.gradCta,
  color: "#06241f",
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

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
