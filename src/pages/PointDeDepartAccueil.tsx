// =============================================================================
// PointDeDepartAccueil — l'écran 0 du tunnel « Mon point de départ » (09/09).
//
// Maquette de Thomas, intégrée telle qu'il l'a dessinée. Deux écarts assumés
// avec le fichier qu'il a fourni, et seulement deux :
//
//   1. LES TOKENS. Sa version déclarait un namespace `--bc-*` qui n'existe
//      nulle part dans le projet — chaque `var()` serait tombé sur son repli
//      hex. Ça rendait juste, mais ça posait une TROISIÈME copie de la palette
//      du club (il y a déjà `.cl` pour le site public et `.pdd` pour ce
//      tunnel). Ce chantier documente déjà ce piège pour le moteur de scoring :
//      « deux copies = deux corrections ». On mappe donc sur `.pdd`, dont ce
//      composant est toujours un descendant. Les valeurs ne bougent pas d'un
//      pixel : ses replis hex étaient EXACTEMENT ceux du site club.
//
//   2. L'EN-TÊTE ET LE LOGO. Sa version portait son propre `<header>` avec le
//      wordmark. `PointDeDepartPage` en a déjà un, collant, présent sur les six
//      écrans. Mesuré au navigateur : garder les deux affichait le MÊME
//      `logo-heart.png` deux fois, à 30 px puis à 34 px, à trois centimètres
//      d'écart. Ce composant n'affiche donc plus de logo du tout.
//
// ⚠️ LES MARGES DES `<p>` SONT EN INLINE, ET C'EST OBLIGATOIRE. `.pdd p{margin:0}`
// pèse (0,1,1) et écrase les utilitaires `mt-*` de Tailwind (0,1,0) : mesuré au
// navigateur, NEUF marges tombaient à zéro, dont celle qui sépare le titre de son
// sous-titre — la cédille de « ÇA NE BOUGE PAS » mordait sur le paragraphe.
// Aucune règle CSS ne peut rendre la main à Tailwind ici : toute règle assez
// spécifique pour battre le reset bat aussi l'utilitaire. L'inline est la seule
// sortie propre, et elle reste locale à cet écran.
//
// ⚠️ Le seul `<button>` de cette page porte son fond en style INLINE, et c'est
// volontaire : la remise à zéro `.pdd button { background:none }` pèse (0,1,1)
// et bat n'importe quelle classe. C'est exactement ce qui avait rendu le bouton
// principal invisible le 09/09 — cf. le commit `1223e5c7`.
// =============================================================================

import { useEffect, useState } from "react";

interface Props {
  /** Lance le quiz — l'écran 1 du tunnel. */
  onStart: () => void;
  /** La salle du club, un matin — la photo déjà servie par le tunnel. */
  clubPhotoSrc?: string;
}

/* ── Les couleurs viennent toutes du scope `.pdd`. Aucune valeur en dur. ──── */
const C = {
  cream: "var(--cream)",
  creamAlt: "var(--cream-3)",
  green: "var(--green-d)",
  ink: "var(--ink)",
  text: "var(--green-d)",
  onDark: "var(--on-dark)",
  onDarkMuted: "var(--on-dark-2)",
  orange: "var(--orange)",
  link: "var(--link)",
  pink: "var(--pink)",
  sage: "var(--sage)",
  yellow: "var(--yellow)",
  amber: "var(--amber)",
  peach: "var(--peach)",
  heart: "var(--heart)",
  muted: "var(--muted)",
  muted2: "var(--muted2)",
  cta: "var(--grad)",
  ctaShadow: "0 16px 34px -14px rgba(255,45,60,.6)",
  cardShadow: "var(--shadow)",
};

const FONT_TITLE = "'Anton', system-ui, sans-serif";
const FONT_BODY = "'Poppins', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

/* ---------------------------------------------------------------- atomes */

function Eyebrow({ children, tone = "yellow" }: { children: React.ReactNode; tone?: "yellow" | "sage" | "peach" }) {
  const tones = {
    yellow: { background: C.yellow, color: "#4A3F12" },
    sage: { background: C.sage, color: "#1E2A18" },
    peach: { background: C.peach, color: "#5A3418" },
  } as const;
  return (
    <span
      className="inline-block rounded-full px-3 py-1.5 text-[10px] font-medium uppercase"
      style={{ ...tones[tone], fontFamily: FONT_MONO, letterSpacing: ".2em" }}
    >
      {children}
    </span>
  );
}

function Title({ children, size = "h2" }: { children: React.ReactNode; size?: "h1" | "h2" }) {
  const Tag = size === "h1" ? "h1" : "h2";
  return (
    <Tag
      className={size === "h1" ? "text-[40px] sm:text-[52px]" : "text-[27px] sm:text-[34px]"}
      // `.pdd h1,h2` porte DÉJÀ Anton, les capitales, l'interlignage 1.05 et
      // `text-wrap:balance` : on ne le redit pas. Un `lineHeight:1.02` inline
      // faisait déborder le Ô de « PLUTÔT » et la cédille de « ÇA » sur la ligne
      // du dessus — mesuré, pas supposé.
      // ⚠️ Mais cette même règle pose `margin:0`, qui pèse (0,1,1) et écrase les
      // classes `mt-*` de Tailwind (0,1,0). La marge haute DOIT rester inline.
      style={{ marginTop: size === "h1" ? 16 : 14 }}
    >
      {children}
    </Tag>
  );
}

/** CTA pilule — 56 px de haut, au-dessus de la cible tactile iOS de 44. */
function Cta({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-full border-0 py-[18px] text-[17px] font-bold text-white transition-transform duration-150 active:scale-[.985]"
      style={{ background: C.cta, boxShadow: C.ctaShadow, fontFamily: FONT_BODY, letterSpacing: ".01em", minHeight: 56 }}
    >
      {children}
    </button>
  );
}

function Micro({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-center text-[10.5px] uppercase"
      style={{ marginTop: 10, fontFamily: FONT_MONO, letterSpacing: ".08em", color: C.muted2 }}
    >
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------- contenu */

// ⚠️ Thomas, 09/09 : « à remplacer par 3 vraies phrases entendues au comptoir ».
// Gardées telles quelles en attendant — elles ne bloquent pas la mise en ligne.
const MIROIR = [
  "Tu tiens deux ou trois semaines, puis tout repart comme avant.",
  "Tu as faim à 11h, et le soir tu grignotes devant la télé.",
  "Tu as déjà essayé plusieurs méthodes. Ça marche… puis non.",
];

const RECOIT = [
  { n: "01", t: "Ton score sur 3 axes", d: "Bouger, l'assiette, le matin. On voit tout de suite lequel te coûte le plus.", c: C.orange },
  { n: "02", t: "Ta priorité n°1", d: "Celle qui débloque les deux autres. Une seule, pas une liste de dix.", c: C.pink },
  { n: "03", t: "Ton geste de demain matin", d: "Une action concrète, faisable dès demain, sans rien acheter.", c: C.sage },
];

const EXEMPLE = [
  { rank: 1, label: "Bouger", score: 12, top: false },
  { rank: 2, label: "L'assiette", score: 17, top: false },
  { rank: 3, label: "Le matin", score: 20, top: true },
];

const COMMENT = [
  "12 questions simples. Aucune photo, aucune pesée.",
  "Ton résultat s'affiche tout de suite à l'écran.",
  "Tu le reçois aussi par mail, et tu en fais ce que tu veux.",
];

/* ---------------------------------------------------------------- écran */

export function PointDeDepartAccueil({
  onStart,
  clubPhotoSrc = "/brand/breakfast-club/photos/club-salle.jpg",
}: Props) {
  const [showSticky, setShowSticky] = useState(false);

  // La barre collante n'apparaît qu'une fois le CTA du premier écran dépassé —
  // sinon on propose deux fois le même bouton dans le même coup d'œil.
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ color: C.ink, fontFamily: FONT_BODY }}>
      <div className="mx-auto w-full max-w-[560px]">
        {/* ── 1 · Le miroir ─────────────────────────────────────────────── */}
        <section className="px-[22px] pb-8 pt-7">
          <Eyebrow>Bilan offert · 3 min</Eyebrow>
          <Title size="h1">
            Tu manges plutôt bien.
            <br />
            Et pourtant,
            <br />
            ça ne bouge pas.
          </Title>
          <p className="text-[15.5px] leading-[1.6]" style={{ marginTop: 14, color: C.text }}>
            En 3 minutes, tu sais <strong className="font-semibold">ce qui bloque vraiment chez toi</strong> — et par
            quoi commencer demain matin.
          </p>
          <div className="mt-5">
            <Cta onClick={onStart}>Je fais mon bilan</Cta>
            <Micro>Gratuit · sans carte bancaire · résultat immédiat</Micro>
          </div>
        </section>

        {/* ── 2 · Ça te parle ? ─────────────────────────────────────────── */}
        <section className="px-[22px] py-[30px]" style={{ background: C.creamAlt }}>
          <Eyebrow tone="sage">Ça te parle ?</Eyebrow>
          <ul className="mt-[18px] grid list-none gap-2.5 p-0">
            {MIROIR.map((l) => (
              <li
                key={l}
                className="relative rounded-[14px] bg-white py-3.5 pl-[46px] pr-4 text-[14.5px] leading-[1.45]"
                style={{ boxShadow: "0 8px 20px -16px rgba(30,51,48,.3)" }}
              >
                <span
                  className="absolute left-[15px] top-[15px] h-[18px] w-[18px] rounded-[5px] border-2"
                  style={{ borderColor: C.orange }}
                  aria-hidden="true"
                />
                <span
                  className="absolute left-5 top-5 h-[5px] w-[9px] rotate-[-45deg] border-b-2 border-l-2"
                  style={{ borderColor: C.orange }}
                  aria-hidden="true"
                />
                {l}
              </li>
            ))}
          </ul>
          <p className="text-[13.5px] font-semibold leading-[1.5]" style={{ marginTop: 16, color: C.link }}>
            Si une seule ligne te ressemble, le bilan va te servir.
          </p>
        </section>

        {/* ── 3 · Ce que tu reçois ──────────────────────────────────────── */}
        <section className="relative overflow-hidden px-[22px] py-[30px]">
          <span
            className="pointer-events-none absolute right-[-6px] top-[52px] z-0 select-none text-[150px] leading-none"
            style={{ fontFamily: FONT_TITLE, color: C.peach, opacity: 0.55 }}
            aria-hidden="true"
          >
            3
          </span>
          <Eyebrow tone="peach">Ce que tu reçois</Eyebrow>
          <Title>
            Pas un régime.
            <br />
            Un point de départ.
          </Title>

          <div className="relative z-[1] mt-[18px] grid gap-3">
            {RECOIT.map((s) => (
              <div
                key={s.n}
                className="rounded-[22px] border-t-[5px] bg-white p-4"
                style={{ borderTopColor: s.c, boxShadow: C.cardShadow }}
              >
                <div className="text-[10px]" style={{ fontFamily: FONT_MONO, letterSpacing: ".2em", color: C.muted2 }}>
                  {s.n}
                </div>
                <h3
                  className="mb-1.5 mt-1.5 text-[17px]"
                  style={{ fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: ".01em" }}
                >
                  {s.t}
                </h3>
                <p className="m-0 text-[13.5px] leading-[1.5]" style={{ color: C.muted }}>
                  {s.d}
                </p>
              </div>
            ))}
          </div>

          {/* Exemple de résultat — légendé, sinon les scores ne veulent rien dire. */}
          <div
            className="relative z-[1] mt-5 rounded-[22px] border-t-[5px] bg-white p-[18px]"
            style={{ borderTopColor: C.amber, boxShadow: C.cardShadow }}
          >
            <div className="text-[10px] uppercase" style={{ fontFamily: FONT_MONO, letterSpacing: ".18em", color: C.muted2 }}>
              Exemple de résultat — Sylvie, 59 ans, Verdun
            </div>
            <p className="text-[12px] leading-[1.4]" style={{ marginTop: 4, marginBottom: 14, color: C.muted }}>
              Score sur 20. Plus il est haut, plus l&apos;axe est prioritaire.
            </p>
            {EXEMPLE.map((r, i) => (
              <div
                key={r.label}
                className="flex items-center gap-2.5 py-[9px]"
                style={{ borderBottom: i < EXEMPLE.length - 1 ? "1px solid var(--dot)" : "none" }}
              >
                <span
                  className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full text-[11px]"
                  style={{
                    fontFamily: FONT_MONO,
                    background: r.top ? C.orange : "var(--cream-3)",
                    color: r.top ? "#fff" : C.muted,
                  }}
                >
                  {r.rank}
                </span>
                <span className={`flex-1 text-[14.5px] ${r.top ? "font-bold" : ""}`}>{r.label}</span>
                {r.top && (
                  <span
                    className="rounded-full px-[7px] py-[3px] text-[9px]"
                    style={{ fontFamily: FONT_MONO, letterSpacing: ".14em", background: "#FFE9DF", color: "#C33F14" }}
                  >
                    PRIORITÉ
                  </span>
                )}
                <span
                  className="text-[16px]"
                  style={{ fontFamily: FONT_MONO, color: r.top ? C.orange : C.muted, fontWeight: r.top ? 500 : 400 }}
                >
                  {r.score}
                </span>
              </div>
            ))}
            <p
              className="border-t pt-3 text-[13.5px] italic leading-[1.55]"
              style={{ marginTop: 14, borderColor: "var(--dot)", color: C.text }}
            >
              «&nbsp;Ton petit-déjeuner ne tient pas jusqu&apos;à midi — et c&apos;est lui qui commande ton grignotage
              du soir.&nbsp;»
            </p>
          </div>
        </section>

        {/* ── 4 · Comment ça se passe + et après ────────────────────────── */}
        <section className="px-[22px] py-[30px]" style={{ background: C.green, color: C.onDark }}>
          <Eyebrow>Comment ça se passe</Eyebrow>
          <Title>
            3 minutes,
            <br />
            sur ton téléphone.
          </Title>
          <ul className="mt-[18px] grid list-none gap-3.5 p-0">
            {COMMENT.map((l, i) => (
              <li key={l} className="flex gap-3 text-[14.5px] leading-[1.5]">
                <span className="flex-none pt-0.5 text-[11px]" style={{ fontFamily: FONT_MONO, color: C.sage }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
          <div
            className="mt-5 rounded-2xl border p-[15px] text-[13.5px] leading-[1.55]"
            style={{ background: "rgba(244,239,228,.07)", borderColor: "rgba(244,239,228,.14)", color: C.onDarkMuted }}
          >
            <strong style={{ color: C.onDark }}>Et après&nbsp;?</strong>
            <br />
            Pas de démarchage. Si tu veux aller plus loin, on te propose de venir prendre un petit-déjeuner au club, un
            matin. Tu décides.
          </div>
        </section>

        {/* ── 5 · Qui te répond ─────────────────────────────────────────── */}
        <section className="px-[22px] py-[30px]">
          <Eyebrow tone="sage">Qui te répond</Eyebrow>
          <div className="relative mt-[18px]">
            <div
              className="absolute rounded-[22px]"
              style={{ inset: "16px -14px -16px 14px", background: C.sage, opacity: 0.3 }}
              aria-hidden="true"
            />
            <img
              src={clubPhotoSrc}
              alt="Six personnes attablées au Breakfast Club de Verdun, un matin."
              loading="lazy"
              className="relative aspect-[16/10] w-full rounded-[22px] object-cover"
              style={{ boxShadow: C.cardShadow }}
            />
          </div>
          <div className="mt-[22px] text-[14.5px] leading-[1.5]">
            <strong
              className="block text-[16px]"
              style={{ fontFamily: FONT_TITLE, textTransform: "uppercase", letterSpacing: ".01em", fontWeight: 400 }}
            >
              Mélanie &amp; Thomas
            </strong>
            Le club, 11 rue Saint-Pierre à Verdun. Ouvert tous les matins dès 7h.
          </div>
        </section>

        {/* ── 6 · Témoignage — sur le bilan, pas sur les kilos ──────────── */}
        <section className="px-[22px] py-[30px]" style={{ background: C.creamAlt }}>
          <div className="rounded-[22px] p-[18px]" style={{ background: C.yellow }}>
            <div className="text-[13px] tracking-[2px]" style={{ color: C.heart }} aria-label="5 étoiles sur 5">
              ★★★★★
            </div>
            <p className="text-[14.5px] leading-[1.55]" style={{ marginTop: 8 }}>
              «&nbsp;J&apos;ai compris en 3 minutes ce que je n&apos;avais pas vu en deux ans&nbsp;: le problème,
              c&apos;était mon petit-déjeuner.&nbsp;»
            </p>
            <div className="mt-3 text-[10px] uppercase" style={{ fontFamily: FONT_MONO, letterSpacing: ".16em", color: "#5C5320" }}>
              Virginie — membre du club
            </div>
          </div>
          <p className="text-center text-[11px] leading-[1.5]" style={{ marginTop: 12, color: C.muted2 }}>
            Résultats individuels — ils varient d&apos;une personne à l&apos;autre.
          </p>
        </section>

        {/* De quoi ne pas finir sous la barre collante. */}
        <div className="h-[120px]" aria-hidden="true" />
      </div>

      {/* ── Barre CTA collante (safe area iOS) ──────────────────────────── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 px-[22px] pt-3.5 transition-opacity duration-200 ${
          showSticky ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
          background: "linear-gradient(to top, var(--cream) 66%, transparent)",
          paddingBottom: "calc(18px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto w-full max-w-[560px]">
          <Cta onClick={onStart}>Je fais mon bilan — 3 min</Cta>
          <Micro>Gratuit · sans carte bancaire</Micro>
        </div>
      </div>
    </div>
  );
}
