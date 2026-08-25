// =============================================================================
// CrmCarteLead — la carte du board (CRM Board V2, lot 2).
//
// Mesurée sur la maquette Claude Design, traduite aux couleurs de l'app
// (décision Thomas : structure du design, tokens `--ls-*`).
//
// ── LES 4 LIGNES DE LA MAQUETTE ───────────────────────────────────────────
//   1. nom (Syne 700 13,5px) + météo · + badge score + badge de retard
//   2. chips du bilan : objectif · 🎯 cible · (⚡ veut commencer — ABSENT en base)
//   3. méta : 🔥 motivation · âge · ville · (canal préféré — ABSENT en base)
//   4. « Pourquoi 82 : … (+30) · … (+20) » — le score rendu auditable
//   + une bordure gauche 3px colorée par la colonne, OU par l'anomalie.
//
// ── L'ÉTAT PRIME SUR LA COLONNE ───────────────────────────────────────────
// La maquette le montre : une carte « sans suite » ou « qui pourrit » prend la
// couleur de son ANOMALIE, pas celle de son étape. Priorité :
//   RDV passé > pourrit (5 j sans mouvement) > sans suite > en retard > saine.
//
// ── CE QUI N'EST PAS ENCORE LÀ ────────────────────────────────────────────
// Purement présentationnelle : elle DÉRIVE tout du lead et n'écrit rien. Les
// gestes (menu, changement de statut, message) restent dans le panneau lead
// (lot 4). Ici, au plus 2 boutons sur la variante urgente — comme la maquette.
// =============================================================================

import type { CrmLead, CrmStatus } from "../../hooks/useCrmLeads";
import { computeLeadScore, TEMP_META } from "../../lib/leadScoring";
import { stagnationDays } from "../../lib/leadActivity";
import { nomAffiche } from "../../features/crm/nomPropre";

interface Props {
  lead: CrmLead;
  /** Ouvre sa fiche. Le corps de la carte est cliquable. */
  onOuvrir: (lead: CrmLead) => void;
  /** Relance WhatsApp — n'apparaît que sur la variante « en retard ». */
  onWhatsApp?: (lead: CrmLead) => void;
  /** Ouvre « Et alors ? » — variante « en retard » et « RDV passé ». */
  onAlors?: (lead: CrmLead) => void;
  /** Rend la carte glissable (board). Le drop ouvre « Et alors ? », lot 1. */
  onDragStart?: (lead: CrmLead) => void;
  onDragEnd?: () => void;
}

/** La couleur de l'étape — sert de bordure gauche quand rien ne cloche. */
const TEINTE_ETAPE: Record<CrmStatus, string> = {
  new: "var(--ls-lime)",
  contacted: "var(--ls-teal)",
  qualified: "var(--ls-purple)",
  converted: "var(--ls-amber)",
  lost: "var(--ls-text-hint)",
};

type Etat = "saine" | "retard" | "sansSuite" | "pourrit" | "rdvPasse";

/** L'anomalie l'emporte sur l'étape. Ordre = priorité.
 *
 *  ⚠️ 25/08 — la carte contredisait sa propre colonne. Quelqu'un qui a un
 *  créneau CONFIRMÉ demain, mais aucune date de relance, tombait dans
 *  « sansSuite » : la carte affichait « ⚠ aucune suite prévue » et une bordure
 *  d'alerte, en REMPLAÇANT le seul renseignement utile — la date du rendez-vous.
 *  Pire encore au-delà de 5 jours d'ancienneté : « 🕸️ N j sans mouvement »,
 *  sur quelqu'un qu'on reçoit le lendemain.
 *
 *  Un créneau à venir EST la suite prévue. Il passe donc avant toute anomalie
 *  de suivi — même ordre que `etapeDuLead` et `zoneDe`.
 */
export function etatDe(lead: CrmLead): Etat {
  const vivant = lead.status !== "converted" && lead.status !== "lost" && !lead.dormant;
  const rdvPasse = !!lead.rdv && lead.rdv.passe === true;
  if (rdvPasse) return "rdvPasse";
  // Rien ne cloche chez quelqu'un qui a rendez-vous.
  if (lead.rdv && !lead.rdv.passe) return "saine";
  if (vivant && stagnationDays(lead) >= 5) return "pourrit";
  if (vivant && !lead.relanceDueAt) return "sansSuite";
  if (lead.relanceDue) return "retard";
  return "saine";
}

/** « demain 14 h », « lun. 24 · 9 h » — la date de la prochaine action. */
function quandCourt(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const j = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${j} · ${h}`;
}

/** Le badge daté qui dit la PROCHAINE action, coloré selon l'état. */
function badgeAction(lead: CrmLead, etat: Etat): { txt: string; cls: string } | null {
  switch (etat) {
    case "pourrit":
      return { txt: `🕸️ ${stagnationDays(lead)} j sans mouvement`, cls: "cl-plein" };
    case "sansSuite":
      return { txt: "⚠ aucune suite prévue", cls: "am" };
    case "retard": {
      const j = lead.relanceDueAt ? Math.max(0, Math.floor((Date.now() - new Date(lead.relanceDueAt).getTime()) / 86_400_000)) : 0;
      return { txt: j > 0 ? `${j} j de retard` : "aujourd'hui", cls: j > 0 ? "cl-plein" : "cl" };
    }
    case "rdvPasse":
      return { txt: `${lead.rdvLabel ?? "RDV"} passé — et alors ?`, cls: "am" };
    default: {
      // Saine : la date de suite, ou le RDV à venir.
      if (lead.rdvLabel) return { txt: `📅 ${lead.rdvLabel}`, cls: "pu" };
      if (lead.relanceDueAt) return { txt: `↻ ${quandCourt(lead.relanceDueAt)}`, cls: "te" };
      if (!lead.contactedAt && lead.status === "new") return { txt: "→ 1er contact aujourd'hui", cls: "li" };
      return null;
    }
  }
}

const CSS = `
.crm-lead{background:var(--ls-surface2);border:1px solid var(--ls-border);border-radius:11px;padding:11px 12px;display:flex;flex-direction:column;gap:7px;cursor:pointer;text-align:left;width:100%;font-family:"DM Sans",sans-serif;color:var(--ls-text)}
.crm-lead.retard{background:color-mix(in srgb,var(--ls-coral) 7%,var(--ls-surface2));box-shadow:0 8px 24px -14px color-mix(in srgb,var(--ls-coral) 40%,transparent)}
.crm-lead.pourrit{background:color-mix(in srgb,var(--ls-coral) 9%,var(--ls-surface2))}
.crm-lead-l1{display:flex;align-items:center;gap:7px}
.crm-lead-nom{font-family:Syne,sans-serif;font-weight:700;font-size:13.5px}
.crm-lead-meteo{margin-left:auto;font-size:11px}
.crm-lead-score{font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:5px}
.crm-lead-ctx{font-size:11.5px;color:var(--ls-text-muted);line-height:1.4}
.crm-lead-chips{display:flex;flex-wrap:wrap;gap:5px}
.crm-lead-tag{background:color-mix(in srgb,var(--ls-teal) 13%,transparent);color:var(--ls-teal);border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700}
.crm-lead-meta{font-size:10.5px;color:color-mix(in srgb,var(--ls-text) 70%,transparent)}
.crm-lead-pourquoi{font-size:10.5px;line-height:1.4;color:color-mix(in srgb,var(--ls-text) 70%,transparent)}
.crm-lead-badge{align-self:flex-start;border-radius:6px;padding:3px 8px;font-size:10.5px;font-weight:700}
.crm-lead-badge.li{background:color-mix(in srgb,var(--ls-lime) 15%,transparent);color:var(--ls-lime)}
.crm-lead-badge.te{background:color-mix(in srgb,var(--ls-teal) 13%,transparent);color:var(--ls-teal)}
.crm-lead-badge.pu{background:color-mix(in srgb,var(--ls-purple) 15%,transparent);color:var(--ls-purple)}
.crm-lead-badge.am{background:color-mix(in srgb,var(--ls-amber) 16%,transparent);color:var(--ls-amber);font-weight:800}
.crm-lead-badge.cl{background:color-mix(in srgb,var(--ls-coral) 16%,transparent);color:var(--ls-coral);font-weight:800}
.crm-lead-badge.cl-plein{background:var(--ls-coral);color:var(--ls-coral-ink);font-weight:800}
.crm-lead-btns{display:flex;gap:6px;margin-top:1px}
.crm-lead-wa{flex:1;min-height:32px;background:var(--ls-wa,#25D366);color:var(--ls-wa-ink,#04210f);border:0;border-radius:7px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit}
.crm-lead-alors{flex:1;min-height:32px;background:var(--ls-surface);border:1px solid var(--ls-border);color:var(--ls-text);border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
@media (max-width:1023.98px){
  .crm-lead-wa,.crm-lead-alors{min-height:44px}
}
`;

export function CrmCarteLead({ lead, onOuvrir, onWhatsApp, onAlors, onDragStart, onDragEnd }: Props) {
  const { score100, temperature, details } = computeLeadScore(lead);
  const etat = etatDe(lead);
  const badge = badgeAction(lead, etat);

  // La bordure gauche : couleur de l'étape, sauf anomalie qui la remplace.
  const teinte =
    etat === "pourrit" || etat === "retard"
      ? "var(--ls-coral)"
      : etat === "sansSuite" || etat === "rdvPasse"
        ? "var(--ls-amber)"
        : TEINTE_ETAPE[lead.status];

  const objectifs = (lead.bilanObjectives ?? []).slice(0, 2);
  const meta = [
    typeof lead.bilanMotivation === "number" ? `🔥 motivation ${lead.bilanMotivation}/10` : null,
    typeof lead.bilanAge === "number" ? `${lead.bilanAge} ans` : null,
    lead.city || null,
  ].filter(Boolean);

  const pourquoi = details.length
    ? `Pourquoi ${score100} : ${details.map((d) => `${d.motif} (+${d.points})`).join(" · ")}`
    : "";

  return (
    <div
      className={`crm-lead${etat === "retard" ? " retard" : etat === "pourrit" ? " pourrit" : ""}`}
      style={{ borderColor: etat === "saine" ? "var(--ls-border)" : `color-mix(in srgb, ${teinte} 30%, var(--ls-border))`, borderLeft: `3px solid ${teinte}` }}
      role="button"
      tabIndex={0}
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => { e.dataTransfer.setData("text/plain", lead.key); e.dataTransfer.effectAllowed = "move"; onDragStart(lead); } : undefined}
      onDragEnd={onDragEnd}
      onClick={() => onOuvrir(lead)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOuvrir(lead); } }}
      aria-label={`Ouvrir ${nomAffiche(lead.firstName, lead.lastName)}`}
    >
      <style>{CSS}</style>

      <div className="crm-lead-l1">
        <span className="crm-lead-nom">{nomAffiche(lead.firstName, lead.lastName)}</span>
        {/* La météo ne porte pas de texte, l'emoji suffit — pas de dette de contraste. */}
        <span className="crm-lead-meteo" title={TEMP_META[temperature].label} aria-label={TEMP_META[temperature].label}>
          {TEMP_META[temperature].emoji}
        </span>
        {score100 > 0 ? (
          <span
            className="crm-lead-score"
            style={{ background: `color-mix(in srgb, ${TEMP_META[temperature].color} 16%, transparent)`, color: "var(--ls-text)" }}
          >
            {score100}
          </span>
        ) : null}
      </div>

      {lead.extra || objectifs.length === 0 ? (
        <div className="crm-lead-ctx">{lead.extra ?? "Bilan en ligne"}</div>
      ) : null}

      {objectifs.length ? (
        <div className="crm-lead-chips">
          {objectifs.map((o) => <span key={o} className="crm-lead-tag">{o}</span>)}
          {typeof lead.bilanWeightTarget === "number" ? (
            <span className="crm-lead-tag">🎯 −{Math.abs(lead.bilanWeightTarget)} kg</span>
          ) : null}
        </div>
      ) : null}

      {meta.length ? <div className="crm-lead-meta">{meta.join(" · ")}</div> : null}

      {badge ? <span className={`crm-lead-badge ${badge.cls}`}>{badge.txt}</span> : null}

      {pourquoi ? <div className="crm-lead-pourquoi">{pourquoi}</div> : null}

      {/* Les gestes directs, seulement là où la maquette les met : sur la carte
          urgente (en retard) et sur le RDV passé. Ailleurs, tout passe par la
          fiche (clic sur le corps). stopPropagation : cliquer un bouton n'ouvre
          pas la fiche. */}
      {etat === "retard" && (onWhatsApp || onAlors) ? (
        <div className="crm-lead-btns" onClick={(e) => e.stopPropagation()}>
          {onWhatsApp ? <button type="button" className="crm-lead-wa" onClick={() => onWhatsApp(lead)}>WhatsApp</button> : null}
          {onAlors ? <button type="button" className="crm-lead-alors" onClick={() => onAlors(lead)}>🎯 Et alors ?</button> : null}
        </div>
      ) : null}
      {etat === "rdvPasse" && onAlors ? (
        <div className="crm-lead-btns" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="crm-lead-alors" onClick={() => onAlors(lead)}>🎯 Et alors ?</button>
        </div>
      ) : null}
    </div>
  );
}
