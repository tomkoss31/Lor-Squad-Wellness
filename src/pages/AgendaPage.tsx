// =============================================================================
// L'agenda — UN SEUL, pour toute l'équipe (lot 4 de l'agenda unique, 18/09/2026).
//
// Jusqu'ici cette page portait « Mon agenda » (3 725 lignes : liste, semaine,
// mois, trois feuilles de qualification, « caler chez un coach », permanences…)
// à côté de « Agenda du club » — deux implémentations de la même chose, qui ne
// disaient pas la même chose (le dimanche proposé d'un côté, fermé de l'autre).
// Thomas, 18/09 : « le standard est complet mais complexe, le BBC simple et
// précis comme TimeTree ». Décision, maquette validée : l'agenda du club pour
// tout le monde, après lui avoir apporté ce que l'ancien faisait de plus — le
// suivi de cliente dans la question unique, les passerelles vers les bilans.
// Une coach sans club y voit ses propres rendez-vous (`coachs_du_club()`).
// Les liens des notifications vers `/agenda?…` arrivent ici et ouvrent l'agenda.
// =============================================================================

import { useAppContext } from "../context/AppContext";
import { useBbcMode } from "../features/bbc/useBbcMode";
import { AgendaDuClubStandard } from "../features/bbc/agenda/AgendaDuClubStandard";

export function AgendaPage() {
  const { currentUser } = useAppContext();
  const { activeClub } = useBbcMode(currentUser?.id, currentUser?.role === "admin");
  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 md:px-6">
      <AgendaDuClubStandard userId={currentUser?.id} coachName={currentUser?.name} club={activeClub ?? null} />
    </div>
  );
}
