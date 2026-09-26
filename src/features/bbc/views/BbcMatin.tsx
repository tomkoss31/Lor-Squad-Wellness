// =============================================================================
// « Le matin » — le premier écran du club, construit sur la journée de Thomas
// (18/09/2026), dans l'ordre où il l'a racontée et sur rien d'autre :
//   1. son PROCHAIN rendez-vous, en gros (le propriétaire de l'espace, pas l'équipe) ;
//   2. les rendez-vous du jour de toute l'équipe ;
//   3. ce qui est arrivé cette nuit : les leads qui attendent, les messages ;
//   4. pointer les habituées (le ＋ de la barre a la feuille complète) ;
//   5. « Contacter aujourd'hui » — le trou : 20 contacts par jour, remplis par l'app ;
//   6. la prochaine étape des membres (bilan des 10, appels, cœurs).
// Remplace le Cockpit (Cobayes du jour 0/20, bannière Formation, cœurs, appel).
// Maquette validée : scratchpad/maquette-bbc-cliquable.html, v7.
// =============================================================================

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { Club } from "../../../types/domain";
import { useAppContext } from "../../../context/AppContext";
import { useCoachsDuClub } from "../useCoachsDuClub";
import { useAgendaDuClub } from "../agenda/useAgendaDuClub";
import { couleurCoach, estIndispo, heureDe, jourDe, libelleNature, nomComplet, parJour, cleJour, sansIndispos, type RdvClub } from "../agenda/agendaClub";
import { useMaintenant } from "../agenda/useMaintenant";
import { useBbcVisits, visitLevel } from "../useBbcVisits";
import type { AContacter } from "../contacter";
import { Carte, Ligne, Rond, Toast, Vide } from "../ui";
import { CaisseSheet } from "../caisse/CaisseSheet";
import { euro } from "../caisse/caisse";
import { XpNiveauxCarte } from "../../client-xp/XpNiveauxCarte";

export type VueCible = "agenda" | "contacter" | "crm" | "club" | "messages" | "appels" | "plus";

interface Props {
  userId?: string;
  club: Club | null;
  contacts: AContacter[];
  faits: Set<string>;
  count: number;
  target: number;
  onGo: (v: VueCible) => void;
  onContact: (c: AContacter) => void;
  onLiens: () => void;
  /** Venue / Pas venue sur le prochain rendez-vous : la question de l'agenda, ici même (livraison C). */
  onQualifier: (rdv: RdvClub, etape: "choix" | "pasvenue") => void;
  /** Ouvre la fiche d'une membre dans « Membres », sur sa prochaine étape. */
  onMembre: (id: string) => void;
  /** Le journal de la coach elle-même (22/09) : la carte « Mon journal », en tête. */
  monJournal?: ReactNode;
}

export function BbcMatin({ userId, club, contacts, faits, count, target, onGo, onContact, onLiens, onQualifier, onMembre, monJournal }: Props) {
  const { unreadMessageCount } = useAppContext();
  // L'heure est VIVANTE : l'app reste ouverte au comptoir, parfois toute la
  // nuit. Sans ça, « aujourd'hui » restait figé sur le jour du montage.
  const now = useMaintenant();
  const cleAuj = cleJour(new Date(now));
  const debut = useMemo(() => jourDe(cleAuj), [cleAuj]);
  const fin = useMemo(() => { const d = new Date(debut); d.setDate(d.getDate() + 2); return d; }, [debut]);
  const { rdvs, loading } = useAgendaDuClub(debut, fin, userId);
  const { coachs } = useCoachsDuClub(userId);
  const prenom = (id: string | null) => coachs.find((c) => c.id === id)?.prenom ?? "le club";
  const parJ = parJour(rdvs);
  const jour = sansIndispos(parJ.get(cleAuj) ?? []);
  const demain = new Date(debut); demain.setDate(demain.getDate() + 1);
  const nbDemain = sansIndispos(parJ.get(cleJour(demain)) ?? []).length;
  const miens = jour.filter((r) => r.coachId === userId);
  // Un rendez-vous terminé reste en tête UNE HEURE — le temps de dire comment
  // ça s'est passé (Thomas, 18/09 : « le rdv passé, tu le laisses max 1 h après
  // pour la qualif »). Passé ce délai il redescend dans la journée, et on
  // remonte le suivant : celui de 14 h 30 ne devait plus trôner à 16 h 51.
  const FENETRE_QUALIF = 60 * 60 * 1000;
  const aVenirAMoi = miens.find((r) => new Date(r.fin).getTime() > now);
  const finiRecent = [...miens].reverse().find((r) => {
    const f = new Date(r.fin).getTime();
    return f <= now && now - f <= FENETRE_QUALIF;
  });
  const prochain: RdvClub | undefined = aVenirAMoi ?? finiRecent ?? jour.find((r) => new Date(r.fin).getTime() > now);
  const autres = jour.filter((r) => r !== prochain);
  const dans = prochain ? Math.round((new Date(prochain.debut).getTime() - now) / 60000) : 0;
  const fini = prochain ? new Date(prochain.fin).getTime() <= now : false;

  const visites = useBbcVisits(userId, club?.id ?? null);
  const aPointer = [...visites.members].sort((a, b) => Number(a.visitedToday) - Number(b.visitedToday) || (b.card?.used ?? 0) - (a.card?.used ?? 0)).slice(0, 8);
  const pointes = visites.members.filter((m) => m.visitedToday).length;
  // « Elle prend quelque chose ? » après un « + » réussi (lot 1 du comptoir, 26/09).
  const [caissePour, setCaissePour] = useState<{ id: string; prenom: string } | null>(null);
  const [mot, setMot] = useState<string | null>(null);
  useEffect(() => {
    if (!mot) return;
    const t = window.setTimeout(() => setMot(null), 2600);
    return () => window.clearTimeout(t);
  }, [mot]);

  async function pointer(id: string, nom: string) {
    const r = await visites.addVisit(id);
    const lePrenom = (r.name || nom).trim().split(/\s+/)[0] || nom;
    if (!r.ok) setMot(`Le pointage de ${lePrenom} n'est pas parti — réessaie.`);
    else if (r.alreadyCounted) setMot(`${lePrenom} était déjà pointé·e il y a moins de 10 min.`);
    else setCaissePour({ id, prenom: lePrenom });
  }

  const aFaire = contacts.filter((c) => !faits.has(c.key));
  const aujourdhuiListe = [...aFaire.slice(0, 5)];
  const urgents = aFaire.filter((c) => c.raison === "lead_nouveau");
  const etapes = visites.members.filter((m) => m.card && (m.card.used >= m.card.type - 1)).slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 760 }}>
      {/* 0 · Son journal à elle (22/09, maquette validée) : la même carte que l'accueil des membres */}
      {monJournal}
      {/* 1 · Ton prochain rendez-vous — le propriétaire de l'espace d'abord */}
      {loading ? null : prochain ? (
        <div className="bbc-carte" style={hero}>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-orange2)" }}>
            {fini ? "À qualifier" : miens.includes(prochain) ? "Ton prochain rendez-vous" : "Prochain rendez-vous du club"} · {fini ? "vient de se terminer" : dans > 0 ? `dans ${dans >= 60 ? `${Math.floor(dans / 60)} h${dans % 60 ? ` ${dans % 60} min` : ""}` : `${dans} min`}` : "en cours"}
          </div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 30, lineHeight: 1, letterSpacing: ".01em", textTransform: "uppercase" }}>
            {heureDe(prochain.debut)} · {nomComplet(prochain)}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{libelleNature(prochain)} · avec {prenom(prochain.coachId)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" className="bbc-pression" onClick={() => onQualifier(prochain, "choix")} style={{ ...heroBtn, background: "var(--ls-bbc-grad)", boxShadow: "var(--ls-bbc-grad-ombre)", border: 0, color: "#fff" }}>Venue</button>
            <button type="button" className="bbc-pression" onClick={() => onQualifier(prochain, "pasvenue")} style={heroBtn}>Pas venue</button>
            <button type="button" className="bbc-pression" onClick={() => onGo("agenda")} style={heroBtn}>La journée</button>
          </div>
        </div>
      ) : null}

      {/* 2 · Aujourd'hui · toute l'équipe — TOUJOURS là, même sans rendez-vous
          en tête : c'est la carte qui remplace TimeTree le matin. */}
      {!loading ? (
        <Carte eye="Aujourd'hui · toute l'équipe" right={`${jour.length} RDV · ${miens.length} à toi`}>
          {autres.length === 0 ? (
            <Vide>{jour.length ? "Rien d'autre aujourd'hui." : "Aucun rendez-vous aujourd'hui. Le ＋ en bas en cale un."}</Vide>
          ) : (
            autres.map((r) => (
              <Ligne
                key={`${r.source}-${r.id}`}
                avant={<span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: "var(--ls-bbc-muted)", minWidth: 44 }}>{heureDe(r.debut)}</span>}
                titre={estIndispo(r) ? `${prenom(r.coachId)} · ${nomComplet(r).toLowerCase()}` : `${nomComplet(r)} · ${libelleNature(r)}`}
                sous={estIndispo(r) ? `jusqu'à ${heureDe(r.fin)}` : `avec ${prenom(r.coachId)}`}
                action={<span style={{ width: 28, height: 28, borderRadius: 999, display: "inline-grid", placeItems: "center", background: couleurCoach(r.coachId, coachs), color: "#fff", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700 }}>{prenom(r.coachId).slice(0, 2)}</span>}
                onClick={() => onGo("agenda")}
              />
            ))
          )}
          <div style={pied}>
            <span>Demain : {nbDemain} RDV</span>
            <button type="button" onClick={() => onGo("agenda")} style={lien}>L'agenda →</button>
          </div>
        </Carte>
      ) : null}

      {/* 3 · Arrivé cette nuit — les leads qui attendent, les messages */}
      <Carte eye="Arrivé cette nuit" tone={urgents.some((c) => (c.attenteMin ?? 0) >= 120) ? "trou" : undefined} right={`${urgents.length} lead${urgents.length > 1 ? "s" : ""} · ${unreadMessageCount ?? 0} message${(unreadMessageCount ?? 0) > 1 ? "s" : ""}`}>
        {urgents.length === 0 && !(unreadMessageCount ?? 0) ? <Vide>Rien de nouveau. C'est le moment de contacter, en dessous.</Vide> : null}
        {urgents.slice(0, 4).map((c) => (
          <Ligne
            key={c.key}
            avant={<Rond tone="lead">{c.lead?.viaName ? "♥" : c.lead?.source === "bilan-online" ? "B" : "M"}</Rond>}
            titre={c.nomComplet}
            sous={c.texte}
            sousTone={(c.attenteMin ?? 0) >= 120 ? "alerte" : undefined}
            action={c.geste === "appeler" ? "Appeler" : "Écrire"}
            actionTone={c.geste === "appeler" ? "fort" : "teal"}
            onClick={() => onContact(c)}
          />
        ))}
        {(unreadMessageCount ?? 0) > 0 ? (
          <Ligne avant={<Rond tone="msg">✉</Rond>} titre={`${unreadMessageCount} message${(unreadMessageCount ?? 0) > 1 ? "s" : ""} de membres`} sous="à lire et à répondre" action="Répondre" actionTone="teal" onClick={() => onGo("messages")} />
        ) : null}
      </Carte>

      {/* 4 · Pointer — les habituées, 1 tap = +1 ; la feuille complète est dans le ＋ */}
      <Carte eye="Pointer" right={visites.loading ? "" : `${pointes} / ${visites.members.length} ce matin · 1 tap = +1`}>
        {visites.loading ? (
          <Vide>chargement…</Vide>
        ) : visites.members.length === 0 ? (
          <Vide>Aucun membre BBC. Le ＋ en bas ouvre la fiche papier.</Vide>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, paddingTop: 2 }}>
            {aPointer.map((m) => {
              const lvl = visitLevel(m.card?.used ?? 0, m.card?.type);
              const fait = m.visitedToday;
              return (
                <button
                  key={m.id}
                  type="button"
                  className="bbc-pression"
                  onClick={() => (fait ? undefined : void pointer(m.id, m.name))}
                  aria-label={`${m.name}${fait ? ", déjà pointée" : ", pointer une visite"}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 7px 6px 11px", borderRadius: 999,
                    background: lvl === "bilan" || lvl === "warn" ? "var(--ls-bbc-jaune)" : "var(--ls-bbc-s2)",
                    color: lvl === "bilan" || lvl === "warn" ? "#1E3330" : "var(--ls-bbc-text)",
                    border: "1px solid var(--ls-bbc-line)", fontSize: 13, fontWeight: 500, fontFamily: "var(--ls-bbc-font-body)", cursor: fait ? "default" : "pointer", opacity: fait ? 0.55 : 1,
                  }}
                >
                  {m.name.split(" ")[0]}
                  <small style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: lvl === "bilan" || lvl === "warn" ? "#55605A" : "var(--ls-bbc-muted)" }}>
                    {m.card ? `${m.card.used}/${m.card.type}` : m.visits}{lvl === "bilan" ? " · bilan" : ""}
                  </small>
                  <i style={{ fontStyle: "normal", display: "inline-grid", placeItems: "center", width: 24, height: 24, borderRadius: 999, background: fait ? "var(--ls-bbc-s3)" : "var(--ls-bbc-orange)", color: fait ? "var(--ls-bbc-muted)" : "#fff", fontWeight: 700, fontSize: 13 }}>{fait ? "✓" : "+"}</i>
                </button>
              );
            })}
          </div>
        )}
        <div style={pied}>
          <span>Quelqu'un d'autre ? Le ＋ en bas, puis Pointer.</span>
          <button type="button" onClick={() => onGo("club")} style={lien}>Les visites →</button>
        </div>
      </Carte>

      {/* 5 · Contacter aujourd'hui — le trou */}
      <Carte eye="Contacter aujourd'hui" tone="trou" right={<span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, color: count >= target ? "var(--ls-bbc-sage)" : "var(--ls-bbc-orange-text)", letterSpacing: ".02em" }}>{count} / {target}</span>}>
        {aujourdhuiListe.length === 0 ? (
          <Vide>{count >= target ? "20 contacts, objectif du jour atteint 👏" : "Personne à contacter pour l'instant : l'app remplit la liste avec les leads, les relances, la 9e visite, les cœurs."}</Vide>
        ) : (
          aujourdhuiListe.map((c) => (
            <Ligne
              key={c.key}
              avant={<Rond tone={c.geste === "appeler" ? "lead" : "msg"}>{c.geste === "appeler" ? "📞" : "💬"}</Rond>}
              titre={c.nomComplet}
              sous={c.texte}
              sousTone={c.raison === "lead_nouveau" && (c.attenteMin ?? 0) >= 120 ? "alerte" : undefined}
              action={c.geste === "appeler" ? "Appeler" : "✨ Écrire"}
              actionTone={c.geste === "appeler" ? "fort" : "neutre"}
              onClick={() => onContact(c)}
            />
          ))
        )}
        <div style={{ height: 6, borderRadius: 999, background: "var(--ls-bbc-s3)", overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: `${Math.min(100, Math.round((count / target) * 100))}%`, background: count >= target ? "var(--ls-bbc-sage)" : "var(--ls-bbc-orange)", transition: "width .5s cubic-bezier(.32,.72,0,1)" }} />
        </div>
        <div style={pied}>
          <span>{aFaire.length} à contacter · {count} fait{count > 1 ? "s" : ""} aujourd'hui</span>
          <button type="button" onClick={() => onGo("contacter")} style={lien}>Tout voir →</button>
        </div>
      </Carte>

      {/* 6 · Tes membres · prochaine étape */}
      <Carte eye="Tes membres · prochaine étape" tone="plein" right={<button type="button" onClick={() => onGo("crm")} style={lien}>Les {visites.members.length} →</button>}>
        {etapes.length === 0 ? (
          <Vide>Personne à sa 9e ou 10e visite pour l'instant. La prochaine étape de chacune est dans sa fiche, volet « Prochaine étape ».</Vide>
        ) : (
          etapes.map((m) => (
            <Ligne
              key={m.id}
              avant={<span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: "var(--ls-bbc-muted)", minWidth: 44 }}>{m.card ? `${m.card.used}/${m.card.type}` : ""}</span>}
              titre={m.name}
              sous={m.card && m.card.used >= m.card.type ? "Carte finie · bilan à faire, carte suivante à proposer" : `À sa ${m.card?.used}e visite · proposer le bilan de la ${m.card?.type}e`}
              action={m.card && m.card.used >= m.card.type ? "Bilan" : "Ouvrir"}
              actionTone={m.card && m.card.used >= m.card.type ? "fort" : "neutre"}
              onClick={() => onMembre(m.id)}
            />
          ))
        )}
        <div style={pied}>
          <span>Cœurs et appels : dans la fiche de chaque membre.</span>
          <button type="button" onClick={() => onGo("appels")} style={lien}>Les appels →</button>
        </div>
      </Carte>

      {/* 6b · Les niveaux de tes membres (24/09) — qui vient de monter, qui n'a rien gagné
          depuis 14 jours. Un indicateur de régularité, jamais un chiffre du journal. */}
      <XpNiveauxCarte
        userId={userId}
        personnes={visites.members.map((m) => ({ id: m.id, nom: m.name }))}
        format="bbc"
        onOuvrir={onMembre}
        onTous={() => onGo("crm")}
      />

      {/* 7 · Tes liens — en attente, remontera « quand posé sur le BBC » */}
      <Carte eye="Tes liens" right={<button type="button" onClick={onLiens} style={lien}>Mes liens →</button>}>
        <Vide>Bilan en ligne · Réserver au club · Ta fiche. 1 tap = le message et le lien, prêts à envoyer.</Vide>
      </Carte>

      {caissePour ? (
        <CaisseSheet
          clientId={caissePour.id}
          prenom={caissePour.prenom}
          onClose={() => setCaissePour(null)}
          onVendu={(total) => setMot(`${caissePour.prenom} : ${euro(total)} d'achats notés ✓`)}
        />
      ) : null}
      <Toast message={mot} />
    </div>
  );
}

const hero: CSSProperties = {
  background: "var(--ls-bbc-text)", color: "var(--ls-bbc-bg)", borderRadius: 20, padding: "14px 14px 12px", display: "grid", gap: 8,
};
const heroBtn: CSSProperties = {
  flex: 1, fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, padding: "10px 0", borderRadius: 999,
  border: "1px solid color-mix(in srgb, var(--ls-bbc-bg) 25%, transparent)", background: "color-mix(in srgb, var(--ls-bbc-bg) 10%, transparent)", color: "var(--ls-bbc-bg)", cursor: "pointer",
};
const pied: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--ls-bbc-line2)", fontSize: 12, color: "var(--ls-bbc-muted)",
};
const lien: CSSProperties = {
  color: "var(--ls-bbc-orange-text)", fontWeight: 700, fontSize: 12.5, background: "none", border: 0, fontFamily: "var(--ls-bbc-font-body)", cursor: "pointer", padding: 0,
};
