// =============================================================================
// PassiveSupervisorInviteModal — chantier V2 Passive Supervisor 2026-05-22
//
// Modale admin pour créer un distri Supervisor passif avec magic link
// read-only. Cas Aurélie : Supervisor qui ne fait pas le business, on lui
// donne juste accès à sa rentab perso via /distri-passif?token=…
//
// Restriction back : Supervisor+ uniquement (50% — pas pertinent pour <50%).
// =============================================================================

import { useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useAppContext } from "../../context/AppContext";
import { createSupabasePassiveSupervisor } from "../../services/supabaseService";
import { RANK_LABELS, type HerbalifeRank } from "../../types/domain";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Seuls les Supervisor+ peuvent être passifs (la fonction back contraint déjà)
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

function buildWhatsAppUrl(firstName: string, magicLink: string): string {
  const msg = `Salut ${firstName} ! Voici ton lien personnel pour suivre ta rentabilité Herbalife sur La Base 360 : ${magicLink} — Lien privé, ne pas partager.`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function PassiveSupervisorInviteModal({ open, onClose }: Props) {
  const { push: pushToast } = useToast();
  const { currentUser, users } = useAppContext();
  const [name, setName] = useState("");
  const [rank, setRank] = useState<HerbalifeRank>("supervisor_50");
  const [sponsorId, setSponsorId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ magicLink: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setRank("supervisor_50");
      setSponsorId("");
      setPhone("");
      setSubmitting(false);
      setResult(null);
      setCopied(false);
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
      pushToast({ tone: "warning", title: "Nom requis (≥ 2 caractères)." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSupabasePassiveSupervisor({
        name: name.trim(),
        currentRank: rank,
        sponsorId: sponsorId || currentUser?.id || null,
      });
      if (res.ok) {
        // L'API renvoie soit /distri-passif?token=… (relatif) soit une URL
        // complète. On normalise pour toujours afficher une URL absolue
        // copiable telle quelle.
        const fullLink = res.magicLink.startsWith("http")
          ? res.magicLink
          : `${window.location.origin}${res.magicLink}`;
        setResult({ magicLink: fullLink, name: name.trim() });
        pushToast({ tone: "success", title: `${name.trim()} créé. Magic link prêt.` });
      } else {
        pushToast({ tone: "error", title: res.error });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      pushToast({ tone: "success", title: "Lien copié." });
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
        background: "rgba(0,0,0,0.55)",
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
          borderRadius: 18,
          width: "100%",
          maxWidth: 480,
          padding: 24,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700, margin: 0, color: "var(--ls-text)" }}>
            🔗 Inviter un Supervisor passif
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "transparent", border: "none", color: "var(--ls-text-muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
          Pour les Supervisor qui ne font pas le business mais touchent leurs royalties.
          Ils accèdent en lecture seule à <code style={{ background: "var(--ls-surface2)", padding: "1px 5px", borderRadius: 4, fontSize: 11.5 }}>/distri-passif</code>
          (rentabilité + lignée anonymisée). Pas d'accès clients, ni messagerie, ni Académie en V1.
        </p>

        {!result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Nom complet">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aurélie de Mouttes"
                style={inputStyle}
                disabled={submitting}
              />
            </Field>

            <Field label="Rang Herbalife (Supervisor 50%+)">
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

            <Field label="Sponsor (= toi par défaut)">
              <select
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                style={inputStyle}
                disabled={submitting}
              >
                <option value="">Moi ({currentUser?.name ?? "—"})</option>
                {users.filter((u) => u.id !== currentUser?.id).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.isExternal ? " (externe)" : u.active ? "" : " (inactif)"}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Téléphone (optionnel, pour partage WhatsApp)">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 …"
                style={inputStyle}
                disabled={submitting}
              />
            </Field>

            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting || name.trim().length < 2}
              style={{
                marginTop: 6,
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: submitting ? "var(--ls-surface2)" : "linear-gradient(135deg, var(--ls-teal), var(--ls-purple))",
                color: submitting ? "var(--ls-text-muted)" : "#fff",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Création…" : "Créer + générer magic link"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                padding: 14,
                background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface2))",
                border: "1px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
                Magic link de {result.name}
              </div>
              <code
                style={{
                  display: "block",
                  fontSize: 11.5,
                  color: "var(--ls-text)",
                  wordBreak: "break-all",
                  fontFamily: "Menlo, monospace",
                  lineHeight: 1.5,
                }}
              >
                {result.magicLink}
              </code>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={handleCopy} style={btnSecondaryStyle}>
                {copied ? "✓ Copié" : "📋 Copier le lien"}
              </button>
              <a
                href={buildWhatsAppUrl(result.name.split(" ")[0], result.magicLink)}
                target="_blank"
                rel="noreferrer"
                style={{ ...btnSecondaryStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                💬 Partager WhatsApp
              </a>
            </div>

            <p style={{ fontSize: 11.5, color: "var(--ls-text-muted)", margin: "4px 0 0", lineHeight: 1.55 }}>
              ⚠️ Le lien donne accès <strong>sans mot de passe</strong> à la rentab de ce distri.
              Partage uniquement avec lui/elle. Tu pourras le révoquer dans une V2 (UI à venir).
            </p>

            <button type="button" onClick={onClose} style={{ ...btnSecondaryStyle, marginTop: 4 }}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11.5, color: "var(--ls-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13.5,
  width: "100%",
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
