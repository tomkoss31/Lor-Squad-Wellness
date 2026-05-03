// Chantier Paramètres Admin (2026-04-23) — commit 3/7.
//
// Onglet Profil : édition du prénom/nom, affichage email (RO pour V1 —
// changement email = flow Supabase Auth séparé), compteur "X jours avec
// Lor'Squad", bouton changement mot de passe, bouton Sortir.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import { XpProgressCard } from "../../features/gamification/components/XpProgressCard";
import { UserActivityPanel } from "../../features/gamification/components/UserActivityPanel";
import { AvatarUploader } from "./AvatarUploader";
import {
  HERBALIFE_ID_UNIFIED_REGEX,
  HERBALIFE_ID_PATTERN,
  HERBALIFE_ID_HELP,
} from "../../lib/herbalifeId";
import { RANK_LABELS, RANK_ORDER, type HerbalifeRank } from "../../types/domain";
import { RankPinBadge } from "../rank/RankPinBadge";

const RANK_OPTIONS: HerbalifeRank[] = RANK_ORDER;

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ProfilTab() {
  const { currentUser, logout, users } = useAppContext();
  const { push: pushToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.name ?? "");
  const [herbalifeId, setHerbalifeId] = useState(currentUser?.herbalifeId ?? "");
  const [sponsorId, setSponsorId] = useState(currentUser?.sponsorId ?? "");
  const [coachReferentUserId, setCoachReferentUserId] = useState(
    currentUser?.coachReferentUserId ?? "",
  );
  // Objectif PV mensuel (Chantier 2026-04-29). Lu par useCopiloteData pour
  // alimenter la jauge PV. Default 13000 si la colonne est null cote DB.
  const [monthlyPvTarget, setMonthlyPvTarget] = useState(
    typeof currentUser?.monthly_pv_target === "number"
      ? String(currentUser.monthly_pv_target)
      : "13000",
  );
  // Avatar + bio (V2 — 2026-04-30)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatarUrl ?? null);
  const [bio, setBio] = useState(currentUser?.bio ?? "");
  // Rang Herbalife (FLEX rank-aware, 2026-11-05). Détermine la marge retail
  // utilisée pour calculer les cibles FLEX. Modifiable ici par le distri lui-même.
  const [currentRank, setCurrentRank] = useState<HerbalifeRank>(
    (currentUser?.currentRank as HerbalifeRank | undefined) ?? "distributor_25",
  );
  // Travail 3 (2026-04-27) : tous les users actifs sont eligibles, sauf
  // soi-meme. Un distri peut choisir un autre distri (sponsor) comme
  // coach referent.
  const coachOptions = useMemo(
    () => users.filter((u) => u.active && u.id !== currentUser?.id),
    [users, currentUser?.id],
  );

  // Note Mel 2026-04-29 : un client VIP qui devient distri garde son ID 21XY...
  // Donc on accepte les 2 formats officiels (distri 2-1-7 OU vip 2-2-6).
  // Centralise dans src/lib/herbalifeId.ts.
  const HERBALIFE_ID_REGEX = HERBALIFE_ID_UNIFIED_REGEX;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const daysWith = useMemo(
    () => daysSince(currentUser?.createdAt),
    [currentUser?.createdAt],
  );

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSaveProfile() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Le nom ne peut pas être vide.");
      return;
    }
    // Validation ID Herbalife (Travail 1, 2026-04-27) : format reel
    // 2 chiffres + 1 lettre majuscule + 7 chiffres. Vide = OK.
    const herbalifeNormalized = herbalifeId.trim().toUpperCase();
    if (herbalifeNormalized && !HERBALIFE_ID_REGEX.test(herbalifeNormalized)) {
      setError(`Format ID Herbalife invalide. ${HERBALIFE_ID_HELP}`);
      return;
    }
    const sponsorNormalized = sponsorId.trim().toUpperCase();
    if (sponsorNormalized && !HERBALIFE_ID_REGEX.test(sponsorNormalized)) {
      setError(`Format ID sponsor invalide. ${HERBALIFE_ID_HELP}`);
      return;
    }
    // Validation objectif PV : entier positif raisonnable (1000 - 100000).
    const pvTargetNum = Number(monthlyPvTarget);
    if (
      !Number.isFinite(pvTargetNum)
      || !Number.isInteger(pvTargetNum)
      || pvTargetNum < 1000
      || pvTargetNum > 100000
    ) {
      setError("Objectif PV invalide (entre 1000 et 100000).");
      return;
    }
    setSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error: updateErr } = await sb
        .from("users")
        .update({
          name: trimmed,
          herbalife_id: herbalifeNormalized || null,
          sponsor_id: sponsorNormalized || null,
          coach_referent_user_id: coachReferentUserId || null,
          monthly_pv_target: pvTargetNum,
          // V2 (2026-04-30) : bio (avatar_url est save par AvatarUploader directement)
          bio: bio.trim() || null,
          // FLEX rank-aware (2026-11-05) : update rank + set rank_set_at
          // (peut être déjà rempli, on le maintient en sync à chaque save).
          current_rank: currentRank,
          rank_set_at: new Date().toISOString(),
        })
        .eq("id", currentUser!.id);
      if (updateErr) throw new Error(updateErr.message);
      pushToast({
        tone: "success",
        title: "Profil mis à jour",
        message: "Ton nom a été enregistré.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwError(null);
    if (pwNew.length < 6) {
      setPwError("Le nouveau mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("Les 2 nouveaux mots de passe ne sont pas identiques.");
      return;
    }
    setPwSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      // Supabase Auth : updateUser accepte un nouveau password sans re-auth
      // tant que la session est active. Si l'user veut re-auth explicitement,
      // on peut passer par signInWithPassword avant. Pour V1 on garde simple.
      const { error: updateErr } = await sb.auth.updateUser({ password: pwNew });
      if (updateErr) throw new Error(updateErr.message);
      pushToast({
        tone: "success",
        title: "Mot de passe changé",
        message: "Utilise-le lors de ta prochaine connexion.",
      });
      setPwModal(false);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Échec du changement.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="space-y-4">
      {/* Gamification 5 (2026-04-29) : niveau + XP en haut du profil. */}
      <XpProgressCard />

      {/* V2 ProfilTab (2026-04-30) : panel activite (sessions, streak,
          temps passe) inline pour que chaque distri voie ses propres stats
          sans aller dans /team. */}
      {currentUser?.id ? <UserActivityPanel userId={currentUser.id} /> : null}

      <Card className="space-y-5">
        {/* Avatar uploader (V2 — 2026-04-30) */}
        <AvatarUploader
          currentUrl={avatarUrl}
          initials={initials}
          onUploaded={(url) => setAvatarUrl(url)}
          onRemoved={() => setAvatarUrl(null)}
        />

        <div style={{ borderTop: "0.5px dashed var(--ls-border)", paddingTop: 14 }}>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
            {currentUser.name}
          </p>
          <p style={{ fontSize: 12, color: "var(--ls-text-muted)", margin: 0, marginTop: 2 }}>
            {currentUser.role === "admin"
              ? "Administrateur"
              : currentUser.role === "referent"
                ? "Référent"
                : "Distributeur"}
          </p>
        </div>

        {/* Bio (V2 — 2026-04-30) */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--ls-text-muted)",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 6,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Bio courte (max 200 caractères)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            placeholder="Ex: Coach Herbalife passionnée par le bien-être. J'accompagne mes clients depuis 2020..."
            rows={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--ls-surface2)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 12,
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif",
              color: "var(--ls-text)",
              resize: "vertical",
              outline: "none",
              minHeight: 70,
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 50%, transparent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--ls-gold) 14%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--ls-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <div
            style={{
              fontSize: 10.5,
              color: bio.length > 180 ? "var(--ls-coral)" : "var(--ls-text-hint)",
              marginTop: 4,
              fontFamily: "DM Sans, sans-serif",
              textAlign: "right",
            }}
          >
            {bio.length} / 200
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <LabeledField label="Prénom et nom">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              data-tour-id="profile-name"
              className="ls-input"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 14,
                fontFamily: "DM Sans, sans-serif",
                outline: "none",
              }}
            />
          </LabeledField>
          <LabeledField label="Email (lecture seule)">
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
                fontSize: 14,
              }}
            >
              {currentUser.email}
            </div>
          </LabeledField>
          {/* Travail 2 (2026-04-27) : champs herbalife/sponsor/coach
              referent caches pour les admins (Thomas, Mel) — ils n en ont
              pas besoin (ce sont eux les coachs). Affiches pour referents
              et distributors. */}
          {currentUser.role !== "admin" ? (
            <>
              <LabeledField label="Ton ID Herbalife">
                <input
                  value={herbalifeId}
                  onChange={(e) => setHerbalifeId(e.target.value)}
                  disabled={saving}
                  placeholder="21Y0103610"
                  pattern={HERBALIFE_ID_PATTERN}
                  maxLength={10}
                  inputMode="text"
                  autoCapitalize="characters"
                  data-tour-id="profile-herbalife-id"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 14,
                    fontFamily: "DM Sans, sans-serif",
                    outline: "none",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>
                  Format : 2 chiffres + 1 lettre + 7 chiffres (ex : 21Y0103610)
                </div>
              </LabeledField>
              <LabeledField label="ID de ton sponsor Herbalife">
                <input
                  value={sponsorId}
                  onChange={(e) => setSponsorId(e.target.value)}
                  disabled={saving}
                  placeholder="21Y0103610"
                  pattern={HERBALIFE_ID_PATTERN}
                  maxLength={10}
                  inputMode="text"
                  autoCapitalize="characters"
                  data-tour-id="profile-sponsor"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 14,
                    fontFamily: "DM Sans, sans-serif",
                    outline: "none",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>
                  L&apos;identifiant Herbalife de la personne qui t&apos;a parrainé.
                </div>
              </LabeledField>
              <LabeledField label="Ton coach référent">
                <select
                  value={coachReferentUserId}
                  onChange={(e) => setCoachReferentUserId(e.target.value)}
                  disabled={saving}
                  data-tour-id="profile-coach-referent"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 14,
                    fontFamily: "DM Sans, sans-serif",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="">— Aucun —</option>
                  {coachOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.role === "admin"
                        ? " (admin)"
                        : u.role === "referent"
                          ? " (coach)"
                          : ""}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>
                  La personne qui te suit au quotidien dans Lor&apos;Squad. Souvent ton sponsor.
                </div>
              </LabeledField>
            </>
          ) : null}
          <LabeledField label="Rôle">
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
                fontSize: 14,
              }}
            >
              {currentUser.role === "admin"
                ? "Administrateur"
                : currentUser.role === "referent"
                  ? "Référent"
                  : "Distributeur"}
            </div>
          </LabeledField>
          <LabeledField label="Jours avec Lor'Squad">
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 14,
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
              }}
            >
              {daysWith === null ? "—" : `${daysWith} jour${daysWith > 1 ? "s" : ""}`}
            </div>
          </LabeledField>
          {/* Objectif PV mensuel (2026-04-29) — visible pour tous les roles, alimente la jauge Co-pilote. */}
          <LabeledField label="Objectif PV mensuel">
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min={1000}
                max={100000}
                step={500}
                value={monthlyPvTarget}
                onChange={(e) => setMonthlyPvTarget(e.target.value)}
                disabled={saving}
                inputMode="numeric"
                style={{
                  width: "100%",
                  padding: "10px 44px 10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface2)",
                  color: "var(--ls-text)",
                  fontSize: 14,
                  fontFamily: "DM Sans, sans-serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ls-gold)",
                  pointerEvents: "none",
                }}
              >
                PV
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>
              Seuil affiché dans ta jauge Co-pilote. Default 13 000 (Senior Consultant).
            </div>
          </LabeledField>
          {/* FLEX rank-aware (2026-11-05) — rang Herbalife = marge retail
              utilisée pour calculer les cibles FLEX. */}
          <LabeledField label="Rang Herbalife (plan marketing)">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
              <RankPinBadge rank={currentRank} size="lg" glow />
              <div style={{ flex: 1 }}>
                <select
                  value={currentRank}
                  onChange={(e) => setCurrentRank(e.target.value as HerbalifeRank)}
                  disabled={saving}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontSize: 14,
                    fontFamily: "DM Sans, sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                    cursor: saving ? "wait" : "pointer",
                  }}
                >
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {RANK_LABELS[r]}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 4 }}>
                  Détermine ta marge retail (25 → 50 %) utilisée par FLEX pour calibrer tes cibles.
                </div>
              </div>
            </div>
          </LabeledField>
          <LabeledField label="Date d'inscription">
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
                fontSize: 14,
              }}
            >
              {formatDate(currentUser.createdAt)}
            </div>
          </LabeledField>
        </div>

        {error ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(251,113,133,0.12)",
              color: "#FBBFC8",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={() => void handleSaveProfile()} disabled={saving} data-tour-id="profile-save">
            {saving ? "Sauvegarde…" : "Enregistrer les modifications"}
          </Button>
          <Button variant="secondary" onClick={() => setPwModal(true)}>
            Changer mon mot de passe
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Session</p>
        <button
          type="button"
          onClick={() => void handleLogout()}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            background: "#FCEBEB",
            color: "#A32D2D",
            border: "none",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
            fontSize: 14,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sortir
        </button>
      </Card>

      {pwModal ? (
        <PasswordModal
          onClose={() => {
            setPwModal(false);
            setPwCurrent("");
            setPwNew("");
            setPwConfirm("");
            setPwError(null);
          }}
          currentValue={pwCurrent}
          onCurrentChange={setPwCurrent}
          newValue={pwNew}
          onNewChange={setPwNew}
          confirmValue={pwConfirm}
          onConfirmChange={setPwConfirm}
          error={pwError}
          saving={pwSaving}
          onSubmit={() => void handleChangePassword()}
        />
      ) : null}
    </div>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--ls-text-muted)",
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

function PasswordModal({
  onClose,
  currentValue,
  onCurrentChange,
  newValue,
  onNewChange,
  confirmValue,
  onConfirmChange,
  error,
  saving,
  onSubmit,
}: {
  onClose: () => void;
  currentValue: string;
  onCurrentChange: (v: string) => void;
  newValue: string;
  onNewChange: (v: string) => void;
  confirmValue: string;
  onConfirmChange: (v: string) => void;
  error: string | null;
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Changer le mot de passe"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          borderRadius: 18,
          maxWidth: 460,
          width: "100%",
          padding: 24,
          border: "1px solid var(--ls-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: 0,
            marginBottom: 6,
          }}
        >
          Changer mon mot de passe
        </p>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 16 }}>
          Le nouveau mot de passe doit faire au moins 6 caractères.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <LabeledField label="Mot de passe actuel (référence, non vérifié)">
            <input
              type="password"
              value={currentValue}
              onChange={(e) => onCurrentChange(e.target.value)}
              disabled={saving}
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </LabeledField>
          <LabeledField label="Nouveau mot de passe">
            <input
              type="password"
              value={newValue}
              onChange={(e) => onNewChange(e.target.value)}
              disabled={saving}
              autoComplete="new-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </LabeledField>
          <LabeledField label="Confirmation">
            <input
              type="password"
              value={confirmValue}
              onChange={(e) => onConfirmChange(e.target.value)}
              disabled={saving}
              autoComplete="new-password"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--ls-border)",
                background: "var(--ls-surface2)",
                color: "var(--ls-text)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </LabeledField>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(251,113,133,0.12)",
              color: "#FBBFC8",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={onSubmit} disabled={saving || !newValue || !confirmValue}>
            {saving ? "Mise à jour…" : "Changer le mot de passe"}
          </Button>
        </div>
      </div>
    </div>
  );
}
