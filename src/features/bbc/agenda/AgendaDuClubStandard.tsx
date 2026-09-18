// =============================================================================
// L'agenda du club, DANS L'APP STANDARD (agenda partagé, étape 9 — 18/09/2026).
//
// Maria est rattachée au club mais n'est pas en mode BBC : elle vit dans l'app
// standard, dont l'agenda « bugue » sur téléphone (Thomas, 17/09) et ne montre
// pas les rendez-vous des autres. On ne réécrit pas un second agenda partagé :
// c'est LE MÊME composant que dans BBC (`BbcAgenda`), mêmes données, mêmes
// gestes — une feature, un seul endroit (règle B9).
//
// Ce fichier ne fait que l'accueillir proprement hors de BBC :
//   · le thème : BBC a sa variante claire (`.bbc-mode.bbc-light`), à poser sur
//     CHAQUE élément `.bbc-mode` (les feuilles en redéclarent un) — on suit le
//     thème de l'app standard (`html.theme-light`), même patron que `BbcApp` ;
//   · l'en-tête mobile de l'app standard reste collé en haut (64 px + encoche) :
//     ce qui colle dans l'agenda se cale dessous ;
//   · le bouton Noaly occupe le coin bas-droit : le ＋ passe au-dessus.
//
// Depuis le lot 4 de l'agenda unique (18/09/2026), c'est L'agenda de tout le
// monde : « Mon agenda » et la bascule ont disparu. Une coach sans club voit ses
// propres rendez-vous (le club vaut `null`, `coachs_du_club()` la rend seule).
// =============================================================================

import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import type { Club } from "../../../types/domain";
import { BbcAgenda } from "./BbcAgenda";
import { urlBilanStandard } from "./agendaClub";

const MOBILE = "(max-width: 1279px)";

export function AgendaDuClubStandard({ userId, coachName, club }: { userId?: string; coachName?: string; club: Club | null }) {
  const navigate = useNavigate();
  // Sous 1280 px, l'app standard affiche son en-tête mobile collant.
  const [mobile, setMobile] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(MOBILE).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(MOBILE);
    const suivre = () => setMobile(mq.matches);
    mq.addEventListener("change", suivre);
    return () => mq.removeEventListener("change", suivre);
  }, []);

  // Le thème : toutes les `.bbc-mode` du document suivent `html.theme-light`.
  // L'observateur est indispensable — une feuille montée après coup n'aurait
  // jamais reçu la classe (cf. `BbcApp`).
  useEffect(() => {
    const appliquer = () => {
      const clair = document.documentElement.classList.contains("theme-light");
      document.querySelectorAll(".bbc-mode").forEach((el) => el.classList.toggle("bbc-light", clair));
    };
    appliquer();
    const observateur = new MutationObserver(appliquer);
    observateur.observe(document.body, { childList: true, subtree: true });
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observateur.disconnect();
      document.querySelectorAll(".bbc-mode").forEach((el) => el.classList.remove("bbc-light"));
    };
  }, []);

  return (
    <div className="bbc-mode" style={cadre}>
      <BbcAgenda
        userId={userId}
        coachName={coachName}
        club={club}
        collantHaut={mobile ? "calc(64px + env(safe-area-inset-top, 0px))" : "0px"}
        fabBas={mobile ? "calc(152px + env(safe-area-inset-bottom, 0px))" : "96px"}
        // PASSERELLE (lot 1 de l'agenda unique, 18/09) : « elle démarre en suivi
        // classique » ouvre le bilan pré-rempli ICI aussi — jusque-là, côté
        // standard, la réponse s'enregistrait et rien ne s'ouvrait.
        onSuiviClassique={(rdv) => navigate(urlBilanStandard(rdv))}
      />
    </div>
  );
}

const cadre: CSSProperties = {
  background: "var(--ls-bbc-bg)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", borderRadius: 20, padding: "16px 14px 20px",
};
