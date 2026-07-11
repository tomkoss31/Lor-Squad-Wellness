// =============================================================================
// BoutiqueAffiliationPage — « Deviens affiliée » (boutique HL SKIN).
// Route publique : /boutique/:coachSlug/affiliation
//
// Inspirée de la BusinessPage (scroll narratif de conversion) mais en identité
// céladon boutique. Premier jet : COPY PLACEHOLDER à valider/réécrire par Thomas
// (pitch, % exacts, lien inscription HL SKIN, prix pack démarrage, témoignages).
// ⚠️ Aucune promesse de revenus : le simulateur est illustratif + disclaimer.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/boutique.css";
import { getSupabaseClient } from "../services/supabaseClient";
import { formatEuro } from "../lib/format";
import type { BoutiqueInfo } from "../components/boutique/types";

// À REMPLACER par Thomas : lien d'inscription HL SKIN + prix pack démarrage.
const HL_REGISTER_URL = "";
const STARTER_PACK_PRICE = "";

// Médias affiliation (assets officiels HL Beauty, communs à toutes les boutiques).
const BK_MEDIA =
  "https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/affil";
const AFFIL_PROMO = `${BK_MEDIA}/promo/affil-promo.mp4`;
const AFFIL_PROMO_POSTER = `${BK_MEDIA}/promo/affil-promo-poster.webp`;
const AFFIL_PEOPLE = `${BK_MEDIA}/affil-people.webp`;
const AFFIL_POSTS = [
  { url: `${BK_MEDIA}/affil-post-5raisons.webp`, alt: "5 raisons de devenir entrepreneur beauté" },
  { url: `${BK_MEDIA}/affil-post-pack.webp`, alt: "Lance-toi — International Business Pack" },
];
const AFFIL_GUIDE = `${BK_MEDIA}/guide-hl-beauty.pdf`;

type ThemeMode = "light" | "dark";

export function BoutiqueAffiliationPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const v = localStorage.getItem("bk-shop-theme");
      return v === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);

  // Simulateur illustratif
  const [friends, setFriends] = useState(5);
  const [avgCart, setAvgCart] = useState(60);
  const [tierRate, setTierRate] = useState(42); // palier de remise (25 → 50 %)

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb || !coachSlug) return;
      const { data } = await sb.rpc("get_boutique_by_slug", { p_slug: coachSlug });
      if (!cancelled && data) setBoutique(data as BoutiqueInfo);
    })();
    return () => {
      cancelled = true;
    };
  }, [coachSlug]);

  useEffect(() => {
    document.title = "Deviens affiliée · Beauté K Skin";
  }, []);

  const shopName = boutique?.shop_name ?? "Beauté K Skin";
  const firstName = boutique?.first_name ?? null;
  const registerUrl = HL_REGISTER_URL || `/boutique/${coachSlug}`;

  // Illustratif : commission = ton palier de remise appliqué aux achats filleules.
  const monthlyGain = useMemo(() => friends * avgCart * (tierRate / 100), [friends, avgCart, tierRate]);

  const FAQ = [
    ["Dois-je forcément vendre pour gagner ?", "Non. Tu gagnes une commission sur les achats des personnes que tu parraines. Mais oui, pour toucher quoi que ce soit, l'inscription (enregistrement distributrice) est obligatoire."],
    ["Mes filleules doivent-elles acheter ?", "Aucune obligation d'achat pour elles. Elles commandent quand elles veulent — et chaque commande te récompense."],
    ["Combien je touche exactement ?", "Ça dépend de ton palier (de 25 % jusqu'à 50 % selon ton activité). Le détail t'est expliqué à l'inscription."],
    ["C'est quoi le pack de démarrage ?", "Un kit pour lancer ton activité en règle. (Prix à préciser.)"],
  ];

  const eyebrow: React.CSSProperties = { marginBottom: 14 };

  return (
    <div className="bk-shop" data-bk-theme={theme}>
      {/* Header */}
      <header className="bk-bar">
        <div className="bk-wrap bk-bar-in">
          <a className="bk-brand" href={`/boutique/${coachSlug}`}>
            <span>
              <span className="bk-mark">{shopName}</span>
              <span className="bk-by" style={{ display: "block" }}>
                {firstName ? `par ${firstName}` : "boutique officielle"} · affiliation
              </span>
            </span>
          </a>
          <button
            className="bk-iconbtn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Thème"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="bk-wrap bk-hero">
        <div className="bk-af-herogrid">
          <div className="bk-af-herotext">
            <div className="bk-eyebrow" style={eyebrow}>
              Programme d'affiliation
            </div>
            <h1 style={{ fontSize: "clamp(36px,5.5vw,60px)", margin: "0 0 20px" }}>
              Partage ta beauté,<br />
              <em style={{ fontStyle: "italic", color: "var(--jade-deep)" }}>sois récompensée.</em>
            </h1>
            <p className="bk-hero-sub" style={{ marginBottom: 26 }}>
              Recommande {shopName} autour de toi. Tes proches commandent avec ton lien — et tu
              touches une commission sur leurs achats. Sans stock, sans forcer, à ton rythme.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a className="bk-btn bk-btn-primary" href={registerUrl}>
                Rejoindre l'équipe
              </a>
              <a
                className="bk-btn bk-btn-ghost"
                href="#bk-af-how"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("bk-af-how")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Comment ça marche
              </a>
            </div>

            {/* Gains highlight */}
            <div className="bk-af-gains">
              {[
                { n: "25 %", l: "dès le départ" },
                { n: "50 %", l: "si tu joues le jeu" },
              ].map((g) => (
                <div key={g.n} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--bk-serif)", fontSize: 48, color: "var(--jade-deep)", lineHeight: 1 }}>
                    {g.n}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{g.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bk-af-heroimg">
            <img src={AFFIL_PEOPLE} alt="La routine beauté HL Skin" />
          </div>
        </div>
      </div>

      {/* Vidéo promo */}
      <section className="bk-wrap bk-sec" style={{ paddingTop: 8 }}>
        <div className="bk-sec-head">
          <div>
            <div className="bk-eyebrow" style={eyebrow}>
              L'opportunité en 30 secondes
            </div>
            <h2>Regarde, puis lance-toi.</h2>
          </div>
        </div>
        <div className="bk-af-video">
          <video
            src={AFFIL_PROMO}
            poster={AFFIL_PROMO_POSTER}
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="bk-af-how" className="bk-wrap bk-sec">
        <div className="bk-sec-head">
          <div>
            <div className="bk-eyebrow" style={eyebrow}>
              En 3 étapes
            </div>
            <h2>Simple comme un partage.</h2>
          </div>
        </div>
        <div className="bk-concerns">
          {[
            { ic: "🔗", t: "Tu partages ton lien", d: "Ta boutique à ton nom, prête à envoyer par message, story ou en personne." },
            { ic: "🛍️", t: "Tes proches commandent", d: "Elles achètent en toute autonomie sur ta boutique, avec leurs propres avantages." },
            { ic: "💶", t: "Tu es récompensée", d: "Tu touches une commission sur leurs achats — mois après mois." },
          ].map((s, i) => (
            <div key={s.t} className="bk-concern" style={{ cursor: "default" }}>
              <div className="bk-ic">{s.ic}</div>
              <h4>
                {i + 1}. {s.t}
              </h4>
              <span>{s.d}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Contenus prêts à partager */}
      <section className="bk-wrap bk-sec">
        <div className="bk-sec-head">
          <div>
            <div className="bk-eyebrow" style={eyebrow}>
              Marketing prêt-à-l'emploi
            </div>
            <h2>Des contenus prêts à partager.</h2>
          </div>
          <p>Tu reçois des visuels professionnels à poster tels quels. Tu partages — la marque fait le reste.</p>
        </div>
        <div className="bk-af-kit">
          {AFFIL_POSTS.map((p) => (
            <div className="bk-af-kitcard" key={p.url}>
              <img src={p.url} alt={p.alt} loading="lazy" />
            </div>
          ))}
          <div className="bk-af-kitcard bk-af-kitnote">
            <div className="bk-ic" aria-hidden="true">🤖</div>
            <h4>+ l'outil HL/Skin AI</h4>
            <p>Ton lien d'analyse de peau par IA pour engager la conversation et recommander la bonne routine en 60 s.</p>
          </div>
        </div>
      </section>

      {/* Simulateur illustratif */}
      <section className="bk-wrap bk-sec">
        <div className="bk-sec-head">
          <div>
            <div className="bk-eyebrow" style={eyebrow}>
              Aperçu de tes gains
            </div>
            <h2>Fais bouger les curseurs.</h2>
          </div>
        </div>
        <div
          style={{
            background: "var(--raised)",
            border: "1px solid var(--hair)",
            borderRadius: 20,
            padding: 30,
            maxWidth: 620,
          }}
        >
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 10 }}>Ta remise (palier)</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[25, 35, 42, 50].map((r) => (
                <button
                  key={r}
                  onClick={() => setTierRate(r)}
                  style={{
                    flex: 1,
                    minWidth: 64,
                    padding: "10px 8px",
                    borderRadius: 12,
                    border: `1px solid ${tierRate === r ? "var(--jade)" : "var(--hair)"}`,
                    background: tierRate === r ? "var(--jade)" : "transparent",
                    color: tierRate === r ? "#fff" : "var(--ink)",
                    fontWeight: 700,
                    fontFamily: "var(--bk-serif)",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  {r} %
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
              <span style={{ color: "var(--ink-soft)" }}>Personnes que tu parraines</span>
              <b style={{ color: "var(--ink)" }}>{friends}</b>
            </div>
            <input type="range" min={1} max={20} value={friends} onChange={(e) => setFriends(+e.target.value)} style={{ width: "100%", accentColor: "var(--jade)" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
              <span style={{ color: "var(--ink-soft)" }}>Panier moyen mensuel</span>
              <b style={{ color: "var(--ink)" }}>{formatEuro(avgCart)}</b>
            </div>
            <input type="range" min={30} max={150} step={5} value={avgCart} onChange={(e) => setAvgCart(+e.target.value)} style={{ width: "100%", accentColor: "var(--jade)" }} />
          </div>
          <div style={{ textAlign: "center", padding: "18px", background: "linear-gradient(140deg,var(--jade-wash),var(--blush-wash))", borderRadius: 14 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", letterSpacing: 1, textTransform: "uppercase" }}>Gain mensuel estimé</div>
            <div style={{ fontFamily: "var(--bk-serif)", fontSize: 44, color: "var(--jade-deep)", lineHeight: 1.1 }}>
              ~ {formatEuro(monthlyGain)}
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 14, textAlign: "center" }}>
            Exemple purement illustratif — ce n'est pas une promesse de revenus. Ta rémunération réelle
            dépend de ton palier et du plan de rémunération Herbalife.
          </p>
        </div>
      </section>

      {/* Témoignages (placeholder) */}
      <section className="bk-wrap bk-sec">
        <div className="bk-sec-head">
          <div>
            <div className="bk-eyebrow" style={eyebrow}>
              Elles se sont lancées
            </div>
            <h2>Des femmes comme toi.</h2>
          </div>
        </div>
        <div className="bk-revs">
          {[
            { init: "AL", who: "Aline", ctx: "Affiliée depuis 6 mois", text: "J'ai juste partagé ma routine autour de moi. Aujourd'hui c'est un vrai complément de revenu." },
            { init: "NB", who: "Noor", ctx: "Affiliée depuis 1 an", text: "Zéro pression : je parle de ce que j'aime, et je suis récompensée pour ça." },
            { init: "SR", who: "Sarah", ctx: "Affiliée depuis 3 mois", text: "Le lien à envoyer, c'est tout bête, mais ça change tout. Mes copines adorent la gamme." },
          ].map((r) => (
            <div className="bk-rev" key={r.who}>
              <div className="bk-rt">
                <span className="bk-stars">★★★★★</span>
                <span className="bk-ba">Gains</span>
              </div>
              <p>« {r.text} »</p>
              <div className="bk-who">
                <div className="bk-av">{r.init}</div>
                <div>
                  <b>{r.who}</b>
                  <br />
                  <span>{r.ctx}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 12 }}>
          Témoignages d'illustration — à remplacer par de vrais retours.
        </p>
      </section>

      {/* FAQ */}
      <section className="bk-wrap bk-sec">
        <div className="bk-sec-head">
          <div>
            <div className="bk-eyebrow" style={eyebrow}>
              Questions fréquentes
            </div>
            <h2>Tout est clair.</h2>
          </div>
        </div>
        <div className="bk-faq" style={{ maxWidth: 640 }}>
          {FAQ.map((f) => (
            <details key={f[0]}>
              <summary>{f[0]}</summary>
              <p style={{ color: "var(--ink-soft)" }}>{f[1]}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Guide PDF à télécharger */}
      <section className="bk-wrap bk-sec" style={{ paddingTop: 6 }}>
        <a className="bk-af-guide" href={AFFIL_GUIDE} target="_blank" rel="noreferrer">
          <div className="bk-af-guide-ic" aria-hidden="true">📘</div>
          <div className="bk-af-guide-txt">
            <div className="bk-eyebrow" style={{ marginBottom: 6 }}>
              Guide à télécharger
            </div>
            <h3>Envie d'en savoir plus ?</h3>
            <p>Le guide complet de l'opportunité HL Beauty — à lire tranquillement avant de te décider.</p>
          </div>
          <span className="bk-btn bk-btn-primary" style={{ whiteSpace: "nowrap" }}>
            Télécharger le guide (PDF)
          </span>
        </a>
      </section>

      {/* CTA final */}
      <section className="bk-wrap bk-sec" style={{ paddingTop: 6 }}>
        <div className="bk-capture">
          <div className="bk-eyebrow" style={{ color: "var(--jade)" }}>
            Prête à te lancer ?
          </div>
          <h2>Rejoins {firstName ? `${firstName} et` : ""} l'aventure.</h2>
          <p>
            L'inscription (enregistrement distributrice) est obligatoire pour être récompensée.
            {STARTER_PACK_PRICE ? ` Pack de démarrage : ${STARTER_PACK_PRICE}.` : ""}
          </p>
          <a className="bk-cta-btn" href={registerUrl} style={{ textDecoration: "none", display: "inline-block" }}>
            Je rejoins l'équipe
          </a>
          {!HL_REGISTER_URL && (
            <p style={{ fontSize: 11, color: "color-mix(in srgb,var(--ground) 55%,transparent)", marginTop: 4 }}>
              (lien d'inscription HL SKIN à brancher)
            </p>
          )}
        </div>
      </section>

      <footer className="bk-footer">
        <div className="bk-wrap bk-foot-in">
          <div>
            <span className="bk-mark" style={{ fontSize: 17 }}>
              {shopName}
            </span>{" "}
            · affiliation
          </div>
          <div>Propulsé par La Base 360</div>
        </div>
      </footer>
    </div>
  );
}
