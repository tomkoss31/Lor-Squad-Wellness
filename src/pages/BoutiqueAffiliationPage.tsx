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

  // Illustratif : commission moyenne 25 % des achats des filleules.
  const monthlyGain = useMemo(() => friends * avgCart * 0.25, [friends, avgCart]);

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
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "20px 0 10px" }}>
          <div className="bk-eyebrow" style={eyebrow}>
            Programme d'affiliation
          </div>
          <h1 style={{ fontSize: "clamp(38px,6vw,64px)", margin: "0 0 20px" }}>
            Partage ta beauté,<br />
            <em style={{ fontStyle: "italic", color: "var(--jade-deep)" }}>sois récompensée.</em>
          </h1>
          <p className="bk-hero-sub" style={{ margin: "0 auto 28px" }}>
            Recommande {shopName} autour de toi. Tes proches commandent avec ton lien — et tu
            touches une commission sur leurs achats. Sans stock, sans forcer, à ton rythme.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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
        </div>

        {/* Gains highlight */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 40,
            flexWrap: "wrap",
            margin: "20px auto 0",
            padding: "26px",
            maxWidth: 560,
            background: "linear-gradient(140deg,var(--jade-wash),var(--blush-wash))",
            border: "1px solid var(--hair)",
            borderRadius: 24,
          }}
        >
          {[
            { n: "25 %", l: "dès le départ" },
            { n: "50 %", l: "si tu joues le jeu" },
          ].map((g) => (
            <div key={g.n} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--bk-serif)", fontSize: 52, color: "var(--jade-deep)", lineHeight: 1 }}>
                {g.n}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{g.l}</div>
            </div>
          ))}
        </div>
      </div>

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
