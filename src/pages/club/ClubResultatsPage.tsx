// Résultats — page interne « Ce qu'ils en disent, et ce qu'on ne promet pas ». v7 fidèle.
import { ClubShell, InnerHero, R } from "./ClubShell";
import { CLUB_RESULTATS } from "../../data/clubResultats";
import { useClubTemoignages } from "./useClubTemoignages";

// ⚠ Ces trois textes disaient « les photos arrivent » — c'était vrai quand la
// grille au-dessus était vide. Elle ne l'est plus : les photos sont là, ce sont
// les MOTS qui manquent encore. Reformulé pour rester exact, et toujours aucune
// citation inventée en attendant les vraies.
const TEMOINS = [
  { txt: "Le premier témoignage s'affichera ici dès qu'un membre nous y autorise. On ne met que du vrai — pas de citations inventées.", nom: "Membre", meta: "Bientôt", top: "var(--orange)" },
  { txt: "Les photos ci-dessus sont réelles et publiées avec l'accord des personnes. Leurs mots arrivent — on préfère attendre du vrai plutôt que remplir avec du faux.", nom: "Membre", meta: "Bientôt", top: "var(--pink)" },
  { txt: "En attendant, la note Google de La Base (4,9/5) parle déjà de la façon dont on accompagne les gens à Verdun.", nom: "La Base", meta: "Avis Google", top: "var(--sage)" },
];

/** Les trois accents du club, en rotation sur les cartes. */
const ACCENTS = ["var(--orange)", "var(--pink)", "var(--sage)"];

export function ClubResultatsPage() {
  // Sans `coachId` : les 7 témoignages approuvés appartiennent tous au
  // propriétaire du club. Filtrer dessus obligerait la page publique à
  // connaître son identifiant, pour un résultat identique.
  const temoignages = useClubTemoignages();

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
        {/* Pas d'`aspectRatio` ici, volontairement : ce sont des diptyques
            (avant | après côte à côte) aux formats différents. Les enfermer
            dans un cadre commun rognerait une des deux moitiés — donc la
            comparaison même qu'on vient montrer. Chacun garde son format. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, marginTop: 30 }}>
          {CLUB_RESULTATS.map((r) => (
            <figure key={r.slug} style={{ margin: 0 }}>
              <div className="cl-resultat">
                <img
                  src={`/brand/breakfast-club/resultats/${r.slug}.jpg`}
                  alt={r.nom ? `${r.nom}, avant et après son accompagnement.` : "Avant et après l'accompagnement d'un membre du club."}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              {r.nom || r.resultat ? (
                <figcaption style={{ marginTop: 10, fontSize: 14.5, color: "var(--muted)" }}>
                  {r.nom ? <b style={{ color: "var(--ink)", fontSize: 16 }}>{r.nom}</b> : null}
                  {/* La mention n'est pas un détail : sans elle, le résultat
                      d'un coach se lit comme celui d'un client. */}
                  {r.coach ? (
                    <span style={{ marginLeft: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--sage-d)", background: "color-mix(in srgb, var(--sage) 26%, transparent)", borderRadius: 6, padding: "3px 8px", verticalAlign: "middle" }}>Coach</span>
                  ) : null}
                  {r.resultat ? (
                    <span style={{ display: "block", marginTop: 2, color: "var(--link)", fontWeight: 700 }}>{r.resultat}</span>
                  ) : null}
                </figcaption>
              ) : null}
              {r.mots ? (
                <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.55, color: "var(--muted2)", fontStyle: "italic" }}>« {r.mots} »</p>
              ) : null}
            </figure>
          ))}
        </div>
        <p style={{ marginTop: 22, fontSize: 14.5, lineHeight: 1.6, color: "var(--muted2)", maxWidth: "72ch" }}>
          Photos publiées avec l'accord des personnes concernées. <b style={{ color: "var(--ink)" }}>Résultats individuels</b> — ils dépendent du point de départ, de la régularité et des habitudes de chacun, et ne constituent pas une promesse.
        </p>
      </div></div>

      <div className="cl-band dark"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill p">Dans leurs mots</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(30px,4.6vw,58px)", color: "#fff" }}>Ce qu'ils <span className="cl-a-yellow">en retiennent.</span></h2>
        {/* Les vrais témoignages s'ils sont chargés, le texte d'attente sinon.
            Pas de squelette : une page vitrine qui clignote coûte plus qu'elle
            ne rassure, et le texte d'attente est déjà une réponse honnête. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, marginTop: 30 }}>
          {temoignages && temoignages.length > 0
            ? temoignages.map((t, i) => (
                <figure key={t.id} className="cl-card" style={{ background: "#fff", margin: 0, padding: "30px 28px", borderLeft: `5px solid ${ACCENTS[i % ACCENTS.length]}` }}>
                  <blockquote style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "var(--muted)", fontStyle: "italic" }}>« {t.texte} »</blockquote>
                  <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
                    <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: "50%", background: ACCENTS[i % ACCENTS.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton", fontSize: 19 }}>
                      {t.auteur.slice(0, 1).toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
                      {t.auteur}{t.ville ? <span style={{ color: "var(--muted2)" }}> · {t.ville}</span> : null}
                    </span>
                  </figcaption>
                </figure>
              ))
            : TEMOINS.map((t, i) => (
                <figure key={i} className="cl-card" style={{ background: "#fff", margin: 0, padding: "30px 28px", borderLeft: `5px solid ${t.top}` }}>
                  <blockquote style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "var(--muted)", fontStyle: "italic" }}>« {t.txt} »</blockquote>
                  <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
                    <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: "50%", background: t.top, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton" }}>•</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{t.nom} · <span style={{ color: "var(--muted2)" }}>{t.meta}</span></span>
                  </figcaption>
                </figure>
              ))}
        </div>
        {/* Le lien « Les témoignages de La Base → » pointait vers
            labase360.fr/temoignages. Cette route N'EXISTE PAS : le serveur
            répond 200 parce que toute URL sert l'application, et le visiteur
            atterrissait sur le Co-pilote — l'app coach, derrière une connexion.
            Retiré plutôt que redirigé : la page porte désormais six vrais
            témoignages, et les avis Google sont déjà en haut de cette page. Un
            « voir plus » de plus n'ajoutait rien qu'une sortie de route. */}
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ textAlign: "center", maxWidth: 720 }}>
        <h2 style={{ fontSize: "clamp(34px,5.4vw,66px)" }}>Tu veux savoir si ça <span className="cl-a-orange">marcherait pour toi ?</span></h2>
        <p className="cl-lead" style={{ marginTop: 16, marginLeft: "auto", marginRight: "auto", maxWidth: 560 }}>C'est exactement la question à laquelle le body scan répond. Il est offert et dure environ 45 minutes.</p>
        <a className="cl-cta" style={{ marginTop: 26 }} href={R}>Réserver mon body scan</a>
      </div></div>
    </ClubShell>
  );
}
