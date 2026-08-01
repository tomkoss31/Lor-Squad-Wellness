// =============================================================================
// ClubLandingPage — vitrine publique du Breakfast Club (Verdun).
// Route /club (et, à terme, racine de labase-nutrition.com via host-routing).
// Identité crème PROPRE au club (≠ thème app). Copy = maquette v7 validée.
// Photos = emplacements « 📷 » à remplir (polish). CTA → tunnel /reserver.
// =============================================================================

import "./ClubLandingPage.css";

const WORDMARK = "/brand/breakfast-club/logo-wordmark-dark.png";
const MEDAILLON = "/brand/breakfast-club/logo-medaillon.png";
const RESERVER = "/reserver?utm_source=site";
const obj = (o: string) => `/reserver?objectif=${o}&utm_source=site`;

function Photo({ label, sub, minHeight }: { label: string; sub?: string; minHeight?: number }) {
  return (
    <div className="cl-ph" style={minHeight ? { minHeight } : undefined}>
      <span>📷 {label}{sub ? <small>{sub}</small> : null}</span>
    </div>
  );
}

export function ClubLandingPage() {
  return (
    <div className="cl">
      <header className="cl-header"><div className="cl-wrap in">
        <a href="#top"><img className="logo" src={WORDMARK} alt="The Breakfast Club by La Base" /></a>
        <a className="cl-cta" style={{ minHeight: 44, padding: "11px 22px", fontSize: 14 }} href={RESERVER}>Réserver ma séance</a>
      </div></header>

      {/* ═══ HERO ═══ */}
      <section id="top" style={{ paddingTop: "clamp(32px,4vw,56px)" }}><div className="cl-wrap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: "clamp(28px,4vw,48px)", alignItems: "center" }}>
          <div>
            <img src={MEDAILLON} alt="" aria-hidden="true" style={{ width: 88, height: "auto", borderRadius: "50%", marginBottom: 18 }} />
            <p className="cl-eyebrow">Nouveau à Verdun · 7h–11h</p>
            <h1 style={{ marginTop: 16, fontSize: "clamp(36px,6vw,66px)" }}>Le club où l'on t'attend, tous les matins.</h1>
            <p className="cl-lead" style={{ marginTop: 18 }}>On ne change pas ta vie. On change ton premier repas. Ce n'est pas la volonté qui te manque — c'est un rendez-vous.</p>
            <div className="cl-chips">
              <span className="cl-chip">☕ 6 matins / semaine</span>
              <span className="cl-chip">⏱ ≈ 20 min</span>
              <span className="cl-chip">🎁 Body scan offert</span>
            </div>
            <p style={{ margin: "26px 0 0", fontWeight: 700, fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase" }}>Choisis ton objectif</p>
            <div className="cl-obj">
              <a href={obj("poids")}><span className="ic">⚖️</span>Perdre du poids</a>
              <a href={obj("muscle")}><span className="ic">💪</span>Reprendre du muscle</a>
              <a href={obj("energie")}><span className="ic">⚡</span>Retrouver de l'énergie</a>
            </div>
            <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <a className="cl-cta" href={RESERVER}>Réserver ma séance découverte →</a>
              <a className="cl-ghost" href="#formule">Voir les formules</a>
            </div>
          </div>
          <Photo label="Photo hero" sub="ambiance club le matin" minHeight={340} />
        </div>
      </div></section>

      {/* ═══ CONCEPT ═══ */}
      <section style={{ background: "var(--panel)" }}><div className="cl-wrap" style={{ maxWidth: 820, textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px,4vw,46px)" }}>On ne change pas ta vie.<br />On change ton premier repas.</h2>
        <p className="cl-lead" style={{ marginTop: 18 }}>Un club de petit-déjeuner. Pas un bar, pas une salle de sport. Tu viens, tu prends ton rituel, on note deux chiffres, et ta matinée est lancée — sans rien avoir eu à décider.</p>
      </div></section>

      {/* ═══ LE RITUEL ═══ */}
      <section><div className="cl-wrap">
        <p className="cl-eyebrow">Le rituel du matin</p>
        <h2 style={{ marginTop: 14, fontSize: "clamp(26px,3.6vw,42px)" }}>Chaque matin, le même rituel.</h2>
        <p className="cl-lead" style={{ marginTop: 14, maxWidth: 640 }}>Trois boissons dans l'ordre, puis le suivi. C'est ce qui fait qu'on n'a rien à décider en arrivant.</p>
        <div className="cl-grid4">
          {[
            { t: "L'aloe vera", d: "Étape 1 · une boisson d'hydratation pour bien démarrer. Ni détox, ni brûle-graisse." },
            { t: "Le thé aux plantes", d: "Étape 2 · un coup de fouet doux. S'il te tient jusqu'à midi, c'est que le smoothie était bien dosé." },
            { t: "Le smoothie", d: "Étape 3 · le vrai repas. Protéines et nutriments, le petit-déjeuner qui cale sans peser." },
            { t: "Le suivi", d: "La partie que personne ne photographie : la pesée, deux chiffres, et une phrase du coach." },
          ].map((c) => (
            <div key={c.t} className="cl-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="cl-ph" style={{ border: "none", borderRadius: 0, minHeight: 150 }}><span>📷 {c.t.replace("Le ", "").replace("L'", "").toLowerCase()}</span></div>
              <div style={{ padding: 18 }}><h3 style={{ fontSize: 22 }}>{c.t}</h3><p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--sub)" }}>{c.d}</p></div>
            </div>
          ))}
        </div>
      </div></section>

      {/* ═══ CE QUE T'APPORTE ═══ */}
      <section style={{ background: "var(--panel)" }}><div className="cl-wrap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "clamp(28px,4vw,48px)", alignItems: "start" }}>
          <div style={{ position: "sticky", top: 80 }}>
            <p className="cl-eyebrow">Tout est inclus</p>
            <h2 style={{ marginTop: 14, fontSize: "clamp(26px,3.6vw,42px)" }}>Ce que t'apporte chaque matin.</h2>
            <p className="cl-lead" style={{ marginTop: 14 }}>Tu achètes des visites, et tout est dedans. Rien à ajouter au comptoir, rien à commander en plus.</p>
          </div>
          <div>
            {[
              { t: "Les trois boissons", d: "L'aloe, le thé et le smoothie. Le rituel complet, servi dans l'ordre, tous les matins." },
              { t: "La pesée", d: "Dix secondes, tous les matins. Pour informer la suite, jamais pour juger." },
              { t: "Le carnet de bord", d: "Quatre valeurs seulement — protéines, hydratation, activité, énergie. Tenable tous les jours." },
              { t: "Le groupe du club", d: "Un seul canal, pas cinq applications. Pour les jours où tu n'as pas envie de venir." },
              { t: "Le point des 10 visites", d: "Nouvelles mesures, nouvelles photos si tu veux, et on décide ensemble de la suite." },
            ].map((i, idx) => (
              <div key={i.t} className="cl-incl" style={idx === 0 ? { borderTop: "none" } : undefined}>
                <span aria-hidden="true" style={{ color: "var(--orange)", fontWeight: 800 }}>✓</span>
                <div><div className="t">{i.t}</div><div className="d">{i.d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div></section>

      {/* ═══ L'ÉQUIPE ═══ */}
      <section><div className="cl-wrap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))", gap: "clamp(24px,3vw,40px)", alignItems: "center" }}>
          <Photo label="Mélanie & Thomas" sub="portrait de l'équipe au club" minHeight={300} />
          <div>
            <p className="cl-eyebrow">Tu n'es jamais seul</p>
            <h2 style={{ marginTop: 14, fontSize: "clamp(26px,3.6vw,42px)" }}>Le club est neuf.<br />L'équipe, non.</h2>
            <p className="cl-lead" style={{ marginTop: 16 }}>Mélanie et Thomas accompagnent des gens à Verdun depuis quatre ans. Ça, ça se lit déjà dans les résultats de leurs membres.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 22 }}>
              <svg width="46" height="42" viewBox="0 0 32 29" aria-hidden="true"><path d="M16 29S2 20 2 10a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 10-14 19-14 19Z" fill="var(--orange)" /></svg>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--green-d)" }}>11 rue Saint&nbsp;Pierre · Verdun</span>
            </div>
          </div>
        </div>
      </div></section>

      {/* ═══ FORMULES ═══ */}
      <section id="formule" style={{ background: "var(--panel)" }}><div className="cl-wrap">
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <p className="cl-eyebrow">Sans engagement</p>
          <h2 style={{ marginTop: 14, fontSize: "clamp(28px,4vw,46px)" }}>Choisis ta formule.</h2>
          <p className="cl-lead" style={{ marginTop: 14 }}>On commence toujours par le body scan. Il est offert et n'engage à rien.</p>
        </div>
        <div className="cl-grid3" style={{ marginTop: 36 }}>
          <div className="cl-card" style={{ padding: 28, textAlign: "center", border: "2px solid var(--orange)" }}>
            <span className="cl-tag">Pour commencer</span>
            <h3 style={{ marginTop: 16, fontSize: 26 }}>Séance découverte</h3>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--sub)" }}>Body scan + bilan · une vingtaine de minutes</p>
            <div className="cl-price" style={{ marginTop: 16, color: "#5F7154" }}>0 €</div>
            <a className="cl-cta" style={{ width: "100%", marginTop: 18 }} href={RESERVER}>Réserver →</a>
          </div>
          <div className="cl-card" style={{ padding: 28, textAlign: "center" }}>
            <h3 style={{ fontSize: 26 }}>10 visites</h3>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--sub)" }}>Pour tester le rythme du club</p>
            <div className="cl-price" style={{ marginTop: 16 }}>80 €</div>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--green-d)", fontWeight: 700 }}>8 € le petit-déjeuner</p>
          </div>
          <div className="cl-card" style={{ padding: 28, textAlign: "center" }}>
            <span className="cl-tag" style={{ background: "var(--green-d)" }}>Le plus choisi</span>
            <h3 style={{ marginTop: 16, fontSize: 26 }}>30 visites</h3>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--sub)" }}>Pour installer l'habitude</p>
            <div className="cl-price" style={{ marginTop: 16 }}>185 €</div>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--green-d)", fontWeight: 700 }}>6,17 € le petit-déjeuner — 23 % de moins</p>
          </div>
        </div>
        <p style={{ textAlign: "center", maxWidth: 620, margin: "26px auto 0", fontSize: 14, color: "var(--sub)" }}>Le body scan est offert et n'engage à rien. Pas d'abonnement, pas de prélèvement automatique, pas de durée minimum. Tu choisis ta carte seulement si tu veux continuer.</p>
      </div></section>

      {/* ═══ FAQ ═══ */}
      <section><div className="cl-wrap" style={{ maxWidth: 760 }}>
        <p className="cl-eyebrow" style={{ textAlign: "center" }}>Avant de venir</p>
        <h2 style={{ marginTop: 14, fontSize: "clamp(26px,3.6vw,42px)", textAlign: "center" }}>Questions fréquentes.</h2>
        <div style={{ marginTop: 28 }}>
          {[
            { q: "Combien ça coûte ?", a: "Le body scan de découverte est offert. Ensuite, si tu veux continuer : une carte de 10 visites à 80 € (8 €/petit-déjeuner) ou 30 visites à 185 € (6,17 €/petit-déjeuner). Rien d'autre.", open: true },
            { q: "Est-ce que je m'engage sur une durée ?", a: "Non. Pas d'abonnement, pas de prélèvement automatique, pas de durée minimum. Tu prends une carte de visites, tu l'utilises à ton rythme." },
            { q: "Suis-je obligé d'acheter des produits ?", a: "Non. Tout ce que tu bois est compris dans ta visite. Rien à ajouter au comptoir, rien à commander en plus." },
            { q: "Je n'ai jamais le temps le matin.", a: "Le rituel prend une vingtaine de minutes, et le club est ouvert de 7h à 11h — tu passes quand ça t'arrange dans le créneau." },
            { q: "Je ne suis pas sportif.", a: "Ce n'est pas une salle de sport. C'est un petit-déjeuner et un suivi. On part d'où tu en es, à ton rythme." },
            { q: "Au bout de combien de temps je vois quelque chose ?", a: "On fait le point à la 10ᵉ visite : nouvelles mesures, nouvelles photos si tu veux. C'est là qu'on regarde ensemble le chemin parcouru." },
          ].map((f) => (
            <details key={f.q} open={f.open}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--sub)" }}>Une question qui n'est pas là ? Appelle-nous au <b style={{ color: "var(--ink)" }}>06 79 44 87 59</b>, on répond entre 7h et 11h.</p>
      </div></section>

      {/* ═══ CTA FINAL ═══ */}
      <section style={{ background: "var(--panel)" }}><div className="cl-wrap" style={{ textAlign: "center", maxWidth: 680 }}>
        <h2 style={{ fontSize: "clamp(30px,5vw,54px)" }}>On se voit demain matin ?</h2>
        <p className="cl-lead" style={{ marginTop: 16 }}>Le body scan est offert et prend une vingtaine de minutes. C'est la meilleure façon de savoir si le club est fait pour toi.</p>
        <a className="cl-cta" style={{ marginTop: 26, fontSize: 17 }} href={RESERVER}>Réserver ma séance découverte →</a>
      </div></section>

      {/* ═══ FOOTER ═══ */}
      <footer className="cl-footer"><div className="cl-wrap">
        <img className="logo" src={WORDMARK} alt="The Breakfast Club by La Base" style={{ filter: "brightness(0) invert(1)" }} />
        <div className="cl-footrow" style={{ marginTop: 26 }}>
          <div><div className="k">Adresse</div>11 rue Saint&nbsp;Pierre<br />55100 Verdun</div>
          <div><div className="k">Horaires</div>Lundi au vendredi 7h–11h<br />Samedi 8h–11h</div>
          <div><div className="k">Téléphone</div>06 79 44 87 59</div>
          <div><div className="k">En ligne</div>www.labase-nutrition.com</div>
        </div>
        <div style={{ marginTop: 30, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.14)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#9FB39A" }}>
          <span style={{ fontFamily: "'Syne',sans-serif", letterSpacing: ".14em", fontWeight: 700 }}>NUTRITION · ÉNERGIE · COMMUNAUTÉ</span>
          <span>The Breakfast Club by La Base · Verdun</span>
        </div>
      </div></footer>
    </div>
  );
}
