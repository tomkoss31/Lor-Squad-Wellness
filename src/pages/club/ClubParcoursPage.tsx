// Comment ça se passe — page interne « De ta première visite à tes premiers résultats ». v7 fidèle.
import { ClubShell, InnerHero, R, PhotoBand, CTA_PRINCIPAL } from "./ClubShell";
import { CLUB_TEL, HORAIRES_PHRASE } from "../../data/clubInfos";

const STEPS = [
  { n: "01", t: "Le body scan — 45 min, offert", top: "cl-top-o", d: "On mesure ta composition corporelle (masse, eau, muscle), on parle vraiment de ton objectif, et tu repars avec un point de départ clair et un plan à toi. Ce que tu dois prévoir : environ 45 minutes, une tenue normale, rien d'autre.", note: "C'est offert et ça n'engage à rien." },
  { n: "02", t: "Les deux premières semaines", top: "cl-top-p", d: "Tu viens le matin, tu prends ton rituel, on cale les dosages avec toi. C'est la période où l'habitude se pose : la même heure, le même geste, jusqu'à ce que ça devienne automatique." },
  { n: "03", t: "Le suivi quotidien", top: "cl-top-s", d: "Chaque matin : la pesée, deux valeurs au carnet, une phrase du coach. Rien de lourd, mais c'est ce fil quotidien qui fait la différence sur la durée." },
  { n: "04", t: "Le point des 10 visites", top: "cl-top-a", d: "On refait les mesures, de nouvelles photos si tu veux, et on regarde ensemble le chemin. Ensuite, tu choisis la suite — sans pression." },
];
const QA = [
  { q: "Combien ça coûte ?", a: "Ton premier body scan est offert. Ensuite, la visite revient à 8 € — et tu y as tes trois boissons, ton smoothie nutritionnel (≈ 40 % de tes apports du jour) et ton point coach. Carte 10 visites à 80 € (valable 30 jours), ou 30 à 185 € (6,17 € la visite, valable 90 jours) — offre de pré-lancement réservée aux 20 premiers membres, ensuite 210 €.", top: "cl-top-o" },
  // ⚠ Disait « ni de durée minimum, tu utilises tes visites à ton rythme » —
  // faux depuis que les cartes ont une validité. Engagement (il n'y en a pas)
  // et validité (il y en a une) sont deux choses distinctes : on dit les deux.
  { q: "Je m'engage sur une durée ?", a: "Pas d'abonnement, pas de prélèvement automatique : tu paies ta carte une fois. En revanche elle a une validité — 30 jours pour la carte 10 visites, 90 jours pour la carte 30, à partir de l'achat. C'est ce qui garde le rythme.", top: "cl-top-p" },
  { q: "Dois-je acheter des produits ?", a: "Non. Tout ce que tu bois est compris dans ta visite.", top: "cl-top-s" },
  { q: "Je n'ai pas le temps le matin.", a: `Tu passes quand tu veux ${HORAIRES_PHRASE}. Tes trois boissons se prennent à ton rythme — souvent un quart d'heure, mais rien ne te presse. Seul le premier rendez-vous, ton bilan, se cale à l'avance.`, top: "cl-top-a" },
  { q: "Je ne suis pas sportif.", a: "Ce n'est pas une salle de sport : aucune performance à prouver, aucun regard sur ce que tu soulèves. On part d'où tu en es, à ton rythme.", top: "cl-top-o" },
  { q: "Au bout de combien de temps ?", a: "On fait le point à la 10ᵉ visite : c'est là qu'on regarde le chemin parcouru.", top: "cl-top-p" },
];

export function ClubParcoursPage() {
  return (
    <ClubShell
      title="Comment ça se passe — Breakfast Club Verdun"
      description="De ton premier body scan offert au point des 10 visites : le déroulé complet, les tarifs, et les réponses aux questions qu'on nous pose avant de venir."
    >
      <InnerHero pill="Comment ça se passe" pillClass="o" title="De ta première visite" accent="à tes premiers résultats." intro="Pas de parcours compliqué. Un body scan offert, une habitude qui se pose, un suivi quotidien, et un vrai point à la 10ᵉ visite." />

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px,2.6vw,28px)" }}>
          {STEPS.map((s) => (
            <div key={s.n} className={`cl-card ${s.top}`} style={{ padding: "clamp(30px,4vw,46px)", display: "grid", gridTemplateColumns: "clamp(60px,8vw,96px) 1fr", gap: "clamp(16px,3vw,32px)", alignItems: "start" }}>
              <div className="cl-num" style={{ fontSize: 64 }}>{s.n}</div>
              <div>
                <h2 style={{ fontSize: "clamp(24px,3.2vw,36px)" }}>{s.t}</h2>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--muted)", marginTop: 12, maxWidth: "62ch" }}>{s.d}</p>
                {s.note ? <p style={{ fontSize: 16, color: "var(--link)", fontStyle: "italic", marginTop: 10 }}>{s.note}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div></div>

      {/* Bande de séparation entre le parcours raconté et la FAQ. Ces deux
          photos-là et pas d'autres : elles montrent le SUIVI en train de se
          faire — la balance, le carnet, le mètre ruban — donc exactement ce
          que les quatre étapes viennent de décrire. Une bande décorative
          n'aurait fait que couper la page ; celle-ci la prolonge. */}
      {/* Bande PLUS HAUTE que celle de l'accueil, et cadrages calculés.
          Mesuré : à 210 px de haut, la fenêtre fait 2,21:1 alors que ces
          photos sont verticales — on n'en voyait que 25 % de la hauteur, d'où
          les têtes coupées. Celle de l'accueil garde sa hauteur : ses photos
          sont des gros plans de boissons, qui supportent la coupe.
          Les `position` viennent de la position réelle des sujets dans chaque
          fichier, pas d'un réglage à l'œil. */}
      <PhotoBand
        hauteur="clamp(190px,26vw,330px)"
        srcs={[
          // 720×1280, très verticale : visages vers 27-39 %, la balance et
          // l'ordinateur vers 48-59 %. On remonte pour tenir les deux.
          { src: "/brand/breakfast-club/photos/club-suivi-duo.jpg", position: "50% 38%" },
          // 1280×1199, presque carrée : visages vers 20-30 %, la pancarte
          // jusqu'à 75 %. C'est elle qu'il faut garder en entier.
          { src: "/brand/breakfast-club/photos/club-suivi-mesures.jpg", position: "50% 55%" },
          { src: "/brand/breakfast-club/photos/club-salle.jpg", position: "50% 42%" },
        ]}
      />

      <div className="cl-band dark"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill y">Avant de venir</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(30px,4.6vw,58px)", color: "#fff" }}>Tu te demandes <span className="cl-a-yellow">sûrement ça.</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18, marginTop: 30 }}>
          {QA.map((x) => (
            <div key={x.q} className={`cl-card dark ${x.top}`} style={{ padding: 28, borderTop: "none", borderLeft: `5px solid ${x.top === "cl-top-o" ? "var(--orange)" : x.top === "cl-top-p" ? "var(--pink)" : x.top === "cl-top-s" ? "var(--sage)" : "var(--amber)"}` }}>
              <h3 style={{ fontSize: 19, color: "#fff" }}>{x.q}</h3>
              <p style={{ fontSize: 16, color: "var(--on-dark-2)", marginTop: 8 }}>{x.a}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 26, fontSize: 16, color: "var(--yellow)" }}>Une autre question ? Appelle-nous au {CLUB_TEL}, {HORAIRES_PHRASE}.</p>
        <a className="cl-cta" style={{ marginTop: 22 }} href={R}>{CTA_PRINCIPAL}</a>
      </div></div>
    </ClubShell>
  );
}
