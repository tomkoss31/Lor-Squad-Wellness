// Chantier Onboarding distributeur complet (2026-04-24, refonte FLEX 2026-11-05).
//
// Route publique /bienvenue-distri?token=XYZ.
// Wizard 5 étapes pour un nouveau distributeur invité par son parrain :
//   0 — Welcome
//   1 — Auth (email + password)
//   2 — Profil (nom, prénom, tél, ville, herbalife_id, avatar)
//   3 — Statut Herbalife (rang, marge retail) — FLEX V3 Option A
//   4 — Ambitions (revenu mensuel + panier moyen + deadline) → crée le
//       plan d'action FLEX automatiquement
//
// Après step 4 : redirect /co-pilote avec rang posé + plan FLEX actif +
// FlexTodayWidget en mode "cibles du jour" + checklist J0-J7 visible.
// Le distri n'a plus besoin de naviguer vers /flex/onboarding ou de
// confirmer son rang via la pop-up : tout est déjà fait.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import {
  RANK_LABELS,
  RANK_MARGINS,
  RANK_ORDER,
  type HerbalifeRank,
} from "../types/domain";
import {
  computeFlexTargets,
  FLEX_DEFAULT_BASKET,
} from "../lib/flexCalculations";
import type { DistributorActionPlanInsert } from "../types/flex";
import { InstallPwaInstructions } from "../components/pwa/InstallPwaInstructions";
import { isStandalonePwa } from "../lib/utils/detectDevice";

// Étape 5 = installation PWA (ajoutée 2026-07) : le nouveau distri doit
// installer l'app sur son tél (iOS/Android) avant d'entrer dans son espace.
type Step = 0 | 1 | 2 | 3 | 4 | 5;

const RANK_LIST: HerbalifeRank[] = RANK_ORDER;

function ymdInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type ValidationState =
  | { status: "loading" }
  | {
      status: "valid";
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      variant: "admin" | "sponsor";
      sponsorFirstName: string;
      sponsorName: string;
    }
  | { status: "invalid"; message: string };

export function BienvenueDistriPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [validation, setValidation] = useState<ValidationState>({ status: "loading" });
  const [step, setStep] = useState<Step>(0);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  // Chantier #10 V2 badges (2026-05-17) : date début activité Herbalife
  // saisie à l'onboarding. Optionnel. Alimente le badge ancienneté sur
  // /bilan-online/<slug>. Modifiable plus tard dans Paramètres > Profil.
  const [coachingSince, setCoachingSince] = useState("");
  const [herbalifeId, setHerbalifeId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // FLEX V3 Option A — étapes 3 & 4
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [currentRank, setCurrentRank] = useState<HerbalifeRank>("distributor_25");
  const [revenueTarget, setRevenueTarget] = useState<number>(1500);
  const [averageBasket, setAverageBasket] = useState<number>(FLEX_DEFAULT_BASKET);
  const [deadline, setDeadline] = useState<string>(ymdInDays(90));

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Calcul live des cibles pour la step 4 (préview avant insert)
  const flexBreakdown = useMemo(
    () =>
      computeFlexTargets({
        monthlyRevenueTarget: revenueTarget,
        averageBasket,
        rank: currentRank,
        startingClients: 0,
      }),
    [revenueTarget, averageBasket, currentRank],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = (params.get("token") ?? "").trim();
    if (!t) {
      setValidation({
        status: "invalid",
        message: "Lien incomplet. Demande à ton parrain un nouveau lien d'invitation.",
      });
      return;
    }
    setToken(t);

    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        setValidation({
          status: "invalid",
          message: "Service momentanément indisponible. Réessaie dans quelques minutes.",
        });
        return;
      }
      const { data, error } = await sb.functions.invoke("validate-distributor-invite-token", {
        body: { token: t },
      });
      if (error || !data || data.valid !== true) {
        const reason = data?.reason as string | undefined;
        const message =
          reason === "expired"
            ? "Ce lien a expiré. Demande à ton parrain un nouveau lien."
            : reason === "consumed"
              ? "Ce lien a déjà été utilisé. Contacte ton parrain."
              : "Ce lien n'est plus valide. Contacte ton parrain.";
        setValidation({ status: "invalid", message });
        return;
      }
      const invitedPhone = (data.invited_phone ?? "") as string;
      const tokenVariant = ((data.variant as string) === "sponsor" ? "sponsor" : "admin") as
        | "admin"
        | "sponsor";
      setValidation({
        status: "valid",
        firstName: data.invited_first_name ?? "",
        lastName: data.invited_last_name ?? "",
        email: data.invited_email ?? "",
        phone: invitedPhone,
        variant: tokenVariant,
        sponsorFirstName: data.sponsor_first_name ?? "ton parrain",
        sponsorName: data.sponsor_name ?? "Ton parrain",
      });
      setFirstName(data.invited_first_name ?? "");
      setLastName(data.invited_last_name ?? "");
      setEmail(data.invited_email ?? "");
      // V2 sponsor : téléphone pré-rempli par le parrain (l'invité peut l'ajuster)
      if (invitedPhone) setPhone(invitedPhone);
    })();
  }, []);

  async function handleUploadAvatar(file: File) {
    setAvatarUploading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      // Key : avatars/pending-<token>/<timestamp>.<ext> tant que le user
      // n'existe pas encore (pas d'auth.uid). Déplaçable en V2.
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const safeToken = token.slice(0, 12);
      const path = `pending-${safeToken}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await sb.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (uploadErr) throw new Error(uploadErr.message);
      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(pub.publicUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload photo impossible.");
    } finally {
      setAvatarUploading(false);
    }
  }

  const handleSubmit = useCallback(async () => {
    if (validation.status !== "valid") return;
    setFormError("");

    if (!email.trim() || !/.+@.+\..+/.test(email.trim())) {
      setFormError("Adresse email invalide.");
      setStep(1);
      return;
    }
    if (password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères.");
      setStep(1);
      return;
    }
    if (password !== passwordConfirm) {
      setFormError("Les 2 mots de passe ne sont pas identiques.");
      setStep(1);
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Prénom et nom obligatoires.");
      return;
    }
    if (!phone.trim()) {
      setFormError("Numéro de téléphone obligatoire.");
      return;
    }
    if (!city.trim()) {
      setFormError("Ville obligatoire.");
      return;
    }
    if (!herbalifeId.trim()) {
      setFormError("ID Herbalife obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");

      const { data, error } = await sb.functions.invoke("consume-distributor-invite-token", {
        body: {
          token,
          password,
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          coaching_since: coachingSince.trim() || null,
          herbalife_id: herbalifeId.trim(),
          avatar_url: avatarUrl,
        },
      });

      if (error || !data?.success) {
        // Hotfix 2026-04-30 : extraction body via helper (supabase-js v2.101+
        // ne renvoie plus le body dans data quand status est 4xx/5xx).
        const msg = await extractFunctionError(data, error, "Impossible de créer ton accès.");
        console.warn("[BienvenueDistriPage] consume failed:", { data, error, msg });
        setFormError(msg);
        return;
      }

      if (data.access_token && data.refresh_token) {
        try {
          await sb.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
        } catch {
          // non bloquant
        }
      }
      // FLEX V3 Option A : on ne redirige PLUS direct vers /co-pilote.
      // Le compte est créé, on passe à la step 3 (rang) puis 4 (ambitions).
      // Le user_id est renvoyé par l'edge function pour les inserts FLEX.
      const newUserId = (data.user_id ?? data.userId ?? null) as string | null;
      if (newUserId) setCreatedUserId(newUserId);
      setStep(3);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSubmitting(false);
    }
  }, [
    avatarUrl,
    city,
    coachingSince,
    firstName,
    herbalifeId,
    lastName,
    password,
    passwordConfirm,
    phone,
    token,
    validation,
  ]);

  /**
   * Step 4 — finalisation : pose le rang Herbalife + crée le plan FLEX
   * + redirige vers /co-pilote. Le user est déjà authentifié depuis la
   * step 2 (setSession après consume-distributor-invite-token).
   */
  const handleFinishOnboarding = useCallback(async () => {
    setFormError("");
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");

      // Récupère l'auth user (au cas où setCreatedUserId n'a pas pu se
      // poser — fallback robuste).
      let userId = createdUserId;
      if (!userId) {
        const { data: authData } = await sb.auth.getUser();
        userId = authData.user?.id ?? null;
      }
      if (!userId) throw new Error("Session perdue, reconnecte-toi.");

      // 1. Update users : rang + rank_set_at (skip pop-up Rank à la connexion)
      const { error: userErr } = await sb
        .from("users")
        .update({
          current_rank: currentRank,
          rank_set_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (userErr) throw new Error(userErr.message);

      // 2. Insert distributor_action_plan
      const planInsert: DistributorActionPlanInsert = {
        user_id: userId,
        monthly_revenue_target: revenueTarget,
        daily_time_minutes: 60,
        starting_clients_count: 0,
        available_slots: [],
        average_basket: averageBasket,
        target_deadline_date: deadline,
        daily_invitations_target: flexBreakdown.daily_invitations_target,
        daily_conversations_target: flexBreakdown.daily_conversations_target,
        weekly_bilans_target: flexBreakdown.weekly_bilans_target,
        weekly_closings_target: flexBreakdown.weekly_closings_target,
        monthly_active_clients_target: flexBreakdown.monthly_active_clients_target,
      };
      const { error: planErr } = await sb
        .from("distributor_action_plan")
        .insert(planInsert);
      if (planErr) throw new Error(planErr.message);

      // Déjà en PWA installée → direct au Co-pilote. Sinon, étape « Installe
      // l'app » avant d'entrer (le distri doit l'avoir sur son tél).
      if (isStandalonePwa()) {
        navigate(`/co-pilote?welcome=distri`, { replace: true });
      } else {
        setStep(5);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSubmitting(false);
    }
  }, [
    averageBasket,
    createdUserId,
    currentRank,
    deadline,
    flexBreakdown,
    navigate,
    revenueTarget,
  ]);

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <div className="distri-root">
      {/* Chantier Premium Onboarding distri (2026-04-24) */}
      <style>{`
        /* Identité v2 « premium performance » (2026-07 refonte) : dark + lime
           (--ls-lime #c5f82a) + Anton titres + JetBrains Mono labels, pour la
           continuité avec la Salle des Opérations qui suit l'inscription.
           Palette locale (page publique, hors thème app) : */
        .distri-root {
          --dw-bg: #0a0c0a;
          --dw-card: #14171a;
          --dw-card-2: #1a1e22;
          --dw-border: rgba(255,255,255,0.10);
          --dw-text: #F1EFE8;
          --dw-muted: #9AA0A6;
          --dw-dim: #6b7280;
          --dw-lime: #c5f82a;
          --dw-lime-dk: #a9d425;
          --dw-teal: #2DD4BF;
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--dw-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
          color: var(--dw-text);
        }
        .distri-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          will-change: transform;
        }
        .distri-blob-gold {
          top: -15%;
          right: -8%;
          width: 540px;
          height: 540px;
          background: radial-gradient(circle, var(--dw-lime) 0%, transparent 70%);
          opacity: 0.18;
          animation: distri-float-1 32s ease-in-out infinite alternate;
        }
        .distri-blob-teal {
          bottom: -18%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, var(--dw-teal) 0%, transparent 70%);
          opacity: 0.16;
          animation: distri-float-2 38s ease-in-out infinite alternate;
        }
        @keyframes distri-float-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-70px, 50px) scale(1.12); }
        }
        @keyframes distri-float-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(80px, -40px) scale(1.1); }
        }
        .distri-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.05;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .distri-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          background: var(--dw-card);
          border-radius: 22px;
          padding: 32px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(197,248,42,0.06);
          border: 1px solid var(--dw-border);
          animation: distri-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        /* Titres Anton CAPS + labels JetBrains Mono */
        .distri-title {
          font-family: 'Anton', 'Syne', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.01em;
          color: var(--dw-text);
          line-height: 1.02;
          margin: 0;
        }
        .distri-eyebrow {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        @keyframes distri-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .distri-blob-gold, .distri-blob-teal, .distri-card { animation: none !important; }
        }
        @media (max-width: 480px) {
          .distri-root { padding: 20px 16px; }
          .distri-card { padding: 24px 22px; }
          .distri-blob-gold, .distri-blob-teal { width: 360px; height: 360px; }
        }
      `}</style>

      <div aria-hidden="true" className="distri-blob distri-blob-gold" />
      <div aria-hidden="true" className="distri-blob distri-blob-teal" />
      <div aria-hidden="true" className="distri-grain" />

      <div className="distri-card">
        {validation.status === "loading" ? (
          <p style={{ textAlign: "center", color: "var(--dw-muted)", fontSize: 14 }}>
            Vérification de ton invitation…
          </p>
        ) : validation.status === "invalid" ? (
          <InvalidCard message={validation.message} />
        ) : (
          <>
            <ProgressBar step={step} />

            {step === 0 ? (
              <WelcomeStep
                firstName={validation.firstName || firstName}
                sponsorFirstName={validation.sponsorFirstName}
                onContinue={() => setStep(1)}
              />
            ) : null}

            {step === 1 ? (
              <PasswordStep
                password={password}
                passwordConfirm={passwordConfirm}
                onPasswordChange={setPassword}
                onPasswordConfirmChange={setPasswordConfirm}
                email={email}
                onEmailChange={setEmail}
                showEmailField={validation.variant === "sponsor"}
                onBack={() => setStep(0)}
                onContinue={() => {
                  if (validation.variant === "sponsor" && (!email.trim() || !/.+@.+\..+/.test(email.trim()))) {
                    setFormError("Adresse email invalide.");
                    return;
                  }
                  if (password.length < 8) {
                    setFormError("Le mot de passe doit contenir au moins 8 caractères.");
                    return;
                  }
                  if (password !== passwordConfirm) {
                    setFormError("Les 2 mots de passe ne sont pas identiques.");
                    return;
                  }
                  setFormError("");
                  setStep(2);
                }}
                error={formError}
              />
            ) : null}

            {step === 2 ? (
              <ProfileStep
                firstName={firstName}
                lastName={lastName}
                phone={phone}
                city={city}
                coachingSince={coachingSince}
                herbalifeId={herbalifeId}
                avatarUrl={avatarUrl}
                avatarUploading={avatarUploading}
                submitting={submitting}
                error={formError}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onPhoneChange={setPhone}
                onCityChange={setCity}
                onCoachingSinceChange={setCoachingSince}
                onHerbalifeIdChange={setHerbalifeId}
                onUploadAvatar={handleUploadAvatar}
                onRemoveAvatar={() => setAvatarUrl(null)}
                onBack={() => setStep(1)}
                onSubmit={() => void handleSubmit()}
              />
            ) : null}

            {step === 3 ? (
              <RankStep
                firstName={firstName}
                rank={currentRank}
                onChange={setCurrentRank}
                onContinue={() => setStep(4)}
              />
            ) : null}

            {step === 4 ? (
              <AmbitionStep
                rank={currentRank}
                revenue={revenueTarget}
                basket={averageBasket}
                deadline={deadline}
                breakdown={flexBreakdown}
                onRevenueChange={setRevenueTarget}
                onBasketChange={setAverageBasket}
                onDeadlineChange={setDeadline}
                onBack={() => setStep(3)}
                submitting={submitting}
                error={formError}
                onSubmit={() => void handleFinishOnboarding()}
              />
            ) : null}

            {step === 5 ? (
              <InstallStep
                onEnter={() => navigate(`/co-pilote?welcome=distri`, { replace: true })}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Étape 5 : installe l'app (PWA) ────────────────────────────────────────
function InstallStep({ onEnter }: { onEnter: () => void }) {
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <span
          className="distri-eyebrow"
          style={{
            display: "inline-block",
            padding: "5px 11px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--dw-lime) 14%, transparent)",
            color: "var(--dw-lime)",
          }}
        >
          Dernière étape
        </span>
        <p className="distri-title" style={{ fontSize: 30, marginTop: 14, marginBottom: 10 }}>
          Installe l&apos;app 📲
        </p>
        <p style={{ fontSize: 14.5, color: "var(--dw-muted)", lineHeight: 1.6 }}>
          Ajoute La Base 360 à ton écran d&apos;accueil : tu l&apos;ouvres en 1 tap (comme
          WhatsApp) et tu reçois tes notifs — RDV, rappels, plan du jour.
        </p>
      </div>

      <div
        style={{
          padding: 18,
          borderRadius: 14,
          background: "var(--dw-card-2)",
          border: "1px solid var(--dw-border)",
          marginBottom: 18,
          color: "var(--dw-text)",
        }}
      >
        <InstallPwaInstructions
          accent="var(--dw-lime)"
          accentBg="color-mix(in srgb, var(--dw-lime) 14%, transparent)"
        />
      </div>

      <PrimaryButton onClick={onEnter}>Entrer dans mon espace →</PrimaryButton>

      <p style={{ textAlign: "center", fontSize: 11, color: "var(--dw-dim)", marginTop: 14 }}>
        Tu pourras réinstaller l&apos;app plus tard depuis tes{" "}
        <strong style={{ color: "var(--dw-muted)" }}>Paramètres</strong>.
      </p>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24 }}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const isActive = step === i;
        const isDone = step > i;
        return (
          <div
            key={i}
            style={{
              width: isActive ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: isActive
                ? "var(--dw-lime)"
                : isDone
                  ? "color-mix(in srgb, var(--dw-lime) 45%, transparent)"
                  : "rgba(255,255,255,0.14)",
              transition: "all 0.25s",
            }}
          />
        );
      })}
    </div>
  );
}

function InvalidCard({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>😕</div>
      <p className="distri-title" style={{ fontSize: 26, marginBottom: 10 }}>
        Lien non valide
      </p>
      <p style={{ fontSize: 14, color: "var(--dw-muted)", lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}

function WelcomeStep({
  firstName,
  sponsorFirstName,
  onContinue,
}: {
  firstName: string;
  sponsorFirstName: string;
  onContinue: () => void;
}) {
  const displayName = firstName || "nouveau distributeur";
  const roadmap = [
    { ico: "🔑", t: "Ton accès", d: "Compte + profil, en 2 min." },
    { ico: "🎯", t: "Ton objectif", d: "Ton revenu cible → ton plan d'action auto." },
    { ico: "📲", t: "L'app sur ton tél", d: "Installe-la comme une vraie appli." },
    { ico: "🚀", t: "Tes 3 premières actions", d: "Ta Salle des Opérations t'attend." },
  ];
  return (
    <div style={{ textAlign: "center" }}>
      <span
        className="distri-eyebrow"
        style={{
          display: "inline-block",
          padding: "5px 11px",
          borderRadius: 999,
          background: "color-mix(in srgb, var(--dw-lime) 14%, transparent)",
          color: "var(--dw-lime)",
          marginBottom: 20,
        }}
      >
        Invitation La Base 360
      </span>
      <p className="distri-title" style={{ fontSize: 34, marginBottom: 12 }}>
        Bienvenue<br />{displayName} 👋
      </p>
      <p style={{ fontSize: 15, color: "var(--dw-muted)", lineHeight: 1.6, marginBottom: 22 }}>
        <strong style={{ color: "var(--dw-text)" }}>{sponsorFirstName}</strong> t'invite dans
        La Base 360 — l'app qui te guide pas à pas pour lancer ton activité. Voici ce qu'on
        va faire ensemble :
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, textAlign: "left" }}>
        {roadmap.map((r, i) => (
          <div
            key={r.t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 13px",
              borderRadius: 12,
              background: "var(--dw-card-2)",
              border: "1px solid var(--dw-border)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 17,
                background: "color-mix(in srgb, var(--dw-lime) 12%, transparent)",
              }}
            >
              {r.ico}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--dw-text)" }}>
                {r.t}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--dw-muted)", marginTop: 1 }}>
                {r.d}
              </span>
            </span>
            <span
              className="distri-eyebrow"
              aria-hidden="true"
              style={{ color: "var(--dw-dim)", flexShrink: 0 }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onContinue}>C'est parti 🚀</PrimaryButton>

      <p style={{ fontSize: 11, color: "var(--dw-dim)", marginTop: 18 }}>
        Déjà inscrit ?{" "}
        <a href="/login" style={{ color: "var(--dw-lime)", textDecoration: "none", fontWeight: 600 }}>
          Se connecter
        </a>
      </p>
    </div>
  );
}

function PasswordStep({
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  email,
  onEmailChange,
  showEmailField,
  onBack,
  onContinue,
  error,
}: {
  password: string;
  passwordConfirm: string;
  onPasswordChange: (v: string) => void;
  onPasswordConfirmChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  showEmailField: boolean;
  onBack: () => void;
  onContinue: () => void;
  error: string;
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: "'Anton', 'Syne', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--dw-text)",
          margin: 0,
          marginBottom: 6,
        }}
      >
        {showEmailField ? "Ton email et ton mot de passe" : "Choisis ton mot de passe"}
      </p>
      <p style={{ fontSize: 13, color: "var(--dw-muted)", marginBottom: 20, lineHeight: 1.55 }}>
        {showEmailField
          ? "Ils te serviront à te connecter. Minimum 8 caractères pour le mot de passe."
          : "Il te servira à te connecter. Minimum 8 caractères — garde-le en sécurité."}
      </p>

      {showEmailField ? (
        <LargeField label="Ton adresse email">
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="prenom.nom@exemple.com"
            autoComplete="email"
            style={inputStyle}
          />
        </LargeField>
      ) : null}

      <LargeField label="Mot de passe">
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Au moins 8 caractères"
          autoComplete="new-password"
          style={inputStyle}
        />
      </LargeField>
      <LargeField label="Confirme ton mot de passe">
        <input
          type="password"
          value={passwordConfirm}
          onChange={(e) => onPasswordConfirmChange(e.target.value)}
          placeholder="Retape le même"
          autoComplete="new-password"
          style={inputStyle}
        />
      </LargeField>

      {error ? <ErrorBanner message={error} /> : null}

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <SecondaryButton onClick={onBack}>Retour</SecondaryButton>
        <PrimaryButton onClick={onContinue} stretch>
          Continuer
        </PrimaryButton>
      </div>
    </div>
  );
}

function ProfileStep({
  firstName,
  lastName,
  phone,
  city,
  coachingSince,
  herbalifeId,
  avatarUrl,
  avatarUploading,
  submitting,
  error,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onCityChange,
  onCoachingSinceChange,
  onHerbalifeIdChange,
  onUploadAvatar,
  onRemoveAvatar,
  onBack,
  onSubmit,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  coachingSince: string;
  herbalifeId: string;
  avatarUrl: string | null;
  avatarUploading: boolean;
  submitting: boolean;
  error: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onCoachingSinceChange: (v: string) => void;
  onHerbalifeIdChange: (v: string) => void;
  onUploadAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <p
        style={{
          fontFamily: "'Anton', 'Syne', sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "var(--dw-text)",
          margin: 0,
          marginBottom: 6,
        }}
      >
        Ton profil distributeur
      </p>
      <p style={{ fontSize: 13, color: "var(--dw-muted)", marginBottom: 20, lineHeight: 1.55 }}>
        Ces infos permettent à ton parrain de te retrouver facilement. La photo
        est optionnelle.
      </p>

      {/* Upload photo */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <AvatarUpload
          avatarUrl={avatarUrl}
          uploading={avatarUploading}
          onUpload={onUploadAvatar}
          onRemove={onRemoveAvatar}
        />
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <LargeField label="Prénom">
          <input
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="Prénom"
            style={inputStyle}
          />
        </LargeField>
        <LargeField label="Nom">
          <input
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="Nom"
            style={inputStyle}
          />
        </LargeField>
      </div>
      <LargeField label="Téléphone">
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="06 12 34 56 78"
          style={inputStyle}
        />
      </LargeField>
      <LargeField label="Ville">
        <input
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          placeholder="Verdun, Paris…"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: "var(--dw-muted)", marginTop: 4 }}>
          Sert à la météo de ton Co-pilote et au badge sur ta page bilan online.
        </div>
      </LargeField>
      <LargeField label="Coach Herbalife depuis (optionnel)">
        <input
          type="date"
          value={coachingSince}
          max={todayStr}
          onChange={(e) => onCoachingSinceChange(e.target.value)}
          style={{ ...inputStyle, colorScheme: "light" }}
        />
        <div style={{ fontSize: 11, color: "var(--dw-muted)", marginTop: 4 }}>
          Ta vraie date de début Herbalife (pas la date d'aujourd'hui). Affichée comme badge ancienneté sur ta page bilan online. Modifiable plus tard dans Paramètres.
        </div>
      </LargeField>
      <LargeField label="ID Herbalife">
        <input
          value={herbalifeId}
          onChange={(e) => onHerbalifeIdChange(e.target.value)}
          placeholder="Ton identifiant Herbalife officiel"
          style={inputStyle}
        />
      </LargeField>

      {error ? <ErrorBanner message={error} /> : null}

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <SecondaryButton onClick={onBack}>Retour</SecondaryButton>
        <PrimaryButton onClick={onSubmit} disabled={submitting} stretch>
          {submitting ? "Création…" : "Finaliser mon inscription"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function AvatarUpload({
  avatarUrl,
  uploading,
  onUpload,
  onRemove,
}: {
  avatarUrl: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <label
      style={{
        position: "relative",
        width: 120,
        height: 120,
        borderRadius: "50%",
        border: avatarUrl ? "3px solid var(--dw-lime)" : "2px dashed rgba(0,0,0,0.2)",
        background: avatarUrl ? "transparent" : "var(--dw-card-2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: uploading ? "wait" : "pointer",
        overflow: "hidden",
      }}
    >
      {avatarUrl ? (
        <>
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Retirer la photo"
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.6)",
              color: "#FFFFFF",
              cursor: "pointer",
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </>
      ) : (
        <div style={{ textAlign: "center", color: "var(--dw-dim)" }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
          <div style={{ fontSize: 11, fontWeight: 500 }}>
            {uploading ? "Envoi…" : "Ajouter une photo"}
          </div>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
        disabled={uploading}
        style={{ display: "none" }}
      />
    </label>
  );
}

function LargeField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
      <span
        className="distri-eyebrow"
        style={{ color: "var(--dw-muted)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      style={{
        marginTop: 12,
        padding: "10px 12px",
        borderRadius: 10,
        background: "rgba(251,113,133,0.12)",
        color: "#FCA5A5",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {message}
    </p>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  stretch,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  stretch?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: stretch ? 1 : undefined,
        width: stretch ? undefined : "100%",
        padding: "14px 20px",
        borderRadius: 12,
        background: disabled ? "rgba(197,248,42,0.22)" : "var(--dw-lime)",
        color: disabled ? "var(--dw-dim)" : "#0a0c0a",
        border: "none",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 0.2,
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : "0 4px 16px rgba(197,248,42,0.28)",
        transition: "transform 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "14px 18px",
        borderRadius: 12,
        background: "var(--dw-card-2)",
        color: "var(--dw-muted)",
        border: "1px solid var(--dw-border)",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--dw-border)",
  background: "var(--dw-card-2)",
  fontSize: 15,
  fontFamily: "DM Sans, sans-serif",
  color: "var(--dw-text)",
  outline: "none",
  boxSizing: "border-box",
};

// ─── FLEX V3 Option A — RankStep + AmbitionStep ─────────────────────────────

function RankStep({
  firstName,
  rank,
  onChange,
  onContinue,
}: {
  firstName: string;
  rank: HerbalifeRank;
  onChange: (r: HerbalifeRank) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--dw-lime)", marginBottom: 8, fontFamily: "DM Sans, sans-serif" }}>
        Étape 4 sur 5 · Plan marketing Herbalife
      </div>
      <h2 style={{ fontFamily: "'Anton', 'Syne', sans-serif", fontSize: 26, color: "var(--dw-text)", margin: 0, fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.01em" }}>
        Quel est ton statut, {firstName || "toi"} ?
      </h2>
      <p style={{ margin: "10px 0 22px 0", fontSize: 14, color: "var(--dw-muted)", lineHeight: 1.55, fontFamily: "DM Sans, sans-serif" }}>
        Ton rang Herbalife détermine ta marge retail (25 → 50 %). On l'utilise
        ensuite pour calibrer tes objectifs réalistes. Tu peux le changer
        plus tard dans Paramètres.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {RANK_LIST.map((r) => {
          const active = rank === r;
          const margin = Math.round((RANK_MARGINS[r] ?? 0) * 100);
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              style={{
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: 12,
                border: active ? "2px solid var(--dw-lime)" : "1px solid rgba(0,0,0,0.1)",
                background: active ? "color-mix(in srgb, var(--dw-lime) 10%, transparent)" : "var(--dw-card-2)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "DM Sans, sans-serif",
                color: "var(--dw-text)",
                fontSize: 14,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontWeight: active ? 600 : 400 }}>{RANK_LABELS[r]}</span>
              <span style={{ fontFamily: "'Anton', 'Syne', sans-serif", fontWeight: 700, color: active ? "var(--dw-lime)" : "var(--dw-muted)" }}>
                {margin}%
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onContinue}
        style={{
          marginTop: 22,
          width: "100%",
          padding: "14px 20px",
          borderRadius: 12,
          border: "none",
          background: "linear-gradient(135deg, var(--dw-lime), var(--dw-lime-dk))",
          color: "#fff",
          fontFamily: "'Anton', 'Syne', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Suivant — mes ambitions →
      </button>
    </div>
  );
}

function AmbitionStep({
  rank,
  revenue,
  basket,
  deadline,
  breakdown,
  onRevenueChange,
  onBasketChange,
  onDeadlineChange,
  onBack,
  submitting,
  error,
  onSubmit,
}: {
  rank: HerbalifeRank;
  revenue: number;
  basket: number;
  deadline: string;
  breakdown: ReturnType<typeof computeFlexTargets>;
  onRevenueChange: (v: number) => void;
  onBasketChange: (v: number) => void;
  onDeadlineChange: (v: string) => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--dw-teal)", marginBottom: 8, fontFamily: "DM Sans, sans-serif" }}>
        Étape 5 sur 5 · Tes ambitions
      </div>
      <h2 style={{ fontFamily: "'Anton', 'Syne', sans-serif", fontSize: 26, color: "var(--dw-text)", margin: 0, fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.01em" }}>
        On pose ton plan d'action 🚀
      </h2>
      <p style={{ margin: "10px 0 20px 0", fontSize: 14, color: "var(--dw-muted)", lineHeight: 1.55, fontFamily: "DM Sans, sans-serif" }}>
        Avec ton rang <strong>{RANK_LABELS[rank]}</strong>, tu gagnes{" "}
        <strong style={{ color: "var(--dw-lime)" }}>{breakdown.net_per_client.toFixed(2)} € net</strong> par client.
        Calibrons ensemble tes cibles quotidiennes.
      </p>

      {/* Revenu mensuel */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--dw-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "DM Sans, sans-serif" }}>
            Objectif revenu mensuel
          </span>
        </div>
        <div style={{ fontFamily: "'Anton', 'Syne', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--dw-lime)", textAlign: "center", marginBottom: 8 }}>
          {revenue.toLocaleString("fr-FR")} €
        </div>
        <input
          type="range"
          min={100}
          max={5000}
          step={50}
          value={revenue}
          onChange={(e) => onRevenueChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--dw-lime)" }}
        />
      </div>

      {/* Panier moyen */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--dw-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "DM Sans, sans-serif" }}>
            Panier moyen client (retail)
          </span>
        </div>
        <div style={{ fontFamily: "'Anton', 'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: "var(--dw-teal)", textAlign: "center", marginBottom: 8 }}>
          {basket} €
        </div>
        <input
          type="range"
          min={50}
          max={500}
          step={5}
          value={basket}
          onChange={(e) => onBasketChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--dw-teal)" }}
        />
      </div>

      {/* Deadline */}
      <div style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 12, color: "var(--dw-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "DM Sans, sans-serif", display: "block", marginBottom: 8 }}>
          Date d'objectif
        </span>
        <input
          type="date"
          value={deadline}
          min={ymdInDays(14)}
          max={ymdInDays(365)}
          onChange={(e) => onDeadlineChange(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "var(--dw-card-2)",
            fontSize: 15,
            fontFamily: "DM Sans, sans-serif",
            color: "var(--dw-text)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Summary cibles */}
      <div
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--dw-lime) 0.0800%, transparent), rgba(15,110,86,0.08))",
          border: "1px solid var(--dw-lime)",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--dw-lime)", marginBottom: 10, fontFamily: "DM Sans, sans-serif" }}>
          Tes cibles quotidiennes calculées
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <Tile label="Invit / jour" value={breakdown.daily_invitations_target} />
          <Tile label="Conv / jour" value={breakdown.daily_conversations_target} />
          <Tile label="Bilans / sem" value={breakdown.weekly_bilans_target} />
          <Tile label="Clos / sem" value={breakdown.weekly_closings_target} />
        </div>
        <p style={{ margin: "10px 0 0 0", fontSize: 11, color: "var(--dw-muted)", fontFamily: "DM Sans, sans-serif", textAlign: "center" }}>
          ~{breakdown.needed_new_clients_per_month} nouveaux clients / mois
        </p>
      </div>

      {error && (
        <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 12, fontFamily: "DM Sans, sans-serif" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "transparent",
            color: "var(--dw-muted)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          ← Retour
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          style={{
            flex: 1,
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            background: submitting
              ? "rgba(255,255,255,0.14)"
              : "linear-gradient(135deg, var(--dw-lime), var(--dw-lime-dk))",
            color: "#fff",
            fontFamily: "'Anton', 'Syne', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          {submitting ? "Création de ton plan…" : "🚀 Lancer mon aventure"}
        </button>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "'Anton', 'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--dw-text)" }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: "var(--dw-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2, fontFamily: "DM Sans, sans-serif" }}>
        {label}
      </div>
    </div>
  );
}
