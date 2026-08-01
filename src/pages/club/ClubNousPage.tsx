// Nous — page interne « Mélanie, Thomas, et un local rue Saint Pierre ». v7 fidèle.
import { ClubShell, InnerHero, Slot, R, TEL } from "./ClubShell";

const EQUIPE = [
  { nom: "Mélanie", role: "Coach · co-fondatrice" },
  { nom: "Thomas", role: "Coach · co-fondateur" },
  { nom: "L'équipe", role: "Bientôt" },
  { nom: "Rejoins-nous", role: "On recrute" },
];
const PRATIQUE = [
  ["Adresse", "11 rue Saint Pierre, 55100 Verdun"],
  ["Horaires", "Lundi au vendredi 7h–11h · Samedi 8h–11h"],
  ["Accès", "En centre-ville, stationnement à proximité"],
  ["Paiement", "Carte, espèces — sur place"],
  ["Téléphone", "06 79 44 87 59"],
];

export function ClubNousPage() {
  return (
    <ClubShell>
      <InnerHero pill="Nous" pillClass="s" title="Mélanie, Thomas," accent="et un local rue Saint Pierre." intro="Pas une franchise anonyme. Deux personnes de Verdun qui accompagnent des gens depuis quatre ans, et un lieu bien réel où l'on t'attend le matin." />

      <div className="cl-band"><div className="cl-wrap" style={{ paddingBottom: "clamp(40px,6vw,72px)" }}>
        <Slot ratio="16/9" label="Mélanie & Thomas au club" sub="portrait de l'équipe" frame="peach" />
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0, maxWidth: 760 }}>
        <p style={{ fontSize: 20, lineHeight: 1.8, color: "var(--muted)" }}>On a commencé simplement : aider des proches à reprendre de bonnes habitudes le matin. Puis d'autres sont venus, et une évidence s'est imposée — ce qui manque à la plupart des gens, ce n'est pas la connaissance, c'est un cadre et quelqu'un qui suit.</p>
        <p style={{ fontSize: 20, lineHeight: 1.8, color: "var(--muted)", marginTop: 18 }}>Le club, c'est ça mis en lieu et en heure. Un local, un rituel, une équipe qui te connaît par ton prénom. Rien de sophistiqué — juste tenu, tous les matins.</p>
        <p style={{ fontFamily: "Anton", fontSize: "clamp(24px,3.2vw,34px)", lineHeight: 1.08, marginTop: 26 }}>On ne t'accueille pas comme un client. <span className="cl-a-sage">On t'attend comme un habitué.</span></p>
      </div></div>

      <div className="cl-band dark"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill y">L'équipe</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(30px,4.6vw,56px)", color: "#fff" }}>Les visages <span className="cl-a-yellow">du matin.</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18, marginTop: 30 }}>
          {EQUIPE.map((p, i) => (
            <figure key={p.nom} style={{ margin: 0 }}>
              <div className="cl-slot" style={{ aspectRatio: "4/5", boxShadow: "none", border: i >= 2 ? "1px dashed rgba(244,239,228,.28)" : undefined, background: "#26403B", color: "var(--on-dark-3)" }}><span>📷 {p.nom}</span></div>
              <figcaption style={{ marginTop: 12 }}><div style={{ fontFamily: "Anton", fontSize: 24, color: "#fff" }}>{p.nom}</div><div style={{ fontSize: 15, color: "var(--on-dark-3)" }}>{p.role}</div></figcaption>
            </figure>
          ))}
        </div>
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,56px)", alignItems: "start" }}>
          <div>
            <span className="cl-pill o">Le club en pratique</span>
            <h2 style={{ marginTop: 20, fontSize: "clamp(28px,3.8vw,48px)" }}>Où, quand, <span className="cl-a-orange">comment venir.</span></h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0" }}>
              {PRATIQUE.map(([k, v]) => (
                <li key={k} style={{ padding: "14px 0", borderTop: "1px solid rgba(30,51,48,.12)" }}>
                  <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted2)", fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 17, marginTop: 3 }}>{v}</div>
                </li>
              ))}
            </ul>
            <a className="cl-cta" style={{ marginTop: 24 }} href={R}>Réserver ma venue</a>
            <a className="cl-ghost" style={{ marginTop: 12, marginLeft: 12 }} href={TEL}>Appeler</a>
          </div>
          <iframe
            title="Plan du club — 11 rue Saint Pierre, Verdun"
            src="https://www.google.com/maps?q=11+rue+Saint+Pierre+Verdun&output=embed"
            style={{ width: "100%", height: 400, border: 0, borderRadius: 20 }}
            loading="lazy"
          />
        </div>
      </div></div>
    </ClubShell>
  );
}
