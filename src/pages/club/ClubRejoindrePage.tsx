// Rejoindre l'équipe — « Deviens coach et crée ton propre club ».
//
// Copie fournie par Thomas le 14/08, appliquée telle quelle. Elle change la
// STRUCTURE et pas seulement les mots : le parcours passe de quatre étapes
// (« on se rencontre / tu testes / on te forme / tu ouvres ») à trois temps
// progressifs, et « Ce qu'on cherche » devient « Pour qui ? ».
//
// Aucun composant nouveau : mêmes cartes, mêmes pastilles, même rythme que le
// reste du site. C'est sa copie coulée dans le design existant, pas un design
// de plus à maintenir.
//
// ⚠ CE QUI EST CONSERVÉ SANS QU'IL L'AIT DEMANDÉ : la section « Ce qu'on ne te
// promet pas ». Sa copie ne la mentionne pas, mais ne demande pas non plus de
// la retirer — et elle dit la seule chose que personne d'autre ne dira à un
// candidat. Supprimer ce qu'on ne nous a pas demandé de supprimer, c'est
// l'erreur de la bande photo du 13/08. Elle reste, il tranchera.
import { ClubShell, InnerHero, TEL } from "./ClubShell";
import { CLUB_TEL } from "../../data/clubInfos";

/** Ce qu'on apprend pendant le stage — la liste de sa copie, dans l'ordre. */
const APPRENTISSAGES = [
  "accompagner tes premiers membres",
  "réaliser des bilans bien-être",
  "suivre les résultats",
  "créer une communauté",
  "développer ton activité progressivement",
];

const ETAPES: Array<{ n: string; t: string; d: string; d2?: string; liste?: string[]; top: string }> = [
  {
    n: "01",
    t: "Commence à ton rythme",
    d: "Tu débutes en tant que coach stagiaire, accompagné(e) par notre équipe.",
    liste: APPRENTISSAGES,
    top: "cl-top-o",
  },
  {
    n: "02",
    t: "Fais grandir ta communauté",
    d: "Au fur et à mesure, tu accompagnes de plus en plus de personnes et tu construis ton propre groupe.",
    d2: "Tu n'es pas seul(e) : nous te transmettons notre expérience, nos outils et notre façon de fonctionner pour t'aider à devenir autonome.",
    top: "cl-top-p",
  },
  {
    n: "03",
    t: "Et demain… ouvre ton propre club",
    d: "Ton objectif peut aller bien plus loin que simplement devenir coach.",
    d2: "En développant suffisamment ta communauté, tu peux avoir l'opportunité de créer ton propre Club de Nutrition et d'y accueillir les membres que tu accompagnes.",
    top: "cl-top-s",
  },
];

const POUR_QUI = [
  "aimes le contact humain",
  "souhaites avoir une activité flexible",
  "veux apprendre un nouveau métier",
  "as envie de développer un projet qui t'appartient",
  "rêves peut-être, un jour, d'avoir ton propre lieu",
];

export function ClubRejoindrePage() {
  return (
    <ClubShell
      title="Devenir coach et ouvrir son club — Verdun"
      description="Deviens coach au Breakfast Club de Verdun : tu démarres accompagné(e), tu fais grandir ta communauté, et tu peux ouvrir ton propre club de nutrition."
    >
      <InnerHero
        pill="Rejoindre l'équipe"
        pillClass="o"
        title="Deviens coach"
        accent="et crée ton propre club."
        intro="Tu aimes aider les autres, créer du lien et accompagner des personnes vers leurs objectifs ? Au sein de notre équipe, tu peux démarrer progressivement, te former à nos côtés et développer ta propre communauté."
      />

      {/* LE PARCOURS — pleine largeur, et non sur deux colonnes comme avant :
          la première étape porte une liste de cinq points, qui devenait
          illisible dans une demi-colonne. */}
      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0 }}>
        <span className="cl-pill o">Le parcours</span>
        <h2 style={{ marginTop: 20, fontSize: "clamp(30px,4.4vw,52px)" }}>Comment ça <span className="cl-a-orange">se passe.</span></h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px,2.4vw,24px)", marginTop: "clamp(26px,3.4vw,38px)" }}>
          {ETAPES.map((s) => (
            <div key={s.n} className={`cl-card ${s.top}`} style={{ padding: "clamp(24px,3.4vw,38px)", display: "grid", gridTemplateColumns: "clamp(52px,7vw,76px) 1fr", gap: "clamp(14px,2.4vw,26px)", alignItems: "start" }}>
              <div className="cl-num" style={{ fontSize: "clamp(38px,5vw,54px)" }}>{s.n}</div>
              <div>
                <h3 style={{ fontSize: "clamp(20px,2.6vw,26px)" }}>{s.t}</h3>
                <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--muted)", marginTop: 10, maxWidth: "60ch" }}>{s.d}</p>
                {s.d2 ? <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--muted)", marginTop: 12, maxWidth: "60ch" }}>{s.d2}</p> : null}
                {s.liste ? (
                  <>
                    <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--muted)", marginTop: 14 }}>Tu apprends à :</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
                      {s.liste.map((item) => (
                        <li key={item} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 10, padding: "8px 0", fontSize: 16.5, color: "var(--muted)" }}>
                          <span aria-hidden="true" style={{ color: "var(--orange)", fontWeight: 800 }}>✓</span>{item}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* La chute de sa copie, mise en avant comme les autres phrases fortes
            du site (même police d'affichage, même échelle). */}
        <p style={{ fontFamily: "Anton", fontSize: "clamp(24px,3.4vw,38px)", lineHeight: 1.15, marginTop: "clamp(30px,4vw,46px)", textAlign: "center" }}>
          De membre à coach.<br />
          <span className="cl-a-pink">De coach à entrepreneur.</span><br />
          Et pourquoi pas… <span className="cl-a-orange">de notre club au tien.</span> 🚀
        </p>
      </div></div>

      {/* POUR QUI — remplace « Ce qu'on cherche ». */}
      <div className="cl-band alt"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill s">Pour qui ?</span>
        <h2 style={{ marginTop: 20, fontSize: "clamp(28px,3.8vw,48px)" }}>Ce parcours peut te correspondre <span className="cl-a-sage">si tu…</span></h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0", maxWidth: "62ch" }}>
          {POUR_QUI.map((c) => (
            <li key={c} style={{ display: "grid", gridTemplateColumns: "26px 1fr", gap: 12, padding: "16px 0", borderTop: "1px solid rgba(30,51,48,.12)", fontSize: 17.5, color: "var(--muted)" }}>
              <span aria-hidden="true" style={{ color: "var(--sage)", fontWeight: 800 }}>✓</span>{c}
            </li>
          ))}
        </ul>
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-rv" style={{ paddingBottom: "clamp(48px,7vw,88px)" }}>
        <div className="cl-card dark" style={{ padding: "clamp(30px,4.5vw,52px)" }}>
          <span className="cl-pill y">Ce qu'on ne te promet pas</span>
          <h2 style={{ marginTop: 18, fontSize: "clamp(24px,3.2vw,38px)", color: "#fff" }}>Ni argent facile, ni recette magique.</h2>
          <p className="cl-lead" style={{ marginTop: 12, maxWidth: "62ch" }}>Ouvrir un club, c'est du vrai travail, tôt le matin, avec de vraies personnes. Ce qu'on promet, c'est un modèle qui tient, une formation sérieuse, et une équipe qui ne te lâche pas. Le reste, c'est toi qui le construis.</p>
        </div>
      </div></div>

      <div className="cl-band alt"><div className="cl-wrap cl-sec cl-rv" style={{ textAlign: "center", maxWidth: 680 }}>
        <span className="cl-pill o">On en parle ?</span>
        <h2 style={{ marginTop: 20, fontSize: "clamp(28px,4.6vw,54px)" }}>Prêt(e) à découvrir <span className="cl-a-orange">le parcours ?</span></h2>
        <p className="cl-lead" style={{ marginTop: 16, marginLeft: "auto", marginRight: "auto", maxWidth: 540 }}>Viens échanger avec nous et découvre comment démarrer à nos côtés.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 26 }}>
          <a className="cl-cta" href="/club/rejoindre/rdv?utm_source=site-club">Découvrir l'opportunité coach</a>
          <a className="cl-ghost" href={TEL}>{CLUB_TEL}</a>
        </div>
      </div></div>
    </ClubShell>
  );
}
