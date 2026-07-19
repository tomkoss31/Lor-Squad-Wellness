// =============================================================================
// BilanResultatPremiumPage — page premium « Résultat Bilan » (chantier 2026-06-11).
//
// Route : /resultat-bilan/:token   (public, prospect non authentifié)
//
// Le coach envoie ce lien manuellement après un bilan online. La page résout
// le token via l'edge get-online-bilan-results (service_role) et affiche, dans
// le thème public V2 dark : analyse perso de Noaly + 5 stratégies + l'échelle
// de programmes (prix RÉELS depuis la DB, jamais « /mois ») + pourquoi démarrer
// + témoignages validés + FAQ + CTA.
//
// Caisse LIVE : « Je démarre » appelle create-payment-link (Square/Stripe, prix
// recalculé serveur). Si le coach n'a pas d'encaissement configuré → fallback
// « ton coach t'envoie le lien ». Retour caisse → ?paid=1.
//
// Grosse refonte (2026-07-09) :
//  · V1 — sous-titres/best-seller par ID (plus d'index), fallback analyse Noaly,
//    violet→teal/lime (v2), copy « nos formules ».
//  · V2 — les 5 stratégies collent au 1ᵉʳ objectif du bilan (weight_loss /
//    mass_gain / énergie-sommeil / perf), plus de contenu 100 % perte de poids.
//  · V3 — de-emoji complet → pictos ligne teal (IconBadge), prix en Anton,
//    écran « payé » sur preuve serveur (bilan_orders payé, pas ?paid=1 nu),
//    section témoignages masquée si aucun avis validé (plus de titre orphelin).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  PublicShell,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
} from "../components/public/PublicShell";
import { TestimonialsCarousel } from "../components/testimonials/TestimonialsCarousel";
import { getSupabaseClient } from "../services/supabaseClient";
import { pickAddOn } from "../lib/bilanAddOns";
import {
  LUNCH_AVG_EUR,
  PRODUCT_DAYS,
  PRODUCT_HUMAN,
  PRODUCT_SHORT,
  dailyCost,
  formatEur,
} from "../data/routineCost";
import { COMMUNITY_STATS, formatCount } from "../data/community";

interface ProgrammeDTO {
  id: string;
  name: string;
  price: number;
  products: { id: string; name: string; category: string }[];
}
interface ResultsDTO {
  bilan: {
    firstName: string;
    age: number | null;
    city: string | null;
    objectives: string[];
    weightLossTargetKg: number | null;
    currentWeightKg: number | null;
    motivationScore: number | null;
    aiAnalysis: string | null;
    createdAt: string;
    // Réponses du questionnaire qui alimentent la reco d'add-on. Optionnel :
    // les bilans d'avant 2026-07-17 n'ont pas forcément un payload complet.
    answers?: {
      sleepHours: string | null;
      sleepQuality: string | null;
      mealsBalanced: string | null;
    };
  };
  coach: { name: string; slug: string | null; userId: string | null };
  programmes: ProgrammeDTO[];
  produits: { id: string; name: string; category: string; price: number; quantiteLabel: string }[];
  // Preuve serveur : true si une commande `bilan_orders` de ce bilan est payée
  // (webhook Square / confirm Stripe). L'écran « payé » ne se base plus sur le
  // seul ?paid=1 (falsifiable) mais sur cette valeur.
  paid?: boolean;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Plus d'énergie",
  sleep: "Mieux dormir",
  wellbeing: "Bien-être général",
  perf_pro: "Performance au travail",
};

function prettyProgramName(name: string): string {
  return name.replace(/^Programme\s+/i, "").trim();
}
function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Scroll vers une ancre en compensant le header collant (§7 du handoff : NE PAS
// utiliser scrollIntoView, qui ne tient pas compte du header et se comporte mal
// selon les navigateurs). HEADER_H = hauteur du header collant.
const HEADER_H = 78;
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_H;
  window.scrollTo({ top, behavior: "smooth" });
}

// Chapitres du menu collant (scrollspy). id = ancre de section.
const CHAPTERS = [
  { id: "bilan", label: "Mon bilan" },
  { id: "plan", label: "Mon plan" },
  { id: "formules", label: "Mes formules" },
  { id: "demarrer", label: "Démarrer" },
] as const;

export function BilanResultatPremiumPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Retour de la caisse (redirect_url → ?paid=1). Stripe ajoute &session_id=cs_…
  const justPaid = searchParams.get("paid") === "1";
  const stripeSessionId = searchParams.get("session_id");

  // Retour Stripe : on confirme le paiement CÔTÉ SERVEUR (pas de webhook à
  // configurer côté distri). L'edge revérifie le statut réel via la clé secrète
  // du distri puis notifie le coach. Best-effort, n'affecte pas l'affichage.
  useEffect(() => {
    if (!token || !stripeSessionId || !stripeSessionId.startsWith("cs_")) return;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb.functions.invoke("confirm-stripe-payment", {
          body: { token, session_id: stripeSessionId },
        });
        // Rafraîchit la preuve serveur (bilan_orders.paid) pour afficher l'écran
        // « payé » sur du réel, pas sur le seul ?paid=1.
        const { data: refreshed } = await sb.functions.invoke("get-online-bilan-results", {
          body: { token },
        });
        const rp = refreshed as { paid?: boolean } | null;
        if (rp && typeof rp.paid === "boolean") {
          setData((d) => (d ? { ...d, paid: rp.paid } : d));
        }
      } catch {
        /* silencieux : le coach verra la commande de toute façon */
      }
    })();
  }, [token, stripeSessionId]);
  const [data, setData] = useState<ResultsDTO | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ok">("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  // Demande de rappel (« Fais-toi rappeler par Thomas »). idle → sending → done.
  // Le lead a déjà laissé prénom + contact + canal préféré à l'étape bilan :
  // un clic suffit, l'edge request-callback horodate la demande sur son lead et
  // notifie le coach par push. done affiche la confirmation inline.
  const [callbackState, setCallbackState] = useState<"idle" | "sending" | "done">("idle");

  async function requestCallback() {
    if (!token || callbackState !== "idle") return;
    setCallbackState("sending");
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setCallbackState("idle");
        return;
      }
      const { data: res, error } = await sb.functions.invoke("request-callback", {
        body: { token },
      });
      const payload = res as { success?: boolean } | null;
      if (error || !payload?.success) {
        setCallbackState("idle");
        return;
      }
      setCallbackState("done");
      // Amène l'œil sur la confirmation (section démarrer).
      scrollToId("demarrer");
    } catch {
      setCallbackState("idle");
    }
  }

  // Phase 2 : « Je démarre » tente la caisse directe (create-payment-link →
  // Square hosted checkout). Si le coach n'a pas d'encaissement configuré
  // (fallback) ou en cas d'erreur → panneau Phase 1 « ton coach t'envoie le
  // lien de paiement ». Le prix est recalculé CÔTÉ SERVEUR (pv_programs).
  async function startCheckout(programId: string | null) {
    if (!programId) {
      setStarted(true);
      return;
    }
    setPayLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setStarted(true);
        return;
      }
      const redirectUrl = `${window.location.origin}/resultat-bilan/${token}?paid=1`;
      const { data: res } = await sb.functions.invoke("create-payment-link", {
        body: { token, program_id: programId, redirect_url: redirectUrl },
      });
      const payload = res as { url?: string; fallback?: boolean } | null;
      if (payload?.url) {
        window.location.href = payload.url;
        return; // on quitte la page vers la caisse Square
      }
      setStarted(true);
    } catch {
      setStarted(true);
    } finally {
      setPayLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (alive) setStatus("error");
          return;
        }
        const { data: res, error } = await sb.functions.invoke("get-online-bilan-results", {
          body: { token },
        });
        if (!alive) return;
        const payload = res as (ResultsDTO & { error?: string }) | null;
        if (error || !payload || payload.error || !payload.bilan) {
          setStatus(payload?.error === "not_found" ? "notfound" : "error");
          return;
        }
        setData(payload);
        // Présélection (revue 2026-07-17). Avant : Premium en dur pour TOUT LE
        // MONDE — une page qui promet « le programme qui te correspond » et qui
        // met en avant la même formule pour chacun. Maintenant : si les réponses
        // du bilan appellent un add-on (sommeil, métabolisme, fibres) et qu'une
        // formule le CONTIENT déjà, c'est elle qu'on met en avant. Ça n'invente
        // aucune règle commerciale : ça lit le catalogue.
        // Fallback = Premium (best-seller réel), puis 1er programme — jamais un
        // index positionnel, qui casserait si l'ordre du catalogue change.
        const addOn = pickAddOn({
          objectives: payload.bilan.objectives,
          sleepHours: payload.bilan.answers?.sleepHours,
          sleepQuality: payload.bilan.answers?.sleepQuality,
          mealsBalanced: payload.bilan.answers?.mealsBalanced,
        });
        const matching = addOn
          ? payload.programmes.find((p) => p.products.some((pr) => pr.id === addOn.productId))
          : undefined;
        const premium = payload.programmes.find((p) => p.id === "premium");
        setSelected(matching?.id ?? premium?.id ?? payload.programmes[0]?.id ?? null);
        setStatus("ok");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  // Fix bug (2026-07-16, chantier Qualif) : au retour Square (?paid=1, pas de
  // session_id), rien ne rafraîchissait jamais data.paid — si le webhook
  // n'était pas encore arrivé au chargement, l'utilisateur restait bloqué sur
  // « on finalise ta confirmation » indéfiniment (fallait recharger la page à
  // la main). On poll get-online-bilan-results tant que le paiement n'est pas
  // confirmé côté serveur — couvre Square (aucun autre mécanisme) et sert de
  // filet de sécurité pour Stripe si confirm-stripe-payment est lent.
  useEffect(() => {
    if (!token || !justPaid || !data || data.paid === true) return;
    let alive = true;
    let attempts = 0;
    const maxAttempts = 10;
    const interval = window.setInterval(() => {
      void (async () => {
        attempts += 1;
        if (!alive) return;
        try {
          const sb = await getSupabaseClient();
          if (!sb || !alive) return;
          const { data: res } = await sb.functions.invoke("get-online-bilan-results", { body: { token } });
          const rp = res as { paid?: boolean } | null;
          if (!alive) return;
          if (rp?.paid === true) {
            setData((d) => (d ? { ...d, paid: true } : d));
            window.clearInterval(interval);
            return;
          }
        } catch {
          /* on retente au prochain tick */
        }
        if (attempts >= maxAttempts) window.clearInterval(interval);
      })();
    }, 2000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [token, justPaid, data?.paid]);

  const firstName = useMemo(() => capitalize((data?.bilan.firstName ?? "").trim()), [data]);
  const primaryObjective = useMemo(() => {
    const first = data?.bilan.objectives?.[0];
    return first ? OBJECTIVE_LABELS[first] ?? capitalize(first.replace(/_/g, " ")) : null;
  }, [data]);
  // V2 : le plan « stratégies » colle au 1ᵉʳ objectif du bilan (plus de contenu
  // 100 % perte de poids servi à un prospect prise de masse / énergie).
  const strategies = useMemo(() => pickStrategies(data?.bilan.objectives), [data]);

  // Prix unitaires par id — sert à calculer le €/jour réel de chaque formule et
  // celui de l'add-on. Les prix viennent de la DB (edge), jamais d'un dur.
  const priceById = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data?.produits ?? []) m.set(p.id, p.price);
    return m;
  }, [data]);

  // €/jour de chaque formule, à la dose réelle (cf. src/data/routineCost.ts).
  // null pour une formule dont un produit n'a pas de dose connue → on masque le
  // €/jour plutôt que d'afficher un montant faux.
  const dailyByProgram = useMemo(() => {
    const m = new Map<string, number | null>();
    for (const p of data?.programmes ?? []) {
      m.set(p.id, dailyCost(p.products.map((pr) => pr.id), priceById));
    }
    return m;
  }, [data, priceById]);

  // L'add-on qui découle de SES réponses (sommeil / objectif / repas).
  const addOn = useMemo(
    () =>
      data
        ? pickAddOn({
            objectives: data.bilan.objectives,
            sleepHours: data.bilan.answers?.sleepHours,
            sleepQuality: data.bilan.answers?.sleepQuality,
            mealsBalanced: data.bilan.answers?.mealsBalanced,
          })
        : null,
    [data],
  );

  // Témoignages : null = pas encore chargé, false = aucun (on masque la section
  // → plus de titre orphelin), true = au moins un.
  const [hasTestimonials, setHasTestimonials] = useState<boolean | null>(null);

  // Entonnoir (refonte 2026-07-18) : chapitre actif (scrollspy), FAQ accordéon,
  // dépliant « détail du calcul » du €/jour.
  const [activeChapter, setActiveChapter] = useState<string>("bilan");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Scrollspy : surligne le chapitre dont le haut vient de passer sous le header
  // collant. `recompute` lit les offsets réels et prend la dernière section dont
  // le haut a franchi la ligne du header. On le déclenche par DEUX voies :
  //   · un listener scroll (vrais navigateurs, scroll souris/tactile) ;
  //   · un IntersectionObserver (réagit au changement d'intersection quelle que
  //     soit la cause — y compris un scroll programmatique, que certains
  //     environnements n'accompagnent PAS d'un événement scroll).
  useEffect(() => {
    if (status !== "ok") return;
    const ids = ["bilan", "plan", "formules", "demarrer"];
    const recompute = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - 96 <= 0) current = id;
      }
      setActiveChapter((prev) => (prev === current ? prev : current));
    };
    recompute();
    window.addEventListener("scroll", recompute, { passive: true });
    const io = new IntersectionObserver(() => recompute(), {
      rootMargin: "-96px 0px 0px 0px",
      threshold: [0, 1],
    });
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => {
      window.removeEventListener("scroll", recompute);
      io.disconnect();
    };
  }, [status]);

  if (status === "loading") {
    return (
      <PublicShell defaultTheme="dark">
        <div style={{ padding: "90px 24px", textAlign: "center", color: "var(--cream-muted)" }}>
          <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
            <LineIcon d={ICON.spark} size={30} />
          </div>
          <div style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 14 }}>
            On prépare ton analyse…
          </div>
        </div>
      </PublicShell>
    );
  }

  if (status !== "ok" || !data) {
    return (
      <PublicShell defaultTheme="dark">
        <div style={{ padding: "90px 24px", textAlign: "center", color: "var(--cream-muted)" }}>
          <div style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 18, color: "var(--cream)" }}>
            {status === "notfound" ? "Ce lien n'est plus valide" : "Oups, un souci de chargement"}
          </div>
          <div style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 14, marginTop: 8 }}>
            Demande à ton coach de te renvoyer ton lien.
          </div>
        </div>
      </PublicShell>
    );
  }

  // ── Portage fidèle de la maquette claude design (ResultatBilan.dc.html) ──
  // Structure/styles/copy = maquette. Données = réelles (edge, prix DB, Noaly,
  // add-on, €/jour via dailyCost, paiement, callback, qualif). Garde-fous §9 OK.
  const { bilan, coach, programmes } = data;
  const paidConfirmed = data.paid === true; // preuve serveur bilan_orders.paid
  const coachName = coach.name;
  const coachInitial = coachName.charAt(0).toUpperCase();

  const recoMatch = addOn
    ? programmes.find((p) => p.products.some((pr) => pr.id === addOn.productId))
    : undefined;
  const recoId = recoMatch?.id ?? programmes.find((p) => p.id === "premium")?.id ?? programmes[0]?.id ?? null;

  const selectedProg = programmes.find((p) => p.id === selected) ?? null;
  const selName = selectedProg ? prettyProgramName(selectedProg.name) : "—";
  const selSubtitle = selectedProg ? (PROGRAMME_SUBTITLE_BY_ID[selectedProg.id] ?? "Pour aller plus loin") : "";
  const selDailyNum = selected ? dailyByProgram.get(selected) ?? null : null;
  const selPerDay = selDailyNum != null ? formatEur(selDailyNum) : null;
  const cheaper = selDailyNum != null && selDailyNum < LUNCH_AVG_EUR;
  const selVsLunch = cheaper ? "moins qu'un déjeuner" : "à peine + qu'un déj";
  const anchorLine = cheaper
    ? "Ta journée complète coûte moins cher que ton seul déjeuner. Ce n'est pas une dépense en plus — c'est le même argent, dépensé autrement."
    : "Pour à peine plus qu'une pause déjeuner, tu couvres ta journée complète — petit-déj, hydratation et boost compris. Le même argent, mais qui travaille pour toi.";

  const breakdown = selectedProg
    ? selectedProg.products.map((pr) => {
        const days = PRODUCT_DAYS[pr.id];
        const price = priceById.get(pr.id);
        return {
          id: pr.id,
          name: PRODUCT_SHORT[pr.id] ?? pr.name,
          days: days != null ? `${Math.round(days)} j` : "—",
          perDay: days && price !== undefined ? formatEur(price / days) : "—",
        };
      })
    : [];

  const seenH = new Set<string>();
  const humanProducts: string[] = [];
  for (const p of programmes) for (const pr of p.products) if (!seenH.has(pr.id) && PRODUCT_HUMAN[pr.id]) { seenH.add(pr.id); humanProducts.push(pr.id); }

  const noalyText = bilan.aiAnalysis
    ?? `${coachName} prépare ta lecture personnalisée à partir de ton bilan — tu la recevras lors de votre échange. En attendant, voici tes fondations et les formules ci-dessous.`;

  const stats = [
    primaryObjective ? { label: "Objectif", value: primaryObjective, color: "var(--teal)" } : null,
    bilan.currentWeightKg != null ? { label: "Poids actuel", value: `${bilan.currentWeightKg} kg`, color: "var(--cream)" } : null,
    bilan.weightLossTargetKg != null ? { label: "Objectif poids", value: `−${bilan.weightLossTargetKg} kg`, color: "var(--lime)" } : null,
    bilan.motivationScore != null ? { label: "Ta motivation", value: `${bilan.motivationScore} / 10`, color: "var(--cream)" } : null,
  ].filter(Boolean) as { label: string; value: string; color: string }[];

  const stratItems = strategies.items.map((s, i) => ({
    n: i + 1,
    title: s.title,
    foundation: !!s.foundation,
    text: s.problem + (s.solution ? ` ${s.solutionLabel ?? ""} ${s.solution}` : ""),
  }));

  const communityStats = [
    { n: formatCount(COMMUNITY_STATS.members), label: "membres" },
    { n: formatCount(COMMUNITY_STATS.messages), label: "messages" },
    { n: String(COMMUNITY_STATS.spaces), label: "salons" },
  ];

  const faqData = [
    { q: "C'est des produits « miracle » ?", a: `Non. Ce sont des compléments qui remplacent un petit-déj ou une collation mal équilibrés. Le vrai moteur, c'est tes habitudes — ${coachName} t'aide à les replacer.` },
    { q: "En combien de temps des résultats ?", a: "Beaucoup ressentent plus d'énergie dès les premières semaines. Pour le poids, on vise du progressif et durable — pas l'effet yo-yo. On mesure ensemble." },
    { q: "Je dois arrêter de manger normalement ?", a: "Pas du tout. Tu gardes de vrais repas. On structure juste le matin et les collations, là où ça pèche le plus." },
    { q: "Et si je n'aime pas le goût ?", a: "Tu choisis ta saveur au démarrage (vanille, chocolat, cookies…). Et si une ne te plaît pas, on en change, simplement." },
    { q: "Je suis suivi·e comment ?", a: `Par ${coachName}, directement : messages, ajustements, pesées, et le groupe pour la motivation. Jamais seul·e avec un PDF.` },
  ];

  const qualifSteps = [
    { n: 1, title: "Ton identité + le règlement", text: "Tu confirmes tes infos et acceptes le RGPD. Ta fiche client se crée toute seule (self-serve)." },
    { n: 2, title: "Ta saveur", text: `Tu choisis tes saveurs (F1, Thé, Aloé). ${coachName} est prévenu direct.` },
    { n: 3, title: "L'appli + ta 1ʳᵉ pesée", text: "Tu scannes We Do Transformations et tu poses ton point de départ." },
    { n: 4, title: "Rejoins la communauté", text: "Tu entres sur le Telegram, puis « Ouvrir mon espace ». Tu es lancé·e." },
  ];

  // ── Styles récurrents (valeurs de la maquette) ──
  const GRAD = "linear-gradient(120deg, #2DD4BF, #c5f82a)";
  const gradText: React.CSSProperties = { background: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" };
  const kickerHint: React.CSSProperties = { fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--cream-hint)" };
  const acteEyebrow: React.CSSProperties = { fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--teal)" };
  const h2Sec: React.CSSProperties = { fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "-0.5px", margin: "0 0 10px" };
  const inkCard: React.CSSProperties = { background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 14, padding: 16 };
  const gradBtn: React.CSSProperties = { background: GRAD, color: "#06241f", border: "none", borderRadius: 14, fontFamily: "'Sora', sans-serif", fontWeight: 700, cursor: "pointer" };

  return (
    // maxWidth:none → on casse la contrainte 560px de .ps-shell (page pleine largeur).
    <PublicShell defaultTheme="dark" showThemeToggle={false} style={{ maxWidth: "none", width: "100%" }}>
      <style>{RB_CSS}</style>
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "var(--cream)" }}>

        {/* ══ HEADER collant ══ */}
        <header style={{ position: "sticky", top: 0, zIndex: 60, background: "rgba(11,13,17,0.82)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid var(--hair)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, letterSpacing: "0.5px", fontSize: 16, whiteSpace: "nowrap" }}>LA&nbsp;BASE&nbsp;<span style={{ color: "var(--teal)" }}>360</span></div>
            <nav id="rb-nav" style={{ display: "flex", gap: 4, marginLeft: 8 }}>
              {CHAPTERS.map((c) => {
                const on = activeChapter === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => scrollToId(c.id)} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: on ? 700 : 500, color: on ? "var(--cream)" : "var(--cream-muted)", background: on ? "rgba(45,212,191,0.14)" : "transparent", border: `1px solid ${on ? "rgba(45,212,191,0.4)" : "transparent"}`, borderRadius: 999, padding: "6px 13px", cursor: "pointer", whiteSpace: "nowrap" }}>{c.label}</button>
                );
              })}
            </nav>
            {selectedProg && (
              <div id="rb-selpill" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, padding: "6px 12px", border: "1px solid var(--hair-strong)", borderRadius: 999, background: "var(--ink2)", whiteSpace: "nowrap" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--teal)", display: "inline-block", boxShadow: "0 0 8px var(--teal)" }} />
                <span style={{ fontSize: 12.5, color: "var(--cream-muted)" }}>Ta sélection&nbsp;·&nbsp;</span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{selName} · {selectedProg.price} €</span>
              </div>
            )}
          </div>
        </header>

        {/* ══ GRID : MAIN + RAIL ══ */}
        <div id="rb-grid" style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 40px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 344px", gap: 44, alignItems: "start" }}>
          <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 64 }}>

            {/* ══ ACTE 1 · TON BILAN ══ */}
            <section id="bilan" style={{ scrollMarginTop: 80, animation: "rb-fade .5s ease both" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, ...acteEyebrow, marginBottom: 14 }}>
                <span style={{ width: 18, height: 1, background: "var(--teal)", display: "inline-block" }} />Acte 1 — Analyse personnalisée
              </div>
              <h1 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1.1, letterSpacing: "-1px", margin: "0 0 16px" }}>
                Salut {firstName || "à toi"}, voici ce que <span style={{ ...gradText, fontStyle: "italic" }}>ton bilan révèle.</span>
              </h1>
              <p style={{ fontSize: 16.5, lineHeight: 1.55, color: "var(--cream-muted)", maxWidth: 560, margin: "0 0 22px" }}>Tu as pris le temps de faire ton bilan — c'est déjà un vrai pas. Voici ta lecture perso, et le plan que {coachName} te propose. Tout est déjà calé sur ce que tu as répondu.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, var(--teal), var(--lime))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontWeight: 800, color: "#06241f" }}>{coachInitial}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Préparé par {coachName}</div>
                  <div style={{ fontSize: 12.5, color: "var(--cream-hint)" }}>Coach bien-être · La Base 360</div>
                </div>
              </div>

              <div id="rb-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {stats.map((st) => (
                  <div key={st.label} style={inkCard}>
                    <div style={{ fontSize: 11.5, letterSpacing: "0.3px", textTransform: "uppercase", fontWeight: 600, color: "var(--cream-hint)" }}>{st.label}</div>
                    <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, marginTop: 8, color: st.color }}>{st.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "linear-gradient(180deg, rgba(45,212,191,0.09), rgba(19,24,32,0.6))", border: "1px solid rgba(45,212,191,0.32)", borderRadius: 16, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "rgba(45,212,191,0.14)", border: "1px solid rgba(45,212,191,0.30)" }}>
                    <LineIcon d={ICON.spark} size={17} />
                  </span>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14.5, color: "var(--teal)" }}>L'analyse de Noaly</div>
                </div>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: "var(--cream)", whiteSpace: "pre-wrap" }}>{noalyText}</p>
                <div style={{ fontSize: 12, color: "var(--cream-hint)", marginTop: 14 }}>Lecture générée à partir de ton bilan · validée par ton coach</div>
              </div>
            </section>

            {/* ══ ACTE 2 · TON PLAN ══ */}
            <section id="plan" style={{ scrollMarginTop: 80 }}>
              <div style={{ ...acteEyebrow, marginBottom: 12 }}>Acte 2 — Ton plan</div>
              <h2 style={h2Sec}>Tes 5 stratégies essentielles</h2>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--cream-muted)", maxWidth: 560, margin: 0 }}>{strategies.intro}</p>

              <div style={{ display: "grid", gap: 10, marginTop: 22 }}>
                {stratItems.map((s) => (
                  <div key={s.n} style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, color: "var(--teal)", lineHeight: 1, minWidth: 22 }}>{s.n}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15.5 }}>{s.title}</span>
                        {s.foundation && <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--teal)", border: "1px solid rgba(45,212,191,0.4)", borderRadius: 999, padding: "2px 8px" }}>Fondation</span>}
                      </div>
                      <p style={{ margin: "5px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--cream-muted)" }}>{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {humanProducts.length > 0 && (
                <div style={{ marginTop: 30 }}>
                  <div style={{ ...kickerHint, marginBottom: 14 }}>Concrètement · ce que tu vas boire</div>
                  <div id="rb-products" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {humanProducts.map((id) => {
                      const h = PRODUCT_HUMAN[id];
                      return (
                        <div key={id} style={{ background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 14, padding: "15px 16px" }}>
                          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14.5 }}>{h.title}</div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--teal)", fontWeight: 600, marginTop: 3 }}>{PRODUCT_SHORT[id] ?? id}</div>
                          <div style={{ fontSize: 13, color: "var(--cream-muted)", marginTop: 6 }}>{h.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parlons vrai */}
              {selDailyNum != null && selectedProg && (
                <div style={{ marginTop: 30, background: "linear-gradient(180deg, rgba(197,248,42,0.06), rgba(19,24,32,0.5))", border: "1px solid rgba(197,248,42,0.24)", borderRadius: 16, padding: 24 }}>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 8 }}>Parlons vrai · les chiffres exacts</div>
                  <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 23, margin: "0 0 16px" }}>Tu dépenses <span style={{ color: "var(--lime)" }}>déjà cet argent</span></h3>
                  <div id="rb-anchortiles" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "var(--ink)", border: "1px solid var(--hair)", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.4px", textTransform: "uppercase", fontWeight: 700, color: "var(--cream-hint)" }}>Ta pause déjeuner</div>
                      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 38, marginTop: 8, lineHeight: 1 }}>{formatEur(LUNCH_AVG_EUR)}</div>
                      <div style={{ fontSize: 12, color: "var(--cream-muted)", marginTop: 6 }}>Coût moyen d'un déjeuner en France — enquête <strong style={{ color: "var(--cream)" }}>Edenred / Ifop</strong>. Un seul repas, et faim à 16 h.</div>
                    </div>
                    <div style={{ background: "var(--ink)", border: "1.5px solid rgba(45,212,191,0.5)", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 11, letterSpacing: "0.4px", textTransform: "uppercase", fontWeight: 700, color: "var(--teal)" }}>Ta routine {selName} · / jour</div>
                      <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 38, marginTop: 8, lineHeight: 1, ...gradText }}>{selPerDay}</div>
                      <div style={{ fontSize: 12, color: "var(--cream-muted)", marginTop: 6 }}>Ton petit-déj complet + ton hydratation + ton boost. Toute la journée.</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowBreakdown((v) => !v)} style={{ marginTop: 14, background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--teal)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {showBreakdown ? "Masquer le détail du calcul ▲" : "Voir le détail du calcul (produit par produit) ▾"}
                  </button>
                  {showBreakdown && (
                    <div style={{ marginTop: 12, background: "var(--ink)", border: "1px solid var(--hair)", borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 12.5, color: "var(--cream-muted)", marginBottom: 12, lineHeight: 1.5 }}>On ne divise pas le pack par une durée au hasard. Le <strong style={{ color: "var(--cream)" }}>€/jour = le prix de chaque produit ÷ le nombre de jours qu'il tient à la dose conseillée</strong>, additionné. Chaque produit tient une durée différente.</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {breakdown.map((b) => (
                          <div key={b.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, paddingBottom: 8, borderBottom: "1px solid var(--hair)" }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{b.name}</span>
                            <span style={{ fontSize: 12, color: "var(--cream-hint)", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>tient {b.days}</span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--lime)", minWidth: 78, textAlign: "right" }}>{b.perDay} / j</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, paddingTop: 4 }}>
                          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700 }}>Total {selName}</span>
                          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 800, color: "var(--teal)" }}>{selPerDay} / jour</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--cream-hint)", marginTop: 12 }}>Durées réelles à la dose prescrite. Prix produits issus du catalogue.</div>
                    </div>
                  )}
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--cream)", margin: "16px 0 0" }}>{anchorLine}</p>
                </div>
              )}
            </section>

            {/* ══ ACTE 3 · TES FORMULES ══ */}
            <section id="formules" style={{ scrollMarginTop: 80 }}>
              <div style={{ ...acteEyebrow, marginBottom: 12 }}>Acte 3 — Tes formules</div>
              <h2 style={h2Sec}>Le programme qui te correspond</h2>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--cream-muted)", maxWidth: 580, margin: 0 }}>Plusieurs niveaux. On démarre où tu te sens prêt·e, et on fait évoluer ton pack selon tes résultats. Clique pour comparer — ta sélection et son €/jour se mettent à jour partout.</p>

              <div id="rb-programs" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 22 }}>
                {programmes.map((p) => {
                  const on = selected === p.id;
                  const reco = p.id === recoId;
                  const d = dailyByProgram.get(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => setSelected(p.id)} style={{
                      background: on ? "linear-gradient(180deg, rgba(45,212,191,0.12), rgba(19,24,32,0.9))" : "var(--ink2)",
                      border: on ? "1.5px solid var(--teal)" : reco ? "1px solid rgba(197,248,42,0.4)" : "1px solid var(--hair)",
                      borderRadius: 16, padding: reco ? "26px 18px 18px" : 18, cursor: "pointer", textAlign: "left", width: "100%",
                      display: "flex", flexDirection: "column", position: "relative", color: "var(--cream)",
                    }}>
                      {reco && <div style={{ position: "absolute", top: -10, left: 16, background: GRAD, color: "#06241f", fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 10.5, letterSpacing: "0.5px", padding: "4px 11px", borderRadius: 999, whiteSpace: "nowrap" }}>★ RECOMMANDÉ</div>}
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--cream-muted)" }}>{PROGRAMME_SUBTITLE_BY_ID[p.id] ?? "Pour aller plus loin"}</div>
                      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 19, marginTop: 3 }}>{prettyProgramName(p.name)}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "10px 0 2px" }}>
                        <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 34, lineHeight: 1 }}>{p.price}</span>
                        <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, color: "var(--teal)" }}>€</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--cream-muted)", marginBottom: 12, minHeight: 15 }}>{d != null ? <>soit <strong style={{ color: "var(--lime)" }}>{formatEur(d)}</strong> / jour</> : null}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                        {p.products.map((pr) => (
                          <div key={pr.id} style={{ fontSize: 13, color: "var(--cream)", display: "flex", gap: 7 }}><span style={{ color: "var(--teal)" }}>•</span>{PRODUCT_SHORT[pr.id] ?? pr.name}</div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: on ? "var(--teal)" : "var(--cream-hint)" }}>{on ? "✓ Sélectionné" : "Choisir cette formule"}</div>
                    </button>
                  );
                })}
              </div>

              {/* Add-on */}
              {addOn && (() => {
                const price = priceById.get(addOn.productId);
                const perDay = price !== undefined ? dailyCost([addOn.productId], priceById) : null;
                return (
                  <div style={{ marginTop: 14, background: "linear-gradient(180deg, rgba(197,248,42,0.07), transparent)", border: "1px solid rgba(197,248,42,0.3)", borderRadius: 16, padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: "rgba(197,248,42,0.12)", border: "1px solid rgba(197,248,42,0.3)" }}>
                      <LineIcon d={ICON.moon} size={19} color="var(--lime)" />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--lime)" }}>Suivant tes réponses</div>
                      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, margin: "4px 0 6px" }}>On te conseille aussi <span style={{ color: "var(--lime)" }}>{addOn.title}</span></div>
                      <p style={{ margin: "0 0 6px", fontSize: 14, fontStyle: "italic", color: "var(--teal)" }}>« {addOn.reason} »</p>
                      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--cream-muted)" }}>{addOn.benefit}{perDay != null && <> <strong style={{ color: "var(--lime)" }}>{formatEur(perDay)} / jour</strong>, à ajouter si tu le souhaites.</>}</p>
                    </div>
                  </div>
                );
              })()}

              {/* WE DO TRANSFORMATIONS */}
              <div style={{ marginTop: 40 }}>
                <div style={{ ...kickerHint, marginBottom: 6 }}>Tu ne démarres pas seul</div>
                <p style={{ fontSize: 15, color: "var(--cream-muted)", maxWidth: 560, margin: "0 0 16px" }}>Un programme, tout le monde peut t'en vendre un. Ce qui change tout, c'est ce qui se passe les semaines suivantes. En démarrant, tu rejoins <strong style={{ color: "var(--cream)" }}>We Do Transformations</strong>.</p>
                <div style={{ background: "linear-gradient(135deg, rgba(45,212,191,0.12), rgba(197,248,42,0.08))", border: "1px solid rgba(197,248,42,0.32)", borderRadius: 18, padding: 26, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 6 }}>Le Challenge We Do · 21 jours</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 52, lineHeight: 0.9, ...gradText }}>10 000 $</span>
                      <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--cream)" }}>en jeu</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "var(--cream)" }}>…pour les <strong style={{ color: "var(--lime)" }}>10 plus belles transformations</strong>. 3 semaines pour changer, tous niveaux — nutrition + activité, guidé jour après jour.</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 240, background: "var(--ink)", border: "1px solid var(--hair)", borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <LineIcon d={ICON.phone} size={18} />
                      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 14.5 }}>L'appli We Do, dans ta poche</div>
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.5, color: "var(--cream-muted)" }}>Ton suivi, tes conseils du jour, ton évolution. <strong style={{ color: "var(--cream)" }}>Incluse — pas une option.</strong></p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {communityStats.map((s) => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, color: "var(--teal)", lineHeight: 1 }}>{s.n}</div>
                          <div style={{ fontSize: 10.5, color: "var(--cream-hint)", marginTop: 3, lineHeight: 1.2 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div id="rb-why" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                  {WHY.map((w) => (
                    <div key={w.title} style={{ background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 14, padding: 18 }}>
                      <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15 }}>{w.title}</div>
                      <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--cream-muted)" }}>{w.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Témoignages (gardés — masqués si aucun avis validé, garde-fou §9.5) */}
              <div style={{ marginTop: hasTestimonials ? 40 : 0 }}>
                {hasTestimonials && <div style={{ ...kickerHint, marginBottom: 14 }}>Ils l'ont fait avant toi</div>}
                <TestimonialsCarousel variant="business" coachId={coach.userId ?? undefined} limit={3} onLoaded={(n) => setHasTestimonials(n > 0)} />
              </div>

              {/* FAQ */}
              <div style={{ marginTop: 40 }}>
                <div style={{ ...kickerHint, marginBottom: 14 }}>Tout est clair ?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {faqData.map((f, i) => {
                    const open = openFaq === i;
                    return (
                      <button key={f.q} type="button" onClick={() => setOpenFaq(open ? -1 : i)} style={{ textAlign: "left", width: "100%", background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 12, padding: "15px 18px", cursor: "pointer", color: "var(--cream)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 14.5 }}>{f.q}</span>
                          <span style={{ color: "var(--teal)", fontSize: 18, lineHeight: 1 }}>{open ? "−" : "+"}</span>
                        </div>
                        {open && <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--cream-muted)" }}>{f.a}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ══ DÉMARRER ══ */}
            <section id="demarrer" style={{ scrollMarginTop: 80 }}>
              <div style={{ textAlign: "center", background: "linear-gradient(180deg, rgba(45,212,191,0.1), rgba(19,24,32,0.6))", border: "1px solid var(--hair-strong)", borderRadius: 20, padding: "40px 28px" }}>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "clamp(24px, 3vw, 32px)", lineHeight: 1.12, margin: "0 0 12px" }}>Prêt·e à démarrer, <span style={{ color: "var(--teal)" }}>{firstName || "toi"}</span> ?</h2>
                <p style={{ fontSize: 15.5, color: "var(--cream-muted)", maxWidth: 440, margin: "0 auto 22px" }}>{selectedProg ? <>Ton choix : <strong style={{ color: "var(--cream)" }}>{selName} · {selectedProg.price} €</strong> {selPerDay && <span style={{ color: "var(--cream-hint)" }}>({selPerDay}/jour)</span>}. On démarre quand tu veux.</> : <>On démarre quand tu veux. La première étape, c'est juste un échange.</>}</p>

                {paidConfirmed ? (
                  <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "left", background: "rgba(45,212,191,0.1)", border: "1px solid rgba(45,212,191,0.35)", borderRadius: 14, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 15 }}>
                      <LineIcon d={ICON.check} size={20} /> Paiement reçu, merci {firstName} !
                    </div>
                    <p style={{ margin: "10px 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--cream-muted)" }}>C'est officiel, tu démarres. Encore 2 minutes pour finaliser ton inscription et tu es prêt·e. Bienvenue !</p>
                    <button type="button" onClick={() => navigate(`/qualif/${token}`)} style={{ ...gradBtn, width: "100%", padding: 15, fontSize: 15 }}>Continuer mon inscription →</button>
                  </div>
                ) : justPaid ? (
                  <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "left", background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 14, padding: 20, fontSize: 14, color: "var(--cream-muted)" }}>
                    <div style={{ fontWeight: 700, color: "var(--cream)", fontSize: 15, marginBottom: 6 }}>On finalise ton paiement…</div>
                    On confirme ton règlement <strong style={{ color: "var(--cream)" }}>Square</strong>. {coachName} revient vers toi tout de suite pour ton programme, ta saveur et ta première pesée.
                  </div>
                ) : started ? (
                  <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "left", background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 14, padding: 20, fontSize: 14, color: "var(--cream-muted)" }}>
                    <div style={{ fontWeight: 700, color: "var(--cream)", fontSize: 15, marginBottom: 6 }}>Super, {firstName} !</div>
                    {coachName} va t'envoyer ton lien de paiement sécurisé pour finaliser {selectedProg ? <>ton pack <strong style={{ color: "var(--cream)" }}>{selName}</strong></> : "ton démarrage"}. Réponds simplement à son message.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                    <button type="button" disabled={payLoading} onClick={() => void startCheckout(selected)} style={{ ...gradBtn, width: "100%", maxWidth: 340, padding: "16px 24px", fontSize: 16, boxShadow: "0 8px 22px rgba(197,248,42,0.28)", opacity: payLoading ? 0.6 : 1, cursor: payLoading ? "wait" : "pointer" }}>{payLoading ? "Ouverture de la caisse…" : "Je démarre mon programme →"}</button>
                    {callbackState === "done" ? (
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--teal)" }}>✓ C'est noté — {coachName} te recontacte.</div>
                    ) : (
                      <>
                        <div style={{ fontSize: 12.5, color: "var(--cream-hint)" }}>Pas encore décidé·e ?</div>
                        <button type="button" disabled={callbackState === "sending"} onClick={() => void requestCallback()} style={{ maxWidth: 280, padding: "11px 20px", background: "transparent", color: "var(--cream-muted)", border: "1px solid var(--hair-strong)", borderRadius: 12, fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer", opacity: callbackState === "sending" ? 0.6 : 1 }}>{callbackState === "sending" ? "Envoi…" : `Fais-toi rappeler par ${coachName}`}</button>
                      </>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--cream-hint)", marginTop: 22 }}>Une question ? Réponds simplement au message de {coachName}, il·elle est là.</div>
              </div>
            </section>
          </main>

          {/* ══ RAIL DE DÉCISION ══ */}
          <aside id="rb-rail" style={{ position: "sticky", top: 84 }}>
            <div style={{ background: "var(--ink2)", border: "1px solid var(--hair-strong)", borderRadius: 18, padding: 22, boxShadow: "0 18px 50px -20px rgba(0,0,0,0.75)" }}>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "var(--teal)" }}>Ta sélection</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, margin: "6px 0 2px" }}>{selName}</div>
              <div style={{ fontSize: 12.5, color: "var(--cream-muted)" }}>{selSubtitle}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5, margin: "16px 0 2px" }}>
                <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 44, lineHeight: 1 }}>{selectedProg?.price ?? "—"}</span>
                <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, color: "var(--teal)" }}>€</span>
              </div>
              {selPerDay && <div style={{ fontSize: 13, color: "var(--cream-muted)" }}>soit <strong style={{ color: "var(--lime)" }}>{selPerDay}</strong> / jour · {selVsLunch}</div>}
              <div style={{ height: 1, background: "var(--hair)", margin: "18px 0" }} />
              {paidConfirmed ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 14, color: "var(--teal)", marginBottom: 14 }}>
                    <LineIcon d={ICON.check} size={18} />Paiement reçu
                  </div>
                  <button type="button" onClick={() => navigate(`/qualif/${token}`)} style={{ ...gradBtn, width: "100%", padding: 14, borderRadius: 12, fontSize: 14.5 }}>Continuer mon inscription →</button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button type="button" disabled={payLoading} onClick={() => void startCheckout(selected)} style={{ ...gradBtn, width: "100%", padding: 15, borderRadius: 12, fontSize: 15, boxShadow: "0 8px 22px rgba(197,248,42,0.25)", opacity: payLoading ? 0.6 : 1, cursor: payLoading ? "wait" : "pointer" }}>{payLoading ? "Ouverture…" : "Je démarre →"}</button>
                  {callbackState === "done" ? (
                    <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "var(--teal)" }}>✓ {coachName} te recontacte</div>
                  ) : (
                    <button type="button" disabled={callbackState === "sending"} onClick={() => void requestCallback()} style={{ width: "100%", padding: 11, background: "transparent", color: "var(--cream-muted)", border: "1px solid var(--hair-strong)", borderRadius: 12, fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: callbackState === "sending" ? 0.6 : 1 }}>{callbackState === "sending" ? "Envoi…" : "Fais-toi rappeler"}</button>
                  )}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 16, fontSize: 11.5, color: "var(--cream-hint)" }}>
                <LineIcon d={ICON.lock} size={13} color="currentColor" />Paiement sécurisé · Square
              </div>
            </div>
            <div style={{ marginTop: 12, background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 14, padding: "14px 16px", fontSize: 12.5, color: "var(--cream-muted)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--cream)" }}>L'appli We Do Transformations incluse</strong> + le challenge 21 jours (10 000 $ en jeu). Compris dès ton démarrage.
            </div>
          </aside>
        </div>

        {/* ══ ET APRÈS ══ */}
        <section style={{ borderTop: "1px solid var(--hair)", background: "rgba(19,24,32,0.4)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px 56px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 26 }}>
              <div>
                <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "var(--lime)", marginBottom: 8 }}>Et juste après ton paiement</div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 26, margin: 0 }}>2 minutes pour finaliser, et tu es lancé·e</h2>
              </div>
              <div style={{ fontSize: 13, color: "var(--cream-hint)", maxWidth: 320 }}>Tout est guidé sur <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--teal)" }}>/qualif</span> — self-serve, ta fiche se crée toute seule. {coachName} est notifié à chaque étape.</div>
            </div>
            <div id="rb-qualif" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {qualifSteps.map((q) => (
                <div key={q.n} style={{ background: "var(--ink2)", border: "1px solid var(--hair)", borderRadius: 16, padding: "20px 18px" }}>
                  <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 15, color: "#06241f", background: "linear-gradient(135deg, var(--teal), var(--lime))", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>{q.n}</div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, margin: "14px 0 6px" }}>{q.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--cream-muted)" }}>{q.text}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--cream-hint)", marginTop: 32 }}>La Base 360 — Ce bilan est personnel et confidentiel.</div>
          </div>
        </section>

        {/* ══ BARRE PAIEMENT MOBILE ══ */}
        <div id="rb-mobilebar" style={{ display: "none", position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70, background: "rgba(11,13,17,0.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderTop: "1px solid var(--hair-strong)", padding: "11px 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 640, margin: "0 auto" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selName} · <strong style={{ color: "var(--cream)" }}>{selectedProg?.price ?? "—"} €</strong></div>
              <div style={{ fontSize: 11, color: "var(--cream-hint)" }}>{selPerDay ? `${selPerDay} / jour · ` : ""}Square sécurisé</div>
            </div>
            {paidConfirmed ? (
              <button type="button" onClick={() => navigate(`/qualif/${token}`)} style={{ ...gradBtn, padding: "13px 20px", borderRadius: 12, fontSize: 14, whiteSpace: "nowrap" }}>Continuer →</button>
            ) : (
              <button type="button" disabled={payLoading} onClick={() => void startCheckout(selected)} style={{ ...gradBtn, padding: "13px 22px", borderRadius: 12, fontSize: 14, whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(197,248,42,0.28)", opacity: payLoading ? 0.6 : 1 }}>{payLoading ? "…" : "Je démarre →"}</button>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

// ─── Rendu picto ligne : une seule <path> (les sous-tracés M…M… suffisent) ──
function LineIcon({ d, size = 22, color = PUBLIC_TOKENS.teal }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ display: "block" }}>
      <path d={d} />
    </svg>
  );
}
// ─── Pictos ligne (24×24) réutilisés (identité v2, remplace les emojis) ──────
const ICON = {
  cup: "M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z M17 9h1.5a2.5 2.5 0 0 1 0 5H17 M6 2v3 M10 2v3 M14 2v3",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2",
  plate: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z",
  droplet: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  dumbbell: "M6.5 8v8 M4 6v12 M17.5 8v8 M20 6v12 M6.5 12h11",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8z",
  moon: "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z",
  plus: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v8 M8 12h8",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M20 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  hands: "M11 13.5 8 16a2 2 0 0 1-3-3l5-5 M13 10.5 16 8a2 2 0 0 1 3 3l-5 5 M8 12l-3 3 M16 12l3-3",
  phone: "M7 2h10v20H7z M11 18h2",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  chat: "M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  puzzle: "M11 4a2 2 0 1 1 4 0v3h3a1 1 0 0 1 1 1v3a2 2 0 1 1 0 4v3a1 1 0 0 1-1 1h-3a2 2 0 1 0-4 0H8a1 1 0 0 1-1-1v-3a2 2 0 1 1 0-4V8a1 1 0 0 1 1-1h3z",
  check: "M20 6 9 17l-5-5",
} as const;

// ─── Stratégies ADAPTÉES à l'objectif du bilan (V2 2026-07-09) ────────────────
// Fini le contenu 100 % perte de poids : on sert le set qui colle au 1ᵉʳ
// objectif du prospect. Fallback = weight_loss.
type Strat = { title: string; icon: string; foundation?: boolean; problem: string; solutionLabel?: string; solution?: string };
const STRATEGY_SETS: Record<string, { intro: string; items: Strat[] }> = {
  weight_loss: {
    intro: "Souvent, ce sont les petits ajustements qui font les plus grands changements. On commence par les fondations — sans t'affamer.",
    items: [
      { title: "Le petit-déjeuner", icon: ICON.cup, foundation: true, problem: "Un petit-déj pauvre en protéines ralentit ton métabolisme dès le matin.", solutionLabel: "La solution :", solution: "un petit-déj sous forme de boisson nutritionnelle calibrée — protéines, vitamines, calories maîtrisées." },
      { title: "Les collations", icon: ICON.clock, foundation: true, problem: "Les coups de mou de l'après-midi viennent souvent d'un en-cas absent ou trop sucré.", solutionLabel: "L'idéal :", solution: "10 g de protéines + ~150 kcal + un fruit, entre les repas." },
      { title: "L'assiette équilibrée", icon: ICON.plate, problem: "Midi : ¼ protéines · ¼ glucides complexes · ½ légumes + un filet d'huile d'olive. Soir : protéines + légumes, on allège les glucides." },
      { title: "L'hydratation", icon: ICON.droplet, problem: "≥ 2 L par jour (eau, infusions, thés non sucrés). Ça soutient la digestion et calme les fringales." },
      { title: "L'activité physique", icon: ICON.pulse, problem: "Pas besoin de t'épuiser : 30 min de marche par jour, en une fois ou en sessions de 10-15 min." },
    ],
  },
  mass_gain: {
    intro: "Prendre de la masse propre, ce n'est pas manger n'importe quoi : c'est un surplus maîtrisé, des protéines bien réparties et de la récup.",
    items: [
      { title: "Des protéines à chaque repas", icon: ICON.dumbbell, foundation: true, problem: "Sans apport protéique régulier, le muscle ne se construit pas.", solutionLabel: "La cible :", solution: "1,6 à 2 g de protéines par kg de poids, réparties sur la journée (dont un shake si besoin)." },
      { title: "Un surplus calorique maîtrisé", icon: ICON.bolt, foundation: true, problem: "Trop peu = pas de prise ; trop = du gras inutile.", solutionLabel: "L'idéal :", solution: "+250 à +400 kcal/jour de qualité, ajustés selon la balance." },
      { title: "Le shake post-entraînement", icon: ICON.cup, problem: "La fenêtre après la séance est clé : protéines + glucides pour relancer la construction musculaire." },
      { title: "La récupération & le sommeil", icon: ICON.moon, problem: "Le muscle se construit au repos, pas à la salle : vise 7-8 h de sommeil régulier." },
      { title: "La surcharge progressive", icon: ICON.pulse, problem: "Augmente progressivement charges ou répétitions : c'est ce qui force le corps à grossir." },
    ],
  },
  energy: {
    intro: "Retrouver de l'énergie, c'est surtout mieux dormir, mieux s'hydrater et éviter les pics de sucre. On pose les fondations.",
    items: [
      { title: "Un sommeil régulier", icon: ICON.moon, foundation: true, problem: "Des horaires de coucher irréguliers cassent ta récup.", solutionLabel: "La base :", solution: "des horaires stables et 7-8 h de sommeil — le socle de l'énergie." },
      { title: "L'hydratation", icon: ICON.droplet, foundation: true, problem: "La déshydratation, même légère, se ressent direct en fatigue et brouillard mental.", solutionLabel: "La cible :", solution: "≥ 2 L par jour, dès le réveil." },
      { title: "Un petit-déj sans pic de sucre", icon: ICON.cup, problem: "Un petit-déj trop sucré = coup de barre 2 h après. On mise sur les protéines pour une énergie stable." },
      { title: "La micronutrition", icon: ICON.plus, problem: "Vitamines et minéraux comblent les carences qui plombent l'énergie au quotidien." },
      { title: "Bouger & la lumière du jour", icon: ICON.pulse, problem: "Un peu de marche + de la lumière naturelle relancent ton horloge et ton tonus." },
    ],
  },
  perf_pro: {
    intro: "Performer sans coup de barre, c'est une énergie stable toute la journée : petit-déj solide, pas de crash, hydratation, sommeil.",
    items: [
      { title: "Un petit-déjeuner qui tient", icon: ICON.cup, foundation: true, problem: "Un petit-déj léger ou sucré = énergie en dents de scie dès la matinée.", solutionLabel: "La solution :", solution: "un petit-déj protéiné (boisson calibrée) pour une énergie stable jusqu'au midi." },
      { title: "Éviter le crash de 15 h", icon: ICON.clock, foundation: true, problem: "Le coup de barre de l'après-midi te coûte ta concentration.", solutionLabel: "L'astuce :", solution: "une collation structurée (protéines + fruit) avant le creux." },
      { title: "L'hydratation = ton focus", icon: ICON.droplet, problem: "Ta concentration chute vite en état de déshydratation. Garde une bouteille à portée, tout le temps." },
      { title: "Le sommeil, c'est de la décision", icon: ICON.moon, problem: "La récup cognitive se joue la nuit : 7-8 h, c'est ce qui te garde net et lucide." },
      { title: "Des micro-pauses actives", icon: ICON.pulse, problem: "Bouger 5 min toutes les 1-2 h relance la circulation et l'attention." },
    ],
  },
};
function pickStrategies(objectives: string[] | undefined) {
  const o = objectives?.[0];
  if (o === "mass_gain") return STRATEGY_SETS.mass_gain;
  if (o === "perf_pro") return STRATEGY_SETS.perf_pro;
  if (o === "energy" || o === "sleep" || o === "wellbeing") return STRATEGY_SETS.energy;
  return STRATEGY_SETS.weight_loss;
}

// Sous-titre par ID de programme (robuste : survit à l'ordre + aux nouveaux
// programmes, ex. sport, contrairement à un index positionnel).
const PROGRAMME_SUBTITLE_BY_ID: Record<string, string> = {
  starter: "Pour démarrer en douceur",
  premium: "Le choix le plus complet",
  "booster-1": "Pour accélérer",
  "booster-2": "Pour pousser plus loin",
};

// Note (2026-07-18) : les cartes « communauté » et « challenge 21 jours » ont
// été retirées d'ici — elles font désormais l'objet de la section We Do
// Transformations dédiée (logo + 10 000 $ + vidéo appli), pour ne pas répéter.
const WHY = [
  { icon: ICON.hands, title: "On le fait ensemble", body: "Pas de PDF lâché dans la nature. On ajuste ton plan au fil des semaines, selon tes résultats et ta vie — je suis là à chaque étape." },
  { icon: ICON.chart, title: "Un suivi qui se voit", body: "Pesées, mensurations, courbe d'évolution : on mesure pour célébrer chaque progrès, pas pour culpabiliser." },
] as const;

// ─── CSS scopé de l'entonnoir (structure + responsive) ───────────────────────
// CSS scopé = la balise <style> de la maquette (ids identiques) + les 2 vars
// manquantes (--ink2, --lime) que public-shell.css ne définit pas. Responsive
// géré via ces media queries (le style inline ne peut pas les porter).
const RB_CSS = `
.public-shell{--ink2:#131820;--lime:#c5f82a}
#rb-nav::-webkit-scrollbar{display:none}
@keyframes rb-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (max-width: 900px){
  #rb-grid{grid-template-columns:1fr !important;gap:30px !important;padding-bottom:132px !important}
  #rb-rail{display:none !important}
  #rb-selpill{display:none !important}
  #rb-nav{overflow-x:auto;-webkit-overflow-scrolling:touch}
  #rb-stats,#rb-qualif{grid-template-columns:repeat(2, 1fr) !important}
  #rb-products,#rb-programs,#rb-why{grid-template-columns:1fr !important}
  #rb-mobilebar{display:block !important}
}
@media (max-width: 560px){
  #rb-stats,#rb-qualif,#rb-anchortiles{grid-template-columns:1fr !important}
}
`;
