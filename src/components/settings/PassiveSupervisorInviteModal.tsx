// =============================================================================
// PassiveSupervisorInviteModal — Light V2 (2026-05-22)
//
// Crée un vrai compte distri "passif" avec email + password.
// Le passif se connecte à /connexion comme un distri normal mais voit
// une interface allégée (Co-pilote + Académie + Messagerie + Paramètres,
// pas de fiches clients ni de portefeuille).
//
// Cas d'usage : Aurélie de Mouttes — Supervisor 50% qui ne fait pas le
// business mais veut tracker ses royalties.
// =============================================================================

import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useAppContext } from "../../context/AppContext";
import { createSupabasePassiveSupervisor } from "../../services/supabaseService";
import { RANK_LABELS, type HerbalifeRank } from "../../types/domain";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const PASSIVE_RANKS: HerbalifeRank[] = [
  "supervisor_50",
  "active_supervisor_50",
  "world_team_50",
  "active_world_team_50",
  "get_team_50",
  "get_team_2500_50",
  "millionaire_50",
  "millionaire_7500_50",
  "presidents_50",
];

function buildWhatsAppShare(firstName: string, email: string, password: string, loginUrl: string): string {
  const msg = [
    `Salut ${firstName} ! 👋`,
    ``,
    `Tes identifiants pour suivre ta rentabilité Herbalife sur *La Base 360* :`,
    ``,
    `🔗 Connexion : ${loginUrl}`,
    `📧 Email : ${email}`,
    `🔑 Mot de passe : ${password}`,
    ``,
    `Tu peux changer ton mot de passe dans Paramètres après ta première connexion. À bientôt 💪`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function PassiveSupervisorInviteModal({ open, onClose, onCreated }: Props) {
  const { push: pushToast } = useToast();
  const { currentUser, users } = useAppContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rank, setRank] = useState<HerbalifeRank>("supervisor_50");
  const [sponsorId, setSponsorId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    name: string;
    email: string;
    password: string;
    loginUrl: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setRank("supervisor_50");
      setSponsorId("");
      setSubmitting(false);
      setResult(null);
      setCopiedField(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      pushToast({ tone: "warning", title: "Nom complet requis (≥ 2 caractères)." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      pushToast({ tone: "warning", title: "Email valide requis." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSupabasePassiveSupervisor({
        name: name.trim(),
        email: email.trim(),
        currentRank: rank,
        sponsorId: sponsorId || currentUser?.id || null,
      });
      if (res.ok) {
        setResult({
          name: name.trim(),
          email: res.email,
          password: res.password,
          loginUrl: res.loginUrl,
        });
        pushToast({ tone: "success", title: `${name.trim()} créé. Identifiants prêts à partager.` });
        onCreated?.();
      } else {
        pushToast({ tone: "error", title: res.error });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      pushToast({ tone: "success", title: "Copié." });
    } catch {
      pushToast({ tone: "error", title: "Impossible de copier." });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 22,
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 0,
          fontFamily: "DM Sans, sans-serif",
          boxShadow: "0 24px 60px -12px rgba(0,0,0,0.45)",
          position: "relative",
        }}
      >
        {/* Hero gradient header */}
        <div
          style={{
            padding: "24px 26px 18px",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 18%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-purple) 14%, var(--ls-surface)) 100%)",
            borderRadius: "22px 22px 0 0",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative orb */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--ls-gold) 30%, transparent) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              position: "absolute",
              top: 14,
              right: 16,
              background: "transparent",
              border: "none",
              color: "var(--ls-text-muted)",
              fontSize: 22,
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
          <div style={{ fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ls-gold)", fontWeight: 700, marginBottom: 6 }}>
            ✨ Distri Light · Supervisor passif
          </div>
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontStyle: "italic",
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              color: "var(--ls-text)",
              lineHeight: 1.2,
            }}
          >
            {result ? "Identifiants prêts" : "Inviter un Supervisor passif"}
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "8px 0 0", lineHeight: 1.5 }}>
            {result
              ? "Copie ces infos et envoie-les via WhatsApp. Le compte est actif immédiatement."
              : "Pour un Supervisor 50%+ qui ne fait pas le business mais veut suivre sa rentab perso (cas Aurélie). Compte allégé : pas de clients, juste sa rentab + son équipe + messagerie."}
          </p>
        </div>

        <div style={{ padding: "22px 26px 24px" }}>
          {!result ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nom complet" hint="ex. Aurélie de Mouttes">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aurélie de Mouttes"
                  style={inputStyle}
                  disabled={submitting}
                  maxLength={80}
                />
              </Field>

              <Field label="Email" hint="Sera son identifiant de connexion. Email réel obligatoire.">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aurelie@exemple.fr"
                  style={inputStyle}
                  disabled={submitting}
                  maxLength={100}
                />
              </Field>

              <Field label="Rang Herbalife" hint="Supervisor 50% minimum (pour calcul royalties)">
                <select
                  value={rank}
                  onChange={(e) => setRank(e.target.value as HerbalifeRank)}
                  style={inputStyle}
                  disabled={submitting}
                >
                  {PASSIVE_RANKS.map((r) => (
                    <option key={r} value={r}>{RANK_LABELS[r]}</option>
                  ))}
                </select>
              </Field>

              <Field label="Sponsor" hint="Toi par défaut (utilisé pour la remontée d'override)">
                <select
                  value={sponsorId}
                  onChange={(e) => setSponsorId(e.target.value)}
                  style={inputStyle}
                  disabled={submitting}
                >
                  <option value="">Moi · {currentUser?.name ?? "—"}</option>
                  {users.filter((u) => u.id !== currentUser?.id).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}{u.isExternal ? " (externe)" : u.active ? "" : " (inactif)"}
                    </option>
                  ))}
                </select>
              </Field>

              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting || name.trim().length < 2 || !email.trim()}
                style={{
                  marginTop: 6,
                  padding: "13px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: submitting
                    ? "var(--ls-surface2)"
                    : "linear-gradient(135deg, var(--ls-teal), var(--ls-purple))",
                  color: submitting ? "var(--ls-text-muted)" : "#fff",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  letterSpacing: 0.3,
                  boxShadow: submitting ? "none" : "0 8px 20px -8px color-mix(in srgb, var(--ls-teal) 60%, transparent)",
                  transition: "transform .15s ease, box-shadow .15s ease",
                }}
              >
                {submitting ? "Création en cours…" : "✨ Créer le compte"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <CredentialRow
                label="Lien de connexion"
                value={result.loginUrl}
                accent="gold"
                copied={copiedField === "loginUrl"}
                onCopy={() => handleCopy(result.loginUrl, "loginUrl")}
              />
              <CredentialRow
                label="Email"
                value={result.email}
                accent="teal"
                copied={copiedField === "email"}
                onCopy={() => handleCopy(result.email, "email")}
              />
              <CredentialRow
                label="Mot de passe"
                value={result.password}
                accent="purple"
                copied={copiedField === "password"}
                onCopy={() => handleCopy(result.password, "password")}
                mono
              />

              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={buildWhatsAppShare(result.name.split(" ")[0], result.email, result.password, result.loginUrl)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    padding: "13px 16px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    color: "#fff",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "none",
                    textAlign: "center",
                    letterSpacing: 0.3,
                    boxShadow: "0 8px 20px -8px rgba(37, 211, 102, 0.4)",
                  }}
                >
                  💬 Partager via WhatsApp
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: "13px 18px",
                    borderRadius: 12,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface2)",
                    color: "var(--ls-text)",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Fermer
                </button>
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding: "12px 14px",
                  background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))",
                  border: "1px solid color-mix(in srgb, var(--ls-gold) 25%, transparent)",
                  borderRadius: 10,
                  fontSize: 11.5,
                  color: "var(--ls-text-muted)",
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: "var(--ls-gold)" }}>⚠️ Note ce mot de passe</strong> — il n'est pas
                récupérable une fois la modale fermée. Le distri pourra le changer après sa première
                connexion via <strong>Paramètres</strong>.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11.5, color: "var(--ls-text-hint)", marginTop: -2 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function CredentialRow({
  label,
  value,
  accent,
  copied,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  accent: "gold" | "teal" | "purple";
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
}) {
  const accentVar = `var(--ls-${accent})`;
  return (
    <div
      style={{
        padding: "12px 14px",
        background: `color-mix(in srgb, ${accentVar} 8%, var(--ls-surface2))`,
        border: `1px solid color-mix(in srgb, ${accentVar} 30%, transparent)`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "var(--ls-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
          {label}
        </div>
        <div
          style={{
            fontFamily: mono ? "Menlo, Monaco, monospace" : "DM Sans, sans-serif",
            fontSize: mono ? 13 : 13.5,
            fontWeight: mono ? 600 : 500,
            color: "var(--ls-text)",
            wordBreak: "break-all",
            lineHeight: 1.4,
          }}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: `1px solid color-mix(in srgb, ${accentVar} 40%, transparent)`,
          background: copied
            ? `color-mix(in srgb, ${accentVar} 30%, transparent)`
            : "var(--ls-surface)",
          color: accentVar,
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all .15s ease",
        }}
      >
        {copied ? "✓ Copié" : "📋 Copier"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 13px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 14,
  width: "100%",
  transition: "border-color .15s ease, box-shadow .15s ease",
};
