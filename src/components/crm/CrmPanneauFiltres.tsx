// =============================================================================
// CrmPanneauFiltres — le tiroir des filtres qui qualifient (CRM Board V2, lot 5).
//
// « Ce ne sont pas des cases en plus, ce sont les questions qui qualifient un
// lead dans les CRM du marché. » La logique (prédicats, vues sauvées) vit dans
// `filtresQualification.ts` et n'est PAS retouchée ici — ce fichier n'est que
// le rendu, sorti de l'empilement de la page vers un vrai tiroir à droite.
//
// ── CE QUE LE LOT 5 AJOUTE ────────────────────────────────────────────────
//   1. La famille « Objectif » : `passe()` la filtrait déjà, mais aucune puce
//      ne l'exposait. Les valeurs viennent des leads réels, pas d'une liste en
//      dur qui divergerait.
//   2. Un COMPTEUR par puce : combien de leads porteraient ce critère. Une
//      facette à 0 se voit et ne se clique pas pour rien.
//
// ── LA TEINTE NE PORTE JAMAIS LE TEXTE ────────────────────────────────────
// Règle de tout le CRM : la couleur passe par le liseré / la pastille ; le
// libellé et le compteur restent en `--ls-text`. Un chip actif = fond 12 % +
// liseré 40 %, jamais du texte teinté sur teinte.
// =============================================================================

import { useMemo } from "react";
import type { CrmLead } from "../../hooks/useCrmLeads";
import { computeLeadScore, TEMP_META, type LeadTemperature } from "../../lib/leadScoring";
import {
  SIGNAUX,
  porteLeSignal,
  passe,
  estVide,
  nbActifs,
  ecrireVues,
  type FiltreQualif,
  type VueSauvee,
} from "../../features/crm/filtresQualification";
import { FILTRE_VIDE } from "../../features/crm/filtresQualification";

interface Props {
  /** Les leads du périmètre courant (déjà filtrés scope/source par CrmPage) —
   *  base des compteurs de facette et de la liste des objectifs. */
  leads: CrmLead[];
  qualif: FiltreQualif;
  setQualif: React.Dispatch<React.SetStateAction<FiltreQualif>>;
  vues: VueSauvee[];
  setVues: (v: VueSauvee[]) => void;
  onFermer: () => void;
}

const TEMPS: LeadTemperature[] = ["hot", "warm", "cold"];

const CSS = `
.crm-flt-fond{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.5);display:flex;justify-content:flex-end}
.crm-flt{width:360px;max-width:92vw;height:100%;overflow-y:auto;background:var(--ls-surface);border-left:1px solid var(--ls-border);display:flex;flex-direction:column;font-family:"DM Sans",sans-serif;color:var(--ls-text)}
.crm-flt-tete{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--ls-border);position:sticky;top:0;background:var(--ls-surface);z-index:1}
.crm-flt-tete b{font-family:Syne,sans-serif;font-weight:800;font-size:16px}
.crm-flt-cpt{font-size:11px;font-weight:800;padding:1px 7px;border-radius:6px;background:color-mix(in srgb,var(--ls-teal) 16%,transparent);color:var(--ls-text)}
.crm-flt-x{margin-left:auto;min-width:34px;min-height:34px;border-radius:9px;border:1px solid var(--ls-border);background:var(--ls-surface2);color:var(--ls-text);font-size:14px;cursor:pointer;font-family:inherit}
.crm-flt-corps{padding:16px;display:flex;flex-direction:column;gap:18px}
.crm-flt-fam{display:flex;flex-direction:column;gap:9px}
.crm-flt-eyebrow{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ls-text-muted);font-weight:600}
.crm-flt-chips{display:flex;flex-wrap:wrap;gap:7px}
.crm-flt-chip{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:5px 11px;border-radius:8px;border:1px solid var(--ls-border);background:var(--ls-surface2);color:var(--ls-text);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
.crm-flt-chip .pt{width:7px;height:7px;border-radius:99px;flex:none}
.crm-flt-chip .n{font-family:Syne,sans-serif;font-weight:800;font-size:11.5px;color:var(--ls-text);opacity:.75}
.crm-flt-chip:disabled{opacity:.4;cursor:not-allowed}
.crm-flt-pied{margin-top:auto;position:sticky;bottom:0;background:var(--ls-surface);border-top:1px solid var(--ls-border);padding:12px 16px;display:flex;flex-direction:column;gap:10px}
.crm-flt-res{font-size:12.5px;color:var(--ls-text-muted)}
.crm-flt-res b{font-family:Syne,sans-serif;color:var(--ls-text);font-size:15px}
.crm-flt-actions{display:flex;gap:8px;flex-wrap:wrap}
.crm-flt-btn{min-height:40px;flex:1;min-width:130px;border-radius:10px;border:1px solid var(--ls-border);background:var(--ls-surface2);color:var(--ls-text);font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
.crm-flt-btn.primaire{background:color-mix(in srgb,var(--ls-teal) 16%,var(--ls-surface2));border-color:color-mix(in srgb,var(--ls-teal) 40%,transparent)}
.crm-flt-vues{display:flex;flex-wrap:wrap;gap:7px}
@media (max-width:1023.98px){ .crm-flt-chip{min-height:44px} .crm-flt-x{min-height:40px} .crm-flt-btn{min-height:44px} }
`;

/** Le style d'un chip actif : liseré + fond de sa couleur, texte jamais teinté. */
function styleActif(couleur: string): React.CSSProperties {
  return {
    background: `color-mix(in srgb, ${couleur} 12%, var(--ls-surface2))`,
    borderColor: `color-mix(in srgb, ${couleur} 40%, transparent)`,
  };
}

export function CrmPanneauFiltres({ leads, qualif, setQualif, vues, setVues, onFermer }: Props) {
  // Compteurs de facette : indépendants les uns des autres, pour montrer ce que
  // vaut CHAQUE critère avant de cliquer (pas l'intersection courante).
  const parTemp = useMemo(() => {
    const m: Record<string, number> = { hot: 0, warm: 0, cold: 0 };
    for (const l of leads) m[computeLeadScore(l).temperature]++;
    return m;
  }, [leads]);

  const parSignal = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of SIGNAUX) m[s.cle] = leads.filter((l) => porteLeSignal(l, s.cle)).length;
    return m;
  }, [leads]);

  // Les objectifs réellement présents, les plus fréquents d'abord.
  const objectifs = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of leads) {
      const o = (l.objectif ?? "").trim();
      if (o) m.set(o, (m.get(o) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [leads]);

  const resultat = useMemo(() => leads.filter((l) => passe(l, qualif)).length, [leads, qualif]);

  // Bascule par forme fonctionnelle : robuste à plusieurs clics rapprochés (une
  // clôture sur `qualif` figé n'aurait gardé que le dernier).
  const bascule = (cle: keyof FiltreQualif, val: string) =>
    setQualif((prev) => {
      const arr = prev[cle] as string[];
      const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
      return { ...prev, [cle]: next } as FiltreQualif;
    });
  const total = nbActifs(qualif);

  return (
    <div className="crm-flt-fond" onClick={onFermer}>
      <style>{CSS}</style>
      <div className="crm-flt" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Filtres">
        <div className="crm-flt-tete">
          <b>Filtres</b>
          {total > 0 ? <span className="crm-flt-cpt">{total}</span> : null}
          <button type="button" className="crm-flt-x" aria-label="Fermer" onClick={onFermer}>✕</button>
        </div>

        <div className="crm-flt-corps">
          {/* Température. */}
          <div className="crm-flt-fam">
            <span className="crm-flt-eyebrow">Température</span>
            <div className="crm-flt-chips">
              {TEMPS.map((t) => {
                const actif = qualif.temperatures.includes(t);
                return (
                  <button key={t} type="button" className="crm-flt-chip"
                    aria-pressed={actif} style={actif ? styleActif(TEMP_META[t].color) : undefined}
                    onClick={() => bascule("temperatures", t)}>
                    <span className="pt" style={{ background: TEMP_META[t].color }} />
                    {TEMP_META[t].emoji} {TEMP_META[t].label}
                    <span className="n">{parTemp[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ce qui cloche. */}
          <div className="crm-flt-fam">
            <span className="crm-flt-eyebrow">Ce qui cloche</span>
            <div className="crm-flt-chips">
              {SIGNAUX.map((sig) => {
                const actif = qualif.signaux.includes(sig.cle);
                const n = parSignal[sig.cle] ?? 0;
                return (
                  <button key={sig.cle} type="button" className="crm-flt-chip" title={sig.pourquoi}
                    aria-pressed={actif} disabled={n === 0 && !actif}
                    style={actif ? styleActif("var(--ls-coral)") : undefined}
                    onClick={() => bascule("signaux", sig.cle)}>
                    <span className="pt" style={{ background: "var(--ls-coral)" }} />
                    {sig.label}
                    <span className="n">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objectif — seulement s'il y a des objectifs en base. */}
          {objectifs.length > 0 ? (
            <div className="crm-flt-fam">
              <span className="crm-flt-eyebrow">Objectif</span>
              <div className="crm-flt-chips">
                {objectifs.map(([o, n]) => {
                  const actif = qualif.objectifs.includes(o);
                  return (
                    <button key={o} type="button" className="crm-flt-chip"
                      aria-pressed={actif} style={actif ? styleActif("var(--ls-purple)") : undefined}
                      onClick={() => bascule("objectifs", o)}>
                      <span className="pt" style={{ background: "var(--ls-purple)" }} />
                      {o}
                      <span className="n">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Vues sauvées. */}
          {vues.length > 0 ? (
            <div className="crm-flt-fam">
              <span className="crm-flt-eyebrow">Mes vues · double-clic pour retirer</span>
              <div className="crm-flt-vues">
                {vues.map((v) => (
                  <button key={v.nom} type="button" className="crm-flt-chip"
                    onClick={() => setQualif(v.filtre)}
                    onDoubleClick={() => { const reste = vues.filter((x) => x.nom !== v.nom); setVues(reste); ecrireVues(reste); }}
                    title="Double-clic pour retirer cette vue">
                    <span className="pt" style={{ background: "var(--ls-purple)" }} /> ⭐ {v.nom}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Pied : résultat + sauver / effacer. */}
        <div className="crm-flt-pied">
          <div className="crm-flt-res"><b>{resultat}</b> lead{resultat > 1 ? "s" : ""} {estVide(qualif) ? "au total" : "correspondent"}</div>
          {!estVide(qualif) ? (
            <div className="crm-flt-actions">
              <button type="button" className="crm-flt-btn primaire" onClick={() => {
                const nom = window.prompt("Nom de la vue ?", "Mes prioritaires")?.trim();
                if (!nom) return;
                const reste = [...vues.filter((v) => v.nom !== nom), { nom, filtre: qualif }];
                setVues(reste); ecrireVues(reste);
              }}>💾 Sauver comme vue</button>
              <button type="button" className="crm-flt-btn" onClick={() => setQualif(FILTRE_VIDE)}>Tout effacer</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
