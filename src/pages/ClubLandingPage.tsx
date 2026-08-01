// =============================================================================
// ClubLandingPage — accueil du site public Breakfast Club (Verdun).
// Reproduction fidèle de la v7. Header/footer/nav = <ClubShell>. Copy v7.
// Photos = slots encadrés « 📷 » à remplir. CTA → tunnel /reserver.
// =============================================================================

import { ClubShell, Slot, R, objUrl, TEL } from "./club/ClubShell";

const WORDMARK = "/brand/breakfast-club/logo-wordmark-dark.png";

const RITUEL = [
  { n: "01", t: "L'aloe vera", d: "Une boisson d'hydratation pour bien démarrer. Ni détox, ni brûle-graisse — juste le bon geste d'ouverture.", top: "cl-top-o" },
  { n: "02", t: "Le thé aux plantes", d: "Un coup de fouet doux. S'il te tient jusqu'à midi, c'est que le smoothie était bien dosé.", top: "cl-top-p" },
  { n: "03", t: "Le smoothie", d: "Le vrai repas. Protéines et nutriments : le petit-déjeuner qui cale sans peser.", top: "cl-top-s" },
  { n: "04", t: "Le suivi", d: "La partie que personne ne photographie : la pesée, deux chiffres, et une phrase du coach.", top: "cl-top-a" },
];
const INCLUS = [
  { n: "01", ic: "🥤", t: "Les trois boissons", d: "L'aloe, le thé et le smoothie. Le rituel complet, servi dans l'ordre, tous les matins.", top: "cl-top-o" },
  { n: "02", ic: "⚖️", t: "La pesée", d: "Dix secondes, tous les matins. Pour informer la suite, jamais pour juger.", top: "cl-top-p" },
  { n: "03", ic: "📓", t: "Le carnet de bord", d: "Quatre valeurs seulement — protéines, hydratation, activité, énergie. Tenable tous les jours.", top: "cl-top-s" },
  { n: "04", ic: "💬", t: "Le groupe du club", d: "Un seul canal, pas cinq applications. Pour les jours où tu n'as pas envie de venir.", top: "cl-top-a" },
  { n: "05", ic: "📸", t: "Le point des 10 visites", d: "Nouvelles mesures, nouvelles photos si tu veux, et on décide ensemble de la suite.", top: "cl-top-o" },
  { n: "06", ic: "🤝", t: "Un vrai accompagnement", d: "Mélanie et Thomas, présents chaque matin. Tu n'avances jamais seul.", top: "cl-top-p" },
];
const FAQ = [
  { q: "Combien ça coûte ?", a: "Le body scan de découverte est offert. Ensuite, si tu veux continuer : une carte de 10 visites à 80 € (8 €/petit-déjeuner) ou 30 visites à 185 € (6,17 €/petit-déjeuner). Rien d'autre.", open: true },
  { q: "Est-ce que je m'engage sur une durée ?", a: "Non. Pas d'abonnement, pas de prélèvement automatique, pas de durée minimum. Tu prends une carte de visites, tu l'utilises à ton rythme." },
  { q: "Suis-je obligé d'acheter des produits ?", a: "Non. Tout ce que tu bois est compris dans ta visite. Rien à ajouter au comptoir, rien à commander en plus." },
  { q: "Je n'ai jamais le temps le matin.", a: "Le rituel prend une vingtaine de minutes, et le club est ouvert de 7h à 11h — tu passes quand ça t'arrange dans le créneau." },
  { q: "Je ne suis pas sportif.", a: "Ce n'est pas une salle de sport. C'est un petit-déjeuner et un suivi. On part d'où tu en es, à ton rythme." },
  { q: "Au bout de combien de temps je vois quelque chose ?", a: "On fait le point à la 10ᵉ visite : nouvelles mesures, nouvelles photos si tu veux. C'est là qu'on regarde ensemble le chemin parcouru." },
];

export function ClubLandingPage() {
  return (
    <ClubShell>
      {/* HERO */}
      <div id="top" className="cl-band">
        <div className="cl-wrap" style={{ paddingTop: "clamp(64px,12vw,120px)", paddingBottom: "clamp(56px,8vw,96px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: "clamp(36px,5vw,72px)", alignItems: "center" }}>
            <div>
              <span className="cl-pill y">Ouverture prochaine · Verdun</span>
              <img src={WORDMARK} alt="The Breakfast Club by La Base" style={{ width: "min(460px,84%)", marginTop: "clamp(22px,3vw,32px)" }} />
              <h1 style={{ marginTop: "clamp(18px,2.5vw,26px)", fontSize: "clamp(32px,5vw,60px)" }}>Le club où l'on t'attend,<br /><span className="cl-a-sage">tous les matins.</span></h1>
              <p className="cl-lead" style={{ marginTop: 18, maxWidth: "32em" }}>On ne change pas ta vie. On change ton premier repas. Ce n'est pas la volonté qui te manque — c'est un rendez-vous.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 28 }}>
                <a className="cl-cta" href={R}>Réserver mon body scan</a>
                <a className="cl-ghost" href="#rituel">Voir le rituel</a>
              </div>
              <div className="cl-stats">
                <div className="cl-stat"><div className="v">7h–11h</div><div className="l">à l'ouverture</div></div>
                <div className="cl-stat"><div className="v">20 min</div><div className="l">à table</div></div>
                <div className="cl-stat"><div className="v">Offert</div><div className="l">ton body scan</div></div>
              </div>
            </div>
            <Slot ratio="4/5" label="Photo hero" sub="ambiance club le matin" />
          </div>
        </div>
      </div>

      {/* OBJECTIF STRIP */}
      <div className="cl-band">
        <div className="cl-wrap" style={{ maxWidth: 1000, paddingTop: "clamp(20px,3vw,30px)", paddingBottom: "clamp(48px,6vw,72px)", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".28em", textTransform: "uppercase", color: "var(--muted2)", margin: "0 0 16px" }}>Choisis ton objectif</p>
          <div className="cl-obj">
            <a href={objUrl("poids")}>⚖️ Perdre du poids</a>
            <a className="p" href={objUrl("muscle")}>💪 Reprendre du muscle</a>
            <a className="s" href={objUrl("energie")}>⚡ Retrouver de l'énergie</a>
          </div>
        </div>
      </div>

      {/* INFO BAR */}
      <div className="cl-band dark">
        <div className="cl-wrap" style={{ display: "flex", flexWrap: "wrap", gap: "14px clamp(28px,5vw,64px)", paddingTop: "clamp(22px,3vw,30px)", paddingBottom: "clamp(22px,3vw,30px)" }}>
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
              <h2 style={{ marginTop: 24, fontSize: "clamp(40px,6.4vw,84px)" }}>On ne change<br />pas ta vie.<br /><span className="cl-a-sage">On change ton<br />premier repas.</span></h2>
            </div>
            <div>
              <p style={{ fontSize: 19, lineHeight: 1.75, color: "var(--muted)" }}>Tu sais déjà quoi faire. Le problème, ce n'est pas l'information — c'est de le faire seul, tous les matins, sans que personne ne le remarque.</p>
              <p style={{ fontSize: 19, lineHeight: 1.75, color: "var(--muted)", marginTop: 16 }}>Le club, c'est l'inverse : un lieu, une heure, une équipe. Tu viens, c'est prêt, et quelqu'un note que tu es venu.</p>
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
            <h2 style={{ marginTop: 24, fontSize: "clamp(38px,6vw,76px)" }}>Chaque matin, <span className="cl-a-orange">le même rituel.</span></h2>
            <p className="cl-lead" style={{ marginTop: 16 }}>Trois boissons dans l'ordre, puis le suivi. C'est ce qui fait qu'on n'a rien à décider en arrivant.</p>
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

      {/* CE QUI EST INCLUS */}
      <div id="inclus" className="cl-band dark">
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ maxWidth: 760 }}>
            <span className="cl-pill p">Ce qui est inclus</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(38px,6vw,76px)", color: "#fff" }}>Ce que t'apporte <span className="cl-a-yellow">chaque matin.</span></h2>
            <p className="cl-lead" style={{ marginTop: 16 }}>Tu achètes des visites, et tout est dedans. Rien à ajouter au comptoir, rien à commander en plus.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: "clamp(18px,2.4vw,26px)", marginTop: "clamp(44px,6vw,64px)" }}>
            {INCLUS.map((c) => (
              <div key={c.n} className={`cl-card dark ${c.top}`} style={{ padding: "32px 28px", position: "relative" }}>
                <span className="cl-num" style={{ position: "absolute", top: 20, right: 22 }}>{c.n}</span>
                <div style={{ fontSize: 30 }} aria-hidden="true">{c.ic}</div>
                <h3 style={{ marginTop: 14, fontSize: 19, color: "#fff" }}>{c.t}</h3>
                <p style={{ marginTop: 8, fontSize: 16, color: "var(--on-dark-2)" }}>{c.d}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid rgba(244,239,228,.18)", fontSize: 15, color: "var(--on-dark-3)", maxWidth: "70ch" }}>Les compléments Herbalife utilisés au club sont des produits de bien-être, pas des médicaments. Ils ne remplacent pas une alimentation variée ni un avis médical.</p>
        </div>
      </div>

      {/* COMMUNAUTÉ */}
      <div id="equipe" className="cl-band">
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,64px)", alignItems: "center" }}>
            <div style={{ order: 2 }}><Slot ratio="4/5" label="Mélanie & Thomas" sub="l'équipe au club" frame="peach" /></div>
            <div style={{ order: 1 }}>
              <span className="cl-pill s">Communauté</span>
              <h2 style={{ marginTop: 24, fontSize: "clamp(40px,6.4vw,82px)" }}>Tu n'es <span className="cl-a-pink">jamais seul.</span></h2>
              <p style={{ fontSize: 19, lineHeight: 1.72, color: "var(--muted)", marginTop: 20 }}>Mélanie et Thomas accompagnent des gens à Verdun depuis quatre ans. Ça, ça se lit déjà dans les résultats de leurs membres.</p>
              <p style={{ fontSize: 19, lineHeight: 1.72, color: "var(--muted)", marginTop: 16 }}>Au club, tu croises les mêmes têtes chaque matin. C'est ce petit rendez-vous social qui fait qu'on revient — et qu'on tient.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RÉSULTATS */}
      <div id="resultats" className="cl-band">
        <div className="cl-wrap cl-sec cl-rv">
          <div style={{ maxWidth: 720 }}>
            <span className="cl-pill peach">Résultats</span>
            <h2 style={{ marginTop: 24, fontSize: "clamp(38px,6vw,72px)" }}>Le club est neuf. <span className="cl-a-sage">L'équipe, non.</span></h2>
            <p className="cl-lead" style={{ marginTop: 16, maxWidth: "44em" }}>Les photos et les témoignages arrivent avec les premiers membres. En attendant, la note de La Base parle déjà pour nous.</p>
          </div>
          <div style={{ background: "var(--dark)", borderRadius: 20, padding: "clamp(26px,3.4vw,40px)", marginTop: 32, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 28px" }}>
            <span style={{ color: "var(--yellow)", fontSize: 18, letterSpacing: 3 }}>★★★★★</span>
            <span style={{ fontFamily: "Anton", fontSize: 38, color: "#fff" }}>4,9 / 5</span>
            <span style={{ fontSize: 17, color: "var(--on-dark-2)" }}>sur les avis Google de La Base</span>
            <a className="cl-cta" style={{ marginLeft: "auto", minHeight: 52 }} href="https://www.google.com/search?q=La+Base+Verdun" target="_blank" rel="noopener noreferrer">Voir les avis →</a>
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
              <p style={{ margin: "6px 0 0", color: "var(--muted2)" }}>Une vingtaine de minutes</p>
              <a className="cl-cta" style={{ marginTop: "auto", background: "transparent", border: "2px solid var(--sage)", color: "var(--sage-d)", boxShadow: "none" }} href={R}>Je réserve</a>
            </div>
            <div className="cl-card" style={{ padding: "14px 32px 34px", display: "flex", flexDirection: "column" }}>
              <div className="cl-ribbon" style={{ background: "var(--grad)" }}>Découverte</div>
              <div className="cl-price" style={{ marginTop: 24, color: "var(--orange-h)" }}>80 €</div>
              <p style={{ margin: "6px 0 0", color: "var(--muted2)" }}>8 € le petit-déjeuner · 10 visites</p>
              <a className="cl-cta" style={{ marginTop: "auto" }} href={R}>Je commence</a>
            </div>
            <div className="cl-card dark" style={{ padding: "14px 32px 34px", display: "flex", flexDirection: "column" }}>
              <div className="cl-ribbon" style={{ background: "var(--grad)" }}>Le plus choisi</div>
              <div className="cl-price" style={{ marginTop: 24, color: "var(--grad-a)" }}>185 €</div>
              <p style={{ margin: "6px 0 0", color: "var(--yellow)" }}>6,17 € le petit-déjeuner — 23 % de moins · 30 visites</p>
              <a className="cl-cta" style={{ marginTop: "auto", background: "#fff", color: "var(--dark)", boxShadow: "none" }} href={R}>Je commence</a>
            </div>
          </div>
          <p style={{ textAlign: "center", maxWidth: 620, margin: "26px auto 0", fontSize: 16, color: "var(--muted2)" }}>Le body scan est offert et n'engage à rien. Pas d'abonnement, pas de prélèvement automatique, pas de durée minimum.</p>
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

      {/* CTA FINAL */}
      <div className="cl-band dark">
        <div className="cl-wrap cl-sec-lg cl-rv" style={{ textAlign: "center", maxWidth: 820 }}>
          <span className="cl-pill y">On se retrouve</span>
          <h2 style={{ marginTop: 24, fontSize: "clamp(42px,7vw,92px)", color: "#fff" }}>On se voit <span className="cl-a-yellow">demain matin ?</span></h2>
          <p className="cl-lead" style={{ marginTop: 18, marginLeft: "auto", marginRight: "auto", maxWidth: 620 }}>Le body scan est offert et prend une vingtaine de minutes. C'est la meilleure façon de savoir si le club est fait pour toi.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 28 }}>
            <a className="cl-cta" href={R}>Mon body scan offert</a>
            <a className="cl-ghost" href={TEL}>Appeler le club</a>
          </div>
        </div>
      </div>
    </ClubShell>
  );
}
