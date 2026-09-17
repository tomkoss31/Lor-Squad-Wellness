// =============================================================================
// « Aujourd'hui » — les rendez-vous du jour, sur l'écran du matin.
//
// Thomas (17/09) : si le premier écran du matin ne dit pas « 9 h 30 Justine,
// 10 h Coralie », les filles rouvrent TimeTree. Cette carte est ce qui fait
// ouvrir l'app à 7 h plutôt que l'autre. Toute l'équipe, pas seulement soi :
// au comptoir, on accueille aussi les personnes des autres.
// =============================================================================

import { useMemo, type CSSProperties } from "react";
import { useCoachsDuClub } from "../useCoachsDuClub";
import { useAgendaDuClub } from "./useAgendaDuClub";
import { couleurCoach, heureDe, libelleNature, nomComplet, parJour, cleJour } from "./agendaClub";

interface Props {
  userId?: string;
  /** Ouvre l'onglet « L'agenda ». */
  onVoir: () => void;
}

export function RdvDuJour({ userId, onVoir }: Props) {
  const aujourdhui = new Date();
  const debut = useMemo(() => new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()), [cleJour(aujourdhui)]);
  const fin = useMemo(() => {
    const d = new Date(debut);
    d.setDate(d.getDate() + 1);
    return d;
  }, [debut]);
  const { rdvs, loading } = useAgendaDuClub(debut, fin, userId);
  const { coachs } = useCoachsDuClub(userId);
  const liste = parJour(rdvs).get(cleJour(aujourdhui)) ?? [];
  const prenom = (id: string | null) => coachs.find((c) => c.id === id)?.prenom ?? "le club";

  return (
    <div style={carte}>
      <div style={oeilleton}>
        <span style={{ flex: 1 }}>📅 aujourd'hui</span>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: 0, textTransform: "none" }}>
          {loading ? "" : `${liste.length} rdv · toute l'équipe`}
        </span>
      </div>
      {loading ? (
        <div style={vide}>chargement…</div>
      ) : liste.length === 0 ? (
        <div style={vide}>Aucun rendez-vous aujourd'hui.</div>
      ) : (
        liste.map((r) => (
          <button key={`${r.source}-${r.id}`} type="button" onClick={onVoir} style={ligne}>
            <span style={{ flex: "none", width: 46, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13.5, fontWeight: 700 }}>{heureDe(r.debut)}</span>
            <span style={{ flex: "none", width: 4, alignSelf: "stretch", borderRadius: 4, background: couleurCoach(r.coachId, coachs) }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {libelleNature(r)} · {nomComplet(r)}
              </span>
              <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>avec {prenom(r.coachId)}</span>
            </span>
          </button>
        ))
      )}
      <button type="button" onClick={onVoir} style={lien}>
        Ouvrir l'agenda ›
      </button>
    </div>
  );
}

const carte: CSSProperties = {
  background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "18px 20px 8px",
};
const oeilleton: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 11, fontWeight: 600, letterSpacing: ".14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase",
};
const ligne: CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, padding: "8px 0",
  border: 0, borderTop: "1px solid var(--ls-bbc-line)", background: "transparent", color: "var(--ls-bbc-text)",
  textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer",
};
const vide: CSSProperties = {
  fontSize: 12, color: "var(--ls-bbc-hint)", padding: "12px 0", borderTop: "1px solid var(--ls-bbc-line)", lineHeight: 1.5,
};
const lien: CSSProperties = {
  width: "100%", minHeight: 44, border: 0, borderTop: "1px solid var(--ls-bbc-line)", background: "transparent",
  color: "var(--ls-bbc-lime-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "right",
};
