// =============================================================================
// FormationV2Done — l'écran de fin de parcours (2026-08-04, lot 3).
//
// Le PONT : quand le débutant a tout ✓, on ne le laisse pas dans un cul-de-sac.
// On le félicite, on récapitule ce qu'il sait faire, et on le pousse vers
// l'ACTION → le cockpit (Salle des Ops), là où il fait ses 1ᵉʳˢ vrais gestes.
//
// Formation = apprendre (ici). Cockpit = faire + prouver (là où mène le CTA).
// Maquette validée par Thomas : scratchpad/formation-v2-fin.html.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { ConfettiBurst } from "../academy/components/ConfettiBurst";
import { FORMATION_V2_CHAPTERS, FORMATION_V2_TOTAL } from "./content";
import { FORMATION_V2_STYLES } from "./styles";

export function FormationV2Done({
  xp,
  streak,
  onClose,
}: {
  xp: number;
  streak: number;
  /** Ferme l'écran et revient au chemin (pour revoir une leçon). */
  onClose: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="fv-screen" role="dialog" aria-modal="true" aria-label="Parcours terminé">
      <style>{FORMATION_V2_STYLES}</style>
      <div className="fv-done-glow" aria-hidden="true" />

      <div className="fv-lhead">
        <button type="button" className="fv-lclose" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="fv-ltrack"><i style={{ width: "100%" }} /></div>
      </div>

      <div className="fv-lbody fv-done">
        <div className="fv-kicker">Parcours complet · {FORMATION_V2_TOTAL} leçons</div>
        <div className="fv-done-medal" aria-hidden="true">🎓</div>
        <h1 className="fv-done-h1">Tu connais les bases !</h1>
        <p className="fv-done-sub">
          Le métier, le bilan, la vente, la duplication — tu as tout parcouru. Bravo.
        </p>

        <div className="fv-done-stats">
          <div className="fv-rstat">
            <div className="fv-rv" style={{ color: "var(--ls-teal)" }}>{xp}</div>
            <div className="fv-rl">✦ XP gagnés</div>
          </div>
          <div className="fv-rstat">
            <div className="fv-rv" style={{ color: "var(--ls-lime)" }}>{Math.max(1, streak)} 🔥</div>
            <div className="fv-rl">Ta série</div>
          </div>
        </div>

        <div className="fv-done-recap">
          <h2>Ce que tu sais faire maintenant</h2>
          {FORMATION_V2_CHAPTERS.map((c) => (
            <div className="fv-drow" key={c.slug}>
              <span className="fv-dcheck" aria-hidden="true">✓</span>
              <span className="fv-dtxt">{c.recap}</span>
            </div>
          ))}
        </div>

        <div className="fv-bridge">
          <div className="fv-bridge-t">Et maintenant ?</div>
          <div className="fv-bridge-h">Passe à l'action.</div>
          <p className="fv-bridge-p">
            Savoir, c'est bien. <b>Faire, c'est là que ça compte.</b> Ton cockpit t'attend pour ton
            1ᵉʳ vrai geste : ta 1ʳᵉ commande, ton 1ᵉʳ bilan, tes 1ᵉʳˢ cobayes.
          </p>
          <button
            type="button"
            className="fv-cta fv-cta-lime"
            onClick={() => navigate("/co-pilote")}
          >
            Aller à mon cockpit →
          </button>
        </div>

        <button type="button" className="fv-done-ghost" onClick={onClose}>
          Revoir une leçon
        </button>
      </div>

      <ConfettiBurst onComplete={() => {}} />
    </div>
  );
}
