// Rejoindre l'équipe — page interne « Et si le club, c'était toi qui l'ouvrais ? ». v7 fidèle.
import { ClubShell, InnerHero, TEL } from "./ClubShell";

const CHERCHE = [
  "Quelqu'un de régulier, du matin, qui aime les gens plus que les gadgets.",
  "Pas besoin d'être coach diplômé : on forme. Besoin d'être fiable et présent.",
  "Envie de construire un lieu de quartier, pas de faire un coup rapide.",
];
const COMMENT = [
  { n: "01", t: "On se rencontre", d: "Un café, on t'explique le modèle en vrai, sans discours de vente. Tu poses toutes tes questions.", top: "cl-top-o" },
  { n: "02", t: "Tu testes le terrain", d: "Tu viens au club plusieurs matins, tu vois l'envers du décor, tu sens si c'est pour toi.", top: "cl-top-p" },
  { n: "03", t: "On te forme", d: "Rituel, suivi, gestion d'un club : on t'accompagne pas à pas, avec l'expérience de La Base.", top: "cl-top-s" },
  { n: "04", t: "Tu ouvres le tien", d: "Ton lieu, ton équipe, ton quartier. On reste derrière toi, tu n'es jamais lâché seul.", top: "cl-top-a" },
];

export function ClubRejoindrePage() {
  return (
    <ClubShell>
      <InnerHero pill="Rejoindre l'équipe" pillClass="o" title="Et si le club," accent="c'était toi qui l'ouvrais ?" intro="Le concept est simple, dupliquable, et il manque partout. Si tu cherches un projet du matin, humain et concret à Verdun ou ailleurs — on devrait se parler." />

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,56px)" }}>
          <div>
            <span className="cl-pill s">Ce qu'on cherche</span>
            <h2 style={{ marginTop: 20, fontSize: "clamp(28px,3.8vw,48px)" }}>Une personne, <span className="cl-a-sage">pas un CV.</span></h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "22px 0 0" }}>
              {CHERCHE.map((c, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 12, padding: "16px 0", borderTop: "1px solid rgba(30,51,48,.12)", fontSize: 17, color: "var(--muted)" }}>
                  <span aria-hidden="true" style={{ color: "var(--sage)", fontWeight: 800 }}>✓</span>{c}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="cl-pill o">Comment ça se passe</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              {COMMENT.map((s) => (
                <div key={s.n} className={`cl-card ${s.top}`} style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "56px 1fr", gap: 16, alignItems: "center" }}>
                  <div className="cl-num" style={{ fontSize: 34 }}>{s.n}</div>
                  <div><div style={{ fontWeight: 700, fontSize: 17 }}>{s.t}</div><div style={{ fontSize: 15, color: "var(--muted)", marginTop: 3 }}>{s.d}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
        <h2 style={{ marginTop: 20, fontSize: "clamp(30px,5vw,60px)" }}>Le premier pas, <span className="cl-a-orange">c'est un café.</span></h2>
        <p className="cl-lead" style={{ marginTop: 16, marginLeft: "auto", marginRight: "auto", maxWidth: 540 }}>Écris-nous ou appelle, on te rappelle et on prend le temps d'en discuter sans engagement.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 26 }}>
          <a className="cl-cta" href="/rejoindre?utm_source=site-club">En parler avec l'équipe</a>
          <a className="cl-ghost" href={TEL}>06 79 44 87 59</a>
        </div>
      </div></div>
    </ClubShell>
  );
}
