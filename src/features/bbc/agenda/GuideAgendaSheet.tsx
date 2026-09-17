// =============================================================================
// « L'agenda, mode d'emploi » — une minute, pour lâcher TimeTree (étape 10).
//
// POURQUOI ICI ET PAS UNE ANNONCE : l'équipe ne lit pas les `app_announcements`
// (Thomas, 13/06), le mode BBC ne les affiche même pas, et leur audience ne sait
// viser que « tous / distri / admin » — pas « le club ». Le mode d'emploi vit
// donc LÀ OÙ L'ON S'EN SERT, derrière un « ? » toujours visible : jamais de
// popup qui s'ouvre tout seul (règle du 2026 : « c'est chiant »).
//
// Le texte répond à la vraie question de l'équipe — « et TimeTree ? » — et dit
// ce que l'agenda fait que TimeTree ne fera jamais : le rappel au client, le
// site qui connaît les dispos, la suite donnée à chaque rendez-vous.
// =============================================================================

import type { CSSProperties, ReactNode } from "react";
import type { CoachRattache } from "../useCoachsDuClub";

interface Props {
  coachs: CoachRattache[];
  couleur: (id: string | null) => string;
  onClose: () => void;
}

export function GuideAgendaSheet({ coachs, couleur, onClose }: Props) {
  return (
    <div style={voile} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bbc-mode" style={panneau} role="dialog" aria-modal="true" aria-label="L'agenda, mode d'emploi">
        <div style={{ width: 40, height: 5, borderRadius: 9, background: "var(--ls-bbc-line2)", margin: "10px auto 4px", flex: "none" }} />
        <div style={entete}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1 }}>L'agenda, mode d'emploi</div>
            <div style={sousTitre}>une minute · on lâche TimeTree</div>
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
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Et TimeTree ?</div>
            On n'y met plus rien. Ce que l'agenda fait et que TimeTree ne fera jamais :
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
              <li>la personne reçoit son <b>rappel par mail la veille</b> (si tu as noté son mail) ;</li>
              <li>le <b>site du club</b> ne propose que tes heures vraiment libres ;</li>
              <li>chaque rendez-vous a une <b>suite</b> : membre, relance ou perdue — plus de lead oublié.</li>
            </ul>
            <div style={{ marginTop: 10, fontWeight: 700, color: "var(--ls-bbc-text)" }}>La règle : un rendez-vous qui n'est pas ici n'existe pas.</div>
          </div>

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
const boutonPlein: CSSProperties = { flex: "none", width: "100%", minHeight: 52, border: 0, borderRadius: 14, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15.5, fontWeight: 800, cursor: "pointer" };
