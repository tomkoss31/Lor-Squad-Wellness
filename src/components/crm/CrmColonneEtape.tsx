// =============================================================================
// CrmColonneEtape — une colonne du board (CRM Board V2, lot 3).
//
// En-tête coloré (pastille + libellé + compteur), pile de cartes plafonnée,
// pied « + N autres » qui déplie sur place. Mesurée sur la maquette.
//
// ── LE DROP OUVRE « ET ALORS ? », IL N'ÉCRIT PAS LE STATUT ────────────────
// Repris du lot 1 : déposer une carte ne change pas l'étape à sec, ça pose la
// question. La colonne « À relancer » (dérivée de relanceDue, pas un vrai
// statut) et « Converti » (verrouillée) N'ACCEPTENT PAS le drop.
//
// ── PLAFOND ET DÉPLIAGE ───────────────────────────────────────────────────
// 2 cartes visibles + « + N autres » : le board reste lisible même avec 40
// leads dans une colonne. Déplier montre le reste, sans quitter l'écran.
// =============================================================================

import { useState } from "react";
import type { CrmLead } from "../../hooks/useCrmLeads";
import { CrmCarteLead } from "./CrmCarteLead";

interface Props {
  label: string;
  teinte: string;
  leads: CrmLead[];
  /** La cible de drop si la colonne en accepte un (statut réel), sinon null. */
  cibleDrop: string | null;
  survole: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onOuvrir: (lead: CrmLead) => void;
  onWhatsApp: (lead: CrmLead) => void;
  onAlors: (lead: CrmLead) => void;
  onDragStartCard: (lead: CrmLead) => void;
  onDragEndCard: () => void;
}

const APERCU = 2;

const CSS = `
.crm-col{flex:1;min-width:220px;display:flex;flex-direction:column;gap:9px}
.crm-col-tete{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:11px}
.crm-col-tete .pt{width:7px;height:7px;border-radius:99px;flex:none}
.crm-col-tete b{font-size:11.5px;font-weight:700;color:var(--ls-text)}
.crm-col-tete .depose{margin-left:6px;font-size:11.5px;font-weight:600;opacity:.85;color:var(--ls-text-muted)}
.crm-col-tete .cn{font-family:Syne,sans-serif;font-weight:800;font-size:13px;margin-left:auto;color:var(--ls-text)}
.crm-col-pile{display:flex;flex-direction:column;gap:8px}
.crm-col-vide{font-size:11.5px;color:var(--ls-text-hint);padding:6px 2px}
.crm-col-plus{border:1px dashed var(--ls-border);border-radius:11px;padding:9px;text-align:center;font-size:11px;color:var(--ls-text-hint);cursor:pointer;background:transparent;font-family:inherit;width:100%}
`;

export function CrmColonneEtape({
  label, teinte, leads, cibleDrop, survole,
  onDragOver, onDragLeave, onDrop, onOuvrir, onWhatsApp, onAlors, onDragStartCard, onDragEndCard,
}: Props) {
  const [tout, setTout] = useState(false);
  const visibles = tout ? leads : leads.slice(0, APERCU);
  const reste = leads.length - visibles.length;
  const accepteDrop = cibleDrop !== null;

  return (
    <div
      className="crm-col"
      onDragOver={accepteDrop ? (e) => { e.preventDefault(); onDragOver(); } : undefined}
      onDragLeave={accepteDrop ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragLeave(); } : undefined}
      onDrop={accepteDrop ? (e) => { e.preventDefault(); onDrop(); } : undefined}
    >
      <style>{CSS}</style>
      <div
        className="crm-col-tete"
        style={
          survole
            ? { background: `color-mix(in srgb, ${teinte} 16%, transparent)`, border: `1px solid color-mix(in srgb, ${teinte} 55%, transparent)` }
            : { background: `color-mix(in srgb, ${teinte} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${teinte} 24%, transparent)` }
        }
      >
        <span className="pt" style={{ background: teinte }} />
        <b>{label}</b>
        {survole ? (
          <span className="depose">{cibleDrop === "converted" ? "🔒 passe par la fiche" : "— dépose ici ✊"}</span>
        ) : null}
        <span className="cn">{leads.length}</span>
      </div>

      <div className="crm-col-pile">
        {visibles.map((lead) => (
          <CrmCarteLead key={lead.key} lead={lead} onOuvrir={onOuvrir} onWhatsApp={onWhatsApp} onAlors={onAlors} onDragStart={onDragStartCard} onDragEnd={onDragEndCard} />
        ))}
        {leads.length === 0 ? <div className="crm-col-vide">—</div> : null}
        {reste > 0 ? (
          <button type="button" className="crm-col-plus" onClick={() => setTout(true)}>+ {reste} autres</button>
        ) : null}
        {tout && leads.length > APERCU ? (
          <button type="button" className="crm-col-plus" onClick={() => setTout(false)}>réduire</button>
        ) : null}
      </div>
    </div>
  );
}
