// Résultats — page interne « Ce qu'ils en disent, et ce qu'on ne promet pas ». v7 fidèle.
import { ClubShell, InnerHero, R } from "./ClubShell";

const TEMOINS = [
  { txt: "Le premier témoignage s'affichera ici dès qu'un membre nous y autorise. On ne met que du vrai — pas de citations inventées.", nom: "Membre", meta: "Bientôt", top: "var(--orange)" },
  { txt: "Photos et mots des membres arrivent avec les premières cartes terminées. On préfère attendre du réel plutôt que remplir avec du faux.", nom: "Membre", meta: "Bientôt", top: "var(--pink)" },
  { txt: "En attendant, la note Google de La Base (4,9/5) parle déjà de la façon dont on accompagne les gens à Verdun.", nom: "La Base", meta: "Avis Google", top: "var(--sage)" },
];

export function ClubResultatsPage() {
  return (
    <ClubShell>
      <InnerHero pill="Résultats" pillClass="peach" title="Ce qu'ils en disent," accent="et ce qu'on ne promet pas." intro="On ne promet pas de miracle en une semaine. On montre du vrai : des membres réels, leurs mots, leurs photos — dès qu'ils nous y autorisent." />

      <div className="cl-band"><div className="cl-wrap" style={{ paddingBottom: "clamp(40px,6vw,72px)" }}>
        <div style={{ background: "var(--dark)", borderRadius: 20, padding: "clamp(26px,3.4vw,40px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 28px" }}>
          <span style={{ color: "var(--yellow)", fontSize: 18, letterSpacing: 3 }}>★★★★★</span>
          <span style={{ fontFamily: "Anton", fontSize: 38, color: "#fff" }}>4,9 / 5</span>
          <span style={{ fontSize: 17, color: "var(--on-dark-2)" }}>sur les avis Google de La Base à Verdun</span>
          <a className="cl-cta" style={{ marginLeft: "auto", minHeight: 52 }} href="https://www.google.com/search?q=La+Base+Verdun" target="_blank" rel="noopener noreferrer">Lire les avis →</a>
        </div>
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: 0 }}>
        <span className="cl-pill o">Avant / après</span>
        <h2 style={{ marginTop: 20, fontSize: "clamp(30px,4.6vw,56px)" }}>Les photos, quand les membres <span className="cl-a-pink">nous autorisent.</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginTop: 30 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="cl-slot" style={{ aspectRatio: "3/4", boxShadow: "none", border: i >= 4 ? "1px dashed rgba(30,51,48,.25)" : undefined }}>
              <span>📷 {i < 4 ? "avant / après" : "à venir"}</span>
            </div>
          ))}
        </div>
      </div></div>

      <div className="cl-band dark"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill p">Dans leurs mots</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(30px,4.6vw,58px)", color: "#fff" }}>Ce qu'ils <span className="cl-a-yellow">en retiennent.</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, marginTop: 30 }}>
          {TEMOINS.map((t, i) => (
            <figure key={i} className="cl-card" style={{ background: "#fff", margin: 0, padding: "30px 28px", borderLeft: `5px solid ${t.top}` }}>
              <blockquote style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "var(--muted)", fontStyle: "italic" }}>« {t.txt} »</blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
                <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: "50%", background: t.top, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton" }}>•</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{t.nom} · <span style={{ color: "var(--muted2)" }}>{t.meta}</span></span>
              </figcaption>
            </figure>
          ))}
        </div>
        <a href="https://www.labase360.fr/temoignages" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 26, color: "var(--yellow)", fontWeight: 700 }}>Les témoignages de La Base →</a>
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ textAlign: "center", maxWidth: 720 }}>
        <h2 style={{ fontSize: "clamp(34px,5.4vw,66px)" }}>Tu veux savoir si ça <span className="cl-a-orange">marcherait pour toi ?</span></h2>
        <p className="cl-lead" style={{ marginTop: 16, marginLeft: "auto", marginRight: "auto", maxWidth: 560 }}>C'est exactement la question à laquelle le body scan répond. Il est offert et dure environ 45 minutes.</p>
        <a className="cl-cta" style={{ marginTop: 26 }} href={R}>Réserver mon body scan</a>
      </div></div>
    </ClubShell>
  );
}
