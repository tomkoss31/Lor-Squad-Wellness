// =============================================================================
// BusinessPage — Landing publique La Base 360 / opportunite partenaire
// Chantier #7 V2 (2026-05-17). Portage du mockup Claude Design business-v2.html.
// Fusionne /opportunite + /simulateur en une seule page scroll narratif unique.
// =============================================================================

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type FormEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import {
  simulate,
  computeTier,
  clampCustomTarget,
  type SimulationResult,
} from "../lib/businessSimulator";
import { BIZ_STYLES } from "./BusinessPage.styles";
import { TestimonialsCarousel } from "../components/testimonials/TestimonialsCarousel";

type FormStatus = "idle" | "submitting" | "success" | "error";

// ─── §05 Témoignages partenaires ─────────────────────────────────────────────
// Refonte 2026-05-18 : 1 seul bloc fondateurs (Thomas + Mélanie ensemble) +
// slots partenaires additionnels (textes Thomas en cours). Plus de récits
// inventés.

interface PartnerStory {
  slug: string;            // prénom normalisé (lookup users.avatar_url côté DB)
  name: string;            // ex « Ambre »
  since: string;           // ex « Partenaire · Divona Center (Lot 46) »
  hook: string;            // accroche entre « ... »
  body: string;            // récit complet
}

// Histoire fondateurs Tom + Mélanie. Avatars auto via RPC publique
// `get_founders_avatars` (lit users.avatar_url, migration 20261118400000).
// Texte officiel envoyé par Thomas 2026-05-18.

type FounderChapter =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] };

const FOUNDERS_STORY_TITLE = "Notre histoire";

const FOUNDERS_STORY_CHAPTERS: FounderChapter[] = [
  { kind: "heading", text: "Avant Herbalife" },
  {
    kind: "paragraph",
    text:
      "Tom, 15 ans conducteur d'engins sur chantier. Debout à 5h, rentré à 19h. Une routine qui lui prenait tout : le temps avec ses enfants, le sport, la vie. Il faisait déjà du sport, mais les résultats n'étaient pas au rendez-vous. Fatigué. En attente du week-end. En attente des vacances. Il cherchait autre chose — plus de temps, mieux gagner sa vie, offrir une vraie vie à ses enfants. Sans véhicule, sans plan B.",
  },
  {
    kind: "paragraph",
    text:
      "Mélanie, 11 ans dans le complément alimentaire pour animaux. Maman de 2 enfants en bas âge, elle vivait ce que beaucoup de mamans vivent : la fatigue qui s'accumule, quelques kilos de grossesse qui ne partaient pas, l'impression de tenir mais de ne plus se reconnaître. Un métier stable, mais sans le sens qu'elle cherchait au fond.",
  },
  {
    kind: "paragraph",
    text: "Deux parcours différents. Une même envie : retrouver de l'énergie, du temps, et construire quelque chose à eux.",
  },

  { kind: "heading", text: "Le déclic — mai 2022" },
  {
    kind: "paragraph",
    text:
      "On leur présente Herbalife. Ils disent oui. Pas parce que c'était facile. Parce qu'ils voyaient pour la première fois un vrai projet : santé, sens, et liberté.",
  },
  {
    kind: "paragraph",
    text: "Tom démarre sur un protocole de 21 jours. Le résultat tombe vite :",
  },
  {
    kind: "bullets",
    items: [
      "–4 kg en 1 mois",
      "18 personnes accompagnées sur leur remise en forme",
      "3 partenaires qui rejoignent l'équipe",
      "1 800 € de revenu complémentaire dès le 1ᵉʳ mois — à côté de son job",
    ],
  },
  {
    kind: "paragraph",
    text:
      "Un an plus tard, Mélanie le rejoint à temps plein. La nutrition la change complètement : elle perd les derniers kilos de grossesse, retrouve une énergie qu'elle avait oubliée, et redevient pleinement elle-même. Plus dynamique. Plus épanouie. Maman, femme, entrepreneure — sur ses propres termes.",
  },

  { kind: "heading", text: "Aujourd'hui — 4 ans plus tard" },
  {
    kind: "bullets",
    items: [
      "+ de 250 personnes accompagnées chaque mois avec toute l'équipe",
      "Des revenus jamais en dessous de 4 000 €/mois",
      "Plusieurs voyages à travers le monde",
      "Un agenda qu'on gère nous-mêmes",
      "La Base Shakes & Drinks à Verdun, notre QG depuis juin 2025",
    ],
  },

  { kind: "heading", text: "Demain" },
  {
    kind: "paragraph",
    text: "Doubler, tripler le nombre de personnes accompagnées. Ouvrir les 100 prochains clubs en France — et pourquoi pas à l'international.",
  },
  {
    kind: "paragraph",
    text: "Ce n'est pas un business. C'est un mouvement. Et on a besoin de toi pour le construire.",
  },
];

// Partenaires additionnels (textes Thomas 2026-05-18). Les avatars sont
// récupérés en batch via RPC `get_avatars_by_slugs` (lit users.avatar_url
// avec lookup ls_normalize_slug(first_name)).
const PARTNER_STORIES: PartnerStory[] = [
  {
    slug: "ambre",
    name: "Ambre",
    since: "Partenaire · Divona Center (Lot 46) · ouvert en juillet",
    hook: "Digestion retrouvée, +8 kg de muscle, –10 % de masse grasse en 2 ans.",
    body:
      "Ambre, 35 ans, maman d'une fille de 4 ans, problème de digestion depuis toute petite. J'ai toujours mangé équilibré et fait du sport, aucune perte de poids. En 2 ans j'ai pris 8 kg de masse musculaire et j'ai perdu 10 % de masse grasse. J'ai retrouvé une digestion normale, de l'énergie et une meilleure hydratation. Pour l'activité, on aide entre 35 et 40 personnes dans le Lot (46), mon meilleur revenu c'est 1 262 € le mois dernier et on a ouvert le Divona Center en juillet.",
  },
  {
    slug: "laura",
    name: "Laura",
    since: "Partenaire · ex-responsable salon de coiffure",
    hook: "+9 kg de muscle en 7 mois, et l'envie d'aider 2 000 personnes en 3 ans.",
    body:
      "Laura, 25 ans. J'étais responsable d'un salon de coiffure. J'ai voulu démarrer pour reprendre de la masse musculaire, chose faite : plus de 9 kg de masse musculaire en 7 mois. Au début j'ai commencé l'activité à temps choisi pour faire des compléments de revenus. Maintenant c'est plus de 150 personnes aidées, 2 500 € de revenus avec une vision claire d'aider 2 000 personnes sur les 3 prochaines années.",
  },
  {
    slug: "valentin",
    name: "Valentin",
    since: "Partenaire · à temps plein depuis janvier 2023",
    hook: "–30 kg en 1 an, +12 kg de muscle, le sport retrouvé.",
    body:
      "Pour ma part, Valentin, j'ai connu le concept en démarrant sur ma nutrition. Je faisais pas mal de sport, mais une mauvaise nutrition. Suite à des blessures successives, j'ai ralenti sur le sport. Je suis passé de 76 kg à 109 kg. En 1 an j'ai séché 30 kg et repris 12 kg de masse musculaire. Depuis janvier 2023 je développe l'activité à temps plein avec une équipe en construction.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Combien de temps par semaine je dois y consacrer ?",
    a: "Au début (3-6 premiers mois), compte 8 à 12 heures par semaine pour atteindre le palier Success Builder (~840 €/mois). Une fois ton réseau de clients établi, beaucoup de partenaires descendent à 5-8 h/semaine sur le long terme. Compatible avec un salariat ou des études — la majorité démarrent en parallèle de leur activité principale.",
  },
  {
    q: "Est-ce que c'est légal en France ?",
    a: "Oui, intégralement. Activité déclarée à la DGCCRF, conforme à la réglementation FVD (Fédération de la Vente Directe). Le statut juridique du partenaire est officiel et reconnu (article L7321 du Code du travail). Tu déclares tes revenus à l'URSSAF et aux impôts comme toute activité indépendante.",
  },
  {
    q: "Quel statut juridique je dois prendre ?",
    a: "Tu démarres en VDI (Vendeur à Domicile Indépendant) — statut spécifique FVD, gratuit, sans formalité administrative complexe. Tu cotises uniquement sur ce que tu gagnes (~22 % de cotisations URSSAF prélevées automatiquement). Quand ton revenu dépasse ~16 000 €/an, tu peux passer en micro-entrepreneur ou en SASU — on t'accompagne au moment venu.",
  },
  {
    q: "Faut-il vendre ? Je n'aime pas ça.",
    a: "Non. La logique La Base 360, c'est accompagner, pas vendre. Tu écoutes un besoin (perte de poids, prise de masse, énergie), tu proposes un programme adapté, tu suis la personne dans le temps. Les clients reviennent parce qu'ils ont des résultats — pas parce qu'on les a « convaincus ». 95 % de notre activité = clients récurrents qui re-commandent d'eux-mêmes.",
  },
  {
    q: "Et si je n'aime pas la vente, est-ce que je peux quand même réussir ?",
    a: "Oui — et c'est même un avantage. Les meilleurs partenaires La Base 360 sont des anciens enseignants, kinés, soignants, profs de sport, parents au foyer. Des gens qui aiment écouter, conseiller, suivre. La « vente classique » (forcer, persuader) ne fonctionne pas dans notre métier — c'est l'écoute qui paye, mois après mois.",
  },
  {
    q: "Combien j'investis vraiment au démarrage ?",
    a: "61,21 € pour le pack ambassadeur. C'est tout. Pas de minimum mensuel à acheter. Pas de stock à constituer. Pas de matériel de prospection à payer. Si tu veux investir dans tes propres produits (usage perso ou pour faire goûter), c'est optionnel et au prix partenaire (−25 à −50 %). Beaucoup démarrent avec 0 € d'investissement supplémentaire au-delà du pack.",
  },
  {
    q: "Et si ça ne marche pas pour moi ?",
    a: "Tu arrêtes, point. Pas d'engagement, pas de clause de non-concurrence, pas de pénalité. Le pack ambassadeur est remboursé intégralement les 30 premiers jours. Au-delà, tu peux mettre ton activité en pause autant que tu veux et la relancer plus tard. Aucun risque financier au-delà des 61,21 € initiaux.",
  },
  {
    q: "Quand je commence à gagner ?",
    a: "Le premier mois typiquement, sur tes premières ventes (10-30 % font leur première vente dans les 7 jours). Le palier Success Coach (~350 €/mois net) est atteint en moyenne au mois 2-3. Success Builder (~840 €/mois) au mois 3-6. Mais on ne te promet rien : ces moyennes existent parce que les gens bossent. Pas de revenu sans action.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "La Base 360 — Opportunité partenaire",
  url: "https://labase360.com/business",
  description: "Page de présentation de l'opportunité partenaire La Base 360.",
  publisher: { "@type": "Organization", name: "La Base 360", url: "https://labase360.com" },
  mainEntity: {
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
};

export function BusinessPage() {
  const [params] = useSearchParams();
  const referrerId = params.get("ref");
  const wantsLeadCapture = params.get("leadcapture") === "1";
  // Funnel Opportunité gated (2026-06) : si on arrive du funnel /rejoindre, le
  // prospect a DÉJÀ laissé ses infos → on remplace le form §07 (doublon) par un
  // remerciement. Visiteur direct/froid = garde le formulaire de capture.
  const fromFunnel = params.get("from") === "funnel";

  // ─── Avatars §05 (fondateurs + partenaires) via RPC publiques ─────────────
  const [foundersAvatars, setFoundersAvatars] = useState<{
    thomas_avatar_url: string | null;
    melanie_avatar_url: string | null;
  }>({ thomas_avatar_url: null, melanie_avatar_url: null });
  const [partnerAvatars, setPartnerAvatars] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;

        // Fondateurs : Thomas + Mélanie
        const { data: f } = await sb.rpc("get_founders_avatars");
        if (!cancelled && f) {
          const row = Array.isArray(f) ? f[0] : f;
          if (row) {
            setFoundersAvatars({
              thomas_avatar_url: row.thomas_avatar_url ?? null,
              melanie_avatar_url: row.melanie_avatar_url ?? null,
            });
          }
        }

        // Partenaires : batch par slug
        const slugs = PARTNER_STORIES.map((p) => p.slug);
        if (slugs.length > 0) {
          const { data: p } = await sb.rpc("get_avatars_by_slugs", { p_slugs: slugs });
          if (!cancelled && Array.isArray(p)) {
            const map: Record<string, string | null> = {};
            for (const r of p as Array<{ slug: string; avatar_url: string | null }>) {
              map[r.slug] = r.avatar_url ?? null;
            }
            setPartnerAvatars(map);
          }
        }
      } catch {
        /* silent : avatars optionnels, fallback gradient initiales */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── Simulateur state ─────────────────────────────────────────────────────
  const [target, setTarget] = useState<number>(500);
  const [customTarget, setCustomTarget] = useState<string>("");
  const [months, setMonths] = useState<number>(6);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [resultShown, setResultShown] = useState(false);
  const [resultRevealed, setResultRevealed] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // ─── Form §6 state ────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<{ firstName?: boolean; phone?: boolean; city?: boolean }>(
    {},
  );
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ─── FAQ accordion ─────────────────────────────────────────────────────────
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ─── Popup lead capture ───────────────────────────────────────────────────
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupFirstName, setPopupFirstName] = useState("");
  const [popupPhone, setPopupPhone] = useState("");
  const [popupReferral, setPopupReferral] = useState("");
  const [popupConsent, setPopupConsent] = useState(false);
  const [popupErrors, setPopupErrors] = useState<{
    firstName?: boolean;
    phone?: boolean;
    consent?: boolean;
  }>({});
  const [popupStatus, setPopupStatus] = useState<FormStatus>("idle");
  const [popupErrorMsg, setPopupErrorMsg] = useState("");
  const popupLastFocusRef = useRef<HTMLElement | null>(null);
  const popupOpenBtnRef = useRef<HTMLButtonElement | null>(null);

  // ─── Sticky bottom CTA mobile ─────────────────────────────────────────────
  const [stickyShown, setStickyShown] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);

  // ─── Container ref pour reveal/observe scoping ────────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ─── Document title + meta SEO + JSON-LD ──────────────────────────────────
  useEffect(() => {
    const prev = document.title;
    document.title = "La Base 360 — Devenir partenaire bien-être";
    const meta = document.createElement("meta");
    meta.name = "description";
    meta.content =
      "Découvre comment transformer ta consommation bien-être en revenu durable. Marque mondiale, modèle éprouvé, accompagnement complet. Démarrer coûte 61,21 €.";
    document.head.appendChild(meta);
    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.text = JSON.stringify(FAQ_JSONLD);
    document.head.appendChild(jsonLd);
    return () => {
      document.title = prev;
      document.head.removeChild(meta);
      document.head.removeChild(jsonLd);
    };
  }, []);

  // ─── Reveal on scroll (IntersectionObserver natif) ────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll<HTMLElement>(".biz-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const parent = el.parentElement;
            const siblings = parent
              ? Array.from(parent.querySelectorAll<HTMLElement>(":scope > .biz-reveal"))
              : [];
            const idx = Math.max(0, siblings.indexOf(el));
            setTimeout(() => el.classList.add("is-visible"), idx * 80);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ─── Tier bars (animate width when visible) ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll<HTMLElement>(".biz-tier");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ─── Sticky bottom CTA (show after hero, hide on contact) ─────────────────
  useEffect(() => {
    if (!heroRef.current || !contactRef.current) return;
    if (!("IntersectionObserver" in window)) return;
    let heroOut = false;
    let contactIn = false;
    const update = () => setStickyShown(heroOut && !contactIn);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.target === heroRef.current) heroOut = !e.isIntersecting;
          if (e.target === contactRef.current) contactIn = e.isIntersecting;
        });
        update();
      },
      { threshold: 0.05 },
    );
    io.observe(heroRef.current);
    io.observe(contactRef.current);
    return () => io.disconnect();
  }, []);

  // ─── Popup auto-open via ?leadcapture=1 ──────────────────────────────────
  useEffect(() => {
    if (!wantsLeadCapture) return;
    if (sessionStorage.getItem("biz-leadcapture-dismissed") === "1") return;
    const t = setTimeout(() => setPopupOpen(true), 600);
    return () => clearTimeout(t);
  }, [wantsLeadCapture]);

  // ─── Popup body lock + ESC + focus management ────────────────────────────
  useEffect(() => {
    if (!popupOpen) {
      document.body.classList.remove("biz-no-scroll");
      if (popupLastFocusRef.current) popupLastFocusRef.current.focus();
      return;
    }
    document.body.classList.add("biz-no-scroll");
    popupLastFocusRef.current = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupOpen]);

  function closePopup() {
    setPopupOpen(false);
    sessionStorage.setItem("biz-leadcapture-dismissed", "1");
  }

  // ─── Simulateur — handlers ────────────────────────────────────────────────
  function handleSelectTarget(amount: number) {
    setTarget(amount);
    setCustomTarget("");
  }
  function handleCustomTarget(raw: string) {
    setCustomTarget(raw);
    const n = clampCustomTarget(parseInt(raw, 10));
    if (n > 0) setTarget(n);
  }
  function handleCompute() {
    const finalTarget = customTarget ? clampCustomTarget(parseInt(customTarget, 10)) : target;
    const effective = finalTarget > 0 ? finalTarget : target;
    setTarget(effective);
    const r = simulate(effective);
    setSimResult(r);
    setResultShown(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setResultRevealed(true));
    });
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  // ─── Submit form §6 ───────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!firstName.trim()) newErrors.firstName = true;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 13) newErrors.phone = true;
    if (!city.trim()) newErrors.city = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setStatus("submitting");
    setErrorMsg("");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const metadata: Record<string, unknown> = {};
      if (simResult) {
        metadata.target_euros = target;
        metadata.target_months = months;
        metadata.clients_needed = simResult.clientsNeeded;
        metadata.target_tier = simResult.tier.key;
      }
      const { data, error } = await sb.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: firstName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          referrer_user_id: referrerId ?? undefined,
          source: "business",
          ...(simResult ? { metadata } : {}),
        },
      });
      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        const friendly =
          raw === "rate_limited"
            ? "Trop de tentatives — réessaie dans une heure."
            : raw;
        throw new Error(friendly);
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue.");
      setStatus("error");
    }
  }

  // ─── Submit popup lead capture ────────────────────────────────────────────
  async function handlePopupSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: typeof popupErrors = {};
    if (!popupFirstName.trim()) newErrors.firstName = true;
    const digits = popupPhone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 13) newErrors.phone = true;
    if (!popupConsent) newErrors.consent = true;
    setPopupErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setPopupStatus("submitting");
    setPopupErrorMsg("");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data, error } = await sb.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: popupFirstName.trim(),
          phone: popupPhone.trim(),
          city: undefined,
          referrer_user_id: referrerId ?? undefined,
          source: "business-leadcapture",
          referral_source: popupReferral.trim() || undefined,
          consent_recontact: popupConsent,
          utm_source: params.get("utm_source") ?? undefined,
          utm_medium: params.get("utm_medium") ?? undefined,
          utm_campaign: params.get("utm_campaign") ?? undefined,
        },
      });
      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        const friendly =
          raw === "rate_limited"
            ? "Trop de tentatives — réessaie dans une heure."
            : raw;
        throw new Error(friendly);
      }
      setPopupStatus("success");
    } catch (err) {
      setPopupErrorMsg(err instanceof Error ? err.message : "Erreur inconnue.");
      setPopupStatus("error");
    }
  }

  // ─── Smooth scroll for anchor clicks ─────────────────────────────────────
  const handleAnchor = useCallback((href: string) => (e: React.MouseEvent) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const targetTier = useMemo(() => (simResult ? simResult.tier : computeTier(target)), [simResult, target]);
  const trackFillWidth = simResult ? `${simResult.trackPosition}%` : "0%";
  const trackMarkerLeft = simResult ? `${simResult.trackPosition}%` : "25%";

  return (
    <div ref={containerRef} className="biz-page">
      <style>{BIZ_STYLES}</style>
      <a href="#main" className="biz-skip">Aller au contenu</a>

      {/* HEADER */}
      <header className="biz-header">
        <div className="biz-container biz-header__inner">
          <a href="#top" className="biz-brand" aria-label="La Base 360" onClick={handleAnchor("#top")}>
            <span className="biz-brand__mark" aria-hidden="true" />
            La Base 360
            <span className="biz-brand__sub">Opportunité 2026</span>
          </a>
          <nav className="biz-nav" aria-label="Sections">
            <a href="#pourquoi" onClick={handleAnchor("#pourquoi")}>Pourquoi</a>
            <a href="#opportunite" onClick={handleAnchor("#opportunite")}>Opportunité</a>
            <a href="#simulateur" onClick={handleAnchor("#simulateur")}>Simulateur</a>
            <a href="#temoignages" onClick={handleAnchor("#temoignages")}>Témoignages</a>
          </nav>
          <button type="button" className="biz-print" onClick={() => window.print()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimer la plaquette
          </button>
        </div>
      </header>

      <main id="main">
        {/* §1 HERO */}
        <section ref={heroRef} className="biz-hero" id="top">
          <div className="biz-hero__bg" aria-hidden="true" />
          <div className="biz-hero__grain" aria-hidden="true" />
          <div className="biz-container biz-hero__inner">
            <div className="biz-eyebrow">Opportunité La Base 360 · 2026</div>
            <h1>Transforme ce que tu vis déjà <em>en revenu</em>.</h1>
            <p className="biz-hero__sub">Le bien-être est devenu un marché. Voici comment en faire un métier — en restant toi-même.</p>
            <div className="biz-hero__ctas">
              <a href="#pourquoi" className="biz-btn biz-btn--primary biz-btn--lg" onClick={handleAnchor("#pourquoi")}>
                Découvrir l'opportunité
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
              </a>
              <a href="#simulateur" className="biz-btn biz-btn--ghost biz-btn--lg" onClick={handleAnchor("#simulateur")}>Calculer mes revenus</a>
            </div>
            <button
              type="button"
              className="biz-hero__ghost"
              ref={popupOpenBtnRef}
              onClick={() => {
                sessionStorage.removeItem("biz-leadcapture-dismissed");
                setPopupOpen(true);
              }}
              aria-haspopup="dialog"
              aria-controls="bizLeadPopup"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Pré-réserver mon échange
            </button>
            <div className="biz-meta-strip" aria-label="Repères">
              <div className="biz-meta-strip__item">
                <div className="biz-meta-strip__num">4 ans</div>
                <div className="biz-meta-strip__label">d'antériorité</div>
              </div>
              <div className="biz-meta-strip__item">
                <div className="biz-meta-strip__num">200+</div>
                <div className="biz-meta-strip__label">partenaires actifs</div>
              </div>
              <div className="biz-meta-strip__item">
                <div className="biz-meta-strip__num">0 €</div>
                <div className="biz-meta-strip__label">d'inventaire requis</div>
              </div>
            </div>
          </div>
        </section>

        {/* §2 POURQUOI */}
        <section className="biz-section" id="pourquoi">
          <div className="biz-container">
            <div className="biz-reveal">
              <div className="biz-eyebrow">§ 02 · Pourquoi maintenant</div>
              <h2 className="biz-h2">Le marché est là.<br/><span style={{color:"var(--biz-graphite)"}}>Deux chiffres qu'on ne peut plus ignorer.</span></h2>
            </div>
            <div className="biz-stats biz-reveal">
              <div className="biz-stat biz-stat--em">
                <div className="biz-stat__num">1<span>/</span>2</div>
                <p className="biz-stat__label"><strong>Une personne sur deux</strong> en France veut changer son hygiène de vie dans les 12 prochains mois.</p>
                <div className="biz-stat__src">— OpinionWay, 2024</div>
              </div>
              <div className="biz-stat biz-stat--cy">
                <div className="biz-stat__num">7<span>/</span>10</div>
                <p className="biz-stat__label"><strong>7 Français sur 10</strong> cherchent un revenu complémentaire — flexible, compatible avec leur quotidien.</p>
                <div className="biz-stat__src">— INSEE, 2023</div>
              </div>
            </div>
            <div className="biz-pillars biz-reveal">
              <article className="biz-pillar">
                <div className="biz-pillar__icon" aria-hidden="true">🌍</div>
                <h4>Marque mondiale</h4>
                <p>Une enseigne implantée dans plus de 90 pays depuis 1980. Cotée NYSE, validée par des millions de clients.</p>
              </article>
              <article className="biz-pillar">
                <div className="biz-pillar__icon" aria-hidden="true">🎯</div>
                <h4>Modèle éprouvé</h4>
                <p>Des millions de partenaires indépendants à travers le monde. Un modèle mature, encadré juridiquement, formé.</p>
              </article>
              <article className="biz-pillar">
                <div className="biz-pillar__icon" aria-hidden="true">🤝</div>
                <h4>Équipe présente</h4>
                <p>Mentor dédié, communauté privée, école de formation interne. On forme avant qu'on encaisse.</p>
              </article>
              <article className="biz-pillar">
                <div className="biz-pillar__icon" aria-hidden="true">🕊️</div>
                <h4>Liberté de rythme</h4>
                <p>Tu choisis tes horaires, ton volume, ton territoire. Compatible salariat, parentalité, études.</p>
              </article>
            </div>
          </div>
        </section>

        {/* §3a TROIS FAÇONS */}
        <section className="biz-section" id="opportunite" style={{paddingTop:0}}>
          <div className="biz-container">
            <div className="biz-reveal">
              <div className="biz-eyebrow">§ 03 · L'opportunité</div>
              <h3 className="biz-h3">Trois façons d'en vivre.</h3>
              <p className="biz-section__lead">Le même écosystème, trois usages — tu choisis le tien, ou tu les empiles.</p>
            </div>
            <div className="biz-ways biz-reveal">
              <article className="biz-way biz-way--em">
                <div className="biz-way__head">
                  <div className="biz-way__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 4 13H2a10 10 0 0 0 20 0c0-3-1-5-3-7s-4-3-7-3a10 10 0 0 0-1 19.96Z"/><path d="M11 20c0-7 4-11 11-11"/></svg>
                  </div>
                  <span className="biz-way__step">01 · Consommer</span>
                </div>
                <div className="biz-way__title">Pour soi.</div>
                <div className="biz-way__figure">−25 à −50 %</div>
                <p className="biz-way__desc">Tu utilises les produits que tu utilises déjà, au prix partenaire. Gain immédiat sur ton budget bien-être.</p>
              </article>
              <article className="biz-way biz-way--cy">
                <div className="biz-way__head">
                  <div className="biz-way__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  </div>
                  <span className="biz-way__step">02 · Partager</span>
                </div>
                <div className="biz-way__title">Avec ton cercle.</div>
                <div className="biz-way__figure">+25 à +50 %</div>
                <p className="biz-way__desc">Tu recommandes ce qui marche, tu accompagnes 3-10 personnes. Marge directe, rythme libre.</p>
              </article>
              <article className="biz-way biz-way--vi">
                <div className="biz-way__head">
                  <div className="biz-way__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <span className="biz-way__step">03 · Construire</span>
                </div>
                <div className="biz-way__title">Un actif.</div>
                <div className="biz-way__figure">+5 % royalties</div>
                <p className="biz-way__desc">Tu accompagnes d'autres à démarrer. Tu touches une royalty récurrente sur leur activité.</p>
              </article>
            </div>
          </div>
        </section>

        {/* §3b 5 PALIERS (dark) */}
        <section className="biz-section biz-section--ink">
          <div className="biz-container">
            <div className="biz-reveal">
              <div className="biz-eyebrow biz-eyebrow--on-dark">§ 03b · Progression</div>
              <h3 className="biz-h3" style={{color:"white"}}>Tes 5 paliers de progression.</h3>
              <p className="biz-section__lead">Une seule mécanique : tes résultats, tes paliers.</p>
            </div>
            <div className="biz-tiers">
              <div className="biz-tier biz-reveal" style={{"--w":"25%"} as React.CSSProperties}>
                <div className="biz-tier__rank">01</div>
                <div className="biz-tier__name">Distributeur</div>
                <div className="biz-tier__bar" aria-hidden="true" />
                <div className="biz-tier__pct">25 %</div>
                <div className="biz-tier__desc">Accessible dès J+1 avec le pack ambassadeur. Tu consommes au prix partenaire, tu commences à recommander.</div>
              </div>
              <div className="biz-tier biz-reveal" style={{"--w":"35%"} as React.CSSProperties}>
                <div className="biz-tier__rank">02</div>
                <div className="biz-tier__name">Success Coach</div>
                <div className="biz-tier__bar" aria-hidden="true" />
                <div className="biz-tier__pct">35 %</div>
                <div className="biz-tier__desc">Accessible mois 2-3. Premier seuil de revenu net mensuel, ~ 350 €/mois nets typiques.</div>
              </div>
              <div className="biz-tier biz-tier--star biz-reveal" style={{"--w":"42%"} as React.CSSProperties}>
                <div className="biz-tier__rank">03</div>
                <div className="biz-tier__name">Success Builder</div>
                <div className="biz-tier__bar" aria-hidden="true" />
                <div className="biz-tier__pct">42 %</div>
                <div className="biz-tier__desc">Accessible mois 3-6. ~ 840 €/mois nets typiques. 7 à 10 clients accompagnés mensuellement.</div>
                <span className="biz-tier__star">Palier-cible de 70 % de nos partenaires</span>
              </div>
              <div className="biz-tier biz-reveal" style={{"--w":"50%"} as React.CSSProperties}>
                <div className="biz-tier__rank">04</div>
                <div className="biz-tier__name">Supervisor</div>
                <div className="biz-tier__bar" aria-hidden="true" />
                <div className="biz-tier__pct">50 %</div>
                <div className="biz-tier__desc">Accessible mois 6-12. ~ 2 000 €/mois nets typiques. Tu débloques le revenu passif via tes filleuls.</div>
              </div>
              <div className="biz-tier biz-reveal" style={{"--w":"50%"} as React.CSSProperties}>
                <div className="biz-tier__rank">05</div>
                <div className="biz-tier__name">TAB Team</div>
                <div className="biz-tier__bar" aria-hidden="true" />
                <div className="biz-tier__pct">50 % + 5 %</div>
                <div className="biz-tier__desc">Objectif long terme. Équipe structurée, royalties récurrentes, bonus internationaux, événements VIP.</div>
              </div>
            </div>
          </div>
        </section>

        {/* §3c PACK 60€ */}
        <section className="biz-section">
          <div className="biz-container">
            <div className="biz-reveal" style={{textAlign:"center",maxWidth:680,margin:"0 auto"}}>
              <div className="biz-eyebrow">§ 03c · Pack ambassadeur</div>
              <h3 className="biz-h3">Démarrer coûte 61,21 €. C'est tout.</h3>
              <p className="biz-section__lead" style={{marginLeft:"auto",marginRight:"auto"}}>Pas de stock à acheter. Pas d'engagement. Pas de minimum mensuel.</p>
            </div>
            <div className="biz-pack biz-reveal">
              <div className="biz-pack__price">
                <div className="biz-pack__price-label">Pack ambassadeur</div>
                <div className="biz-pack__amount">61,21<span>€</span></div>
                <p className="biz-pack__note">TVA incluse · Livré sous 5 jours en France métropolitaine · Annulation possible 30 jours, remboursement intégral.</p>
              </div>
              <div>
                <div className="biz-pack__title">Ce qui est inclus.</div>
                <ul className="biz-pack__list">
                  <li><span className="biz-pack__check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span><strong>Kit produits de découverte</strong> — tu testes la gamme avant de la recommander.</span></li>
                  <li><span className="biz-pack__check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span><strong>Site personnalisé à ton nom</strong> — commandes en direct, traitement automatisé.</span></li>
                  <li><span className="biz-pack__check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span><strong>Backoffice complet</strong> — suivi commandes, marges, clients, bilans.</span></li>
                  <li><span className="biz-pack__check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span><strong>Accès à l'Académie La Base 360</strong> — 60+ modules vidéo, scripts, certifications.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* §3d ACCOMPAGNEMENT */}
        <section className="biz-section" style={{paddingTop:0}}>
          <div className="biz-container">
            <div className="biz-reveal" style={{textAlign:"center",maxWidth:640,margin:"0 auto"}}>
              <div className="biz-eyebrow">§ 03d · Accompagnement</div>
              <h3 className="biz-h3">Tu n'es pas seul·e.</h3>
              <p className="biz-section__lead" style={{marginLeft:"auto",marginRight:"auto"}}>Quatre piliers d'accompagnement, tout au long de ton parcours.</p>
            </div>
            <div className="biz-support biz-reveal">
              <div className="biz-support__card"><div className="biz-support__icon" aria-hidden="true">🎓</div><h4>Académie La Base 360</h4><p>Formations vidéo, scripts, certifications. Tu apprends à ton rythme, depuis ton canapé.</p></div>
              <div className="biz-support__card"><div className="biz-support__icon" aria-hidden="true">🤝</div><h4>Mentor dédié</h4><p>Un partenaire expérimenté t'accompagne en 1-to-1. Visio hebdo les 3 premiers mois.</p></div>
              <div className="biz-support__card"><div className="biz-support__icon" aria-hidden="true">📱</div><h4>App coach</h4><p>App dédiée pour gérer tes clients, leurs bilans et leurs commandes. Pensée pour le mobile.</p></div>
              <div className="biz-support__card"><div className="biz-support__icon" aria-hidden="true">💬</div><h4>Communauté privée</h4><p>Groupe WhatsApp + événements présentiels. Tu n'es jamais seul·e face à une question.</p></div>
            </div>
            <p className="biz-reveal" style={{marginTop:56,textAlign:"center",fontFamily:"var(--biz-italic)",fontStyle:"italic",fontWeight:500,color:"var(--biz-gold)",fontSize:18}}>
              Combien ça représente concrètement ? On calcule. <a href="#simulateur" style={{color:"inherit",borderBottom:"1px solid currentColor"}} onClick={handleAnchor("#simulateur")}>↓</a>
            </p>
          </div>
        </section>

        {/* §4 SIMULATEUR */}
        <section className="biz-section biz-section--ink" id="simulateur">
          <div className="biz-container">
            <div className="biz-reveal" style={{maxWidth:680}}>
              <div className="biz-eyebrow biz-eyebrow--on-dark">60 secondes</div>
              <h3 className="biz-h3" style={{color:"white"}}>Calcule ton plan.</h3>
              <p className="biz-section__lead">Donne-toi un objectif, un délai. On te montre ce que ça veut dire en clients, en programmes, en prospects.</p>
            </div>
            <div className="biz-sim biz-reveal">
              <div className="biz-sim-step">
                <div className="biz-sim-step__label"><b>01</b>Combien tu veux gagner par mois ?</div>
                <div className="biz-pills" role="radiogroup" aria-label="Objectif mensuel">
                  {[100, 300, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`biz-pill${target === amt && !customTarget ? " is-active" : ""}`}
                      role="radio"
                      aria-checked={target === amt && !customTarget}
                      onClick={() => handleSelectTarget(amt)}
                    >
                      {amt.toLocaleString("fr-FR")} €
                      {amt === 500 && <span className="biz-pill__star">★</span>}
                    </button>
                  ))}
                  <span className="biz-pill biz-pill--custom">
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      step={50}
                      value={customTarget}
                      onChange={(e) => handleCustomTarget(e.target.value)}
                      placeholder="Montant personnalisé €"
                      aria-label="Montant personnalisé"
                    />
                  </span>
                </div>
              </div>
              <div className="biz-sim-step">
                <div className="biz-sim-step__label"><b>02</b>En combien de temps ?</div>
                <div className="biz-pills" role="radiogroup" aria-label="Délai">
                  {[
                    { months: 3, label: "Sprint" },
                    { months: 6, label: "Équilibre" },
                    { months: 12, label: "Marathon" },
                  ].map((m) => (
                    <button
                      key={m.months}
                      type="button"
                      className={`biz-pill${months === m.months ? " is-active" : ""}`}
                      role="radio"
                      aria-checked={months === m.months}
                      onClick={() => setMonths(m.months)}
                    >
                      {m.label} <span style={{opacity:0.6,marginLeft:6,fontWeight:400}}>{m.months} mois</span>
                      {m.months === 6 && <span className="biz-pill__star">★</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="biz-sim__compute">
                <button type="button" className="biz-btn biz-btn--primary biz-btn--lg" onClick={handleCompute}>
                  Calcule mon plan
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>
              <div
                ref={resultRef}
                className={`biz-result${resultShown ? " is-shown" : ""}${resultRevealed ? " is-revealed" : ""}`}
                aria-live="polite"
                aria-atomic="true"
              >
                <div className="biz-result__cards">
                  <div className="biz-result-card" style={{"--c":"var(--biz-emerald)"} as React.CSSProperties}>
                    <div className="biz-result-card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                    <div className="biz-result-card__num">{simResult?.clientsNeeded ?? "—"}</div>
                    <div className="biz-result-card__label">clients fidèles à accompagner</div>
                  </div>
                  <div className="biz-result-card" style={{"--c":"var(--biz-cyan)"} as React.CSSProperties}>
                    <div className="biz-result-card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
                    <div className="biz-result-card__num">{simResult?.programsPerMonth ?? "—"}</div>
                    <div className="biz-result-card__label">programmes vendus / mois</div>
                  </div>
                  <div className="biz-result-card" style={{"--c":"var(--biz-violet)"} as React.CSSProperties}>
                    <div className="biz-result-card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
                    <div className="biz-result-card__num">{simResult?.prospectsPerMonth ?? "—"}</div>
                    <div className="biz-result-card__label">prospects à rencontrer / mois</div>
                  </div>
                </div>
                <div className="biz-result-summary">
                  <div className="biz-result-summary__item"><div className="biz-result-summary__k">Palier visé</div><div className="biz-result-summary__v">{targetTier.name}</div></div>
                  <div className="biz-result-summary__item"><div className="biz-result-summary__k">Marge typique</div><div className="biz-result-summary__v">{targetTier.marginLabel}</div></div>
                  <div className="biz-result-summary__item"><div className="biz-result-summary__k">Programmes / client</div><div className="biz-result-summary__v">1 / mois</div></div>
                </div>
                <div className="biz-tier-track">
                  <div className="biz-tier-track__head">
                    <h4>Ta progression</h4>
                    <em>Sur ton délai de <b>{months}</b> mois</em>
                  </div>
                  <div className="biz-track__lane" aria-hidden="true">
                    <div className="biz-track__fill" style={{width: trackFillWidth}} />
                    <div className={`biz-track__milestone${targetTier.medal === "sc" ? " is-target" : ""}`} data-tier="sc">
                      🥉
                      <span className="biz-track__milestone-label"><b>Success Coach</b>~ 350 €/mois</span>
                      <span className="biz-track__milestone-amt">mois 2–3</span>
                    </div>
                    <div className={`biz-track__milestone${targetTier.medal === "sb" ? " is-target" : ""}`} data-tier="sb">
                      🥈
                      <span className="biz-track__milestone-label"><b>Success Builder</b>~ 840 €/mois</span>
                      <span className="biz-track__milestone-amt">mois 3–6</span>
                    </div>
                    <div className={`biz-track__milestone${targetTier.medal === "sup" ? " is-target" : ""}`} data-tier="sup">
                      🥇
                      <span className="biz-track__milestone-label"><b>Supervisor</b>~ 2 000 €/mois</span>
                      <span className="biz-track__milestone-amt">mois 6–12</span>
                    </div>
                    {simResult && <div className="biz-track__marker" style={{left: trackMarkerLeft}} />}
                  </div>
                </div>
                <div className="biz-bonus">
                  <div className="biz-bonus__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                  </div>
                  <div>
                    <div className="biz-bonus__title">Et si un ami démarre avec toi… <b>+5 % royalty</b> sur toute son activité — à vie.</div>
                    <div className="biz-bonus__desc">Exemple : 3 amis qui font 500 €/mois = <b style={{color:"white"}}>+75 € passifs par mois</b> pour toi.</div>
                  </div>
                </div>
                <p className="biz-footnote">
                  Calcul indicatif basé sur un prix moyen de 200 € par programme, une marge de 42 % (palier Success Builder), 1 programme par client par mois, 25 % de taux de conversion prospect→client (avec un buffer churn de 20 %). Les résultats varient selon ton effort, ton réseau, ton territoire.
                </p>
                <div className="biz-result__cta">
                  <a href="#contact" className="biz-btn biz-btn--primary biz-btn--lg" onClick={handleAnchor("#contact")}>
                    Démarrer mon plan
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* §5 TÉMOIGNAGES */}
        <section className="biz-section" id="temoignages">
          <div className="biz-container">
            <div className="biz-reveal" style={{maxWidth:680}}>
              <div className="biz-eyebrow">§ 05 · Témoignages</div>
              <h3 className="biz-h3">Ils l'ont fait avant toi.</h3>
              <p className="biz-section__lead">Deux histoires vraies. Tu peux en écrire une autre.</p>
            </div>
            <div className="biz-stories">
              {/* Bloc fondateurs fusionné — Tom + Mélanie en 1 récit en
                  4 chapitres. Avatars auto via RPC get_founders_avatars
                  (lit users.avatar_url). Texte officiel Thomas 2026-05-18. */}
              <article className="biz-story biz-story--founders biz-reveal" style={{ gridColumn: "1 / -1" }}>
                <div className="biz-story__head">
                  <div
                    className="biz-story__photo biz-story__photo--couple"
                    aria-hidden="true"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    {foundersAvatars.thomas_avatar_url ? (
                      <img
                        src={foundersAvatars.thomas_avatar_url}
                        alt=""
                        style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                      />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#10B981,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 22, border: "3px solid #fff" }}>T</div>
                    )}
                    {foundersAvatars.melanie_avatar_url ? (
                      <img
                        src={foundersAvatars.melanie_avatar_url}
                        alt=""
                        style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", marginLeft: -16, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                      />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#A78BFA,#FB7185)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 22, marginLeft: -16, border: "3px solid #fff" }}>M</div>
                    )}
                  </div>
                  <div>
                    <div className="biz-story__name">{FOUNDERS_STORY_TITLE}</div>
                    <div className="biz-story__since">Tom &amp; Mélanie · fondateurs La Base 360</div>
                  </div>
                </div>
                <div className="biz-story__chapters">
                  {FOUNDERS_STORY_CHAPTERS.map((c, i) => {
                    if (c.kind === "heading") {
                      return (
                        <h4 key={i} className="biz-story__chapter-title">
                          {c.text}
                        </h4>
                      );
                    }
                    if (c.kind === "paragraph") {
                      return (
                        <p key={i} className="biz-story__chapter-p">
                          {c.text}
                        </p>
                      );
                    }
                    return (
                      <ul key={i} className="biz-story__chapter-list">
                        {c.items.map((it, j) => (
                          <li key={j}>{it}</li>
                        ))}
                      </ul>
                    );
                  })}
                </div>
              </article>

              {/* Partenaires additionnels — textes Thomas 2026-05-18.
                  Avatars auto via RPC get_avatars_by_slugs (lookup
                  ls_normalize_slug(users.first_name)). */}
              {PARTNER_STORIES.map((s, i) => {
                const av = partnerAvatars[s.slug] ?? null;
                return (
                  <article key={i} className="biz-story biz-reveal">
                    <div className="biz-story__head">
                      <div className="biz-story__photo" aria-hidden="true" style={{ overflow: "hidden", padding: 0 }}>
                        {av ? (
                          <img src={av} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#10B981,#06B6D4)", color: "#fff", fontWeight: 700, fontSize: 22 }}>
                            {s.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="biz-story__name">{s.name}</div>
                        <div className="biz-story__since">{s.since}</div>
                      </div>
                    </div>
                    <div className="biz-story__hook">« {s.hook} »</div>
                    <p className="biz-story__body">{s.body}</p>
                  </article>
                );
              })}
            </div>
            <div className="biz-reveal biz-stories__signature">
              <span>« La seule règle : démarrer. »</span>
            </div>

            {/* §5b — Carrousel temoignages clients (Chantier #11 finition) */}
            <div className="biz-reveal" style={{ marginTop: 56, maxWidth: 880, marginInline: "auto" }}>
              <div
                className="public-shell-scope"
                data-public-theme="light"
                style={{ fontFamily: '"Inter", -apple-system, sans-serif' }}
              >
                <h4
                  style={{
                    fontFamily: '"Sora", system-ui, sans-serif',
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(15,23,42,.55)",
                    marginBottom: 6,
                  }}
                >
                  Et les clients qui en bénéficient ?
                </h4>
                <p
                  style={{
                    fontSize: 15,
                    color: "rgba(15,23,42,.62)",
                    marginBottom: 12,
                    maxWidth: 540,
                  }}
                >
                  Tu as vu pourquoi les partenaires aiment ce métier. Voilà ce que disent ceux qu'on accompagne au quotidien.
                </p>
                <TestimonialsCarousel variant="business" />
              </div>
            </div>
          </div>
        </section>

        {/* §6 FAQ */}
        <section className="biz-section" style={{paddingTop:0}} id="faq">
          <div className="biz-container">
            <div className="biz-reveal" style={{maxWidth:680}}>
              <div className="biz-eyebrow">§ 06 · FAQ</div>
              <h3 className="biz-h3">Les vraies questions.</h3>
              <p className="biz-section__lead">Ce que les gens nous demandent vraiment avant de se lancer.</p>
            </div>
            <div className="biz-faq biz-reveal">
              {FAQ_ITEMS.map((item, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className={`biz-faq__item${isOpen ? " is-open" : ""}`}>
                    <button
                      className="biz-faq__q"
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                    >
                      {item.q}
                      <svg className="biz-faq__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div
                      className="biz-faq__a"
                      role="region"
                      style={{maxHeight: isOpen ? 600 : 0}}
                    >
                      <div className="biz-faq__a-inner">{item.a}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* §6 CTA CONTACT */}
        <section ref={contactRef} className="biz-section biz-section--ink biz-cta" id="contact">
          <div className="biz-container">
            <div className="biz-cta__inner biz-reveal">
              {fromFunnel ? (
                <>
                  <div className="biz-eyebrow biz-eyebrow--on-dark">§ 07 · Merci</div>
                  <h3 className="biz-cta__title">C'est noté 🎉</h3>
                  <p className="biz-cta__sub">
                    On a bien reçu tes réponses. Ton coach te recontacte <strong>sous 48 h</strong> pour
                    un échange simple, sans pression. D'ici là, prépare tes questions — tu pourras tout
                    lui demander à l'appel 📞
                  </p>
                  <div
                    style={{
                      marginTop: 22,
                      padding: "18px 20px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      maxWidth: 460,
                      marginLeft: "auto",
                      marginRight: "auto",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>
                      💬 Tu as une question avant l'appel ?
                    </div>
                    <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
                      Note-la quelque part, ou explore l'opportunité ci-dessus à ton rythme.
                      Ton coach revient vers toi très vite.
                    </div>
                  </div>
                </>
              ) : (
              <>
              <div className="biz-eyebrow biz-eyebrow--on-dark">§ 07 · On en parle</div>
              <h3 className="biz-cta__title">On en parle ?</h3>
              <p className="biz-cta__sub">Réponse sous 48 h, sans pression. Pas de présentation d'une heure — juste un échange humain.</p>
              <form className={`biz-form${status === "success" ? " is-sent" : ""}`} onSubmit={handleSubmit} autoComplete="off" noValidate>
                <div className="biz-form__content">
                  <div className="biz-field">
                    <label htmlFor="bizFirstname">Prénom</label>
                    <input
                      id="bizFirstname"
                      type="text"
                      required
                      placeholder="Ton prénom"
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors({...errors, firstName: false}); }}
                      className={errors.firstName ? "has-error" : ""}
                    />
                  </div>
                  <div className="biz-field">
                    <label htmlFor="bizPhone">Téléphone WhatsApp</label>
                    <input
                      id="bizPhone"
                      type="tel"
                      required
                      placeholder="06 XX XX XX XX"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors({...errors, phone: false}); }}
                      className={errors.phone ? "has-error" : ""}
                    />
                  </div>
                  <div className="biz-field">
                    <label htmlFor="bizCity">Ville</label>
                    <input
                      id="bizCity"
                      type="text"
                      required
                      placeholder="Lyon, Bordeaux…"
                      value={city}
                      onChange={(e) => { setCity(e.target.value); if (errors.city) setErrors({...errors, city: false}); }}
                      className={errors.city ? "has-error" : ""}
                    />
                  </div>
                  <button
                    type="submit"
                    className="biz-btn biz-btn--primary biz-btn--lg biz-btn--block biz-form__submit"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting" ? "Envoi…" : "Être rappelé·e"}
                  </button>
                  {status === "error" && <p className="biz-form__error">{errorMsg}</p>}
                  <p className="biz-form__legal">En soumettant ce formulaire, tu acceptes d'être recontacté·e par un partenaire La Base 360. Tes coordonnées ne sont ni revendues ni utilisées hors de ce contexte.</p>
                </div>
                <div className="biz-form-success">
                  <div className="biz-form-success__check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h4>Reçu, on te rappelle sous 48 h.</h4>
                  <p>Tu seras contacté·e par un partenaire de l'équipe.</p>
                </div>
              </form>
              </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="biz-footer">
        <div className="biz-container biz-footer__inner">
          <div className="biz-footer__brand">
            <span className="biz-brand__mark" aria-hidden="true" />
            La Base 360
            <span style={{color:"rgba(255,255,255,.4)",fontWeight:400,marginLeft:8,fontFamily:"var(--biz-body)",fontSize:13}}>— Activité indépendante de partenaire FVD</span>
          </div>
          <div className="biz-footer__links">
            <a href="#">Mentions légales</a>
            <a href="#">CGU</a>
            <a href="#">Confidentialité</a>
            <span>© 2026</span>
          </div>
        </div>
      </footer>

      {/* STICKY BOTTOM CTA mobile */}
      <button
        type="button"
        className={`biz-sticky-cta${stickyShown ? " is-shown" : ""}`}
        aria-label="Être rappelé·e sous 48 heures"
        onClick={() => contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        Être rappelé·e sous 48&nbsp;h
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>

      {/* POPUP LEAD CAPTURE */}
      <div
        className={`biz-popup${popupOpen ? " is-open" : ""}${popupStatus === "success" ? " is-sent" : ""}`}
        id="bizLeadPopup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bizPopupTitle"
        hidden={!popupOpen}
      >
        <div className="biz-popup__backdrop" onClick={closePopup} />
        <div className="biz-popup__card" role="document">
          <button type="button" className="biz-popup__close" onClick={closePopup} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="biz-popup__title" id="bizPopupTitle">Avant qu'on te montre ça… 👇</h3>
          <p className="biz-popup__sub">Tu auras accès à tout, on aimerait juste savoir à qui on parle.</p>
          <form className="biz-popup__form" onSubmit={handlePopupSubmit} autoComplete="off" noValidate>
            <div className="biz-popup__field">
              <label htmlFor="bizPopupFirstname">Prénom *</label>
              <input
                id="bizPopupFirstname"
                type="text"
                required
                placeholder="Ton prénom"
                value={popupFirstName}
                onChange={(e) => { setPopupFirstName(e.target.value); if (popupErrors.firstName) setPopupErrors({...popupErrors, firstName: false}); }}
                className={popupErrors.firstName ? "has-error" : ""}
              />
            </div>
            <div className="biz-popup__field">
              <label htmlFor="bizPopupPhone">Téléphone WhatsApp *</label>
              <input
                id="bizPopupPhone"
                type="tel"
                required
                placeholder="06 XX XX XX XX"
                value={popupPhone}
                onChange={(e) => { setPopupPhone(e.target.value); if (popupErrors.phone) setPopupErrors({...popupErrors, phone: false}); }}
                className={popupErrors.phone ? "has-error" : ""}
              />
            </div>
            <div className="biz-popup__field">
              <label htmlFor="bizPopupSource">Tu nous as trouvé·e comment ?</label>
              <input
                id="bizPopupSource"
                type="text"
                placeholder="Insta, FB, un·e ami·e, autre…"
                value={popupReferral}
                onChange={(e) => setPopupReferral(e.target.value)}
              />
              <span className="biz-popup__field-hint">Optionnel — ça nous aide à mieux comprendre.</span>
            </div>
            <label className={`biz-popup__consent${popupErrors.consent ? " has-error" : ""}`}>
              <input
                type="checkbox"
                required
                checked={popupConsent}
                onChange={(e) => { setPopupConsent(e.target.checked); if (popupErrors.consent) setPopupErrors({...popupErrors, consent: false}); }}
              />
              <span>J'accepte d'être recontacté·e par un partenaire La Base 360.</span>
            </label>
            <button
              type="submit"
              className="biz-btn biz-btn--primary biz-btn--lg biz-popup__submit"
              disabled={popupStatus === "submitting"}
            >
              {popupStatus === "submitting" ? "Envoi…" : "Je découvre l'opportunité"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            {popupStatus === "error" && <p className="biz-popup__error">{popupErrorMsg}</p>}
            <p className="biz-popup__legal">Pas de spam, pas de revente.</p>
          </form>
          <div className={`biz-popup__success${popupStatus === "success" ? " is-shown" : ""}`}>
            <div className="biz-popup__success-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h4>Bienvenue !</h4>
            <p>On t'a reçu·e. Profite de la page — on te rappelle sous 48 h.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessPage;
