// Le club — page interne « Un club de petit-déjeuner, pas un bar ni une salle ». v7 fidèle.
import { ClubShell, InnerHero, Slot, R } from "./ClubShell";

const PAS = [
  "Pas un bar : on ne vient pas juste consommer, on vient pour un rituel et un suivi.",
  "Pas une salle de sport : aucune performance à prouver, aucun regard sur ce que tu soulèves.",
  "Pas un régime : on n'interdit rien, on ajoute un bon premier repas et de la régularité.",
  "Pas un abonnement piège : tu prends des visites, tu les utilises, point.",
];
const MATINEE = [
  { h: "7h00", t: "Tu passes la porte", d: "On te connaît, ton aloe est déjà prêt. Pas de file, pas d'attente." },
  { h: "8h30", t: "Ton rituel", d: "Les trois boissons dans l'ordre, à ton rythme, assis ou à emporter." },
  { h: "10h00", t: "La pesée + deux mots", d: "Dix secondes sur la balance, une remarque du coach sur hier." },
  { h: "11h00", t: "Tu repars lancé", d: "Ta matinée est réglée. Le reste de ta journée t'appartient." },
];

export function ClubLeClubPage() {
  return (
    <ClubShell>
      <InnerHero pill="Le club" pillClass="p" title="Un club de petit-déjeuner." accent="Pas un bar, pas une salle de sport." intro="Un lieu simple, ouvert tous les matins, où l'on prend soin de toi sans en faire tout un cinéma. Voilà ce que c'est — et ce que ce n'est pas." />

      <div className="cl-band"><div className="cl-wrap" style={{ paddingBottom: "clamp(40px,6vw,72px)" }}>
        <Slot ratio="16/9" label="Le local rue Saint Pierre" sub="façade / intérieur du club" frame="orange" />
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,64px)" }}>
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)" }}>Pourquoi le matin</h2>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>Parce que c'est le seul moment que personne ne te prend. Un bon premier repas et un cap posé à 8h, et le reste de la journée suit. Le soir, tout le monde est fatigué, distrait, sollicité. Le matin, tu gagnes.</p>
          </div>
          <div>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,40px)" }}>Pourquoi en groupe</h2>
            <p style={{ fontSize: 18, lineHeight: 1.75, color: "var(--muted)", marginTop: 14 }}>Parce que seul, on lâche. Au club, il y a une heure, un lieu, des têtes connues et quelqu'un qui note que tu es venu. Ce petit rendez-vous social, c'est exactement ce qui manque quand on essaie « tout seul, à la maison ».</p>
          </div>
        </div>
      </div></div>

      <div className="cl-band dark"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill p">À dire clairement</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(32px,4.6vw,58px)", color: "#fff" }}>Ce que ce <span className="cl-a-yellow">n'est pas.</span></h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "26px 0 0" }}>
          {PAS.map((p, i) => (
            <li key={i} style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 12, padding: "22px 0", borderTop: "1px solid rgba(244,239,228,.18)", fontSize: 17, color: "var(--on-dark-2)" }}>
              <span aria-hidden="true" style={{ color: "var(--orange)", fontWeight: 800, fontSize: 20 }}>✕</span>{p}
            </li>
          ))}
        </ul>
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill o">Une matinée type</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(32px,4.6vw,56px)" }}>De 7h à 11h, <span className="cl-a-orange">comment ça se passe.</span></h2>
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
