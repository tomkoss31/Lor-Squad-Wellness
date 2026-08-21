// =============================================================================
// CrmPanneauLead — le volet lead docké (CRM Board V2, lot 4).
//
// Au clic sur une carte du board, un volet s'ouvre À DROITE (pas en overlay
// par-dessus le board — exigence de la maquette). Il donne le « coup d'œil » :
// score expliqué, coordonnées, gestes rapides. La FICHE COMPLÈTE reste à un
// clic (route /crm/leads/:key, page inchangée) — on ne duplique pas Noaly ni
// les 14 réponses du bilan, qui coûtent cher et vivent déjà là-bas.
//
// ── NAVIGATION ↑ ↓ SANS REFERMER ──────────────────────────────────────────
// On passe d'une carte à la suivante sans fermer le volet — c'est ce qui rend
// une file de leads traitable d'affilée. Les flèches du clavier marchent aussi.
//
// ── CE QUI N'EST PAS DUPLIQUÉ ─────────────────────────────────────────────
// Purement présentationnel. Les écritures (statut, conversion, message) passent
// par les callbacks fournis par CrmPage — qui appelle la MÊME logique que
// partout. Le volet n'invente aucun chemin d'écriture.
// =============================================================================

import { useEffect } from "react";
import type { CrmLead } from "../../hooks/useCrmLeads";
import { computeLeadScore, TEMP_META } from "../../lib/leadScoring";
import { nomAffiche } from "../../features/crm/nomPropre";

interface Props {
  lead: CrmLead;
  /** Position dans la file courante, pour les flèches (1-indexé pour l'affichage). */
  index: number;
  total: number;
  onFermer: () => void;
  /** delta = -1 (précédent) / +1 (suivant). */
  onNaviguer: (delta: number) => void;
  onWhatsApp: (lead: CrmLead) => void;
  onAlors: (lead: CrmLead) => void;
  /** Ouvre la fiche pleine (route existante). */
  onFiche: (lead: CrmLead) => void;
  /** Ouvre la fiche en mode conversion (?convert=1). */
  onConvertir: (lead: CrmLead) => void;
}

const CSS = `
.crm-vol-fond{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.5);display:flex;justify-content:flex-end}
.crm-vol{width:380px;max-width:92vw;height:100%;overflow-y:auto;background:var(--ls-surface);border-left:1px solid var(--ls-border);display:flex;flex-direction:column;font-family:"DM Sans",sans-serif;color:var(--ls-text)}
.crm-vol-tete{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--ls-border);position:sticky;top:0;background:var(--ls-surface);z-index:1}
.crm-vol-nav{display:flex;gap:4px;margin-left:auto}
.crm-vol-nav button,.crm-vol-x{min-width:34px;min-height:34px;border-radius:9px;border:1px solid var(--ls-border);background:var(--ls-surface2);color:var(--ls-text);font-size:14px;cursor:pointer;font-family:inherit}
.crm-vol-corps{padding:16px;display:flex;flex-direction:column;gap:16px}
.crm-vol-nom{font-family:Syne,sans-serif;font-weight:800;font-size:20px}
.crm-vol-sous{font-size:12px;color:var(--ls-text-muted);margin-top:2px}
.crm-vol-eyebrow{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ls-text-muted);font-weight:600;margin-bottom:8px}
.crm-vol-bloc{background:var(--ls-surface2);border:1px solid var(--ls-border);border-radius:14px;padding:13px 14px}
.crm-vol-score{display:flex;align-items:center;gap:14px}
.crm-vol-detail{font-size:11.5px;line-height:1.6;color:color-mix(in srgb,var(--ls-text) 72%,transparent)}
.crm-vol-detail b{color:var(--ls-text)}
.crm-vol-coord{display:flex;flex-direction:column;gap:6px;font-size:13px}
.crm-vol-coord .k{font-size:10.5px;color:var(--ls-text-muted)}
.crm-vol-actions{display:flex;flex-direction:column;gap:8px}
.crm-vol-btn{min-height:44px;border-radius:11px;border:1px solid var(--ls-border);background:var(--ls-surface2);color:var(--ls-text);font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px}
.crm-vol-btn.wa{background:var(--ls-wa,#25D366);color:var(--ls-wa-ink,#04210f);border:0}
.crm-vol-btn.principal{background:color-mix(in srgb,var(--ls-teal) 16%,var(--ls-surface2));border-color:color-mix(in srgb,var(--ls-teal) 40%,transparent)}
`;

/** L'anneau de score : SVG, stroke-dashoffset = part manquante. */
function Anneau({ valeur, couleur }: { valeur: number; couleur: string }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(100, valeur)) / 100);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--ls-border)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={couleur} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontFamily="Syne, sans-serif" fontWeight="800" fontSize="16" fill="var(--ls-text)">{valeur}</text>
    </svg>
  );
}

export function CrmPanneauLead({ lead, index, total, onFermer, onNaviguer, onWhatsApp, onAlors, onFiche, onConvertir }: Props) {
  const { score100, temperature, details } = computeLeadScore(lead);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
      else if (e.key === "ArrowDown") { e.preventDefault(); onNaviguer(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); onNaviguer(-1); }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer, onNaviguer]);

  const sous = [
    typeof lead.bilanAge === "number" ? `${lead.bilanAge} ans` : null,
    lead.city || null,
    lead.viaName ? `via ${lead.viaName}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="crm-vol-fond" onClick={onFermer}>
      <style>{CSS}</style>
      <div className="crm-vol" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Fiche de ${nomAffiche(lead.firstName, lead.lastName)}`}>
        <div className="crm-vol-tete">
          <span className="crm-vol-eyebrow" style={{ margin: 0 }}>{index} / {total}</span>
          <div className="crm-vol-nav">
            <button type="button" aria-label="Précédent" disabled={index <= 1} onClick={() => onNaviguer(-1)}>↑</button>
            <button type="button" aria-label="Suivant" disabled={index >= total} onClick={() => onNaviguer(1)}>↓</button>
            <button type="button" className="crm-vol-x" aria-label="Fermer" onClick={onFermer}>✕</button>
          </div>
        </div>

        <div className="crm-vol-corps">
          <div>
            <div className="crm-vol-nom">{nomAffiche(lead.firstName, lead.lastName)}</div>
            {sous ? <div className="crm-vol-sous">{sous}</div> : null}
          </div>

          {/* Score + son détail auditable. */}
          <div className="crm-vol-bloc">
            <div className="crm-vol-score">
              <Anneau valeur={score100} couleur={TEMP_META[temperature].color} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{TEMP_META[temperature].emoji} {TEMP_META[temperature].label}</div>
                {details.length ? (
                  <div className="crm-vol-detail" style={{ marginTop: 4 }}>
                    {details.map((d) => <span key={d.motif}><b>+{d.points}</b> {d.motif}<br /></span>)}
                  </div>
                ) : (
                  <div className="crm-vol-detail" style={{ marginTop: 4 }}>{lead.rdvLabel ? "rendez-vous pris" : "score forfaitaire"}</div>
                )}
              </div>
            </div>
          </div>

          {/* Coordonnées. */}
          <div className="crm-vol-bloc crm-vol-coord">
            <div><span className="k">Contact</span><br />{lead.contact ?? "—"}</div>
            {lead.objectif ? <div><span className="k">Objectif</span><br />{lead.objectif}</div> : null}
            {(lead.bilanObjectives ?? []).length ? (
              <div><span className="k">Bilan</span><br />{(lead.bilanObjectives ?? []).join(" · ")}
                {typeof lead.bilanWeightTarget === "number" ? ` · 🎯 −${Math.abs(lead.bilanWeightTarget)} kg` : ""}</div>
            ) : null}
          </div>

          {/* Gestes. WhatsApp seulement s'il a un numéro. */}
          <div>
            <div className="crm-vol-eyebrow">à faire</div>
            <div className="crm-vol-actions">
              {lead.contactIsPhone ? (
                <button type="button" className="crm-vol-btn wa" onClick={() => onWhatsApp(lead)}>📱 WhatsApp</button>
              ) : null}
              <button type="button" className="crm-vol-btn principal" onClick={() => onAlors(lead)}>🎯 Et alors ?</button>
              <button type="button" className="crm-vol-btn" onClick={() => onConvertir(lead)}>✅ Valider → fiche client</button>
              <button type="button" className="crm-vol-btn" onClick={() => onFiche(lead)}>↗ Fiche complète</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
