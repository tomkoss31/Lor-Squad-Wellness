// =============================================================================
// OpportunitePage — Page educative funnel business V1 (chantier 2026-11-07)
// =============================================================================
//
// Page publique /opportunite : presente le plan business sans nommer Herbalife
// explicitement. Cible prospect FROID (lien partage sur reseaux sociaux) ET
// prospect WARM (envoye par un coach depuis fiche client business_interest>0).
//
// Sections (cf. docs/BUSINESS_FUNNEL_ARCHITECTURE.md) :
//   1. Hero - promesse forte
//   2. Pourquoi nous rejoindre - argumentaire general
//   3. 3 facons de gagner
//   4. Les paliers expliques
//   5. Cas concret chiffre
//   6. Investissement de depart - PACK AMBASSADEUR 60 EUR
//   7. L'accompagnement - 4 piliers
//   8. FAQ - 8 questions
//   9. A propos - story Thomas + Melanie
//   10. CTA + form contact (reutilise ProspectFormModal)
//
// Print-friendly : bouton Imprimer/PDF en haut-right, CSS print integre.
// Branding G3 Vital Fusion (emerald cyan violet) coherent app.
// =============================================================================

import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProspectFormModal } from "../components/welcome/ProspectFormModal";

export function OpportunitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const formAnchorRef = useRef<HTMLDivElement | null>(null);

  // Tracking ?ref=[user_id] (V2 : lecture/store cote backend a venir)
  const referrerId = params.get("ref");

  function scrollToForm() {
    setFormOpen(true);
    setTimeout(() => {
      formAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  return (
    <div style={pageStyle}>
      {/* Bouton imprimer / PDF (terrain club) */}
      <button onClick={() => window.print()} style={printBtnStyle} type="button">
        🖨️ Imprimer · PDF
      </button>

      {/* Bouton retour Welcome (mobile) */}
      <button
        onClick={() => navigate("/welcome")}
        style={backBtnStyle}
        type="button"
      >
        ← Welcome
      </button>

      <div style={contentWrapStyle}>
        {/* ================================================================
            SECTION 1 — HERO
            ================================================================ */}
        <section style={heroStyle}>
          <div style={heroBlobs} aria-hidden="true">
            <div style={blob1} />
            <div style={blob2} />
            <div style={blob3} />
          </div>
          <div style={brandWrap}>
            <span style={brandMark} aria-hidden="true" />
            <span style={brandText}>
              LA BASE <em style={brandTextAccent}>360</em>
            </span>
          </div>
          <h1 style={heroTitle}>
            Et si tu transformais ce que tu fais déjà en{" "}
            <span style={heroTitleAccent}>revenu</span> ?
          </h1>
          <p style={heroSubtitle}>
            Manger mieux. Te sentir mieux. Et le partager autour de toi. C'est
            tout ce que ça demande pour démarrer.
          </p>
          <div style={heroCtaRow}>
            <button onClick={scrollToForm} style={ctaPrimary} type="button">
              Réserver mon échange →
            </button>
            <a href="#decouvrir" style={ctaGhost}>
              Découvrir comment ça marche ↓
            </a>
          </div>
        </section>

        {/* ================================================================
            SECTION 2 — POURQUOI NOUS REJOINDRE
            ================================================================ */}
        <section id="decouvrir" style={sectionStyle}>
          <div style={eyebrowStyle}>01 · Pourquoi</div>
          <h2 style={h2Style}>
            Une opportunité <span style={accentGreen}>claire</span>, pas un
            mirage
          </h2>
          <p style={leadStyle}>
            Aujourd'hui en France, 1 personne sur 2 est en surpoids. 7 sur 10
            disent manquer d'énergie. Et beaucoup cherchent une activité
            complémentaire qui a du sens — pas un job de plus, pas un MLM bidon,
            mais quelque chose d'utile.
          </p>
          <p style={{ ...leadStyle, marginTop: 14 }}>
            <strong>C'est exactement ce qu'on construit ici :</strong>
          </p>
          <ul style={ulCheckStyle}>
            <li>
              <span style={checkIcon}>✦</span> Une <strong>marque leader mondiale</strong>{" "}
              présente dans plus de 90 pays, qui produit ses compléments
              nutritionnels depuis plus de 40 ans
            </li>
            <li>
              <span style={checkIcon}>✦</span> Un <strong>modèle simple</strong> :
              tu te transformes toi-même, tu partages ton résultat, tu
              accompagnes les autres
            </li>
            <li>
              <span style={checkIcon}>✦</span> Une <strong>équipe formée</strong> qui
              te transmet ses outils, son énergie et son accompagnement
              personnalisé
            </li>
            <li>
              <span style={checkIcon}>✦</span> Une <strong>liberté totale</strong> :
              ton agenda, ton rythme, ton revenu
            </li>
          </ul>
          <blockquote style={quoteStyle}>
            « On ne vend pas un rêve. On vend une opportunité de
            transformation, pour toi d'abord, pour les autres ensuite. »
          </blockquote>
        </section>

        {/* ================================================================
            SECTION 3 — 3 FAÇONS DE GAGNER
            ================================================================ */}
        <section style={sectionStyle}>
          <div style={eyebrowStyle}>02 · Les 3 leviers</div>
          <h2 style={h2Style}>
            Trois <span style={accentCyan}>façons concrètes</span> de générer du
            revenu
          </h2>
          <div style={grid3Style}>
            <div style={{ ...wayCardStyle, ...wayCardEmerald }}>
              <div style={wayIcon}>🛒</div>
              <h3 style={wayTitle}>Consommer</h3>
              <p style={wayDesc}>
                Tu achètes tes produits à prix membre. Tu économises{" "}
                <strong>25 % à 50 %</strong> dès le premier jour.
              </p>
              <p style={wayNote}>Pour démarrer ou pour soi.</p>
            </div>
            <div style={{ ...wayCardStyle, ...wayCardCyan }}>
              <div style={wayIcon}>🤝</div>
              <h3 style={wayTitle}>Partager</h3>
              <p style={wayDesc}>
                Tu accompagnes des clients vers leurs objectifs. Ta marge sur
                chaque vente : <strong>25 % à 50 %</strong> selon ton rang.
              </p>
              <p style={wayNote}>L'activité principale.</p>
            </div>
            <div style={{ ...wayCardStyle, ...wayCardViolet }}>
              <div style={wayIcon}>🌱</div>
              <h3 style={wayTitle}>Construire</h3>
              <p style={wayDesc}>
                Tu formes ta propre équipe. Tu touches une commission sur leurs
                ventes : <strong>5 % à 35 %</strong> de différentiel.
              </p>
              <p style={wayNote}>Le levier de revenus passifs.</p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECTION 4 — LES PALIERS
            ================================================================ */}
        <section style={sectionStyle}>
          <div style={eyebrowStyle}>03 · Le chemin</div>
          <h2 style={h2Style}>
            5 paliers — un chemin <span style={accentViolet}>progressif</span>
          </h2>
          <p style={leadStyle}>
            Plus tu vends régulièrement, plus tu accèdes à de meilleures
            remises. C'est progressif, transparent, et tu gardes ton avancement
            à vie.
          </p>
          <div style={levelsListStyle}>
            <LevelRow num={1} name="Client privilégié" desc="Inscription gratuite, achats à prix membre" pct="−15 %" gradient="grey" />
            <LevelRow num={2} name="Distributor" desc="Inscription officielle, démarrage de ton activité" pct="−25 %" gradient="gold" />
            <LevelRow num={3} name="Senior Consultant" desc="500 PV en 1 mois (~890 € de ventes)" pct="−35 %" gradient="emerald" />
            <LevelRow num={4} name="Success Builder" desc="1 000 PV en 1 mois (~1 780 €)" pct="−42 %" gradient="cyan" />
            <LevelRow num={5} name="Supervisor" desc="4 000 PV en 1 mois (perso + équipe). Le palier qui change tout." pct="−50 %" gradient="violet" />
          </div>
        </section>

        {/* ================================================================
            SECTION 5 — CAS CONCRET
            ================================================================ */}
        <section style={sectionStyle}>
          <div style={eyebrowStyle}>04 · Un exemple parlant</div>
          <h2 style={h2Style}>
            Imagine : 1 000 PV au palier{" "}
            <span style={accentEmerald}>Senior Consultant</span>
          </h2>
          <div style={caseStudyStyle}>
            <div style={caseRowStyle}>
              <span style={caseLabel}>Volume vendu</span>
              <span style={caseValue}>1 000 PV (~ 1 780 € HT de produits)</span>
            </div>
            <div style={caseRowStyle}>
              <span style={caseLabel}>Ta marge retail (35 %)</span>
              <span style={caseValueAccent}>~ 623 €</span>
            </div>
            <div style={caseRowStyle}>
              <span style={caseLabel}>Bonus : tu passes Success Builder le mois suivant</span>
              <span style={caseValue}>+ 7 % de marge supplémentaire</span>
            </div>
            <div style={caseTotalStyle}>
              <span style={caseTotalLabel}>💎 Revenu estimé du mois</span>
              <span style={caseTotalValue}>~ 623 €</span>
            </div>
            <p style={caseFootnote}>
              Pas mal pour une activité que tu peux faire en complément de ton
              boulot actuel — sans stock obligatoire, sans investissement initial
              massif.
            </p>
            <p style={caseDisclaimer}>
              ⚠️ Estimation pédagogique sur un mix produit moyen. Les revenus
              réels dépendent de ton activité et de ton équipe.
            </p>
          </div>
        </section>

        {/* ================================================================
            SECTION 6 — INVESTISSEMENT DE DÉPART
            ================================================================ */}
        <section style={sectionStyle}>
          <div style={eyebrowStyle}>05 · Pour démarrer</div>
          <h2 style={h2Style}>
            <span style={accentGold}>60 €</span> pour démarrer — c'est tout
          </h2>
          <p style={leadStyle}>
            Pas besoin d'investir des milliers d'euros pour tester.{" "}
            <strong>Un pack Ambassadeur à 60 €</strong> suffit pour commencer.
          </p>
          <div style={packCardStyle}>
            <div style={packBadge}>📦 PACK AMBASSADEUR</div>
            <h3 style={packPrice}>60 €</h3>
            <h4 style={packSubtitle}>Ce que tu reçois :</h4>
            <ul style={packListStyle}>
              <li>
                ✦ Une boîte de <strong>Formula 1</strong> — ton produit phare pour
                ta propre transformation
              </li>
              <li>
                ✦ L'accès à ta <strong>plateforme distributeur officielle</strong>{" "}
                (ton espace personnel pour gérer ton activité)
              </li>
              <li>
                ✦ Tous les <strong>outils digitaux</strong> pour démarrer :
                commandes, suivi clients, formations
              </li>
              <li>
                ✦ Ton <strong>accompagnement par un mentor de l'équipe</strong>{" "}
                dès le jour 1
              </li>
            </ul>
            <h4 style={packSubtitle}>À quoi ça sert concrètement :</h4>
            <ol style={packListStyle}>
              <li>
                <strong>Vivre toi-même la transformation</strong> (objectif :
                sortir ton résultat sur 21 jours)
              </li>
              <li>
                <strong>Faire goûter</strong> ton entourage et créer tes
                premières conversations
              </li>
              <li>
                <strong>T'inscrire officiellement</strong> pour pouvoir générer
                du revenu dès la première vente
              </li>
            </ol>
            <blockquote style={packQuote}>
              Aucune obligation de réabonnement. Aucun engagement. Si ça ne te
              convient pas, tu arrêtes.
            </blockquote>
          </div>
        </section>

        {/* ================================================================
            SECTION 7 — L'ACCOMPAGNEMENT
            ================================================================ */}
        <section style={sectionStyle}>
          <div style={eyebrowStyle}>06 · Tu n'es jamais seul·e</div>
          <h2 style={h2Style}>
            4 piliers d'<span style={accentCyan}>accompagnement</span>
          </h2>
          <p style={leadStyle}>
            C'est probablement le plus gros plus de notre équipe. La Base 360,
            c'est un système d'accompagnement complet qui t'évite de tâtonner.
          </p>
          <div style={grid2Style}>
            <PillarCard
              icon="🎓"
              title="Formation Académie"
              desc="Un parcours pédagogique progressif (12 modules) qui te forme à l'activité : nutrition, écoute client, structuration de bilan, posture pro. Tu avances à ton rythme, validation par étape."
              color="emerald"
            />
            <PillarCard
              icon="🧭"
              title="Mentor dédié"
              desc="Tu es jumelé·e à un distri expérimenté de l'équipe qui te coache en 1-to-1. Appels hebdomadaires, retours sur tes premiers RDV, partage de scripts qui marchent. Pas un théoricien — quelqu'un qui fait, comme toi."
              color="cyan"
            />
            <PillarCard
              icon="📱"
              title="L'app La Base 360"
              desc="On a développé un outil digital complet : suivi clients, tableau de rentabilité temps réel, formations en ligne, notifications intelligentes pour relancer au bon moment."
              color="violet"
            />
            <PillarCard
              icon="💎"
              title="La communauté"
              desc="Un groupe d'entraide actif. Quand tu galères, tu poses la question — la réponse arrive dans la journée. Quand tu kifs, tu partages. C'est une équipe, pas une compétition."
              color="gold"
            />
          </div>
          <blockquote style={quoteStyle}>
            « On a une obsession : que tu réussisses. Notre intérêt est aligné
            avec le tien. »
          </blockquote>
        </section>

        {/* ================================================================
            SECTION 8 — FAQ
            ================================================================ */}
        <section style={sectionStyle}>
          <div style={eyebrowStyle}>07 · Questions fréquentes</div>
          <h2 style={h2Style}>
            Les <span style={accentViolet}>vraies questions</span> qu'on nous pose
          </h2>
          <div style={faqListStyle}>
            <FaqItem
              q="Combien ça me prend de temps par semaine ?"
              a="C'est toi qui décides. Certains font 5h/semaine en complément d'un job, d'autres 30h+ pour en faire leur activité principale. La règle : 1h investie = X € à terme. Plus tu y mets, plus ça pousse. Mais à 5h/semaine, c'est déjà significatif."
            />
            <FaqItem
              q="Faut-il un statut juridique ?"
              a="Oui — mais c'est simple. La majorité des distri démarrent sous statut auto-entrepreneur (création gratuite en ligne, environ 30 minutes). Pour les premières années, c'est l'idéal : pas de comptabilité lourde, charges proportionnelles à ce que tu gagnes."
            />
            <FaqItem
              q="Et si je n'aime pas vendre ?"
              a="Bonne nouvelle : on ne « vend » pas. On accompagne. La méthode de l'équipe, c'est un bilan personnalisé gratuit pour chaque personne intéressée — on écoute ses objectifs, on lui propose un programme adapté, et c'est elle qui décide. Aucune pression. Tu deviens un coach, pas un vendeur."
            />
            <FaqItem
              q="Combien de temps pour gagner mes premiers euros ?"
              a="La majorité des distri qui suivent la méthode équipe encaissent leurs premiers 100-300 € dans les 30 jours. Tout dépend de ton réseau de départ et de ton engagement. Mais le pack ambassadeur à 60 € est rentabilisé en général dès le premier mois."
            />
            <FaqItem
              q="Est-ce que je peux arrêter quand je veux ?"
              a="Oui. Aucun engagement, aucune clause d'exclusivité, aucune pénalité. Si ça ne te convient pas, tu arrêtes. Tes produits, tu les gardes. Tu peux aussi faire des pauses puis reprendre — ton activité reste active tant que tu commandes au minimum."
            />
            <FaqItem
              q="Est-ce que je dois stocker des produits ?"
              a="Non. Aucun stock minimum imposé. Tu commandes en fonction de la demande de tes clients. Beaucoup de distri démarrent sans stock du tout — ils prennent les commandes et l'envoi se fait directement par la marque."
            />
            <FaqItem
              q="C'est légal en France ?"
              a="Oui, à 100 %. La marque opère en France depuis plus de 40 ans, est conforme à la réglementation Vente Directe (FVD — Fédération de la Vente Directe) et tu es ton propre patron en auto-entrepreneur déclaré."
            />
            <FaqItem
              q="Et si ça ne marche pas pour moi ?"
              a="Tu auras quand même bénéficié de produits qui marchent, d'un accompagnement bien-être personnalisé, et d'une formation business complète à 60 € — c'est honnête comme deal. Mais soyons clairs : ceux qui suivent la méthode et restent réguliers obtiennent des résultats. L'échec, c'est l'abandon."
            />
          </div>
        </section>

        {/* ================================================================
            SECTION 9 — À PROPOS
            ================================================================ */}
        <section style={sectionStyle}>
          <div style={eyebrowStyle}>08 · Qui on est</div>
          <h2 style={h2Style}>
            L'histoire derrière <span style={accentGold}>La Base 360</span>
          </h2>

          <div style={storyCardStyle}>
            <h3 style={storyTitle}>Thomas — l'ouvrier qui a osé</h3>
            <p style={storyParagraph}>
              Pendant 15 ans, j'étais conducteur d'engins dans le BTP. Un boulot
              honnête, stable. Mais un boulot qui me faisait lever à 5h du matin
              et rentrer à 19h. <em>Métro, boulot, dodo.</em> Sans vraie marge
              pour vivre, ni temps pour mes proches.
            </p>
            <p style={storyParagraph}>
              À 30 ans passés, j'ai eu un déclic :{" "}
              <strong>je n'allais pas faire ça encore 30 ans.</strong>
            </p>
            <p style={storyParagraph}>
              Je cherchais une opportunité. Pas un truc miracle — une vraie
              opportunité, qui me permettrait à la fois d'augmenter mes revenus{" "}
              <strong>et</strong> de retrouver du temps. C'est à ce moment-là, en{" "}
              <strong>mai 2022</strong>, qu'on m'a parlé de la nutrition.
            </p>
            <p style={storyParagraph}>
              J'ai commencé par moi. Sérieusement.{" "}
              <strong>−4 kg en 21 jours.</strong> Plus de performance dans mes
              activités sportives. Moins de fatigue. Une meilleure digestion. Je
              me sentais clairement mieux dans mon corps.
            </p>
            <p style={storyParagraph}>
              Naturellement, j'en ai parlé autour de moi — à mes amis du sport,
              à mes collègues du chantier.{" "}
              <strong>
                En l'espace d'un mois, j'avais généré 1 800 € de revenus
                complémentaires
              </strong>{" "}
              simplement en accompagnant les gens autour de moi sur leur remise
              en forme.
            </p>
            <p style={storyParagraph}>
              C'était parti. Aujourd'hui, <strong>4 ans plus tard</strong>, on
              est une équipe d'environ <strong>200 distributeurs</strong> sur le
              terrain. Je gère mon agenda comme je veux, je passe du temps avec
              ma famille, et nos revenus mensuels ne descendent{" "}
              <strong>jamais en dessous de 4 000 €</strong> — souvent bien plus.
            </p>
            <p style={storyParagraph}>
              <strong>Notre objectif sur 2026-2027</strong> : aider entre{" "}
              <strong>800 et 1 000 personnes</strong> à se transformer, à leur
              rythme, avec une équipe de coachs qu'on est en train de former.
            </p>
          </div>

          <div style={{ ...storyCardStyle, ...storyCardAlt }}>
            <h3 style={storyTitle}>Mélanie — la maman qui s'est libérée</h3>
            <p style={storyParagraph}>
              Ma femme Mélanie m'a rejoint à temps plein en{" "}
              <strong>novembre 2024</strong>, après{" "}
              <strong>11 ans dans une grande entreprise d'aliments canin</strong>{" "}
              (Royal Canin).
            </p>
            <p style={storyParagraph}>
              Pour elle aussi, le déclic a été nutritionnel d'abord :{" "}
              <strong>−4 kg de masse grasse le premier mois</strong>,
              l'élimination des kilos de grossesse de nos 2 enfants, et surtout
              le retour de l'énergie qu'elle avait perdue avec deux enfants en
              bas âge (aujourd'hui 6 et 8 ans).
            </p>
            <p style={storyParagraph}>
              Mélanie a une mission claire dans l'équipe :{" "}
              <strong>accompagner les femmes</strong>, en particulier les{" "}
              <strong>mamans en post-partum</strong> et celles qui veulent
              retrouver leur silhouette tout en gérant leur quotidien familial.
            </p>
          </div>

          <div style={complementBlockStyle}>
            <h3 style={complementTitle}>Une équipe complémentaire, à ton service</h3>
            <p style={storyParagraph}>
              Thomas + Mélanie. Le BTP et la grande entreprise. L'homme et la
              femme. Les hommes performance et les mamans actives. Notre couple
              incarne déjà la diversité des profils qu'on accompagne dans
              l'équipe.
            </p>
            <p style={storyParagraph}>
              Et c'est là le vrai luxe de cette activité :{" "}
              <strong>
                tu choisis avec qui tu veux travailler. En solo, en couple, en
                famille, entre amis, en équipe.
              </strong>{" "}
              Tu choisis ton revenu cible. Tu choisis la vie que tu veux avoir.
            </p>
            <blockquote style={signatureQuoteStyle}>
              La seule règle :<br />
              <strong>démarrer.</strong>
              <br />
              <em>Et ne jamais abandonner.</em>
            </blockquote>
          </div>
        </section>

        {/* ================================================================
            SECTION 10 — FORM CONTACT (CTA FINAL)
            ================================================================ */}
        <section ref={formAnchorRef} style={ctaSectionStyle}>
          <div style={ctaBlobs} aria-hidden="true">
            <div style={ctaBlob1} />
            <div style={ctaBlob2} />
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={eyebrowStyleWhite}>09 · On en parle ?</div>
            <h2 style={ctaTitleStyle}>
              <span style={ctaAccent}>15 minutes</span> pour découvrir si
              c'est fait pour toi.
            </h2>
            <p style={ctaSubtitle}>
              Un appel ou un café — pour comprendre tes objectifs et voir si La
              Base 360 colle avec ton projet de vie.{" "}
              <strong>Aucune obligation.</strong> Juste une discussion honnête.
            </p>
            <button onClick={() => setFormOpen(true)} style={ctaPrimaryBig} type="button">
              Réserver mon échange →
            </button>
            <p style={ctaPromise}>On te rappelle dans les 48h max. Promis.</p>
          </div>
        </section>

        {/* Footer signature */}
        <footer style={footerStyle}>
          <div style={footerSignature}>
            La Base 360 · The wellness nutrition club
          </div>
          <div style={footerNote}>
            Verdun · France · Depuis 2022
            {referrerId ? <span> · partagé par un membre de l'équipe</span> : null}
          </div>
        </footer>
      </div>

      <ProspectFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      {/* Print CSS */}
      <style>{`
        @media print {
          .opp-print-btn, .opp-back-btn { display: none !important; }
          body { background: white !important; }
          section { page-break-inside: avoid; }
        }
        @media (max-width: 768px) {
          .opp-grid-3 { grid-template-columns: 1fr !important; }
          .opp-grid-2 { grid-template-columns: 1fr !important; }
          .opp-h1 { font-size: 36px !important; }
          .opp-h2 { font-size: 24px !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function LevelRow({
  num, name, desc, pct, gradient,
}: {
  num: number; name: string; desc: string; pct: string; gradient: "grey" | "gold" | "emerald" | "cyan" | "violet";
}) {
  const gradients: Record<string, string> = {
    grey: "linear-gradient(135deg, #94A3B8, #64748B)",
    gold: "linear-gradient(135deg, #B8922A, #C9A84C)",
    emerald: "linear-gradient(135deg, #10B981, #34D399)",
    cyan: "linear-gradient(135deg, #06B6D4, #22D3EE)",
    violet: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
  };
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "56px 1fr auto",
      gap: 18, alignItems: "center",
      background: "white",
      border: "0.5px solid #E2E8F0",
      borderRadius: 14, padding: "16px 20px",
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: 12,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 16, color: "white",
        background: gradients[gradient],
      }}>{num}</span>
      <div>
        <div style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 3, color: "#0F172A" }}>{name}</div>
        <div style={{ fontSize: 12, color: "#64748B" }}>{desc}</div>
      </div>
      <div style={{
        fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24,
        color: gradient === "grey" ? "#64748B" : gradient === "gold" ? "#B8922A" :
          gradient === "emerald" ? "#10B981" : gradient === "cyan" ? "#06B6D4" : "#8B5CF6",
      }}>{pct}</div>
    </div>
  );
}

function PillarCard({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: "emerald" | "cyan" | "violet" | "gold" }) {
  const palette: Record<string, string> = {
    emerald: "#10B981", cyan: "#06B6D4", violet: "#8B5CF6", gold: "#B8922A",
  };
  return (
    <div style={{
      background: "white",
      border: "0.5px solid #E2E8F0",
      borderLeft: `4px solid ${palette[color]}`,
      borderRadius: 16, padding: "22px 24px",
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 8px", color: "#0F172A" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        background: "white",
        border: "0.5px solid #E2E8F0",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 8,
      }}
    >
      <summary style={{
        cursor: "pointer", fontFamily: "Sora, sans-serif", fontSize: 14,
        fontWeight: 700, color: "#0F172A", listStyle: "none",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 12,
      }}>
        <span>{q}</span>
        <span style={{ color: "#10B981", fontSize: 18, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0)" }}>+</span>
      </summary>
      <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{a}</p>
    </details>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#FAFAFC",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: "#0F172A",
  WebkitFontSmoothing: "antialiased",
  position: "relative",
};

const printBtnStyle: React.CSSProperties = {
  position: "fixed", top: 16, right: 16, zIndex: 100,
  padding: "9px 16px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
  color: "white", fontFamily: "Sora, sans-serif",
  fontSize: 12, fontWeight: 700, cursor: "pointer",
  boxShadow: "0 4px 14px rgba(16,185,129,0.32)",
};

const backBtnStyle: React.CSSProperties = {
  position: "fixed", top: 16, left: 16, zIndex: 100,
  padding: "9px 14px", borderRadius: 10,
  border: "0.5px solid #E2E8F0",
  background: "white", color: "#475569",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const contentWrapStyle: React.CSSProperties = {
  maxWidth: 920, margin: "0 auto", padding: "60px 24px 40px",
};

// ─── Hero ─────────────────────────────────────────────────────────────────
const heroStyle: React.CSSProperties = {
  textAlign: "center", padding: "80px 30px 60px",
  position: "relative", overflow: "hidden",
  borderRadius: 28, marginBottom: 60,
  background: "linear-gradient(135deg, color-mix(in srgb, #10B981 6%, white) 0%, color-mix(in srgb, #06B6D4 5%, white) 50%, color-mix(in srgb, #8B5CF6 6%, white) 100%)",
};
const heroBlobs: React.CSSProperties = {
  position: "absolute", inset: 0, pointerEvents: "none",
};
const blob1: React.CSSProperties = {
  position: "absolute", top: -80, right: -80, width: 280, height: 280,
  background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)",
  borderRadius: "50%",
};
const blob2: React.CSSProperties = {
  position: "absolute", bottom: -100, left: -100, width: 320, height: 320,
  background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 70%)",
  borderRadius: "50%",
};
const blob3: React.CSSProperties = {
  position: "absolute", top: "40%", left: "30%", width: 200, height: 200,
  background: "radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)",
  borderRadius: "50%",
};
const brandWrap: React.CSSProperties = {
  position: "relative", zIndex: 1,
  display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 26,
};
const brandMark: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
  boxShadow: "0 2px 8px rgba(16,185,129,0.25)",
  display: "inline-block",
};
const brandText: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
};
const brandTextAccent: React.CSSProperties = {
  fontStyle: "italic", fontWeight: 800,
  background: "linear-gradient(135deg,#10B981,#06B6D4,#8B5CF6)",
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
};
const heroTitle: React.CSSProperties = {
  position: "relative", zIndex: 1,
  fontFamily: "Sora, sans-serif", fontSize: 52, fontWeight: 800,
  margin: "0 auto 18px", maxWidth: 720, letterSpacing: "-0.025em", lineHeight: 1.1,
};
const heroTitleAccent: React.CSSProperties = {
  background: "linear-gradient(135deg, #10B981, #06B6D4, #8B5CF6)",
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
  fontStyle: "italic",
};
const heroSubtitle: React.CSSProperties = {
  position: "relative", zIndex: 1,
  fontSize: 18, color: "#475569", maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.65,
};
const heroCtaRow: React.CSSProperties = {
  position: "relative", zIndex: 1,
  display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap",
};
const ctaPrimary: React.CSSProperties = {
  padding: "14px 28px", borderRadius: 12, border: "none",
  background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
  color: "white", fontFamily: "Sora, sans-serif",
  fontSize: 14, fontWeight: 700, cursor: "pointer",
  boxShadow: "0 8px 24px rgba(16,185,129,0.4)",
};
const ctaPrimaryBig: React.CSSProperties = {
  ...ctaPrimary, padding: "16px 36px", fontSize: 16,
  boxShadow: "0 12px 32px rgba(16,185,129,0.5)",
};
const ctaGhost: React.CSSProperties = {
  padding: "14px 22px", borderRadius: 12,
  border: "0.5px solid rgba(15,23,42,0.16)",
  color: "#475569", fontFamily: "DM Sans, sans-serif",
  fontSize: 13, fontWeight: 600, textDecoration: "none",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
};

// ─── Sections génériques ───────────────────────────────────────────────────
const sectionStyle: React.CSSProperties = {
  marginBottom: 60,
};
const eyebrowStyle: React.CSSProperties = {
  display: "inline-block", fontSize: 11, letterSpacing: 2.4,
  color: "#10B981", fontWeight: 700, textTransform: "uppercase",
  marginBottom: 14,
};
const eyebrowStyleWhite: React.CSSProperties = {
  ...eyebrowStyle, color: "#34D399",
};
const h2Style: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontSize: 32, fontWeight: 800,
  margin: "0 0 18px", letterSpacing: "-0.02em", lineHeight: 1.15,
};
const accentEmerald: React.CSSProperties = { color: "#10B981", fontStyle: "italic" };
const accentGreen: React.CSSProperties = accentEmerald;
const accentCyan: React.CSSProperties = { color: "#06B6D4", fontStyle: "italic" };
const accentViolet: React.CSSProperties = { color: "#8B5CF6", fontStyle: "italic" };
const accentGold: React.CSSProperties = { color: "#B8922A", fontStyle: "italic" };
const leadStyle: React.CSSProperties = {
  fontSize: 16, color: "#475569", lineHeight: 1.7, margin: 0,
};
const ulCheckStyle: React.CSSProperties = {
  listStyle: "none", padding: 0, margin: "14px 0 0",
  display: "flex", flexDirection: "column", gap: 12, fontSize: 15, color: "#475569", lineHeight: 1.6,
};
const checkIcon: React.CSSProperties = {
  color: "#10B981", marginRight: 8, fontWeight: 700,
};
const quoteStyle: React.CSSProperties = {
  margin: "26px 0 0", padding: "16px 22px",
  borderLeft: "3px solid #10B981",
  background: "color-mix(in srgb, #10B981 6%, white)",
  borderRadius: 10, fontStyle: "italic", color: "#0F172A",
  fontSize: 15, lineHeight: 1.6,
};

// ─── 3 façons ────────────────────────────────────────────────────────────
const grid3Style: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18,
  marginTop: 22,
};
const grid2Style: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18,
  marginTop: 22,
};
const wayCardStyle: React.CSSProperties = {
  background: "white", borderRadius: 18, padding: "26px 24px",
  border: "0.5px solid #E2E8F0",
  boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  textAlign: "center",
};
const wayCardEmerald: React.CSSProperties = { borderTop: "3px solid #10B981" };
const wayCardCyan: React.CSSProperties = { borderTop: "3px solid #06B6D4" };
const wayCardViolet: React.CSSProperties = { borderTop: "3px solid #8B5CF6" };
const wayIcon: React.CSSProperties = { fontSize: 36, marginBottom: 12 };
const wayTitle: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 800,
  margin: "0 0 10px", color: "#0F172A",
};
const wayDesc: React.CSSProperties = { fontSize: 13, color: "#475569", lineHeight: 1.55, margin: "0 0 8px" };
const wayNote: React.CSSProperties = { fontSize: 11, color: "#94A3B8", margin: 0, fontStyle: "italic" };

// ─── Levels ────────────────────────────────────────────────────────────
const levelsListStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 10,
  marginTop: 22,
};

// ─── Cas concret ───────────────────────────────────────────────────────
const caseStudyStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in srgb, #10B981 7%, white) 0%, color-mix(in srgb, #06B6D4 5%, white) 100%)",
  border: "0.5px solid color-mix(in srgb, #10B981 20%, transparent)",
  borderRadius: 22, padding: "30px 32px", marginTop: 16,
};
const caseRowStyle: React.CSSProperties = {
  background: "white", borderRadius: 12,
  padding: "14px 18px", marginBottom: 8,
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
};
const caseLabel: React.CSSProperties = { fontSize: 13, color: "#475569", flex: 1 };
const caseValue: React.CSSProperties = { fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, color: "#0F172A" };
const caseValueAccent: React.CSSProperties = { ...caseValue, color: "#10B981", fontSize: 18 };
const caseTotalStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #10B981, #06B6D4)",
  color: "white", borderRadius: 14, padding: "18px 24px",
  marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between",
  boxShadow: "0 8px 24px rgba(16,185,129,0.32)",
};
const caseTotalLabel: React.CSSProperties = { fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14 };
const caseTotalValue: React.CSSProperties = { fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 30 };
const caseFootnote: React.CSSProperties = {
  marginTop: 16, fontSize: 13, color: "#475569", lineHeight: 1.6, fontStyle: "italic", textAlign: "center",
};
const caseDisclaimer: React.CSSProperties = {
  marginTop: 8, fontSize: 11, color: "#94A3B8", textAlign: "center", margin: "8px 0 0",
};

// ─── Pack ──────────────────────────────────────────────────────────────
const packCardStyle: React.CSSProperties = {
  background: "white",
  border: "0.5px solid color-mix(in srgb, #B8922A 25%, transparent)",
  borderTop: "4px solid #B8922A",
  borderRadius: 22, padding: "32px 36px", marginTop: 16,
  boxShadow: "0 4px 14px rgba(184,146,42,0.08)",
};
const packBadge: React.CSSProperties = {
  display: "inline-block", padding: "4px 12px",
  background: "color-mix(in srgb, #B8922A 12%, white)",
  color: "#B8922A", borderRadius: 999,
  fontSize: 10, letterSpacing: 1.6, fontWeight: 700,
  marginBottom: 14,
};
const packPrice: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontSize: 56, fontWeight: 800,
  margin: "0 0 22px", color: "#B8922A", letterSpacing: "-0.02em",
};
const packSubtitle: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700,
  margin: "16px 0 8px", color: "#0F172A",
};
const packListStyle: React.CSSProperties = {
  paddingLeft: 16, color: "#475569", fontSize: 14, lineHeight: 1.7,
  margin: "0 0 8px",
};
const packQuote: React.CSSProperties = {
  margin: "20px 0 0", padding: "12px 18px",
  background: "color-mix(in srgb, #10B981 7%, white)",
  borderLeft: "3px solid #10B981", borderRadius: 10,
  fontSize: 13, color: "#475569", fontStyle: "italic",
};

// ─── FAQ ────────────────────────────────────────────────────────────────
const faqListStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", marginTop: 16,
};

// ─── Story ─────────────────────────────────────────────────────────────
const storyCardStyle: React.CSSProperties = {
  background: "white",
  border: "0.5px solid #E2E8F0", borderRadius: 18,
  padding: "28px 32px", marginBottom: 14,
  borderLeft: "4px solid #10B981",
};
const storyCardAlt: React.CSSProperties = {
  borderLeftColor: "#06B6D4",
};
const storyTitle: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 800,
  margin: "0 0 16px", color: "#0F172A",
};
const storyParagraph: React.CSSProperties = {
  fontSize: 15, color: "#475569", lineHeight: 1.75, margin: "0 0 14px",
};
const complementBlockStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in srgb, #10B981 7%, white) 0%, color-mix(in srgb, #8B5CF6 6%, white) 100%)",
  border: "0.5px solid color-mix(in srgb, #8B5CF6 20%, transparent)",
  borderRadius: 18, padding: "28px 32px", marginTop: 14,
};
const complementTitle: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 800,
  margin: "0 0 16px", color: "#0F172A",
};
const signatureQuoteStyle: React.CSSProperties = {
  margin: "20px 0 0", padding: "20px 24px", textAlign: "center",
  fontFamily: "Sora, sans-serif", fontSize: 18, lineHeight: 1.5,
  background: "white", borderRadius: 14, color: "#0F172A",
};

// ─── CTA final ─────────────────────────────────────────────────────────
const ctaSectionStyle: React.CSSProperties = {
  position: "relative", textAlign: "center",
  padding: "60px 32px", borderRadius: 28, marginBottom: 30,
  background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
  color: "white", overflow: "hidden",
};
const ctaBlobs: React.CSSProperties = {
  position: "absolute", inset: 0, pointerEvents: "none",
};
const ctaBlob1: React.CSSProperties = {
  position: "absolute", top: -120, right: -120, width: 320, height: 320,
  background: "radial-gradient(circle, rgba(16,185,129,0.32), transparent 65%)",
  borderRadius: "50%",
};
const ctaBlob2: React.CSSProperties = {
  position: "absolute", bottom: -100, left: -100, width: 280, height: 280,
  background: "radial-gradient(circle, rgba(139,92,246,0.28), transparent 65%)",
  borderRadius: "50%",
};
const ctaTitleStyle: React.CSSProperties = {
  ...h2Style, color: "white", maxWidth: 700, margin: "0 auto 14px", textAlign: "center",
  fontSize: 36,
};
const ctaAccent: React.CSSProperties = {
  background: "linear-gradient(135deg, #34D399, #06B6D4)",
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
  fontStyle: "italic",
};
const ctaSubtitle: React.CSSProperties = {
  fontSize: 16, color: "rgba(255,255,255,0.85)",
  maxWidth: 580, margin: "0 auto 28px", lineHeight: 1.65,
};
const ctaPromise: React.CSSProperties = {
  marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic",
};

// ─── Footer ────────────────────────────────────────────────────────────
const footerStyle: React.CSSProperties = {
  textAlign: "center", padding: "30px 20px", marginTop: 30,
  borderTop: "0.5px solid #E2E8F0",
};
const footerSignature: React.CSSProperties = {
  fontFamily: "Sora, sans-serif", fontWeight: 700,
  fontSize: 14, color: "#0F172A", marginBottom: 6,
};
const footerNote: React.CSSProperties = {
  fontSize: 11, color: "#94A3B8",
};
