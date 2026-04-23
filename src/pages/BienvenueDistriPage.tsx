// Chantier Onboarding distributeur complet (2026-04-24) — commit 3/4.
//
// Route publique /bienvenue-distri?token=XYZ.
// Wizard 3 étapes (Welcome / Password / Profil) pour un nouveau
// distributeur invité par son parrain.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";

type Step = 0 | 1 | 2;

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
  const [herbalifeId, setHerbalifeId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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
          herbalife_id: herbalifeId.trim(),
          avatar_url: avatarUrl,
        },
      });

      if (error || !data?.success) {
        const msg =
          (data?.error as string | undefined) ??
          error?.message ??
          "Impossible de créer ton accès.";
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
      navigate(`/co-pilote?welcome=distri`, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setSubmitting(false);
    }
  }, [
    avatarUrl,
    city,
    firstName,
    herbalifeId,
    lastName,
    navigate,
    password,
    passwordConfirm,
    phone,
    token,
    validation,
  ]);

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <div className="distri-root">
      {/* Chantier Premium Onboarding distri (2026-04-24) */}
      <style>{`
        .distri-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: #0A0D0F;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 20px;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
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
          background: radial-gradient(circle, #EF9F27 0%, transparent 70%);
          opacity: 0.34;
          animation: distri-float-1 32s ease-in-out infinite alternate;
        }
        .distri-blob-teal {
          bottom: -18%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #1D9E75 0%, transparent 70%);
          opacity: 0.3;
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
          opacity: 0.06;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        .distri-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          border-radius: 22px;
          padding: 32px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45), 0 4px 16px rgba(239, 159, 39, 0.1);
          border: 1px solid rgba(239, 159, 39, 0.18);
          animation: distri-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
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
          <p style={{ textAlign: "center", color: "#6B7280", fontSize: 14 }}>
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
                herbalifeId={herbalifeId}
                avatarUrl={avatarUrl}
                avatarUploading={avatarUploading}
                submitting={submitting}
                error={formError}
                onFirstNameChange={setFirstName}
                onLastNameChange={setLastName}
                onPhoneChange={setPhone}
                onCityChange={setCity}
                onHerbalifeIdChange={setHerbalifeId}
                onUploadAvatar={handleUploadAvatar}
                onRemoveAvatar={() => setAvatarUrl(null)}
                onBack={() => setStep(1)}
                onSubmit={() => void handleSubmit()}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24 }}>
      {[0, 1, 2].map((i) => {
        const isActive = step === i;
        const isDone = step > i;
        return (
          <div
            key={i}
            style={{
              width: isActive ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: isActive ? "#BA7517" : isDone ? "#0F6E56" : "rgba(0,0,0,0.15)",
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
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#111827",
          marginBottom: 10,
        }}
      >
        Lien non valide
      </p>
      <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>{message}</p>
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
  return (
    <div style={{ textAlign: "center" }}>
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 8,
          background: "rgba(201,168,76,0.12)",
          color: "#BA7517",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 20,
        }}
      >
        Invitation Lor'Squad Wellness
      </span>
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "#111827",
          margin: 0,
          marginBottom: 12,
          lineHeight: 1.15,
        }}
      >
        🎉 Bienvenue {displayName} !
      </p>
      <p
        style={{
          fontSize: 15,
          color: "#4B5563",
          lineHeight: 1.65,
          marginBottom: 26,
        }}
      >
        {sponsorFirstName} t'invite à rejoindre Lor'Squad Wellness. On va
        créer ton accès distributeur en 2 minutes.
      </p>

      <PrimaryButton onClick={onContinue}>Créer mon accès</PrimaryButton>

      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 18 }}>
        Déjà inscrit ?{" "}
        <a href="/login" style={{ color: "#BA7517", textDecoration: "none", fontWeight: 600 }}>
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
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#111827",
          margin: 0,
          marginBottom: 6,
        }}
      >
        {showEmailField ? "Ton email et ton mot de passe" : "Choisis ton mot de passe"}
      </p>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 20, lineHeight: 1.55 }}>
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
  herbalifeId,
  avatarUrl,
  avatarUploading,
  submitting,
  error,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onCityChange,
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
  herbalifeId: string;
  avatarUrl: string | null;
  avatarUploading: boolean;
  submitting: boolean;
  error: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onCityChange: (v: string) => void;
  onHerbalifeIdChange: (v: string) => void;
  onUploadAvatar: (file: File) => void;
  onRemoveAvatar: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#111827",
          margin: 0,
          marginBottom: 6,
        }}
      >
        Ton profil distributeur
      </p>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 20, lineHeight: 1.55 }}>
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
        border: avatarUrl ? "3px solid #BA7517" : "2px dashed rgba(0,0,0,0.2)",
        background: avatarUrl ? "transparent" : "#FAFAFA",
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
        <div style={{ textAlign: "center", color: "#9CA3AF" }}>
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
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#4B5563",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}
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
        background: "rgba(220,38,38,0.08)",
        color: "#B91C1C",
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
        background: disabled ? "#D5B880" : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
        color: "#FFFFFF",
        border: "none",
        fontFamily: "Syne, sans-serif",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 0.3,
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : "0 4px 12px rgba(186,117,23,0.3)",
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
        background: "#FFFFFF",
        color: "#6B7280",
        border: "1px solid rgba(0,0,0,0.12)",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 500,
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
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#FAFAFA",
  fontSize: 15,
  fontFamily: "DM Sans, sans-serif",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
};
