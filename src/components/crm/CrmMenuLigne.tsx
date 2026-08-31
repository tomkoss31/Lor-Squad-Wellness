// =============================================================================
// CrmMenuLigne — le « ⋯ » d'une ligne : tout ce qui n'est pas joindre.
//
// La ligne porte les deux gestes du métier (Appeler, Écrire) écrits en toutes
// lettres. Le reste vit ici, à un tap : caler un rendez-vous, qualifier,
// endormir, supprimer, ouvrir la fiche complète.
//
// Pourquoi une feuille et pas un menu déroulant : sur un téléphone, un menu
// ancré à un bouton finit sous le clavier ou hors écran. La feuille remonte du
// bas, on la ferme d'un tap à côté — c'est déjà le motif de la feuille de
// qualification, on ne réinvente rien.
//
// Elle ne décide de rien : elle propose, l'appelant écrit.
// =============================================================================

import { useEffect } from "react";
import type { CrmLead } from "../../hooks/useCrmLeads";
import { CRM_EDITABLE_SOURCES, CRM_SOURCE_META, type CrmSource } from "../../hooks/useCrmLeads";

interface Props {
  lead: CrmLead;
  onFermer: () => void;
  onQualifier: () => void;
  onCalerRdv: () => void;
  onEndormir: () => void;
  onReveiller: () => void;
  onFiche: () => void;
  onSupprimer?: () => void;
  /** Corriger la provenance. C'était la seule fonction de l'ancienne liste qui
   *  n'existait nulle part ailleurs — elle aurait disparu en silence. */
  onSource?: (s: CrmSource) => void;
}

export function CrmMenuLigne({
  lead, onFermer, onQualifier, onCalerRdv, onEndormir, onReveiller, onFiche, onSupprimer, onSource,
}: Props) {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const nom = `${lead.firstName} ${lead.lastName ?? ""}`.trim();

  return (
    <div style={voile} onClick={onFermer} role="presentation">
      <div
        style={feuille}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Actions pour ${nom}`}
      >
        <div style={poignee} aria-hidden="true" />
        <p style={titre}>{nom}</p>

        <button type="button" style={action} onClick={onQualifier}>
          🎯 <span>Et alors ? — dire ce qui s'est passé</span>
        </button>
        <button type="button" style={action} onClick={onCalerRdv}>
          📅 <span>Caler un rendez-vous</span>
        </button>
        <button type="button" style={action} onClick={onFiche}>
          ↗ <span>Ouvrir la fiche complète</span>
        </button>
        {lead.dormant ? (
          <button type="button" style={action} onClick={onReveiller}>
            ☀️ <span>Réveiller</span>
          </button>
        ) : (
          <button type="button" style={action} onClick={onEndormir}>
            💤 <span>Mettre de côté</span>
          </button>
        )}
        {onSupprimer && (
          <button type="button" style={{ ...action, color: "var(--ls-coral)" }} onClick={onSupprimer}>
            🗑 <span>Supprimer</span>
          </button>
        )}

        {onSource && (
          <label style={{ ...action, cursor: "default" }}>
            🏷️
            <span style={{ flex: 1 }}>Provenance</span>
            <select
              value={lead.source}
              onChange={(e) => onSource(e.target.value as CrmSource)}
              aria-label="Changer la provenance"
              style={selecteur}
            >
              {CRM_EDITABLE_SOURCES.map((s) => (
                <option key={s} value={s}>{CRM_SOURCE_META[s].label}</option>
              ))}
            </select>
          </label>
        )}

        <button type="button" style={{ ...action, ...fermer }} onClick={onFermer}>
          Fermer
        </button>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const voile: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  background: "rgba(0,0,0,.55)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
};

const feuille: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border2)",
  borderRadius: "20px 20px 0 0",
  padding: "10px 14px calc(16px + env(safe-area-inset-bottom))",
  maxHeight: "85vh",
  overflowY: "auto",
};

const poignee: React.CSSProperties = {
  width: 40,
  height: 4,
  borderRadius: 999,
  background: "var(--ls-border2)",
  margin: "0 auto 12px",
};

const titre: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 16,
  margin: "0 0 10px 4px",
  color: "var(--ls-text)",
};

const action: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  width: "100%",
  minHeight: 50,
  padding: "0 12px",
  marginBottom: 6,
  borderRadius: 12,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 14.5,
  fontWeight: 600,
  textAlign: "left",
  cursor: "pointer",
};

const selecteur: React.CSSProperties = {
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  border: "1px solid var(--ls-border2)",
  borderRadius: 8,
  padding: "6px 8px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
};

const fermer: React.CSSProperties = {
  background: "transparent",
  justifyContent: "center",
  color: "var(--ls-text-muted)",
  marginTop: 4,
};
