// =============================================================================
// « L'agenda » — l'agenda partagé du club, dans le mode BBC.
//
// MAQUETTE VALIDÉE PAR THOMAS le 17/09/2026 (v5). Le but, dit par lui : que
// l'équipe lâche TimeTree. Donc ce que TimeTree fait bien, on le fait pareil :
// un seul calendrier pour tout le club, une couleur par coach, les noms
// visibles de tous, les rituels et fermetures dedans.
//
// Ce lot : la vue MOIS et la liste d'un jour. Les vues Jour et Semaine, l'ajout
// et la qualification arrivent dans les lots suivants — chacun sur le même
// socle : `agenda_du_club()` en base, `agendaClub.ts` pour la logique.
//
// Règles de l'écran, à ne pas défaire :
//   · la couleur dit la coach, la place de la pastille va au PRÉNOM ;
//   · un jour trop plein affiche « +N » — on le touche, sa liste s'ouvre ;
//   · tout ce qu'on touche fait 44 px (garde-fou visuel BBC).
// =============================================================================

import { useMemo, useState, type CSSProperties } from "react";
import type { Club } from "../../../types/domain";
import { useCoachsDuClub } from "../useCoachsDuClub";
import { useAgendaDuClub } from "./useAgendaDuClub";
import {
  aQualifier,
  cleJour,
  couleurCoach,
  grilleMois,
  heureDe,
  jourDe,
  libelleJour,
  libelleMois,
  libelleNature,
  marqueDe,
  nomComplet,
  parJour,
  prenomSeul,
  type RdvClub,
} from "./agendaClub";

/** Au-delà, la case du mois n'affiche plus les pastilles mais « +N ». */
const PASTILLES_MAX = 3;

interface Props {
  userId?: string;
  club: Club | null;
}

export function BbcAgenda({ userId }: Props) {
  const aujourdhui = new Date();
  const cleAuj = cleJour(aujourdhui);
  const [mois, setMois] = useState(() => new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1));
  const [filtre, setFiltre] = useState<string>("tous");
  const [jourOuvert, setJourOuvert] = useState<string | null>(null);
  const [rdvOuvert, setRdvOuvert] = useState<RdvClub | null>(null);

  const { coachs } = useCoachsDuClub(userId);
  const semaines = useMemo(() => grilleMois(mois.getFullYear(), mois.getMonth()), [mois]);
  // La fenêtre lue = la grille affichée, débords compris.
  const du = useMemo(() => jourDe(semaines[0][0]), [semaines]);
  const au = useMemo(() => {
    const d = jourDe(semaines[semaines.length - 1][6]);
    d.setDate(d.getDate() + 1);
    return d;
  }, [semaines]);
  const { rdvs, loading } = useAgendaDuClub(du, au, userId);

  const visibles = useMemo(
    () => (filtre === "tous" ? rdvs : rdvs.filter((r) => r.coachId === filtre)),
    [rdvs, filtre],
  );
  const parJourMap = useMemo(() => parJour(visibles), [visibles]);
  const maintenant = Date.now();
  const couleur = (id: string | null) => couleurCoach(id, coachs);
  const prenomCoach = (id: string | null) => coachs.find((c) => c.id === id)?.prenom ?? "le club";

  const decaler = (n: number) => setMois((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Le mois, et où l'on va ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => decaler(-1)} aria-label="Mois précédent" style={fleche}>
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0, fontSize: 19, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {libelleMois(mois)}
        </div>
        <button
          type="button"
          onClick={() => setMois(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1))}
          style={boutonAuj}
        >
          Auj.
        </button>
        <button type="button" onClick={() => decaler(1)} aria-label="Mois suivant" style={fleche}>
          ›
        </button>
      </div>

      {/* ── Les coachs : « Tous », puis chacune avec sa couleur ───────────── */}
      <div style={rangeeCoachs}>
        <Puce on={filtre === "tous"} onClick={() => setFiltre("tous")}>
          Tous
        </Puce>
        {coachs.map((c) => (
          <Puce key={c.id} on={filtre === c.id} onClick={() => setFiltre(c.id)} couleur={couleur(c.id)}>
            {c.prenom}
          </Puce>
        ))}
      </div>

      {/* ── La grille ──────────────────────────────────────────────────── */}
      <div>
        <div style={teteJours}>
          {["lu", "ma", "me", "je", "ve", "sa", "di"].map((j) => (
            <span key={j} style={{ textAlign: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".06em" }}>
              {j}
            </span>
          ))}
        </div>
        {semaines.map((semaine) => (
          <div key={semaine[0]} style={ligneSemaine}>
            {semaine.map((k, i) => {
              const d = jourDe(k);
              const horsMois = d.getMonth() !== mois.getMonth();
              const liste = parJourMap.get(k) ?? [];
              const estAuj = k === cleAuj;
              return (
                <button key={k} type="button" onClick={() => setJourOuvert(k)} style={caseJour}>
                  <span
                    style={{
                      ...numero,
                      color: estAuj ? "var(--ls-bbc-bg)" : i === 6 ? "var(--ls-bbc-coral)" : horsMois ? "var(--ls-bbc-hint)" : "var(--ls-bbc-text)",
                      background: estAuj ? "var(--ls-bbc-lime)" : "transparent",
                      opacity: horsMois && !estAuj ? 0.55 : 1,
                    }}
                  >
                    {d.getDate()}
                  </span>
                  {liste.slice(0, PASTILLES_MAX).map((r) => {
                    const m = marqueDe(r);
                    const c = couleur(r.coachId);
                    return (
                      <span
                        key={r.id}
                        style={{
                          ...pastille,
                          background: `color-mix(in srgb, ${c} 18%, transparent)`,
                          borderLeft: `3px solid ${c}`,
                          opacity: m?.code === "pas_venue" ? 0.55 : 1,
                          textDecoration: m?.code === "pas_venue" ? "line-through" : "none",
                        }}
                      >
                        {m ? `${m.symbole} ` : ""}
                        {prenomSeul(r)}
                      </span>
                    );
                  })}
                  {liste.length > PASTILLES_MAX ? (
                    <span style={{ display: "block", textAlign: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, color: "var(--ls-bbc-hint)" }}>
                      +{liste.length - PASTILLES_MAX}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
        <div style={{ fontSize: 12, color: "var(--ls-bbc-hint)", padding: "10px 0 0", lineHeight: 1.5 }}>
          {loading ? "Chargement…" : `${visibles.length} rendez-vous sur la période · touche un jour pour sa liste.`}
        </div>
      </div>

      {/* ── La liste d'un jour ─────────────────────────────────────────── */}
      {jourOuvert ? (
        <Feuille onClose={() => setJourOuvert(null)} titre={libelleJour(jourDe(jourOuvert))} sous={sousTitreJour(parJourMap.get(jourOuvert) ?? [], filtre, prenomCoach(filtre))}>
          {(parJourMap.get(jourOuvert) ?? []).length === 0 ? (
            <div style={vide}>Rien de prévu ce jour-là.</div>
          ) : (
            (parJourMap.get(jourOuvert) ?? []).map((r) => {
              const m = marqueDe(r);
              const urgent = aQualifier(r, maintenant);
              return (
                <button key={`${r.source}-${r.id}`} type="button" onClick={() => setRdvOuvert(r)} style={ligneRdv}>
                  <span style={{ flex: "none", width: 46, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 14, fontWeight: 700 }}>{heureDe(r.debut)}</span>
                  <span style={{ flex: "none", width: 4, alignSelf: "stretch", borderRadius: 4, background: couleur(r.coachId) }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {libelleNature(r)} · {nomComplet(r)}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: urgent ? "var(--ls-bbc-coral)" : "var(--ls-bbc-muted)", marginTop: 2 }}>
                      avec {prenomCoach(r.coachId)}
                      {m ? ` · ${m.symbole} ${m.libelle}` : urgent ? " · passé, à qualifier" : ""}
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ flex: "none", color: "var(--ls-bbc-hint)", fontSize: 18 }}>
                    ›
                  </span>
                </button>
              );
            })
          )}
        </Feuille>
      ) : null}

      {/* ── Un rendez-vous ─────────────────────────────────────────────── */}
      {rdvOuvert ? (
        <Feuille
          onClose={() => setRdvOuvert(null)}
          titre={nomComplet(rdvOuvert)}
          sous={`${libelleJour(new Date(rdvOuvert.debut))} · ${heureDe(rdvOuvert.debut)} – ${heureDe(rdvOuvert.fin)}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 0 6px" }}>
            <Ligne couleur={couleur(rdvOuvert.coachId)}>
              {libelleNature(rdvOuvert)} <span style={{ color: "var(--ls-bbc-muted)" }}>avec {prenomCoach(rdvOuvert.coachId)}</span>
            </Ligne>
            {marqueDe(rdvOuvert) ? (
              <Ligne couleur="var(--ls-bbc-lime)">
                {marqueDe(rdvOuvert)!.symbole} {marqueDe(rdvOuvert)!.libelle}
              </Ligne>
            ) : null}
            {rdvOuvert.telephone ? (
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <a href={`tel:${rdvOuvert.telephone.replace(/\D/g, "")}`} style={lienAction}>
                  📞 Appeler
                </a>
                <a href={`sms:${rdvOuvert.telephone.replace(/\D/g, "")}`} style={lienAction}>
                  💬 SMS
                </a>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>Pas de téléphone sur ce rendez-vous.</div>
            )}
          </div>
        </Feuille>
      ) : null}
    </div>
  );
}

function sousTitreJour(liste: RdvClub[], filtre: string, prenom: string): string {
  const n = liste.length;
  const qui = filtre === "tous" ? "toute l'équipe" : prenom;
  return `${n} rendez-vous · ${qui}`;
}

// ── Petits composants ───────────────────────────────────────────────────────

function Puce({ on, onClick, couleur, children }: { on: boolean; onClick: () => void; couleur?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        padding: "0 13px",
        borderRadius: 999,
        border: `1px solid ${on ? "var(--ls-bbc-text)" : "var(--ls-bbc-line)"}`,
        background: "var(--ls-bbc-s1)",
        color: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)",
        fontFamily: "var(--ls-bbc-font-body)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {couleur ? <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: couleur, flex: "none" }} /> : null}
      {children}
    </button>
  );
}

function Ligne({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
      <span aria-hidden="true" style={{ flex: "none", width: 12, height: 12, borderRadius: 999, background: couleur }} />
      <span>{children}</span>
    </div>
  );
}

/** La feuille bas d'écran du mode BBC — même patron que les autres. */
function Feuille({ titre, sous, onClose, children }: { titre: string; sous?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau}>
        <div style={{ width: 40, height: 5, borderRadius: 9, background: "var(--ls-bbc-line2)", margin: "10px auto 4px", flex: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1 }}>{titre}</div>
            {sous ? (
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 }}>{sous}</div>
            ) : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "4px 18px calc(18px + env(safe-area-inset-bottom))" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const fleche: CSSProperties = {
  flex: "none", width: 44, height: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line)",
  background: "var(--ls-bbc-s1)", color: "var(--ls-bbc-text)", fontSize: 18, cursor: "pointer", minHeight: 44,
};
const boutonAuj: CSSProperties = {
  flex: "none", height: 44, minHeight: 44, padding: "0 12px", borderRadius: 12, border: "1px solid var(--ls-bbc-lime)",
  background: "transparent", color: "var(--ls-bbc-lime-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const rangeeCoachs: CSSProperties = {
  display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2,
};
const teteJours: CSSProperties = {
  position: "sticky", top: 0, zIndex: 2, display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
  background: "var(--ls-bbc-bg)", padding: "8px 0 6px",
};
const ligneSemaine: CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderTop: "1px solid var(--ls-bbc-line)",
};
const caseJour: CSSProperties = {
  minWidth: 0, minHeight: 104, padding: "4px 2px 6px", border: 0, borderRadius: 8, background: "transparent",
  color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", textAlign: "left", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2,
};
const numero: CSSProperties = {
  display: "block", width: 26, height: 26, margin: "0 auto 3px", borderRadius: 999, textAlign: "center",
  lineHeight: "26px", fontSize: 13, fontWeight: 700,
};
const pastille: CSSProperties = {
  display: "block", margin: "0 1px", padding: "2px 4px", borderRadius: 4, fontSize: 11, lineHeight: 1.25, fontWeight: 600,
  whiteSpace: "nowrap", overflow: "hidden", color: "var(--ls-bbc-text)",
};
const ligneRdv: CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 60, padding: "10px 0",
  border: 0, borderBottom: "1px solid var(--ls-bbc-line)", background: "transparent", color: "var(--ls-bbc-text)",
  textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer",
};
const vide: CSSProperties = { padding: "22px 0", textAlign: "center", fontSize: 13, color: "var(--ls-bbc-hint)" };
const lienAction: CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 12,
  border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, textDecoration: "none",
};
const voile: CSSProperties = {
  position: "fixed", inset: 0, zIndex: 60, background: "rgba(8, 20, 18, .6)", display: "flex", alignItems: "flex-end", justifyContent: "center",
};
const panneau: CSSProperties = {
  width: "min(560px, 100%)", maxHeight: "78vh", display: "flex", flexDirection: "column", overflow: "hidden",
  background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", color: "var(--ls-bbc-text)",
};
const croix: CSSProperties = {
  flex: "none", width: 44, height: 44, minHeight: 44, borderRadius: 99, border: 0, background: "var(--ls-bbc-s3)",
  color: "var(--ls-bbc-muted)", fontSize: 16, cursor: "pointer",
};
