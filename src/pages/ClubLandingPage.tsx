// =============================================================================
// ClubLandingPage — accueil du site public Breakfast Club (Verdun).
// Reproduction fidèle de la v7. Header/footer/nav = <ClubShell>. Copy v7.
// Photos = slots encadrés « 📷 » à remplir. CTA → tunnel /reserver.
// =============================================================================

import { useEffect, useState, type ReactNode } from "react";
import { ClubShell, Slot, PhotoBand, R, objUrl, TEL } from "./club/ClubShell";
import { CountUp } from "./club/CountUp";
import { ClubCardCheckout, type CardOffer } from "./club/ClubCardCheckout";
import { ClubPaymentReturn } from "./club/ClubPaymentReturn";
import { ClubOfferPopup } from "./club/ClubOfferPopup";
import { PrelaunchCounter } from "./club/PrelaunchCounter";

// Affichage seulement — l'edge relit prix ET validité dans clubs.settings.cards
// avant d'encaisser quoi que ce soit. Ces valeurs sont là pour que la modale
// confirme à la personne ce qu'elle achète, jamais pour fixer le montant.
// Elles doivent rester alignées sur les cartes ci-dessous et sur la base.
const CARD_OFFERS: Record<10 | 30, CardOffer> = {
  10: { type: 10, priceEur: 80, validityDays: 30 },
  30: { type: 30, priceEur: 185, validityDays: 90 },
};

// Wordmark AVEC le cœur rouge (logo officiel) — sur fond crème clair le cœur ressort.
const WORDMARK = "/brand/breakfast-club/logo-heart.png";

// Icônes filaires (style Feather) — remplacent les emoji (rendu incohérent selon
// l'OS). Monochrome, stroke = currentColor (couleur portée par le parent).
const IIC: Record<string, ReactNode> = {
  drink: <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></>,
  pulse: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  book: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
  heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />,
  weight: <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></>,
  muscle: <><path d="M6.5 6.5v11" /><path d="M17.5 6.5v11" /><path d="M3.5 9v6" /><path d="M20.5 9v6" /><line x1="6.5" y1="12" x2="17.5" y2="12" /></>,
  energy: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
};
function Ico({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {IIC[name]}
    </svg>
  );
}

const RITUEL = [
  { n: "01", t: "L'aloe vera", d: "De l'eau et un concentré de pulpe d'aloe vera. Après une nuit sans boire, la première chose dont ton corps a besoin, c'est de l'eau — pas un café.", top: "cl-top-o" },
  { n: "02", t: "Le thé aux plantes", d: "Thé vert, hibiscus, extraits de plantes. Chaud ou glacé, un peu de caféine. C'est le verre qu'on prend assis, celui pendant lequel on discute.", top: "cl-top-p" },
  { n: "03", t: "Le smoothie", d: "Le vrai petit-déjeuner complet : protéines végétales, 26 vitamines et minéraux, fibres — sans lactose ni gluten. Dosage ajusté à ton objectif, parfum au choix.", top: "cl-top-s" },
  { n: "04", t: "Le suivi", d: "Avant de repartir : la pesée, deux lignes dans ton carnet, une phrase avec ton coach. La partie qu'on sous-estime, et celle qui fait la différence.", top: "cl-top-a" },
];
const INCLUS = [
  { n: "01", ic: "drink", t: "Les trois boissons", d: "L'aloe, le thé et le smoothie. Le rituel complet, servi dans l'ordre, tous les matins.", top: "cl-top-o" },
  { n: "02", ic: "pulse", t: "La pesée", d: "Dix secondes chaque matin. On mesure pour ajuster ton plan, jamais pour te juger.", top: "cl-top-p" },
  { n: "03", ic: "book", t: "Le carnet de bord", d: "Quatre valeurs seulement — protéines, hydratation, activité, énergie. Tenable tous les jours.", top: "cl-top-s" },
  { n: "04", ic: "chat", t: "Le groupe du club", d: "L'équipe et les autres membres, dans un seul groupe. Pour les matins où la motivation n'y est pas.", top: "cl-top-a" },
  { n: "05", ic: "camera", t: "Le point des 10 visites", d: "Nouvelles mesures, tes photos avant/après, et on décide ensemble de la suite.", top: "cl-top-o" },
  { n: "06", ic: "heart", t: "Un vrai accompagnement", d: "Mélanie et Thomas, présents chaque matin. Tu n'avances jamais seul.", top: "cl-top-p" },
];
const FAQ = [
  { q: "Combien ça coûte ?", a: "Ton premier body scan est offert. Ensuite, une visite revient à 8 € — et une visite, ce n'est pas juste un petit-déj : c'est ta boisson d'hydratation, ton thé aux plantes, un smoothie qui couvre près de 40 % de tes apports de la journée, ta pesée et ton point avec le coach. Deux cartes au choix : 10 visites à 80 € (8 € la visite, valable 30 jours), ou 30 visites à 185 € (6,17 € la visite, valable 90 jours) — offre de pré-lancement réservée aux 20 premiers membres, ensuite 210 €. Les cartes ne sont pas remboursables. Le prix de ta carte, c'est tout ce que tu paies pour venir.", open: true },
  // ⚠ Cette réponse disait « tu l'utilises à ton rythme » — ça contredisait
  // frontalement la validité de 30 / 90 jours. Reformulée : engagement (il n'y
  // en a pas) et validité (il y en a une) sont deux choses différentes, et le
  // client doit lire les deux au même endroit.
  { q: "Est-ce que je m'engage sur une durée ?", a: "Non. Pas d'abonnement, pas de prélèvement automatique : tu paies ta carte une fois, et c'est tout. En revanche une carte a une durée de validité — 30 jours pour la carte 10 visites, 90 jours pour la carte 30 visites, à partir du jour de l'achat. C'est ce qui garde le rythme : une carte 10 visites, c'est deux à trois matins par semaine pendant un mois." },
  { q: "Et si je n'utilise pas toutes mes visites ?", a: "Les cartes ne sont pas remboursables et les visites non utilisées à la fin de la validité sont perdues. On préfère te le dire avant plutôt qu'après. Si un imprévu sérieux t'empêche de venir — hospitalisation, déménagement — parle-nous-en : on trouve une solution au cas par cas. Et si tu hésites entre les deux cartes, commence par la 10 visites." },
  { q: "Suis-je obligé d'acheter des produits ?", a: "Non. Tout ce que tu consommes pendant ta visite est déjà compris dans ta carte. Pour continuer à la maison, on a de la nutrition à emporter — collations, smoothie et boissons pour les matins où tu ne passes pas au club. Utile, mais jamais imposé." },
  { q: "Je n'ai jamais le temps le matin.", a: "Tu passes quand tu veux entre 7h et 11h, sans rendez-vous. Sur place, tu prends tes trois boissons à ton rythme : souvent un quart d'heure, parfois plus si tu t'assois pour discuter. Il n'y a pas de chrono — juste ton moment du matin." },
  // La phrase forte vient de la section « Ce que ce n'est pas » (page Le club),
  // supprimée parce que redondante. Elle, non : elle enlève la peur numéro un
  // de quelqu'un qui n'est pas en forme, et rien d'autre ne le disait ici.
  { q: "Je ne suis pas sportif.", a: "Ce n'est pas une salle de sport : aucune performance à prouver, aucun regard sur ce que tu soulèves. C'est un petit-déjeuner et un suivi. On part d'où tu en es, à ton rythme." },
  { q: "Au bout de combien de temps je vois quelque chose ?", a: "On fait le point à la 10ᵉ visite : nouvelles mesures, nouvelles photos si tu veux. C'est là qu'on regarde ensemble le chemin parcouru." },
];

export function ClubLandingPage() {
  const [offer, setOffer] = useState<CardOffer | null>(null);
  // Retour de paiement : l'edge a mis l'identifiant de commande dans l'URL.
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const carte = new URLSearchParams(window.location.search).get("carte");
    if (!carte) return;
    setOrderId(carte);
    // On nettoie l'URL tout de suite : un rechargement, un partage du lien ou
    // un retour en arrière ne doivent pas ré-afficher « paiement reçu ».
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  return (
    <ClubShell>
      {offer ? <ClubCardCheckout offer={offer} onClose={() => setOffer(null)} /> : null}
      {orderId ? <ClubPaymentReturn orderId={orderId} onClose={() => setOrderId(null)} /> : null}
      {/* Jamais en même temps qu'un autre panneau : quelqu'un qui achète ou qui
          revient de payer n'a pas besoin qu'on lui propose de réserver. */}
      {!offer && !orderId ? <ClubOfferPopup /> : null}
      {/* HERO */}
      <div id="top" className="cl-band cl-rel">
        <div className="cl-blob" aria-hidden="true" style={{ width: 400, height: 400, background: "var(--yellow)", opacity: .34, top: -150, left: -120 }} />
        <div className="cl-dots" aria-hidden="true" style={{ width: 260, height: 320, top: 70, right: 0 }} />
        <div className="cl-wrap" style={{ paddingTop: "clamp(64px,12vw,120px)", paddingBottom: "clamp(56px,8vw,96px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: "clamp(36px,5vw,72px)", alignItems: "center" }}>
            <div>
              <span className="cl-pill y">Ouverture prochaine · Verdun</span>
              <img src={WORDMARK} alt="The Breakfast Club by La Base" style={{ width: "min(460px,84%)", marginTop: "clamp(22px,3vw,32px)" }} />
              <h1 style={{ marginTop: "clamp(18px,2.5vw,26px)", fontSize: "clamp(32px,5vw,60px)" }}>Reprends ta forme,<br /><span className="cl-a-sage">un matin à la fois.</span></h1>
              <p className="cl-lead" style={{ marginTop: 18, maxWidth: "32em" }}>Le club de petit-déjeuner et de coaching nutrition de Verdun. On t'accompagne chaque matin pour atteindre ton objectif. C'est quoi, le tien ?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 28 }}>
                <a className="cl-cta" href={R}>Réserver mon body scan</a>
                <a className="cl-ghost" href="#rituel">Voir le rituel</a>
              </div>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14.5 }}>
                <span aria-hidden="true" style={{ color: "var(--amber)", letterSpacing: 2 }}>★★★★★</span>
                <b style={{ color: "var(--ink)" }}>4,9/5</b>
                <span style={{ color: "var(--muted2)" }}>sur Google · 0 € · sans engagement</span>
              </div>
              {/* « 7h–11h » occupait cette place, mais l'horaire est déjà répété
                  juste en dessous dans la barre d'infos ET dans le pied de page.
                  Le hero n'avait alors aucune PREUVE, seulement du pratique — or
                  c'est la première question qu'on se pose devant un club neuf.
                  Le chiffre est attribué à La Base et pas au club (qui n'a pas
                  encore ouvert) : c'est la même formulation que la section
                  Communauté, « depuis quatre ans à Verdun ». */}
              <div className="cl-stats">
                <div className="cl-stat"><div className="v">200+</div><div className="l">personnes accompagnées</div></div>
                <div className="cl-stat"><div className="v">Sans RDV</div><div className="l">tu passes quand tu veux</div></div>
                <div className="cl-stat"><div className="v">Offert</div><div className="l">ton body scan</div></div>
              </div>
            </div>
            <Slot
              ratio="4/5"
              label="Photo hero"
              sub="ambiance club le matin"
              src="/brand/breakfast-club/photos/club-salle.jpg"
              alt="Six personnes attablées au Breakfast Club de Verdun un matin, boissons et carnet de coaching sur la table."
              priority
            />
          </div>
        </div>
      </div>

      {/* OBJECTIF STRIP */}
      <div className="cl-band">
        <div className="cl-wrap" style={{ maxWidth: 1000, paddingTop: "clamp(20px,3vw,30px)", paddingBottom: "clamp(48px,6vw,72px)", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".28em", textTransform: "uppercase", color: "var(--muted2)", margin: "0 0 16px" }}>Choisis ton objectif</p>
          <div className="cl-obj">
            <a href={objUrl("poids")}><Ico name="weight" size={19} />Perdre du poids</a>
            <a className="p" href={objUrl("muscle")}><Ico name="muscle" size={19} />Reprendre du muscle</a>
            <a className="s" href={objUrl("energie")}><Ico name="energy" size={19} />Retrouver de l'énergie</a>
          </div>
        </div>
      </div>

      {/* INFO BAR */}
      <div className="cl-band dark">
        <div className="cl-wrap" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", textAlign: "center", gap: "14px clamp(28px,5vw,64px)", paddingTop: "clamp(22px,3vw,30px)", paddingBottom: "clamp(22px,3vw,30px)" }}>
          <div><div style={{ color: "var(--yellow)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700 }}>Adresse</div><div style={{ color: "var(--on-dark-2)", marginTop: 3 }}>11 rue Saint Pierre, Verdun</div></div>
          <div><div style={{ color: "var(--yellow)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700 }}>Horaires</div><div style={{ color: "var(--on-dark-2)", marginTop: 3 }}>Lun–Ven 7h–11h · Sam 8h–11h</div></div>
          <div><div style={{ color: "var(--yellow)", fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700 }}>Téléphone</div><a href={TEL} style={{ color: "#fff", marginTop: 3, display: "inline-block", textDecoration: "underline", textDecorationColor: "var(--yellow)" }}>06 79 44 87 59</a></div>
        </div>
      </div>

      {/* PHILOSOPHIE */}
      <div id="philosophie" className="cl-band">
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center" }}>
            <div>
              <span className="cl-pill y">Notre philosophie</span>
              <h2 style={{ marginTop: 24, fontSize: "clamp(40px,6.4vw,84px)" }}>Du concret,<br /><span className="cl-a-sage">pas des promesses.</span></h2>
            </div>
            <div>
              <p style={{ fontSize: 19, lineHeight: 1.75, color: "var(--muted)" }}>Pas de régime express, pas de poudre magique. Ce qui marche, c'est la régularité : un bon petit-déjeuner pris chaque matin au même endroit, avec quelqu'un qui suit tes chiffres — c'est ça qui finit par tout changer. Ici, tu trouves tout au même endroit : de quoi bien manger, un coach qui te suit, et un groupe qui t'attend, dès 7h.</p>
              <p style={{ fontSize: 19, lineHeight: 1.75, color: "var(--muted)", marginTop: 16 }}>On t'aide à installer des habitudes qui tiennent et à comprendre ce dont ton corps a besoin — pas à suivre un plan que tu lâcheras dans deux semaines. Au bout du compte : plus d'énergie dès le réveil, un corps qui bouge dans le bon sens, et la fierté de t'y être tenu.</p>
              <p style={{ fontFamily: "Anton", fontSize: "clamp(22px,2.6vw,30px)", lineHeight: 1.05, marginTop: 26 }}>Ce n'est pas la volonté qui te manque. <span className="cl-a-pink">C'est un rendez-vous.</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* LE RITUEL */}
      <div id="rituel" className="cl-band">
        <div className="cl-wrap" style={{ paddingBottom: "clamp(64px,10vw,120px)" }}>
          <div className="cl-rv" style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
            <span className="cl-pill o">Le rituel du matin</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(34px,4.8vw,60px)" }}>Chaque matin,<br /><span className="cl-a-orange">le même rituel.</span></h2>
            <p className="cl-lead" style={{ marginTop: 16 }}>Le même déroulé chaque matin, pensé pour un seul objectif : que tu repartes plein d'énergie et un pas plus près du tien. Tu pousses la porte, tout est prêt — rien à préparer, rien à décider.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "clamp(18px,2.4vw,26px)", marginTop: "clamp(44px,6vw,64px)" }}>
            {RITUEL.map((c) => (
              <div key={c.n} className={`cl-card ${c.top}`} style={{ padding: "34px 28px 30px" }}>
                <div className="cl-num">{c.n}</div>
                <h3 style={{ marginTop: 16, fontSize: 20 }}>{c.t}</h3>
                <p style={{ marginTop: 10, fontSize: 16, color: "var(--muted3)" }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BANDE PHOTO — coupure entre « le rituel raconté » et « ce qui est inclus ».
          Ordre volontaire : les trois boissons d'abord, dans l'ordre où on les
          sert, parce que ce sont les trois qui survivent au recadrage mobile
          (cf. .cl-photoband) — la bande continue donc de raconter le rituel
          même quand il n'en reste que trois. */}
      <PhotoBand
        srcs={[
          "/brand/breakfast-club/photos/rituel-aloe.jpg",
          "/brand/breakfast-club/photos/rituel-the.jpg",
          "/brand/breakfast-club/photos/rituel-smoothie.jpg",
          "/brand/breakfast-club/photos/equipe-paysage.jpg",
          "/brand/breakfast-club/photos/club-facade.jpg",
        ]}
      />

      {/* CE QUI EST INCLUS */}
      <div id="inclus" className="cl-band dark cl-rel">
        <div className="cl-blob" aria-hidden="true" style={{ width: 440, height: 440, background: "var(--sage)", opacity: .16, top: -130, right: -100 }} />
        <div className="cl-dots" aria-hidden="true" style={{ width: 220, height: 260, bottom: 30, left: 10 }} />
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ maxWidth: 760 }}>
            <span className="cl-pill p">Ce qui est inclus</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(38px,6vw,76px)", color: "#fff" }}>Ce que t'apporte<br /><span className="cl-a-yellow">chaque matin.</span></h2>
            <p className="cl-lead" style={{ marginTop: 16 }}>Tu achètes des visites, et tout le rituel est déjà dedans — aucun supplément surprise au comptoir. Et pour les matins où tu ne passes pas, ce qu'il te faut pour garder le rythme à la maison : tes boissons et ton smoothie à emporter.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: "clamp(18px,2.4vw,26px)", marginTop: "clamp(44px,6vw,64px)" }}>
            {INCLUS.map((c) => (
              <div key={c.n} className={`cl-card dark ${c.top}`} style={{ padding: "32px 28px", position: "relative" }}>
                <span className="cl-num" style={{ position: "absolute", top: 20, right: 22 }}>{c.n}</span>
                <div style={{ color: "var(--yellow)" }} aria-hidden="true"><Ico name={c.ic} /></div>
                <h3 style={{ marginTop: 14, fontSize: 19, color: "#fff" }}>{c.t}</h3>
                <p style={{ marginTop: 8, fontSize: 16, color: "var(--on-dark-2)" }}>{c.d}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid rgba(244,239,228,.18)", fontSize: 15, color: "var(--on-dark-3)", maxWidth: "70ch" }}>Les boissons et compléments servis au club sont des produits de bien-être, pas des médicaments. Ils ne remplacent pas une alimentation variée ni un avis médical.</p>
        </div>
      </div>

      {/* COMMUNAUTÉ */}
      <div id="equipe" className="cl-band cl-rel">
        <div className="cl-blob b" aria-hidden="true" style={{ width: 380, height: 380, background: "var(--peach)", opacity: .40, bottom: -150, left: -110 }} />
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center" }}>
            <div style={{ order: 2 }}>
              <Slot
                ratio="4/5"
                label="Mélanie & Thomas"
                sub="l'équipe au club"
                frame="peach"
                // Le selfie devant le néon a remplacé le portrait posé : plus
                // vrai, et il montre le lieu en même temps que les visages.
                // Format 9:16 dans un cadre 4:5 → il faut dire QUOI garder :
                // « 50% 22% » remonte la fenêtre pour conserver l'enseigne et
                // les deux visages, là où un centrage coupait le néon.
                src="/brand/breakfast-club/photos/equipe-selfie.jpg"
                position="50% 22%"
                alt="Mélanie et Thomas, les coachs du club, souriants devant le mur végétal et l'enseigne lumineuse La Base."
              />
            </div>
            <div style={{ order: 1 }}>
              <span className="cl-pill s">Communauté</span>
              <h2 style={{ marginTop: 24, fontSize: "clamp(40px,6.4vw,82px)" }}>Tu n'es <span className="cl-a-pink">jamais seul.</span></h2>
              <p style={{ fontSize: 19, lineHeight: 1.72, color: "var(--muted)", marginTop: 20 }}>Mélanie et Thomas accompagnent des habitants de Verdun depuis quatre ans — et ça se voit dans les résultats de leurs membres.</p>
              <p style={{ fontSize: 19, lineHeight: 1.72, color: "var(--muted)", marginTop: 16 }}>Au club, tu retrouves les mêmes visages chaque matin. C'est ce rendez-vous-là qui fait qu'on revient — et qu'on tient sur la durée.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RÉSULTATS */}
      <div id="resultats" className="cl-band">
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ maxWidth: 720 }}>
            <span className="cl-pill peach">Résultats</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(38px,6vw,72px)" }}>Le club est neuf.<br /><span className="cl-a-sage">L'expérience, non.</span></h2>
            <p className="cl-lead" style={{ marginTop: 16, maxWidth: "44em" }}>Les photos et les témoignages du club arriveront avec ses premiers membres. En attendant, les avis Google de La Base parlent déjà pour nous.</p>
          </div>
          <div style={{ background: "var(--dark)", borderRadius: 20, padding: "clamp(26px,3.4vw,40px)", marginTop: 32, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 28px" }}>
            <span style={{ color: "var(--yellow)", fontSize: 18, letterSpacing: 3 }}>★★★★★</span>
            <span style={{ fontFamily: "Anton", fontSize: 38, color: "#fff" }}><CountUp end={4.9} decimals={1} duration={1400} /> / 5</span>
            <span style={{ fontSize: 17, color: "var(--on-dark-2)" }}>sur les avis Google de La Base</span>
            <a className="cl-cta" style={{ marginLeft: "auto", minHeight: 52 }} href="https://www.google.com/maps/place//data=!4m3!3m2!1s0x47eb1d44e38c23ab:0x685b5b72dd6c5ae2!12e1?source=g.page.m._&laa=merchant-review-solicitation" target="_blank" rel="noopener noreferrer">Voir les avis →</a>
          </div>
        </div>
      </div>

      {/* MINI 3 ÉTAPES — le parcours en un coup d'œil, juste avant les tarifs */}
      <div className="cl-band">
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <span className="cl-pill o">Comment ça se passe</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(38px,6vw,72px)" }}>3 étapes, <span className="cl-a-orange">c'est tout.</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "clamp(18px,2.4vw,26px)", marginTop: "clamp(40px,6vw,60px)" }}>
            {[
              { n: "01", t: "Tu réserves", d: "Ton body scan de découverte, offert. En ligne, 2 minutes.", top: "cl-top-o" },
              { n: "02", t: "On fait le point", d: "Mesures, objectif, ton plan — 45 min avec un coach.", top: "cl-top-p" },
              { n: "03", t: "Tu viens le matin", d: "Ton rituel + ton suivi, chaque matin, à ton rythme.", top: "cl-top-s" },
            ].map((s) => (
              <div key={s.n} className={`cl-card ${s.top}`} style={{ padding: "34px 28px 30px" }}>
                <div className="cl-num">{s.n}</div>
                <h3 style={{ marginTop: 16, fontSize: 20 }}>{s.t}</h3>
                <p style={{ marginTop: 10, fontSize: 16, color: "var(--muted3)" }}>{s.d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "clamp(28px,4vw,40px)", display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            <a className="cl-cta" href={R}>Réserver mon body scan</a>
            <a className="cl-ghost" href="/club/comment-ca-se-passe">Voir le détail</a>
          </div>
        </div>
      </div>

      {/* FORMULES */}
      <div id="formule" className="cl-band alt">
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <span className="cl-pill s">Sans engagement</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(40px,6.4vw,80px)" }}>Choisis <span className="cl-a-orange">ta formule.</span></h2>
            <p className="cl-lead" style={{ marginTop: 16 }}>On commence toujours par le body scan. Il est offert et n'engage à rien.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "clamp(18px,2.4vw,26px)", marginTop: 40, alignItems: "stretch" }}>
            <div className="cl-card" style={{ padding: "14px 32px 34px", display: "flex", flexDirection: "column" }}>
              <div className="cl-ribbon" style={{ background: "var(--sage)" }}>1ère visite</div>
              <div className="cl-price" style={{ marginTop: 24, color: "var(--sage-d)" }}>Offert</div>
              <p style={{ margin: "6px 0 0", color: "var(--muted2)" }}>Ton body scan de découverte · 45 min</p>
              <ul className="cl-feats">
                <li>Ton <b>bilan bien-être</b> complet avec un coach</li>
                <li>Ton <b>scan de composition corporelle</b></li>
                <li>Ta boisson détox + ton smoothie, <b>offerts</b></li>
                <li>Ton plan de départ, clair et à toi</li>
                <li>Zéro engagement, tu repars libre</li>
              </ul>
              <a className="cl-cta" style={{ marginTop: "auto", background: "transparent", border: "2px solid var(--sage)", color: "var(--sage-d)", boxShadow: "none" }} href={R}>Je réserve</a>
            </div>
            <div className="cl-card" style={{ padding: "14px 32px 34px", display: "flex", flexDirection: "column" }}>
              <div className="cl-ribbon" style={{ background: "var(--grad)" }}>Découverte</div>
              <div className="cl-price" style={{ marginTop: 24, color: "var(--orange-h)" }}><CountUp end={80} duration={1600} /> €</div>
              {/* Le prix par visite fait la division à la place du visiteur : c'est
                  ce chiffre-là qui se compare à un café-croissant, pas les 80 €. */}
              <p style={{ margin: "6px 0 0", color: "var(--muted2)" }}>10 visites · <b style={{ color: "var(--ink)" }}>soit 8 € la visite</b></p>
              <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--muted3)" }}>Tout compris · valable 30 jours</p>
              <ul className="cl-feats">
                <li>10 matins <b>complets</b> au club</li>
                <li>Aloé + thé aux plantes + <b>smoothie nutritionnel</b> (≈ 40 % de tes apports du jour)</li>
                <li>Ta <b>pesée et ton point coach</b> chaque matin</li>
                <li>L'accès au groupe du club</li>
                <li>Le bilan mesures à la 10ᵉ visite</li>
              </ul>
              <button type="button" className="cl-cta" style={{ marginTop: "auto", border: "none", font: "inherit", cursor: "pointer" }} onClick={() => setOffer(CARD_OFFERS[10])}>Je commence</button>
            </div>
            <div className="cl-card dark" style={{ padding: "14px 32px 34px", display: "flex", flexDirection: "column" }}>
              <div className="cl-ribbon" style={{ background: "var(--grad)" }}>Le plus choisi</div>
              <div style={{ marginTop: 24, display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <div className="cl-price" style={{ color: "var(--grad-a)" }}><CountUp end={185} duration={1600} /> €</div>
                <div className="cl-price" style={{ fontSize: 30, color: "var(--on-dark-3)", textDecoration: "line-through", opacity: .8 }}>210 €</div>
              </div>
              {/* Le badge « −12 % » a sauté (il contredisait le « 23 % » juste
                  en dessous), mais le 210 € reste : c'est le tarif prévu APRÈS
                  le pré-lancement, et il donne sa mesure à l'offre. */}
              <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--yellow)" }}><span aria-hidden="true">🎉</span> Offre de pré-lancement · 20 premiers membres</div>
              <PrelaunchCounter />
              <p style={{ margin: "10px 0 0", color: "var(--yellow)" }}>30 visites · <b>soit 6,17 € la visite</b></p>
              <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--on-dark-3)" }}>23 % moins cher que la carte 10 · valable 90 jours</p>
              <ul className="cl-feats">
                <li><b>Tout</b> ce qu'il y a dans la carte 10 visites</li>
                <li><b>3× plus de matins</b> pour ancrer le rituel</li>
                <li>Le <b>meilleur tarif par visite</b> du club</li>
                <li>Fait pour t'installer dans la durée</li>
              </ul>
              <button type="button" className="cl-cta" style={{ marginTop: "auto", background: "#fff", color: "var(--dark)", boxShadow: "none", border: "none", font: "inherit", cursor: "pointer" }} onClick={() => setOffer(CARD_OFFERS[30])}>Je commence</button>
            </div>
          </div>
          {/* La validité et le non-remboursement sont des conditions de vente :
              elles doivent être lisibles AVANT l'achat, pas seulement dans la FAQ.
              « Pas de durée minimum » a été retiré — ça contredisait la validité. */}
          <p style={{ textAlign: "center", maxWidth: 660, margin: "26px auto 0", fontSize: 16, color: "var(--muted2)" }}>Le body scan est offert et n'engage à rien. Pas d'abonnement, pas de prélèvement automatique. Les cartes sont <b style={{ color: "var(--ink)" }}>valables 30 jours (10 visites) et 90 jours (30 visites)</b> à partir de l'achat, et ne sont pas remboursables. <b style={{ color: "var(--ink)" }}>La carte 30 visites à 185 € est une offre de pré-lancement, réservée aux 20 premiers membres</b> — ensuite 210 €.</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="cl-band">
        <div className="cl-wrap cl-sec cl-rv" style={{ maxWidth: 860 }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
            <span className="cl-pill p">FAQ</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(40px,6.4vw,80px)" }}>Questions <span className="cl-a-orange">fréquentes.</span></h2>
          </div>
          {FAQ.map((f) => (
            <details key={f.q} open={f.open}>
              <summary>{f.q}<span className="cl-plus" aria-hidden="true">+</span></summary>
              <div className="ans">{f.a}</div>
            </details>
          ))}
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 15, color: "var(--muted)" }}>Une question qui n'est pas là ? Appelle-nous au <a href={TEL} style={{ color: "var(--ink)", fontWeight: 700 }}>06 79 44 87 59</a>, on répond entre 7h et 11h.</p>
        </div>
      </div>

      {/* NOUS TROUVER — carte + itinéraire (bas de page) */}
      <div className="cl-band alt"><div className="cl-wrap cl-sec cl-rv">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <span className="cl-pill s">Nous trouver</span>
          <h2 style={{ marginTop: 24, fontSize: "clamp(32px,4.6vw,56px)" }}>On t'attend <span className="cl-a-sage">rue Saint Pierre.</span></h2>
          <p className="cl-lead" style={{ marginTop: 16 }}>11 rue Saint Pierre, 55100 Verdun. Ouvert Lun–Ven 7h–11h et Sam 8h–11h.</p>
        </div>
        <div style={{ marginTop: 32, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(30,51,48,.14)", boxShadow: "0 12px 40px rgba(0,0,0,.08)" }}>
          <iframe
            title="Carte — The Breakfast Club, 11 rue Saint Pierre, Verdun"
            src="https://www.google.com/maps?q=11+rue+Saint+Pierre+55100+Verdun&output=embed"
            width="100%"
            height="360"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a className="cl-cta" href="https://www.google.com/maps/dir/?api=1&destination=11+rue+Saint+Pierre+55100+Verdun" target="_blank" rel="noopener noreferrer">Itinéraire →</a>
        </div>
      </div></div>

      {/* CTA FINAL */}
      <div className="cl-band dark">
        <div className="cl-wrap cl-sec-lg cl-rv" style={{ textAlign: "center", maxWidth: 820 }}>
          <span className="cl-pill y">On se retrouve</span>
          <h2 style={{ marginTop: 24, fontSize: "clamp(42px,7vw,92px)", color: "#fff" }}>On se voit<br /><span className="cl-a-yellow">demain matin ?</span></h2>
          <p className="cl-lead" style={{ marginTop: 18, marginLeft: "auto", marginRight: "auto", maxWidth: 620 }}>Le body scan est offert et dure environ 45 minutes. C'est la meilleure façon de savoir si le club est fait pour toi.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 28 }}>
            <a className="cl-cta" href={R}>Mon body scan offert</a>
            <a className="cl-ghost" href={TEL}>Appeler le club</a>
          </div>
        </div>
      </div>
    </ClubShell>
  );
}
