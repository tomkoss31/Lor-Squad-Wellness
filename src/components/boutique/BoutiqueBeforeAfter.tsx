// =============================================================================
// BoutiqueBeforeAfter — section « Résultats réels » de la boutique HL SKIN.
//
// Preuve visuelle : les avant/après réels des clientes et clients, avec leurs
// mots. Sert aussi de respiration entre les blocs produits de la vitrine.
//
// ⚠️ Les visuels sont hétérogènes (2 ou 3 panneaux, ratios 0,60 → 1,48, libellés
// parfois déjà incrustés). D'où deux partis pris NON négociables :
//   - ratio d'origine préservé, jamais de recadrage (sinon on coupe un panneau) ;
//   - aucune étiquette « Avant / Après » ajoutée (sinon doublon + mauvais repère).
// La mise en page utilise des colonnes CSS, qui absorbent les hauteurs inégales.
//
// Contenu : src/data/beforeAfter.ts (seul fichier à éditer pour en ajouter).
// =============================================================================

import { BEFORE_AFTER } from "../../data/beforeAfter";

export function BoutiqueBeforeAfter() {
  if (BEFORE_AFTER.length === 0) return null;

  return (
    <div className="bk-avap-band">
      <section id="bk-resultats" className="bk-wrap bk-sec bk-reveal">
        <div className="bk-sec-head">
          <div className="bk-eyebrow">Résultats réels</div>
          <h2>Leur peau, en quelques semaines.</h2>
          <p>
            Photos non retouchées, mots authentiques. De 21 jours à un mois de routine — de
            24 à 58 ans, femmes et hommes, sur des peaux très différentes.
          </p>
        </div>

        <div className="bk-avap-grid">
          {BEFORE_AFTER.map((p) => (
            <article className="bk-avap" key={p.slug}>
              <div className="bk-avap-media">
                <img
                  src={`/hlskin/avant-apres/${p.slug}.webp`}
                  alt={`La peau de ${p.name} avant et après ${p.when} de routine HL Skin`}
                  loading="lazy"
                  decoding="async"
                />
                <div className="bk-avap-when">{p.when}</div>
              </div>
              <div className="bk-avap-body">
                {p.quote ? <p>« {p.quote} »</p> : null}
                <div className="bk-avap-fav">
                  <span aria-hidden="true">✦</span>
                  <span>
                    Son produit préféré : <b>{p.fav}</b>
                  </span>
                </div>
                <div className="bk-avap-who">
                  <div className="bk-avap-av" aria-hidden="true">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <b>{p.name}</b>
                    <small>{[p.age, p.concern].filter(Boolean).join(" · ")}</small>
                  </div>
                  <span className="bk-avap-chip">Photo réelle</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="bk-avap-note">
          Photos publiées avec l'accord des personnes concernées. Résultats individuels,
          susceptibles de varier d'une peau à l'autre : il s'agit de témoignages, pas d'une
          promesse de résultat. Ces produits sont des cosmétiques et ne se substituent pas à
          un avis médical.
        </p>
      </section>
    </div>
  );
}
