// Le rituel — page interne « Ce qu'il y a dans ton verre, et pourquoi dans cet ordre ». v7 fidèle.
import { ClubShell, InnerHero, Slot, R, CTA_PRINCIPAL } from "./ClubShell";

const ETAPES = [
  {
    e: "Étape 1 · environ 2 minutes", t: "L'aloe vera", frame: "orange", acc: "cl-a-orange",
    img: "/brand/breakfast-club/photos/rituel-aloe.jpg",
    alt: "Un verre d'aloe vera glacé posé sur une table claire, à côté d'un bol de mangue et d'un plant d'aloe.",
    p1: "On commence par une boisson d'aloe. C'est le geste d'ouverture : on hydrate, on réveille le système en douceur, on prépare le terrain pour le reste.",
    p2: "Rien de spectaculaire, et c'est le but. Un premier verre simple qui lance la mécanique du matin.",
    no: "Ce que ce n'est pas : un détox, un brûle-graisse, ni un médicament. C'est une boisson d'hydratation.",
  },
  {
    e: "Étape 2 · le temps de t'asseoir", t: "La boisson thermo", frame: "pink", acc: "cl-a-pink",
    img: "/brand/breakfast-club/photos/rituel-the.jpg",
    alt: "Une femme souriante porte à ses lèvres un verre de boisson thermo ambrée, dehors, ciel bleu derrière elle.",
    // Même règle que sur l'accueil : le moment d'abord, la composition ensuite.
    // « Thé vert » et « caféine » restent dits — ce sont des ingrédients, les
    // taire serait malhonnête — mais ils ne sont plus la première chose qu'on
    // lit, parce que ce sont les deux mots qui font reculer.
    p1: "Ensuite, la boisson thermo. Un coup de fouet doux qui accompagne le début de matinée sans t'agiter — chaud l'hiver, glacé l'été.",
    p2: "C'est le moment où on souffle deux minutes avant le vrai repas. Côté composition : un mélange d'extraits de plantes, dont du thé vert et de l'hibiscus, avec un peu de caféine — comme dans un thé.",
    no: "Ce que ce n'est pas : un coupe-faim. S'il te tient jusqu'à midi, c'est que ton smoothie était bien dosé.",
  },
  {
    e: "Étape 3 · le repas", t: "Le smoothie nutritionnel", frame: "sage", acc: "cl-a-sage",
    img: "/brand/breakfast-club/photos/rituel-smoothie.jpg",
    alt: "Un grand verre de smoothie crémeux avec une paille en verre, posé sur une table en bois clair.",
    p1: "Enfin, le smoothie : c'est le vrai petit-déjeuner. Protéines, 20+ vitamines et minéraux — près de 40 % de tes apports de la journée dans un seul verre, de quoi caler jusqu'au déjeuner sans te sentir lourd.",
    p2: "Dosé avec toi selon ton objectif, il remplace le café-croissant qui te lâche à 10h30.",
    no: "Ce que ce n'est pas : un shaker de sportif. C'est un repas complet, servi et ajusté sur place.",
  },
];
const SUIVI = [
  { t: "La pesée", d: "Dix secondes, tous les matins. Une balance qu'on ne consulte pas en cachette et qui ne sert pas à se punir." },
  { t: "Le carnet", d: "Quatre valeurs seulement : protéines, hydratation, activité, énergie. Deux lignes, pas un journal." },
  { t: "La phrase du coach", d: "Une remarque par matin sur ce qui a marché hier. C'est court, et c'est ce qui fait revenir." },
];

export function ClubRituelPage() {
  return (
    <ClubShell
      title="Le rituel du matin — Breakfast Club Verdun"
      description="Aloe vera, boisson thermo, smoothie nutritionnel : ce qu'il y a dans ton verre chaque matin au club de Verdun, et pourquoi dans cet ordre."
    >
      <InnerHero dark pill="Le rituel" pillClass="p" title="Ce qu'il y a dans ton verre," accent="et pourquoi dans cet ordre." intro="Trois boissons, un ordre, une raison pour chacune. Rien à décider en arrivant : c'est prêt, servi, et ajusté avec toi." />

      {ETAPES.map((s, i) => (
        <div key={s.t} className="cl-band"><div className="cl-wrap cl-sec cl-rv">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(28px,4vw,56px)", alignItems: "center" }}>
            <div style={{ order: i % 2 === 0 ? 1 : 2 }}>
              <p style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".22em", textTransform: "uppercase" }} className={s.acc}>{s.e}</p>
              <h2 style={{ marginTop: 12, fontSize: "clamp(30px,4.4vw,52px)" }}>{s.t}</h2>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--muted)", marginTop: 16 }}>{s.p1}</p>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--muted)", marginTop: 14 }}>{s.p2}</p>
              <p style={{ fontSize: 15, color: "var(--muted2)", marginTop: 18, fontStyle: "italic" }}>{s.no}</p>
            </div>
            <div style={{ order: i % 2 === 0 ? 2 : 1 }}>
              <Slot ratio="1/1" label={s.t} sub="photo de la boisson" frame={s.frame} src={s.img} alt={s.alt} />
            </div>
          </div>
        </div></div>
      ))}

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0 }}>
        <div className="cl-card dark" style={{ padding: "clamp(34px,5vw,64px)" }}>
          <span className="cl-pill y">Étape 4</span>
          <h2 style={{ marginTop: 20, fontSize: "clamp(28px,4.2vw,50px)", color: "#fff" }}>La partie que personne ne photographie : <span className="cl-a-yellow">le suivi.</span></h2>
          <p className="cl-lead" style={{ marginTop: 14, maxWidth: "60ch" }}>Les trois boissons, tu pourrais les prendre chez toi. Ce que tu ne peux pas faire chez toi, c'est ça :</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 24, marginTop: 28 }}>
            {SUIVI.map((x, i) => (
              <div key={x.t}>
                <h3 style={{ fontSize: 14, letterSpacing: ".14em", textTransform: "uppercase", color: i === 0 ? "var(--orange)" : i === 1 ? "var(--pink)" : "var(--sage)" }}>{x.t}</h3>
                <p style={{ fontSize: 17, color: "var(--on-dark-2)", marginTop: 8 }}>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div></div>

      <div className="cl-band alt"><div className="cl-wrap cl-sec cl-rv">
        <div className="cl-card" style={{ background: "#fff", borderLeft: "6px solid var(--orange)", padding: "clamp(30px,4.5vw,52px)" }}>
          <h2 style={{ fontSize: "clamp(24px,3.2vw,38px)" }}>À dire clairement.</h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--muted)", marginTop: 14, maxWidth: "62ch" }}>Les boissons du club sont des produits de bien-être, pas des médicaments. Elles ne soignent rien, ne remplacent pas une alimentation variée ni un avis médical. Ce qui marche, c'est la régularité et le suivi — pas un ingrédient magique.</p>
          <a className="cl-cta" style={{ marginTop: 24 }} href={R}>{CTA_PRINCIPAL}</a>
        </div>
      </div></div>
    </ClubShell>
  );
}
