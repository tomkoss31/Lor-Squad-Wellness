// Le club — page interne « Un club de petit-déjeuner, pas un bar ni une salle ». v7 fidèle.
import { ClubShell, InnerHero, Slot, R } from "./ClubShell";
import { HORAIRES_PHRASE } from "../../data/clubInfos";

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
const MATINEE = [
  { h: "0 min", t: "Tu passes la porte", d: "On te connaît, ton aloe est déjà prêt. Pas de file, pas d'attente." },
  { h: "5 min", t: "Ton rituel", d: "Les trois boissons dans l'ordre, à ton rythme, assis ou à emporter." },
  { h: "12 min", t: "La pesée + deux mots", d: "Dix secondes sur la balance, une remarque du coach sur hier." },
  { h: "15 min", t: "Tu repars lancé", d: "C'est réglé pour la journée. Le reste t'appartient." },
];

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
        <span className="cl-pill o">Une visite type</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(32px,4.6vw,56px)" }}>Un quart d'heure, <span className="cl-a-orange">pas ta matinée.</span></h2>
        <p className="cl-lead" style={{ marginTop: 16, maxWidth: "52ch" }}>Tu passes une seule fois, quand tu veux {HORAIRES_PHRASE}, sans rendez-vous. Compte un quart d'heure — un peu plus si tu t'assois pour discuter.</p>
        <ul style={{ listStyle: "none", padding: 0, margin: "30px 0 0" }}>
          {MATINEE.map((m) => (
            <li key={m.h} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "clamp(12px,3vw,28px)", padding: "22px 0", borderTop: "1px solid rgba(30,51,48,.16)" }}>
              <span style={{ fontFamily: "Anton", fontSize: 30, color: "var(--orange)" }}>{m.h}</span>
              <div><div style={{ fontWeight: 700, fontSize: 18 }}>{m.t}</div><div style={{ fontSize: 16, color: "var(--muted)", marginTop: 4 }}>{m.d}</div></div>
            </li>
          ))}
        </ul>
      </div></div>

      <div className="cl-band alt"><div className="cl-wrap cl-sec cl-rv">
        <div className="cl-card" style={{ background: "#fff", padding: "clamp(32px,5vw,60px)" }}>
          <span className="cl-pill s">Le lien avec La Base</span>
          <h2 style={{ marginTop: 20, fontSize: "clamp(28px,3.8vw,48px)" }}>Le club, c'est La Base, <span className="cl-a-sage">version matin.</span></h2>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--muted)", marginTop: 16, maxWidth: "60ch" }}>La Base accompagne des gens à Verdun depuis quatre ans. Le club, c'est le même sérieux, le même suivi — mais autour d'un rituel du matin simple et régulier. Tu bénéficies de toute cette expérience dès ta première visite.</p>
          <a className="cl-cta" style={{ marginTop: 24 }} href={R}>Réserver mon body scan offert</a>
        </div>
      </div></div>
    </ClubShell>
  );
}
