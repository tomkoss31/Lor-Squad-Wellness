// Le club — page interne « Un club de petit-déjeuner, pas un bar ni une salle ». v7 fidèle.
import { ClubShell, InnerHero, Slot, R, CTA_PRINCIPAL } from "./ClubShell";
import { HORAIRES_LIGNES } from "../../data/clubInfos";

// La section « Ce que ce n'est pas » vivait ici. Retirée le 2026-08-10 : trois
// de ses quatre lignes étaient déjà dites ailleurs (« pas un régime » dans la
// philosophie, « pas un abonnement piège » dans la FAQ et sous les tarifs,
// « pas une salle de sport » dans la FAQ), et la quatrième — « pas un bar » —
// est le sous-titre de CETTE page, lu trente secondes plus tôt. Un bandeau
// vert pleine largeur avec quatre croix orange pour dire quatre fois non, sur
// une page qui doit donner envie de venir.
// Sa seule phrase irremplaçable — « aucune performance à prouver, aucun regard
// sur ce que tu soulèves » — a été remontée dans la FAQ « Je ne suis pas
// sportif », où elle répond à quelqu'un qui se pose vraiment la question.
// « UNE VISITE TYPE — un quart d'heure, pas ta matinée » vivait ici : quatre
// lignes chronométrées, 0 / 5 / 12 / 15 min. Retirée le 14/08 à la demande de
// Thomas, et elle méritait de partir : un club qui affiche un chronomètre à
// l'entrée promet le contraire de ce qu'il vend. On y lisait « compte un quart
// d'heure », « dix secondes sur la balance », « tu repars lancé » — la
// grammaire d'un drive, pas d'un lieu où l'on s'assoit.
// Sa copie dit maintenant l'inverse : viens quand ça t'arrange, reste le temps
// que tu veux, et si tu es pressé(e) c'est possible aussi — mais ce n'est pas
// la règle.
/** Ce qu'on vient y faire, dans l'ordre de sa copie. */
const AU_CLUB = [
  { e: "🥤", t: "Tu prends ton petit-déjeuner" },
  { e: "🤝", t: "Tu retrouves tes coachs et les autres membres" },
  { e: "💬", t: "Tu échanges, tu partages, tu poses tes questions" },
  { e: "📊", t: "Tu suis régulièrement ton évolution" },
  { e: "❤️", t: "Et surtout, tu profites de l'énergie de la communauté" },
];

/** « du lundi au vendredi : 7h–11h » → « Du lundi… ». La source reste
 *  clubInfos.ts : on ne recopie pas un horaire, on capitalise le sien. */
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ClubLeClubPage() {
  return (
    <ClubShell
      title="Le club — The Breakfast Club Verdun"
      description="Un club de petit-déjeuner ouvert dès 7h à Verdun : trois boissons, une table, et quelqu'un qui suit tes chiffres chaque matin. Premier body scan offert."
    >
      <InnerHero pill="Le club" pillClass="p" title="Un club de petit-déjeuner." accent="Pas un bar, pas une salle de sport." intro="Un lieu simple, ouvert tous les matins, où l'on prend soin de toi." />

      <div className="cl-band"><div className="cl-wrap" style={{ paddingBottom: "clamp(40px,6vw,72px)" }}>
        <Slot
          ratio="16/9"
          label="Le local rue Saint Pierre"
          sub="façade / intérieur du club"
          frame="orange"
          src="/brand/breakfast-club/photos/club-facade.jpg"
          alt="La devanture de La Base Shakes & Drinks, 11 rue Saint Pierre à Verdun : Breakfast Club de 7h à 11h, bar healthy de 11h à 17h30."
        />
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,64px)" }}>
          {/* Copie de Thomas du 14/08.
              L'ancienne version disait la même chose, mais à l'envers : « le
              seul moment que personne ne te prend », « parce que seul, on
              lâche », « tout le monde est fatigué, distrait, sollicité ». Elle
              démontrait par le manque et par le reproche.
              Celle-ci dit ce qu'on GAGNE — l'énergie, l'intention, le sentiment
              d'avoir déjà fait quelque chose pour soi. Et « chacun avance à son
              rythme, sans jugement » enlève la peur qui retient vraiment
              quelqu'un devant la porte d'un groupe. */}
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)" }}>Pourquoi le matin ☀️</h2>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>Parce que commencer la journée en prenant soin de soi peut changer toute la dynamique de la journée.</p>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>Un petit-déjeuner équilibré, un moment pour soi, quelques échanges et de bonnes habitudes qui s'installent petit à petit.</p>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>On démarre la journée avec une intention positive, de l'énergie et le sentiment d'avoir déjà fait quelque chose pour soi. ❤️</p>
          </div>
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)" }}>Pourquoi en groupe 🤝</h2>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>Parce qu'il est souvent plus facile de rester régulier quand on se sent entouré, encouragé et soutenu.</p>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>Au Club, on retrouve des personnes qui avancent elles aussi vers leurs objectifs. On échange, on partage ses réussites comme ses difficultés et on profite de l'énergie du groupe.</p>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>Chacun avance à son rythme, sans jugement, mais jamais seul. ❤️</p>
          </div>
        </div>
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill o">Ton rythme</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(32px,4.6vw,56px)" }}>Un moment pour toi, <span className="cl-a-orange">à ton rythme</span> ❤️</h2>
        <p className="cl-lead" style={{ marginTop: 16, maxWidth: "60ch" }}>Le Breakfast Club est ouvert chaque matin pour te permettre d'intégrer facilement ta nouvelle routine à ton quotidien.</p>
        <p className="cl-lead" style={{ marginTop: 12, maxWidth: "60ch" }}>Avant le travail, après avoir déposé les enfants ou simplement pour prendre un moment pour toi : tu viens au moment qui te convient.</p>

        <ul style={{ listStyle: "none", padding: 0, margin: "clamp(26px,3.6vw,38px) 0 0" }}>
          {AU_CLUB.map((m) => (
            <li key={m.t} style={{ display: "grid", gridTemplateColumns: "clamp(34px,5vw,44px) 1fr", gap: "clamp(10px,2vw,18px)", alignItems: "center", padding: "18px 0", borderTop: "1px solid rgba(30,51,48,.16)" }}>
              <span aria-hidden="true" style={{ fontSize: "clamp(22px,3vw,28px)", lineHeight: 1 }}>{m.e}</span>
              <span style={{ fontSize: "clamp(16.5px,2vw,18.5px)", lineHeight: 1.5 }}>{m.t}</span>
            </li>
          ))}
        </ul>

        <p style={{ fontWeight: 700, fontSize: 18.5, marginTop: "clamp(28px,3.8vw,40px)" }}>Tu es pressé(e) ? Aucun problème.</p>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--muted)", marginTop: 10, maxWidth: "62ch" }}>Tu peux aussi faire un passage plus rapide les jours où ton emploi du temps est chargé. Mais ici, aucune course contre la montre.</p>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--muted)", marginTop: 10, maxWidth: "62ch" }}>Le Breakfast Club, c'est avant tout un moment pour prendre soin de toi et avancer vers ton objectif, entouré(e).</p>

        {/* Les horaires, enfin donnés en clair sur cette page : jusqu'ici elle
            se contentait de la tournure « quand tu veux entre 7h et 11h »
            glissée dans une phrase. */}
        <div className="cl-card cl-top-s" style={{ padding: "clamp(24px,3.4vw,36px)", marginTop: "clamp(28px,4vw,40px)", maxWidth: 560 }}>
          <span className="cl-pill s">Horaires du club</span>
          <div style={{ marginTop: 16 }}>
            {HORAIRES_LIGNES.map((l) => (
              <div key={l} style={{ fontFamily: "Anton", fontSize: "clamp(19px,2.4vw,25px)", lineHeight: 1.45 }}>{majuscule(l)}</div>
            ))}
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--muted)", marginTop: 14 }}>Tu arrives quand tu veux pendant les horaires d'ouverture, selon ton emploi du temps.</p>
        </div>
      </div></div>

      <div className="cl-band alt"><div className="cl-wrap cl-sec cl-rv">
        <div className="cl-card" style={{ background: "#fff", padding: "clamp(32px,5vw,60px)" }}>
          <span className="cl-pill s">Le lien avec La Base</span>
          <h2 style={{ marginTop: 20, fontSize: "clamp(28px,3.8vw,48px)" }}>Le club, c'est La Base, <span className="cl-a-sage">version matin.</span></h2>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--muted)", marginTop: 16, maxWidth: "60ch" }}>La Base accompagne des gens à Verdun depuis quatre ans. Le club, c'est le même sérieux, le même suivi — mais autour d'un rituel du matin simple et régulier. Tu bénéficies de toute cette expérience dès ta première visite.</p>
          <a className="cl-cta" style={{ marginTop: 24 }} href={R}>{CTA_PRINCIPAL}</a>
        </div>
      </div></div>
    </ClubShell>
  );
}
