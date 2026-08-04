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
import { BoutiqueFooter } from "../components/boutique/BoutiqueFooter";
import { BoutiqueReviews } from "../components/boutique/BoutiqueReviews";
import { BoutiqueMobileMenu } from "../components/boutique/BoutiqueMobileMenu";
import { setMetaDescription } from "../components/boutique/seo";

// Décision Thomas (2026-07-30) : PAS de lien d'inscription externe. Une personne
// intéressée laisse ses coordonnées → lead dans le CRM du distri + notif push →
// il/elle prend contact manuellement. Le prix du pack de démarrage change (promos
// en cours) → on ne l'affiche pas, on renvoie vers la coach.
const PACK_PRICE_NOTE = "Le prix change selon les promos en cours — ta coach te donne le tarif du moment.";

// Médias affiliation (assets officiels HL Beauty, communs à toutes les boutiques).
const BK_MEDIA =
  "https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/affil";
const AFFIL_PROMO = `${BK_MEDIA}/promo/affil-promo.mp4`;
const AFFIL_PROMO_POSTER = `${BK_MEDIA}/promo/affil-promo-poster.webp`;
const AFFIL_PEOPLE = `${BK_MEDIA}/affil-people.webp`;
const AFFIL_POSTS = [
  { url: `${BK_MEDIA}/affil-post-5raisons.webp`, alt: "5 raisons de devenir entrepreneur beauté" },
  { url: `${BK_MEDIA}/affil-post-pack.webp`, alt: "Lance-toi — International Business Pack" },
  { url: `${BK_MEDIA}/affil-post-ai.webp`, alt: "HL Beauty AI — ton assistant skincare digital" },
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

  const [contactOpen, setContactOpen] = useState(false);

  const shopName = boutique?.shop_name ?? "Beauté K Skin";
  const firstName = boutique?.first_name ?? null;

  useEffect(() => {
    document.title = `Deviens affiliée · ${shopName}`;
    setMetaDescription(
      `Partage les soins HL Skin autour de toi et sois récompensée (25 % à 50 %). Sans stock, à ton rythme, accompagnée${firstName ? ` par ${firstName}` : ""}. Découvre comment ça marche.`,
    );
  }, [shopName, firstName]);

  // Illustratif : commission = ton palier de remise appliqué aux achats filleules.
  const monthlyGain = useMemo(() => friends * avgCart * (tierRate / 100), [friends, avgCart, tierRate]);

  const FAQ = [
    ["Dois-je forcément vendre pour gagner ?", "Non. Tu gagnes une commission sur les achats des personnes que tu parraines. Mais oui, pour toucher quoi que ce soit, l'inscription (enregistrement distributrice) est obligatoire."],
    ["Mes filleules doivent-elles acheter ?", "Aucune obligation d'achat pour elles. Elles commandent quand elles veulent — et chaque commande te récompense."],
    ["Combien je touche exactement ?", "Ça dépend de ton palier (de 25 % jusqu'à 50 % selon ton activité). Le détail t'est expliqué à l'inscription."],
    ["C'est quoi le pack de démarrage ?", `Un kit pour lancer ton activité en règle (produits, outils, accompagnement). ${PACK_PRICE_NOTE}`],
    ["Comment je m'inscris ?", "Tu laisses ton prénom et ton numéro ici : ta coach te rappelle, répond à tes questions et t'accompagne pas à pas pour l'inscription. Rien à faire seule."],
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
          <div className="bk-bar-actions">
            <button
              className="bk-iconbtn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Thème"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <BoutiqueMobileMenu
              coachSlug={coachSlug}
              shopName={shopName}
              aiScanUrl={boutique?.ai_scan_url}
            />
          </div>
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
              <button className="bk-btn bk-btn-primary" onClick={() => setContactOpen(true)}>
                Je veux en savoir plus
              </button>
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

      {/* Témoignages business réels (catégorie business) + formulaire */}
      <BoutiqueReviews
        coachSlug={coachSlug}
        coachUserId={boutique?.user_id}
        category="business"
        eyebrow="Elles se sont lancées"
        title="Des femmes comme toi."
        subtitle="De vrais retours d'affiliées. Tu t'es lancée ? Partage ton expérience."
        ctaLabel="✍️ Partager mon parcours"
        emptyText="Sois la première à partager ton parcours d'affiliée ✨"
        reviewedLabel="Affiliée · vérifié"
      />

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
            Laisse-nous ton prénom et ton numéro : {firstName ?? "ta coach"} te rappelle, t'explique
            tout et t'accompagne pour ton inscription. Sans engagement.
          </p>
          <button className="bk-cta-btn" onClick={() => setContactOpen(true)}>
            Être recontactée
          </button>
        </div>
      </section>

      <BoutiqueFooter coachSlug={coachSlug} shopName={shopName} distriFirstName={firstName} />

      {contactOpen && (
        <AffiliationContactForm
          coachSlug={coachSlug}
          coachUserId={boutique?.user_id}
          coachFirstName={firstName}
          onClose={() => setContactOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Formulaire « être recontactée » ────────────────────────────────────────
// Crée un lead dans le CRM du distri (submit-prospect-lead → prospect_leads) +
// notif push « nouveau lead ». Le distri prend contact manuellement (décision
// Thomas : pas d'inscription en autonomie sur la boutique).
function AffiliationContactForm({
  coachSlug,
  coachUserId,
  coachFirstName,
  onClose,
}: {
  coachSlug?: string;
  // ⚠️ On envoie referrer_user_id EXPLICITEMENT : la résolution coach_slug de
  // submit-prospect-lead cherche `users.slug`, colonne qui n'existe pas → le lead
  // arriverait non attribué. Ici on a déjà l'id via get_boutique_by_slug.
  coachUserId?: string;
  coachFirstName: string | null;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  const canSend =
    firstName.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 6 &&
    state !== "sending";

  async function submit() {
    if (!canSend) return;
    setState("sending");
    setErr("");
    try {
      const sb = await getSupabaseClient();
      const { data, error } = await sb!.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: firstName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          coach_slug: coachSlug,
          referrer_user_id: coachUserId,
          source: "affiliation_boutique",
          consent_recontact: true,
          metadata: {
            interet: "Affiliation / opportunité HL Beauty",
            origine: "Page affiliation boutique HL Skin",
            boutique_slug: coachSlug ?? null,
            message: note.trim() || null,
          },
        },
      });
      const res = data as { success?: boolean; error?: string } | null;
      if (error || !res?.success) {
        setErr(res?.error || "Une erreur est survenue. Réessaie.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErr("Une erreur est survenue. Réessaie.");
      setState("error");
    }
  }

  return (
    <div
      className="bk-qvm"
      role="dialog"
      aria-modal="true"
      aria-label="Être recontactée"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bk-rev-form">
        <button className="bk-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        {state === "done" ? (
          <div style={{ textAlign: "center", padding: "10px 4px" }}>
            <div style={{ fontSize: 34 }}>🌿</div>
            <h3 style={{ margin: "8px 0" }}>C'est noté, merci !</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
              {coachFirstName ?? "Ta coach"} a reçu ta demande et te recontacte très vite pour tout
              t'expliquer.
            </p>
            <button className="bk-btn bk-btn-primary" style={{ marginTop: 16 }} onClick={onClose}>
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="bk-eyebrow" style={{ marginBottom: 6 }}>
              Sans engagement
            </div>
            <h3 style={{ marginBottom: 6 }}>Être recontactée</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>
              {coachFirstName ?? "Ta coach"} t'appelle, répond à tes questions (gains, pack de
              démarrage, temps à y consacrer) et t'accompagne si tu veux te lancer.
            </p>

            <label className="bk-rev-lbl">Prénom *</label>
            <input
              className="bk-rev-in"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ton prénom"
              maxLength={40}
            />

            <label className="bk-rev-lbl">Téléphone *</label>
            <input
              className="bk-rev-in"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              maxLength={20}
            />

            <label className="bk-rev-lbl">Email (optionnel)</label>
            <input
              className="bk-rev-in"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.fr"
              maxLength={80}
            />

            <label className="bk-rev-lbl">Ta question (optionnel)</label>
            <textarea
              className="bk-rev-in"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce que tu aimerais savoir…"
              rows={3}
              maxLength={500}
            />

            {state === "error" && (
              <div style={{ color: "var(--blush)", fontSize: 13, marginTop: 8 }}>{err}</div>
            )}

            <button
              className="bk-btn bk-btn-primary"
              style={{ width: "100%", marginTop: 12, opacity: canSend ? 1 : 0.5 }}
              disabled={!canSend}
              onClick={() => void submit()}
            >
              {state === "sending" ? "Envoi…" : "Envoyer ma demande"}
            </button>
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 10, textAlign: "center" }}>
              Tes coordonnées servent uniquement à te recontacter. Aucun engagement.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
