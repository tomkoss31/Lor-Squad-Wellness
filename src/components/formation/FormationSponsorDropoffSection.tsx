// =============================================================================
// FormationSponsorDropoffSection — sponsors decrochéss (Phase D)
//
// Liste des sponsors qui ont >=1 recrue en admin_relay (= ils n ont pas
// reagi sous 48h, l admin a pris le relais). Permet d envoyer un rappel
// ferme via WhatsApp / messagerie interne.
// =============================================================================

import type { FormationSponsorDropoff } from "../../features/formation/hooks/useFormationAdminKpis";

interface Props {
  dropoffs: FormationSponsorDropoff[];
}

function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function FormationSponsorDropoffSection({ dropoffs }: Props) {
  if (dropoffs.length === 0) {
    return (
      <div
        style={{
          padding: "14px 16px",
          background: "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface))",
          border: "0.5px dashed color-mix(in srgb, var(--ls-teal) 30%, transparent)",
          borderRadius: 14,
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          fontFamily: "DM Sans, sans-serif",
          lineHeight: 1.5,
        }}
      >
        🌿 Tous les sponsors sont à jour — personne n'est décroché.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {dropoffs.map((d) => (
        <div
          key={d.sponsor_id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderLeft: "3px solid var(--ls-coral)",
            borderRadius: 12,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--ls-coral) 0%, color-mix(in srgb, var(--ls-coral) 70%, #000) 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 13,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {getInitials(d.sponsor_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 14,
                color: "var(--ls-text)",
                letterSpacing: "-0.01em",
              }}
            >
              {d.sponsor_name}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 1 }}>
              {d.stuck_count} recrue{d.stuck_count > 1 ? "s" : ""} bloquée{d.stuck_count > 1 ? "s" : ""} ·
              plus ancienne le {formatDateShort(d.oldest_pending)}
            </div>
          </div>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "color-mix(in srgb, var(--ls-coral) 14%, transparent)",
              color: "var(--ls-coral)",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {d.stuck_count}
          </span>
        </div>
      ))}
    </div>
  );
}
