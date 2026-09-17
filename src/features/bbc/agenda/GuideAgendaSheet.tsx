// =============================================================================
// « L'agenda, mode d'emploi » — une minute pour bien démarrer (étape 10).
//
// ⚠️ LE TON (Thomas, 17/09, en relisant la 1re version) : « tu es dur avec
// TimeTree, je n'impose rien, je propose juste un outil ». Ce texte PROPOSE :
// ni « on lâche TimeTree », ni date butoir, ni « un RDV qui n'est pas ici
// n'existe pas ». On dit ce que l'outil apporte, et on laisse chacune l'essayer.
// Il sert aussi aux NOUVELLES coachs : rien qui date le texte.
//
// POURQUOI ICI ET PAS UNE ANNONCE : l'équipe ne lit pas les `app_announcements`
// (Thomas, 13/06), le mode BBC ne les affiche même pas, et leur audience ne sait
// viser que « tous / distri / admin » — pas « le club ». Le mode d'emploi vit
// donc LÀ OÙ L'ON S'EN SERT, derrière un « ? » toujours visible : jamais de
// popup qui s'ouvre tout seul (règle du 2026 : « c'est chiant »).
//
// Le texte dit ce que l'agenda apporte EN PLUS d'un agenda personnel : le
// rappel au client, le site qui connaît les dispos, la suite donnée à chaque
// rendez-vous — sans rien demander d'abandonner.
// =============================================================================

import { useState, type CSSProperties, type ReactNode } from "react";
import type { CoachRattache } from "../useCoachsDuClub";
import { envoyerModeEmploi } from "./envoyerModeEmploi";

interface Props {
  coachs: CoachRattache[];
  couleur: (id: string | null) => string;
  userId?: string | null;
  /** Propriétaire du club ou admin : peut envoyer le mode d'emploi par mail. */
  peutEnvoyer: boolean;
  onClose: () => void;
}

export function GuideAgendaSheet({ coachs, couleur, userId, peutEnvoyer, onClose }: Props) {
  // L'envoi par mail — pour la coach qui arrive, ou celle qui préfère le lire
  // tranquillement. Deux gestes (choisir, puis envoyer) : un mail ne part
  // jamais sur un appui malheureux.
  const [choisie, setChoisie] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const prenomChoisie = coachs.find((c) => c.id === choisie)?.prenom ?? "";

  async function envoyer() {
    if (!choisie || envoi) return;
    setEnvoi(true);
    setRetour(null);
    const res = await envoyerModeEmploi(choisie);
    setEnvoi(false);
    setRetour(res.ok ? { ok: true, texte: `Envoyé à ${choisie === userId ? "toi" : prenomChoisie} ✓` } : { ok: false, texte: res.message });
    if (res.ok) setChoisie(null);
  }

  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau} role="dialog" aria-modal="true" aria-label="L'agenda, mode d'emploi">
        <div style={{ width: 40, height: 5, borderRadius: 9, background: "var(--ls-bbc-line2)", margin: "10px auto 4px", flex: "none" }} />
        <div style={entete}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1 }}>L'agenda, mode d'emploi</div>
            <div style={sousTitre}>une minute · pour bien démarrer</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={croix}>
            ✕
          </button>
        </div>

        <div style={corps}>
          <Point emoji="👀" titre="Tout le club, d'un coup d'œil">
            Chacune voit les rendez-vous de toute l'équipe, avec les noms. Une couleur par coach :
            <span style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 8 }}>
              {coachs.map((c) => (
                <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--ls-bbc-text)" }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: couleur(c.id) }} />
                  {c.prenom}
                </span>
              ))}
            </span>
          </Point>

          <Point emoji="＋" titre="Caler un rendez-vous">
            Le <b>＋</b> en bas à droite. Tu choisis le type, puis <b>⚡ au plus tôt</b> ou un jour : seuls les créneaux <b>libres</b> de chaque coach s'affichent. Tu cherches la personne dans tes contacts (ou tu la crées), et c'est calé. Si c'est chez une autre, elle est prévenue.
          </Point>

          <Point emoji="👆" titre="Encore plus vite : la vue Jour">
            Une colonne par coach. Tu touches un trou dans la colonne de Romane à 11 h : le rendez-vous se cale chez elle, à 11 h.
          </Point>

          <Point emoji="✅" titre="Toucher un rendez-vous = lui donner une suite">
            ☕ elle prend sa carte · 📋 suivi classique · 🕓 pas encore (tu choisis quand elle revient dans ta liste d'appels) · 🚫 pas venue. C'est aussi là qu'on le <b>déplace</b>. Un rendez-vous passé sans suite reste en rouge : il t'attend.
          </Point>

          <Point emoji="🚫" titre="Pas dispo">
            ＋ puis <b>Pas dispo</b> : le matin, l'après-midi ou la journée. Plus personne ne cale rien dessus — et le site du club ne propose plus ces heures. Pour l'enlever, tu la touches puis « Libérer ».
          </Point>

          <Point emoji="☕" titre="Le club, ce jour-là">
            Le ☕ dit qui ouvre le bar (en orange s'il n'y a personne). On y voit les heures de réservation du jour, les jours fermés, et les rituels du soir en violet.
          </Point>

          <div style={encart}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Ce que ça t'apporte</div>
            Un rendez-vous noté ici travaille pour toi :
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
              <li>la personne reçoit son <b>rappel par mail la veille</b> (si tu as noté son mail) ;</li>
              <li>le <b>site du club</b> ne propose que tes heures vraiment libres ;</li>
              <li>chaque rendez-vous a une <b>suite</b> : membre, relance ou perdue — plus de lead oublié.</li>
            </ul>
            <div style={{ marginTop: 10, color: "var(--ls-bbc-text)" }}>
              Tu as déjà ton agenda (TimeTree ou autre) ? Aucun souci : c'est un outil de plus, pas une obligation. Essaie-le sur tes prochains rendez-vous, et dis-nous ce qui manque.
            </div>
          </div>

          {peutEnvoyer ? (
            <div style={blocEnvoi}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>✉️ L'envoyer par mail</div>
              <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.5, marginTop: 3 }}>
                Le même mode d'emploi, avec des visuels. Pour une coach qui arrive, ou qui préfère le lire tranquillement. À renvoyer autant de fois que tu veux.
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {coachs.map((c) => {
                  const on = c.id === choisie;
                  return (
                    <button key={c.id} type="button" aria-pressed={on} onClick={() => { setChoisie(on ? null : c.id); setRetour(null); }} style={{ ...puce, borderColor: on ? couleur(c.id) : "var(--ls-bbc-line)", background: on ? "var(--ls-bbc-s3)" : "var(--ls-bbc-s1)", color: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)" }}>
                      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: couleur(c.id), flex: "none" }} />
                      {c.id === userId ? "Moi (pour voir)" : c.prenom}
                    </button>
                  );
                })}
              </div>
              {choisie ? (
                <button type="button" onClick={() => void envoyer()} disabled={envoi} style={{ ...boutonEnvoi, opacity: envoi ? 0.6 : 1 }}>
                  {envoi ? "Envoi…" : `Envoyer à ${choisie === userId ? "moi" : prenomChoisie}`}
                </button>
              ) : null}
              {retour ? <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 700, color: retour.ok ? "var(--ls-bbc-lime-text)" : "var(--ls-bbc-coral)" }}>{retour.texte}</div> : null}
            </div>
          ) : null}

          <button type="button" onClick={onClose} style={boutonPlein}>
            C'est compris
          </button>
        </div>
      </div>
    </div>
  );
}

function Point({ emoji, titre, children }: { emoji: string; titre: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span aria-hidden="true" style={pastille}>
        {emoji}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{titre}</div>
        <div style={{ fontSize: 13.5, color: "var(--ls-bbc-muted)", lineHeight: 1.55, marginTop: 3 }}>{children}</div>
      </div>
    </div>
  );
}

const voile: CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(8, 20, 18, .74)", display: "flex", alignItems: "flex-end", justifyContent: "center" };
const panneau: CSSProperties = {
  width: "100%", maxWidth: 560, maxHeight: "92dvh", display: "flex", flexDirection: "column", background: "var(--ls-bbc-s1)", color: "var(--ls-bbc-text)",
  borderRadius: "22px 22px 0 0", border: "1px solid var(--ls-bbc-line)", borderBottom: 0, fontFamily: "var(--ls-bbc-font-body)",
};
const entete: CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "6px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)", flex: "none" };
const sousTitre: CSSProperties = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 };
const croix: CSSProperties = { flex: "none", width: 44, height: 44, minHeight: 44, borderRadius: 99, border: 0, background: "var(--ls-bbc-s3)", color: "var(--ls-bbc-muted)", fontSize: 16, cursor: "pointer" };
const corps: CSSProperties = { flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "16px 18px calc(18px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 16 };
const pastille: CSSProperties = { flex: "none", width: 40, height: 40, borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 };
const encart: CSSProperties = { padding: "14px 16px", borderRadius: 16, border: "1px solid var(--ls-bbc-lime)", background: "color-mix(in srgb, var(--ls-bbc-lime) 8%, var(--ls-bbc-s2))", fontSize: 13.5, color: "var(--ls-bbc-muted)", lineHeight: 1.55 };
const blocEnvoi: CSSProperties = { padding: "14px 16px", borderRadius: 16, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)" };
const puce: CSSProperties = { display: "flex", alignItems: "center", gap: 7, minHeight: 44, padding: "0 13px", borderRadius: 11, border: "1px solid", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const boutonEnvoi: CSSProperties = { width: "100%", minHeight: 48, marginTop: 10, borderRadius: 13, border: "1px solid var(--ls-bbc-lime)", background: "transparent", color: "var(--ls-bbc-lime-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 14.5, fontWeight: 800, cursor: "pointer" };
const boutonPlein: CSSProperties = { flex: "none", width: "100%", minHeight: 52, border: 0, borderRadius: 14, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15.5, fontWeight: 800, cursor: "pointer" };
