// =============================================================================
// CalerChezUnCoach — poser un rendez-vous dans l'agenda d'un collègue.
//
// Sur la maquette validée par Thomas (`public/mockups/agenda-equipe.html`).
// Le cas qu'il a décrit : « Maria veut caler des RDV avec Mélanie qui lui fait
// la formation. Maria doit voir l'agenda et les dispos de Mélanie pour prendre
// les RDV d'elle-même. »
//
// ⚠️ CE QU'ON MONTRE, ET SURTOUT CE QU'ON NE MONTRE PAS.
// Règle de Thomas : « les coachs voient les créneaux libres, les créneaux avec
// RDV, mais PAS l'info du lead ». Cet écran ne reçoit du serveur que des
// couples [début, fin] (`creneaux_occupes`) — ni nom, ni motif, ni type. Il ne
// PEUT pas divulguer ce qu'il n'a pas.
//
// Il ne vit pas sur une route à lui : une entrée de menu de plus pour un geste
// hebdomadaire irait contre la règle « une feature = un seul endroit ». On
// l'ouvre depuis l'Agenda, en plein écran, comme la journée du mois.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  compterLibres,
  creneauxDuJour,
  enMinutes,
  type Creneau,
  type Plage,
} from "./creneauxLibres";
import {
  lireCoachsJoignables,
  lireCreneauxOccupes,
  type CoachJoignable,
} from "../../services/sb/creneauxCoach";
import { getSupabaseClient } from "../../services/supabaseClient";

/** Les bornes de la journée proposées par défaut, et le pas d'un créneau. */
const OUVERTURE = enMinutes("09:00")!;
const FERMETURE = enMinutes("19:00")!;
const PAS = 60;
const JOURS_PROPOSES = 14;

const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "Europe/Paris" });
const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris",
});
const HEURE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export interface CalerChezUnCoachProps {
  onFermer: () => void;
  /** Appelé après une réservation réussie — l'agenda se recharge. */
  onReserve?: () => void;
}

export function CalerChezUnCoach({ onFermer, onReserve }: CalerChezUnCoachProps) {
  const [coachs, setCoachs] = useState<CoachJoignable[]>([]);
  const [coach, setCoach] = useState<CoachJoignable | null>(null);
  const [occupees, setOccupees] = useState<Plage[] | null>(null);
  const [chargement, setChargement] = useState(false);
  const [jour, setJour] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [creneau, setCreneau] = useState<Date | null>(null);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<Date | null>(null);

  useEffect(() => {
    void (async () => {
      const liste = await lireCoachsJoignables();
      setCoachs(liste);
      if (liste.length === 1) setCoach(liste[0]);
    })();
  }, []);

  // Les plages occupées du coach choisi, sur les 14 prochains jours. On
  // recharge quand on change de coach — pas à chaque changement de jour : une
  // seule lecture couvre toute la bande.
  const charger = useCallback(async (c: CoachJoignable) => {
    setChargement(true);
    setOccupees(null);
    const du = new Date();
    const au = new Date();
    au.setDate(au.getDate() + JOURS_PROPOSES + 1);
    const r = await lireCreneauxOccupes(c.id, du, au);
    setOccupees(r);
    setChargement(false);
  }, []);

  useEffect(() => {
    if (coach) void charger(coach);
  }, [coach, charger]);

  const jours = useMemo(() => {
    const out: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < JOURS_PROPOSES; i += 1) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      // Dimanche exclu : le club est fermé, et personne ne reçoit ce jour-là.
      if (d.getDay() !== 0) out.push(d);
    }
    return out;
  }, []);

  const creneauxPour = useCallback(
    (d: Date): Creneau[] =>
      occupees === null
        ? []
        : creneauxDuJour({
            jour: d,
            ouvertureMin: OUVERTURE,
            fermetureMin: FERMETURE,
            pasMin: PAS,
            occupees,
            maintenant: new Date(),
          }),
    [occupees],
  );

  const creneauxDuJourChoisi = useMemo(() => creneauxPour(jour), [creneauxPour, jour]);

  const reserver = async () => {
    if (!coach || !creneau || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb.rpc("reserver_chez_un_coach", {
        p_coach: coach.id,
        p_debut: creneau.toISOString(),
        p_duree_min: PAS,
        p_motif: motif.trim() || null,
      });
      if (error) {
        // Le serveur revérifie le créneau : c'est le SEUL refus qui compte, et
        // il arrive quand quelqu'un a pris la place entre l'affichage et le tap.
        setErreur(
          /deja pris/i.test(error.message)
            ? "Ce créneau vient d'être pris. Choisis-en un autre — la liste est à jour."
            : error.message,
        );
        // On relit : la photo affichée n'est plus la bonne.
        if (coach) void charger(coach);
        setCreneau(null);
        return;
      }
      setFait(creneau);
      onReserve?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Réservation impossible.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Caler un rendez-vous chez un coach" style={cadre}>
      <header style={entete}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={surtitre}>Agenda d'équipe</div>
          <h2 style={titre}>Caler chez un coach</h2>
        </div>
        <button type="button" onClick={onFermer} aria-label="Fermer" style={croix}>✕</button>
      </header>

      <div style={corps}>
        {fait ? (
          <section style={carteFaite}>
            <h3 style={{ ...h3, color: "var(--ls-text)", fontSize: 18 }}>C'est calé ✓</h3>
            <p style={{ margin: "6px 0 0", color: "var(--ls-text-muted)", fontSize: 14 }}>
              Avec <strong style={{ color: "var(--ls-text)" }}>{coach?.prenom}</strong>,{" "}
              <strong style={{ color: "var(--ls-text)" }}>
                {JOUR_LONG.format(fait)} à {HEURE.format(fait)}
              </strong>.
            </p>
            <ul style={liste}>
              <li>Le créneau n'est plus proposé à personne.</li>
              <li>Il apparaît dans l'agenda de {coach?.prenom}, à ton nom.</li>
              <li>Le tunnel public du club ne peut plus le vendre.</li>
            </ul>
            <button type="button" onClick={onFermer} style={{ ...cta, marginTop: 14 }}>Fermer</button>
          </section>
        ) : (
          <>
            <section style={bloc}>
              <h3 style={h3}>Avec qui ?</h3>
              {coachs.length === 0 ? (
                <p style={aide}>Aucun coach joignable pour l'instant.</p>
              ) : (
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  {coachs.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={coach?.id === c.id}
                      onClick={() => { setCoach(c); setCreneau(null); setErreur(null); }}
                      style={puce(coach?.id === c.id)}
                    >
                      {c.prenom}
                    </button>
                  ))}
                </div>
              )}
              <p style={mur}>
                <strong style={{ color: "var(--ls-text)" }}>Tu vois quand il est pris, jamais avec qui.</strong>{" "}
                Aucun nom, aucun motif — seulement des créneaux occupés.
              </p>
            </section>

            {coach ? (
              <section style={bloc}>
                <h3 style={h3}>Quel jour ?</h3>
                {chargement ? (
                  <p style={aide}>Lecture de son agenda…</p>
                ) : occupees === null ? (
                  // ⚠️ « je ne sais pas » ≠ « sa journée est libre ». On refuse
                  // de proposer plutôt que d'inventer des créneaux.
                  <p style={{ ...aide, color: "var(--ls-coral)" }}>
                    Son agenda n'a pas pu être lu — on ne propose rien plutôt que de
                    te faire réserver à l'aveugle. Réessaie dans un instant.
                  </p>
                ) : (
                  <>
                    <div style={bandeJours}>
                      {jours.map((d) => {
                        const n = compterLibres(creneauxPour(d));
                        const actif = d.toDateString() === jour.toDateString();
                        return (
                          <button
                            key={d.toISOString()}
                            type="button"
                            aria-pressed={actif}
                            onClick={() => { setJour(d); setCreneau(null); }}
                            style={carteJour(actif)}
                          >
                            <span style={jourNom}>{JOUR_COURT.format(d).replace(".", "")}</span>
                            <span style={jourNum}>{d.getDate()}</span>
                            <span style={{ ...jourLibres, color: n === 0 ? "var(--ls-text-hint)" : "var(--ls-teal)" }}>
                              {n === 0 ? "complet" : `${n} libre${n > 1 ? "s" : ""}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={grilleCreneaux}>
                      {creneauxDuJourChoisi.map((c) => {
                        const choisi = creneau?.getTime() === c.debut.getTime();
                        return (
                          <button
                            key={c.debut.toISOString()}
                            type="button"
                            disabled={!c.libre}
                            aria-pressed={choisi}
                            onClick={() => { setCreneau(c.debut); setErreur(null); }}
                            style={boutonCreneau(c.libre, choisi)}
                          >
                            {HEURE.format(c.debut)}
                            {!c.libre ? <span style={srOnly}> — déjà pris</span> : null}
                          </button>
                        );
                      })}
                    </div>
                    {creneauxDuJourChoisi.every((c) => !c.libre) ? (
                      <p style={aide}>Rien de libre ce jour-là — essaie un autre.</p>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}

            {creneau ? (
              <section style={bloc}>
                <h3 style={h3}>On valide ?</h3>
                <p style={{ ...aide, marginBottom: 10 }}>
                  Avec <strong style={{ color: "var(--ls-text)" }}>{coach?.prenom}</strong>,{" "}
                  <strong style={{ color: "var(--ls-text)" }}>
                    {JOUR_LONG.format(creneau)} à {HEURE.format(creneau)}
                  </strong>. Il apparaîtra dans son agenda et bloquera le créneau.
                </p>
                <label htmlFor="motif" style={{ ...h3, display: "block" }}>Motif (facultatif)</label>
                <input
                  id="motif"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Formation, point business…"
                  maxLength={120}
                  style={champ}
                />
                {erreur ? <p style={messageErreur}>{erreur}</p> : null}
                <button type="button" onClick={() => void reserver()} disabled={envoi} style={cta}>
                  {envoi ? "…" : "Réserver ce créneau"}
                </button>
              </section>
            ) : erreur ? (
              <p style={messageErreur}>{erreur}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const cadre: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 80, background: "var(--ls-bg)",
  display: "flex", flexDirection: "column",
};
const entete: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, flex: "none",
  padding: "14px 16px 12px", paddingTop: "calc(14px + env(safe-area-inset-top))",
  borderBottom: "1px solid var(--ls-border)", background: "var(--ls-surface)",
};
const surtitre: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)", fontSize: 10.5,
  letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-text-hint)",
};
const titre: React.CSSProperties = {
  margin: "2px 0 0", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 21,
  lineHeight: 1.15, color: "var(--ls-text)",
};
const croix: React.CSSProperties = {
  flex: "none", width: 44, height: 44, borderRadius: 12, fontSize: 20, lineHeight: 1,
  border: "1px solid var(--ls-border2)", background: "var(--ls-surface2)",
  color: "var(--ls-text)", cursor: "pointer",
};
const corps: React.CSSProperties = {
  flex: 1, overflowY: "auto", padding: "14px 16px calc(30px + env(safe-area-inset-bottom))",
  maxWidth: 640, width: "100%", margin: "0 auto",
};
const bloc: React.CSSProperties = {
  background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
  borderRadius: 15, padding: 15, marginBottom: 12,
};
const carteFaite: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-lime) 12%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-lime) 45%, transparent)",
  borderRadius: 15, padding: 16,
};
const h3: React.CSSProperties = {
  margin: "0 0 9px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16,
  color: "var(--ls-text)",
};
const aide: React.CSSProperties = { margin: 0, fontSize: 13.5, color: "var(--ls-text-muted)" };
const mur: React.CSSProperties = {
  margin: "12px 0 0", padding: "11px 13px", borderRadius: 11, fontSize: 13, lineHeight: 1.5,
  background: "color-mix(in srgb, var(--ls-teal) 8%, transparent)",
  borderLeft: "3px solid var(--ls-teal)", color: "var(--ls-text-muted)",
};
const puce = (on: boolean): React.CSSProperties => ({
  minHeight: 42, padding: "0 15px", borderRadius: 999, cursor: "pointer",
  fontFamily: "DM Sans, sans-serif", fontSize: 14, fontWeight: on ? 700 : 600,
  border: `1px solid ${on ? "var(--ls-teal)" : "var(--ls-border2)"}`,
  background: on ? "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface2))" : "var(--ls-surface2)",
  color: on ? "var(--ls-text)" : "var(--ls-text-muted)",
});
const bandeJours: React.CSSProperties = {
  display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 12,
};
const carteJour = (on: boolean): React.CSSProperties => ({
  flex: "none", minWidth: 62, minHeight: 58, padding: "7px 4px", borderRadius: 12,
  cursor: "pointer", textAlign: "center", fontFamily: "DM Sans, sans-serif",
  border: `1px solid ${on ? "var(--ls-teal)" : "var(--ls-border2)"}`,
  background: on ? "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface2))" : "var(--ls-surface2)",
  color: "var(--ls-text)",
});
const jourNom: React.CSSProperties = {
  display: "block", fontFamily: "var(--lb360-mono, monospace)", fontSize: 10,
  textTransform: "uppercase", color: "var(--ls-text-hint)",
};
const jourNum: React.CSSProperties = {
  display: "block", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, lineHeight: 1.25,
};
const jourLibres: React.CSSProperties = {
  display: "block", fontFamily: "var(--lb360-mono, monospace)", fontSize: 9.5,
};
const grilleCreneaux: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 7,
};
const boutonCreneau = (libre: boolean, choisi: boolean): React.CSSProperties => ({
  minHeight: 46, borderRadius: 11, cursor: libre ? "pointer" : "not-allowed",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)", fontSize: 13.5,
  fontWeight: choisi ? 700 : 500,
  border: `1px ${libre ? "solid" : "dashed"} ${choisi ? "var(--ls-teal)" : "var(--ls-border2)"}`,
  background: choisi ? "var(--ls-teal)" : libre ? "var(--ls-surface2)" : "transparent",
  color: choisi ? "var(--ls-bg)" : libre ? "var(--ls-text)" : "var(--ls-text-hint)",
  textDecoration: libre ? "none" : "line-through",
});
const champ: React.CSSProperties = {
  width: "100%", minHeight: 44, padding: "0 12px", borderRadius: 11, marginBottom: 12,
  border: "1px solid var(--ls-border2)", background: "var(--ls-surface2)",
  color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif", fontSize: 14.5,
};
const cta: React.CSSProperties = {
  width: "100%", minHeight: 50, borderRadius: 13, cursor: "pointer",
  fontFamily: "DM Sans, sans-serif", fontSize: 15.5, fontWeight: 700,
  background: "var(--ls-teal)", color: "var(--ls-bg)", border: "1px solid var(--ls-teal)",
};
const messageErreur: React.CSSProperties = {
  margin: "0 0 10px", padding: "10px 12px", borderRadius: 10, fontSize: 13.5,
  background: "color-mix(in srgb, var(--ls-coral) 12%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  color: "var(--ls-text)",
};
const liste: React.CSSProperties = {
  margin: "10px 0 0", paddingLeft: 19, fontSize: 13.5, lineHeight: 1.65,
  color: "var(--ls-text-muted)",
};
const srOnly: React.CSSProperties = {
  position: "absolute", width: 1, height: 1, overflow: "hidden",
  clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
};
