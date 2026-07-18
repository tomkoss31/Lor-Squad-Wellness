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
  publicGradText,
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
import { TELEGRAM_GROUP_URL } from "../lib/telegram";

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

// Les 4 étapes réelles du parcours /qualif (bandeau « Et après »).
const QUALIF_STEPS = [
  { n: "1", t: "Ton identité", d: "Quelques infos + accord RGPD. Ta fiche se crée toute seule." },
  { n: "2", t: "Tes saveurs", d: "Tu choisis tes saveurs Formula 1, Thé et Aloé." },
  { n: "3", t: "Ton point de départ", d: "L'appli We Do + ta première pesée." },
  { n: "4", t: "La communauté", d: "Tu rejoins le groupe et tu ouvres ton espace." },
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

  const { bilan, coach, programmes } = data;
  const selectedProg = programmes.find((p) => p.id === selected) ?? null;
  const paidConfirmed = data.paid === true; // preuve serveur (bilan_orders payé)
  const selectedDaily = selected ? dailyByProgram.get(selected) ?? null : null;

  // Formule recommandée (pastille ★) — même logique que la présélection au
  // chargement : la formule qui contient l'add-on détecté, sinon Premium,
  // sinon la 1ʳᵉ. Indépendant de la sélection courante de l'utilisateur.
  const recoMatch = addOn
    ? programmes.find((p) => p.products.some((pr) => pr.id === addOn.productId))
    : undefined;
  const recoId = recoMatch?.id ?? programmes.find((p) => p.id === "premium")?.id ?? programmes[0]?.id ?? null;

  // Produits en langage humain (union ordonnée sur toutes les formules).
  const seenHuman = new Set<string>();
  const humanProducts: string[] = [];
  for (const p of programmes) {
    for (const pr of p.products) {
      if (!seenHuman.has(pr.id) && PRODUCT_HUMAN[pr.id]) {
        seenHuman.add(pr.id);
        humanProducts.push(pr.id);
      }
    }
  }

  // Détail du calcul €/jour de la formule sélectionnée (produit par produit),
  // pour le dépliant « Voir le détail du calcul ».
  const breakdown = selectedProg
    ? selectedProg.products.map((pr) => {
        const days = PRODUCT_DAYS[pr.id];
        const price = priceById.get(pr.id);
        const perDay = days && price !== undefined ? price / days : null;
        return { id: pr.id, name: PRODUCT_SHORT[pr.id] ?? pr.name, days: days ?? null, perDay };
      })
    : [];

  // Actions du panneau de décision — partagées entre le rail desktop et (en
  // partie) la barre mobile. Appellent les handlers existants (startCheckout /
  // requestCallback), états caisse inchangés.
  const railActions = paidConfirmed ? (
    <>
      <div style={{ ...bodyText, fontSize: 14, fontWeight: 600, color: PUBLIC_TOKENS.teal, marginBottom: 12 }}>
        ✓ Paiement reçu, merci {firstName} !
      </div>
      <button
        type="button"
        onClick={() => navigate(`/qualif/${token}`)}
        style={{ ...ctaPrimary, width: "100%", justifyContent: "center" }}
      >
        Continuer mon inscription →
      </button>
    </>
  ) : (
    <>
      <button
        type="button"
        disabled={payLoading}
        onClick={() => void startCheckout(selected)}
        style={{ ...ctaPrimary, width: "100%", justifyContent: "center", opacity: payLoading ? 0.6 : 1, cursor: payLoading ? "wait" : "pointer" }}
      >
        {payLoading ? "Ouverture…" : "Je démarre →"}
      </button>
      {callbackState === "done" ? (
        <div style={{ ...bodyText, fontSize: 13.5, fontWeight: 600, color: PUBLIC_TOKENS.teal, marginTop: 10, textAlign: "center" }}>
          ✓ {coach.name} te recontacte.
        </div>
      ) : (
        <button
          type="button"
          disabled={callbackState === "sending"}
          onClick={() => void requestCallback()}
          style={{
            width: "100%",
            marginTop: 10,
            fontFamily: PUBLIC_FONTS.display,
            fontWeight: 600,
            fontSize: 14.5,
            color: "var(--cream)",
            background: "transparent",
            border: "1px solid var(--hair-strong)",
            borderRadius: 14,
            padding: "13px 20px",
            cursor: callbackState === "sending" ? "wait" : "pointer",
            opacity: callbackState === "sending" ? 0.6 : 1,
          }}
        >
          {callbackState === "sending" ? "Envoi…" : "Fais-toi rappeler"}
        </button>
      )}
    </>
  );

  const secTitleWrap: React.CSSProperties = { ...secTitle };

  return (
    // maxWidth:none → on casse la contrainte 560px de .ps-shell : cette page est
    // en pleine largeur (header + grille 1fr/344px + bandeau), pas mono-colonne.
    <PublicShell defaultTheme="dark" style={{ maxWidth: "none", width: "100%" }}>
      <style>{RB_CSS}</style>

      {/* ── HEADER collant : logo · menu chapitre (scrollspy) · pastille sélection ── */}
      <header className="rb-header">
        <div className="rb-header-inner">
          <div className="rb-logo">LA&nbsp;BASE&nbsp;<span style={{ color: PUBLIC_TOKENS.teal }}>360</span></div>
          <nav className="rb-chapters" aria-label="Chapitres">
            {CHAPTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={"rb-chapter" + (activeChapter === c.id ? " is-active" : "")}
                onClick={() => scrollToId(c.id)}
              >
                {c.label}
              </button>
            ))}
          </nav>
          {selectedProg && (
            <span className="rb-selpill">
              <span className="rb-dot" /> Ta sélection ·{" "}
              <strong>{prettyProgramName(selectedProg.name)} · {selectedProg.price} €</strong>
            </span>
          )}
        </div>
      </header>

      {/* ── SHELL : MAIN (contenu) + ASIDE (rail collant) ── */}
      <div className="rb-shell">
        <main className="rb-main">
          {/* ═══ ACTE 1 · TON BILAN ═══ */}
          <section id="bilan" style={{ scrollMarginTop: 92, paddingTop: 28 }}>
            <div style={eyebrow}>— Acte 1 — Analyse personnalisée</div>
            <h1 style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 800, fontSize: "clamp(30px,5.4vw,46px)", lineHeight: 1.08, letterSpacing: "-1px", margin: "14px 0 4px", color: "var(--cream)" }}>
              Salut {firstName || "à toi"}, voici ce que{" "}
              <span style={publicGradText}>ton bilan révèle.</span>
            </h1>
            <p style={{ ...bodyMuted, fontSize: 16.5, maxWidth: 560, marginTop: 16 }}>
              Tu as pris le temps de faire ton bilan — c'est déjà un vrai pas. Voici ta lecture
              perso, et le plan que {coach.name} te propose. Tout est déjà calé sur ce que tu as
              répondu.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 22 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: PUBLIC_TOKENS.gradCta, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PUBLIC_FONTS.display, fontWeight: 700, color: "#06241f" }}>
                {coach.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--cream)" }}>Préparé par {coach.name}</div>
                <div style={{ ...bodyMuted, fontSize: 13 }}>Coach bien-être · La Base 360</div>
              </div>
            </div>

            <div className="rb-stats">
              {primaryObjective && (
                <div style={{ ...card, padding: 16 }}>
                  <div style={{ ...bodyMuted, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 600 }}>Objectif</div>
                  <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 18, marginTop: 6, color: PUBLIC_TOKENS.teal }}>{primaryObjective}</div>
                </div>
              )}
              {bilan.currentWeightKg != null && <StatCard label="Poids actuel" value={`${bilan.currentWeightKg} kg`} />}
              {bilan.weightLossTargetKg != null && (
                <div style={{ ...card, padding: 16 }}>
                  <div style={{ ...bodyMuted, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 600 }}>Objectif poids</div>
                  <div style={{ fontFamily: PUBLIC_FONTS.impact, fontWeight: 400, fontSize: 22, marginTop: 6, color: PUBLIC_TOKENS.lime }}>−{bilan.weightLossTargetKg} kg</div>
                </div>
              )}
              {bilan.motivationScore != null && <StatCard label="Ta motivation" value={`${bilan.motivationScore} / 10`} />}
            </div>

            <div style={{ ...card, marginTop: 16, border: `1px solid ${withA(PUBLIC_TOKENS.teal, 0.3)}`, background: `linear-gradient(180deg, ${withA(PUBLIC_TOKENS.teal, 0.08)}, ${withA(PUBLIC_TOKENS.lime, 0.03)})` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                <IconBadge d={ICON.spark} />
                <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 15, color: PUBLIC_TOKENS.teal }}>L'analyse de Noaly</div>
              </div>
              {bilan.aiAnalysis ? (
                <>
                  <p style={{ ...bodyText, whiteSpace: "pre-wrap" }}>{bilan.aiAnalysis}</p>
                  <div style={{ ...bodyMuted, fontSize: 12, marginTop: 12 }}>Lecture générée à partir de ton bilan · validée par ton coach</div>
                </>
              ) : (
                <p style={bodyText}>
                  {coach.name} prépare ta lecture personnalisée à partir de ton bilan — tu la recevras
                  lors de votre échange. En attendant, voici tes fondations et les formules ci-dessous.
                </p>
              )}
            </div>
          </section>

          {/* ═══ ACTE 2 · TON PLAN ═══ */}
          <section id="plan" style={{ scrollMarginTop: 92, paddingTop: 52 }}>
            <div style={eyebrow}>— Acte 2 — Ton plan</div>
            <h2 style={secTitleWrap}>Tes 5 stratégies <span style={publicGradText}>essentielles</span></h2>
            <p style={{ ...bodyMuted, fontSize: 15.5, maxWidth: 580, marginBottom: 18 }}>{strategies.intro}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {strategies.items.map((s, i) => (
                <div key={s.title} style={{ ...card, padding: 18, display: "flex", gap: 14 }}>
                  <span style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 26, color: PUBLIC_TOKENS.teal, lineHeight: 1, flexShrink: 0, minWidth: 22 }}>{i + 1}</span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 15.5, color: "var(--cream)" }}>{s.title}</span>
                      {s.foundation && (
                        <span style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700, color: PUBLIC_TOKENS.teal, border: `1px solid ${withA(PUBLIC_TOKENS.teal, 0.4)}`, borderRadius: 999, padding: "2px 8px" }}>Fondation</span>
                      )}
                    </div>
                    <p style={{ ...bodyMuted, fontSize: 13.5, marginTop: 6 }}>
                      {s.problem}
                      {s.solution && (
                        <> <strong style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>{s.solutionLabel} </strong>{s.solution}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {humanProducts.length > 0 && (
              <>
                <h3 style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 18, color: "var(--cream)", margin: "34px 0 4px" }}>Ce que tu vas prendre</h3>
                <p style={{ ...bodyMuted, fontSize: 14.5, maxWidth: 560, marginBottom: 16 }}>Des gestes simples, à glisser dans ta journée. {coach.name} te montre comment.</p>
                <div className="rb-grid2">
                  {humanProducts.map((id) => {
                    const h = PRODUCT_HUMAN[id];
                    const price = priceById.get(id);
                    const d = price !== undefined ? dailyCost([id], priceById) : null;
                    return (
                      <div key={id} style={{ ...card, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 16, color: "var(--cream)" }}>{h.title}</div>
                        <p style={{ ...bodyMuted, fontSize: 14, margin: "2px 0 0" }}>{h.detail}</p>
                        {d != null && (
                          <div style={{ marginTop: "auto", paddingTop: 10, ...bodyText, fontSize: 13.5 }}>
                            <strong style={{ color: PUBLIC_TOKENS.lime }}>{formatEur(d)}</strong>
                            <span style={{ color: "var(--cream-muted)" }}> / jour</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* PARLONS VRAI — ancrage prix + dépliant calcul */}
            {selectedDaily != null && selectedProg && (
              <div style={{ ...card, marginTop: 20, padding: 22, border: `1px solid ${withA(PUBLIC_TOKENS.lime, 0.32)}`, background: `linear-gradient(135deg, ${withA(PUBLIC_TOKENS.teal, 0.08)}, ${withA(PUBLIC_TOKENS.lime, 0.04)})` }}>
                <div style={{ ...eyebrow, color: PUBLIC_TOKENS.lime, margin: 0 }}>Parlons vrai</div>
                <h3 style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 20, color: "var(--cream)", margin: "8px 0 12px" }}>Tu dépenses déjà cet argent</h3>
                <div className="rb-grid2" style={{ gap: 12 }}>
                  <div style={{ ...card, padding: 16 }}>
                    <div style={{ ...bodyMuted, fontSize: 11.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>Ta pause déjeuner</div>
                    <div style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 34, color: "var(--cream)", lineHeight: 1.1, marginTop: 6 }}>{formatEur(LUNCH_AVG_EUR)}</div>
                    <div style={{ ...bodyMuted, fontSize: 12, marginTop: 4 }}>Un seul repas.</div>
                  </div>
                  <div style={{ ...card, padding: 16, border: `1.5px solid ${withA(PUBLIC_TOKENS.lime, 0.5)}` }}>
                    <div style={{ ...bodyMuted, fontSize: 11.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600, color: PUBLIC_TOKENS.teal }}>Ton programme {prettyProgramName(selectedProg.name)}</div>
                    <div style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 34, lineHeight: 1.1, marginTop: 6, ...publicGradText }}>{formatEur(selectedDaily)}</div>
                    <div style={{ ...bodyMuted, fontSize: 12, marginTop: 4 }}>Ton petit-déj complet + ton hydratation de la journée.</div>
                  </div>
                </div>
                <p style={{ ...bodyMuted, fontSize: 12.5, marginTop: 12 }}>
                  8,30 € = coût moyen d'un déjeuner en France — enquête Edenred / Ifop.
                </p>
                <button type="button" onClick={() => setShowBreakdown((v) => !v)} style={{ ...linkBtn, marginTop: 8 }}>
                  {showBreakdown ? "Masquer le détail du calcul" : "Voir le détail du calcul →"}
                </button>
                {showBreakdown && (
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--hair)", paddingTop: 12 }}>
                    <p style={{ ...bodyMuted, fontSize: 12.5, marginBottom: 10 }}>
                      On ne divise pas le pack par une durée au hasard. On additionne le coût réel de
                      chaque produit à la dose conseillée :
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {breakdown.map((b) => (
                        <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, ...bodyMuted, fontSize: 13 }}>
                          <span style={{ color: "var(--cream)" }}>{b.name}{b.days != null ? <span style={{ color: "var(--cream-muted)" }}> · tient {Math.round(b.days)} j</span> : null}</span>
                          <span style={{ fontFamily: PUBLIC_FONTS.mono, color: "var(--cream)", whiteSpace: "nowrap" }}>{b.perDay != null ? `${formatEur(b.perDay)}/j` : "—"}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--hair)", fontWeight: 700 }}>
                        <span style={{ color: "var(--cream)" }}>Total</span>
                        <span style={{ fontFamily: PUBLIC_FONTS.mono, color: PUBLIC_TOKENS.lime }}>{formatEur(selectedDaily)}/jour</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ═══ ACTE 3 · TES FORMULES ═══ */}
          <section id="formules" style={{ scrollMarginTop: 92, paddingTop: 52 }}>
            <div style={eyebrow}>— Acte 3 — Tes formules</div>
            <h2 style={secTitleWrap}>Le programme qui <span style={publicGradText}>te correspond</span></h2>
            <p style={{ ...bodyMuted, fontSize: 15.5, maxWidth: 580, marginBottom: 20 }}>
              Plusieurs niveaux. On démarre où tu te sens prêt·e — clique pour comparer : ta sélection
              et son €/jour se mettent à jour partout.
            </p>

            <div className="rb-grid2">
              {programmes.map((p) => {
                const isSel = selected === p.id;
                const isReco = p.id === recoId;
                const d = dailyByProgram.get(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p.id)}
                    style={{
                      ...card,
                      textAlign: "left",
                      cursor: "pointer",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      border: isSel
                        ? `1.5px solid ${PUBLIC_TOKENS.teal}`
                        : isReco
                          ? `1px solid ${withA(PUBLIC_TOKENS.lime, 0.45)}`
                          : "1px solid var(--hair)",
                      background: isSel || isReco ? `linear-gradient(180deg, ${withA(PUBLIC_TOKENS.teal, 0.10)}, ${withA(PUBLIC_TOKENS.lime, 0.04)})` : card.background,
                    }}
                  >
                    {isReco && (
                      <div style={{ position: "absolute", top: -11, left: 18, background: PUBLIC_TOKENS.gradCta, color: "#06241f", fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: "4px 11px", borderRadius: 999 }}>★ RECOMMANDÉ</div>
                    )}
                    <div style={{ ...bodyMuted, fontSize: 12.5, fontWeight: 600 }}>{PROGRAMME_SUBTITLE_BY_ID[p.id] ?? "Pour aller plus loin"}</div>
                    <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 19, marginTop: 4, color: "var(--cream)" }}>{prettyProgramName(p.name)}</div>
                    <div style={{ margin: "12px 0 4px", display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 38, letterSpacing: 0.5, color: "var(--cream)", lineHeight: 1 }}>{p.price}</span>
                      <span style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 20, color: PUBLIC_TOKENS.teal, lineHeight: 1 }}>€</span>
                    </div>
                    {d != null ? (
                      <div style={{ marginBottom: 12, ...bodyMuted, fontSize: 12.5 }}>soit <strong style={{ color: PUBLIC_TOKENS.lime }}>{formatEur(d)}</strong> / jour</div>
                    ) : <div style={{ marginBottom: 12 }} />}
                    {/* ⚠️ NE PAS re-tronquer (garde-fou §9.2) : le 5ᵉ produit justifie l'écart de prix. */}
                    <ul style={{ listStyle: "none", display: "grid", gap: 7, margin: 0, padding: 0, flex: 1 }}>
                      {p.products.map((pr) => (
                        <li key={pr.id} style={{ ...bodyText, fontSize: 13.5 }}>
                          <span style={{ color: PUBLIC_TOKENS.teal }}>•</span> {PRODUCT_SHORT[pr.id] ?? pr.name}
                        </li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 600, color: isSel ? PUBLIC_TOKENS.teal : "var(--cream-muted)" }}>
                      {isSel ? "✓ Sélectionné" : "Choisir cette formule"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Add-on issu des réponses */}
            {addOn && (() => {
              const price = priceById.get(addOn.productId);
              const perDay = price !== undefined ? dailyCost([addOn.productId], priceById) : null;
              return (
                <div style={{ ...card, marginTop: 16, border: `1px solid ${withA(PUBLIC_TOKENS.lime, 0.4)}`, background: `linear-gradient(180deg, ${withA(PUBLIC_TOKENS.lime, 0.06)}, transparent)` }}>
                  <div style={{ ...eyebrow, color: PUBLIC_TOKENS.lime, margin: "0 0 8px" }}>Suivant tes réponses</div>
                  <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 20, color: "var(--cream)" }}>On te conseille aussi <span style={publicGradText}>{addOn.title}</span></div>
                  <p style={{ ...bodyText, fontSize: 15, marginTop: 10, fontStyle: "italic", color: PUBLIC_TOKENS.teal }}>« {addOn.reason} »</p>
                  <p style={{ ...bodyMuted, fontSize: 14.5, marginTop: 8, maxWidth: 640 }}>{addOn.benefit}</p>
                  {perDay != null && (
                    <div style={{ marginTop: 12, ...bodyText, fontSize: 13.5 }}>
                      <strong style={{ color: PUBLIC_TOKENS.lime }}>{formatEur(perDay)}</strong>
                      <span style={{ color: "var(--cream-muted)" }}> / jour · à ajouter si tu le souhaites</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* WE DO TRANSFORMATIONS */}
            <div style={{ marginTop: 40 }}>
              <div style={eyebrow}>Ta communauté</div>
              <h2 style={secTitleWrap}>Tu ne démarres <span style={publicGradText}>pas seul</span></h2>
              <p style={{ ...bodyMuted, fontSize: 15.5, maxWidth: 620, marginBottom: 20 }}>
                En démarrant, tu rejoins <strong style={{ color: "var(--cream)" }}>We Do Transformations</strong> —
                notre appli et notre communauté. C'est ça qui change tout, après le premier jour.
              </p>
              <div style={{ ...card, background: `linear-gradient(135deg, ${withA(PUBLIC_TOKENS.teal, 0.14)}, ${withA(PUBLIC_TOKENS.lime, 0.06)})`, border: `1px solid ${withA(PUBLIC_TOKENS.lime, 0.4)}`, textAlign: "center", padding: "26px 20px", marginBottom: 14 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 11, margin: "0 auto" }}>
                  <div style={{ display: "flex", gap: 3, transform: "skewX(-12deg)" }} aria-hidden="true">
                    <span style={{ width: 8, height: 40, background: "#E10B17", borderRadius: 1 }} />
                    <span style={{ width: 8, height: 40, background: "#F5C518", borderRadius: 1 }} />
                    <span style={{ width: 8, height: 40, background: "var(--cream)", borderRadius: 1 }} />
                  </div>
                  <span style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 44, fontStyle: "italic", color: "var(--cream)", letterSpacing: 1, lineHeight: 1 }}>WDT</span>
                </div>
                <div style={{ fontFamily: PUBLIC_FONTS.mono, fontSize: 10.5, letterSpacing: 2, color: "var(--cream-muted)", margin: "8px 0 16px" }}>#WEDOTRANSFORMATIONS</div>
                <div style={{ ...eyebrow, color: PUBLIC_TOKENS.lime, margin: "0 0 6px" }}>Le Challenge We Do · 21 jours</div>
                <div style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: "clamp(42px,10vw,68px)", lineHeight: 1, ...publicGradText }}>10 000 $</div>
                <p style={{ ...bodyText, fontSize: 15, maxWidth: 440, margin: "12px auto 0" }}>en jeu pour les <strong>10 plus belles transformations</strong>. 3 semaines pour changer, tous ensemble.</p>
                <p style={{ ...bodyMuted, fontSize: 13, marginTop: 8 }}>Inclus dès ton démarrage.</p>
              </div>
              <div className="rb-grid2">
                <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                  <video src="/brand/wdt-app.mp4" autoPlay muted loop playsInline style={{ width: "100%", borderRadius: 12, display: "block", background: "#000" }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--cream)" }}>L'appli We Do, dans ta poche</div>
                    <p style={{ ...bodyMuted, fontSize: 13.5, marginTop: 4 }}>Ton suivi, tes conseils du jour, ton évolution. Incluse — pas une option.</p>
                  </div>
                </div>
                <div style={{ ...card, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 30, lineHeight: 1, ...publicGradText }}>{formatCount(COMMUNITY_STATS.members)}</div>
                      <div style={{ ...bodyMuted, fontSize: 12 }}>membres</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 30, lineHeight: 1, ...publicGradText }}>{formatCount(COMMUNITY_STATS.messages)}</div>
                      <div style={{ ...bodyMuted, fontSize: 12 }}>messages échangés</div>
                    </div>
                  </div>
                  <p style={{ ...bodyMuted, fontSize: 13.5, textAlign: "center" }}>Recettes, transformations, lives, entraide au quotidien. Tu y entres dès ton premier jour.</p>
                  <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noreferrer noopener" style={{ ...linkBtn, display: "inline-block", textDecoration: "none", textAlign: "center" }}>Voir la communauté →</a>
                </div>
              </div>
            </div>

            {/* Pourquoi (2 cartes) */}
            <div style={{ marginTop: 40 }}>
              <div style={eyebrow}>L'accompagnement</div>
              <h2 style={secTitleWrap}>Pourquoi démarrer <span style={publicGradText}>avec nous</span></h2>
              <div className="rb-grid2" style={{ marginTop: 20 }}>
                {WHY.map((w) => (
                  <div key={w.title} style={card}>
                    <IconBadge d={w.icon} />
                    <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 16, marginTop: 12, color: "var(--cream)" }}>{w.title}</div>
                    <p style={{ ...bodyMuted, fontSize: 14, marginTop: 6 }}>{w.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Témoignages (masqués si aucun avis) */}
            <div style={{ marginTop: hasTestimonials ? 40 : 0 }}>
              {hasTestimonials && (
                <>
                  <div style={eyebrow}>Ils l'ont fait</div>
                  <h2 style={secTitleWrap}>Des <span style={publicGradText}>vraies histoires</span></h2>
                </>
              )}
              <TestimonialsCarousel variant="business" coachId={coach.userId ?? undefined} limit={3} onLoaded={(n) => setHasTestimonials(n > 0)} />
            </div>

            {/* FAQ accordéon */}
            <div style={{ marginTop: 40 }}>
              <div style={eyebrow}>Tout est clair ?</div>
              <h2 style={{ ...secTitleWrap, marginBottom: 18 }}>Tes questions, <span style={publicGradText}>mes réponses</span></h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {FAQ.map((f, i) => {
                  const open = openFaq === i;
                  return (
                    <div key={f.q} style={{ ...card, padding: 0, overflow: "hidden" }}>
                      <button type="button" onClick={() => setOpenFaq(open ? null : i)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <span style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 600, fontSize: 15, color: "var(--cream)" }}>{f.q}</span>
                        <span style={{ color: PUBLIC_TOKENS.teal, fontSize: 20, lineHeight: 1, transform: open ? "rotate(45deg)" : "none", transition: "transform .18s" }}>+</span>
                      </button>
                      {open && (
                        <p style={{ ...bodyMuted, fontSize: 14, padding: "0 18px 16px" }}>{f.a.replace("{coach}", coach.name)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ═══ DÉMARRER (états caisse) ═══ */}
          <section id="demarrer" style={{ scrollMarginTop: 92, paddingTop: 52 }}>
            <div style={{ ...card, textAlign: "center", border: "1px solid var(--hair-strong)", background: `linear-gradient(180deg, ${withA(PUBLIC_TOKENS.teal, 0.08)}, ${withA(PUBLIC_TOKENS.lime, 0.05)})`, padding: "38px 24px" }}>
              <h2 style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 800, fontSize: "clamp(24px,4.6vw,32px)", lineHeight: 1.15, color: "var(--cream)" }}>
                Prêt·e à démarrer, <span style={publicGradText}>{firstName || "toi"}</span> ?
              </h2>
              <p style={{ ...bodyText, fontSize: 16, maxWidth: 460, margin: "14px auto 24px" }}>
                {selectedProg
                  ? <>Ton choix : <strong style={{ color: "var(--cream)" }}>{prettyProgramName(selectedProg.name)} · {selectedProg.price} €</strong>. On démarre quand tu veux.</>
                  : <>On démarre quand tu veux. La première étape, c'est juste un échange — sans pression.</>}
              </p>
              {paidConfirmed ? (
                <div style={{ ...card, background: withA(PUBLIC_TOKENS.teal, 0.1), borderColor: withA(PUBLIC_TOKENS.teal, 0.35), maxWidth: 460, margin: "0 auto", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <IconBadge d={ICON.check} />
                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--cream)" }}>Paiement reçu, merci {firstName} !</div>
                  </div>
                  <p style={{ ...bodyMuted, fontSize: 14, marginTop: 10 }}>C'est officiel, tu démarres. Encore 2 minutes pour finaliser ton inscription et tu es prêt·e. Bienvenue !</p>
                  <button type="button" onClick={() => navigate(`/qualif/${token}`)} style={{ ...ctaPrimary, width: "100%", marginTop: 16, justifyContent: "center" }}>Continuer mon inscription →</button>
                </div>
              ) : justPaid ? (
                <div style={{ ...card, background: withA(PUBLIC_TOKENS.teal, 0.08), borderColor: withA(PUBLIC_TOKENS.teal, 0.3), maxWidth: 460, margin: "0 auto", textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--cream)" }}>Merci {firstName} !</div>
                  <p style={{ ...bodyMuted, fontSize: 14, marginTop: 6 }}>On finalise la confirmation de ton paiement. {coach.name} revient vers toi tout de suite pour ton programme, ta saveur et ta première pesée.</p>
                </div>
              ) : !started ? (
                <>
                  <button type="button" disabled={payLoading} onClick={() => void startCheckout(selected)} style={{ ...ctaPrimary, opacity: payLoading ? 0.6 : 1, cursor: payLoading ? "wait" : "pointer" }}>
                    {payLoading ? "Ouverture de la caisse…" : "Je démarre mon programme →"}
                  </button>
                  <div style={{ marginTop: 18 }}>
                    {callbackState === "done" ? (
                      <div style={{ ...card, background: withA(PUBLIC_TOKENS.teal, 0.1), borderColor: withA(PUBLIC_TOKENS.teal, 0.35), maxWidth: 460, margin: "0 auto", textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <IconBadge d={ICON.check} />
                          <div style={{ fontWeight: 600, fontSize: 15, color: "var(--cream)" }}>C'est noté, {firstName} !</div>
                        </div>
                        <p style={{ ...bodyMuted, fontSize: 14, marginTop: 10 }}>{coach.name} a reçu ta demande et te recontacte très vite. Pas besoin de faire autre chose de ton côté.</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ ...bodyMuted, fontSize: 13, marginBottom: 8 }}>Pas encore décidé·e ?</div>
                        <button type="button" disabled={callbackState === "sending"} onClick={() => void requestCallback()} style={{ ...linkBtn, opacity: callbackState === "sending" ? 0.6 : 1 }}>
                          {callbackState === "sending" ? "Envoi…" : `Fais-toi rappeler par ${coach.name} →`}
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ ...card, background: withA(PUBLIC_TOKENS.teal, 0.08), borderColor: withA(PUBLIC_TOKENS.teal, 0.3), maxWidth: 460, margin: "0 auto", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <IconBadge d={ICON.lock} />
                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--cream)" }}>Super, {firstName} !</div>
                  </div>
                  <p style={{ ...bodyMuted, fontSize: 14, marginTop: 10 }}>
                    {coach.name} va t'envoyer ton lien de paiement sécurisé pour finaliser
                    {selectedProg ? <> ton pack <strong style={{ color: "var(--cream)" }}>{prettyProgramName(selectedProg.name)}</strong></> : " ton démarrage"}.
                    Réponds simplement à son message.
                  </p>
                </div>
              )}
              <div style={{ ...bodyMuted, fontSize: 12.5, marginTop: 22 }}>Une question ? Réponds simplement au message de {coach.name}, il·elle est là.</div>
            </div>
          </section>
        </main>

        {/* ── ASIDE : rail de décision collant (desktop) ── */}
        <div className="rb-rail-wrap">
          <aside className="rb-rail" style={{ ...card, padding: 20 }}>
            <div style={{ ...eyebrow, margin: 0 }}>Ta sélection</div>
            <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 22, color: "var(--cream)", marginTop: 8 }}>{selectedProg ? prettyProgramName(selectedProg.name) : "—"}</div>
            {selectedProg && <div style={{ ...bodyMuted, fontSize: 13 }}>{PROGRAMME_SUBTITLE_BY_ID[selectedProg.id] ?? "Pour aller plus loin"}</div>}
            <div style={{ margin: "14px 0 2px", display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 40, color: "var(--cream)", lineHeight: 1 }}>{selectedProg?.price ?? "—"}</span>
              <span style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 20, color: PUBLIC_TOKENS.teal, lineHeight: 1 }}>€</span>
            </div>
            {selectedDaily != null && (
              <div style={{ ...bodyMuted, fontSize: 13 }}>soit <strong style={{ color: PUBLIC_TOKENS.lime }}>{formatEur(selectedDaily)}</strong> / jour · {selectedDaily < LUNCH_AVG_EUR ? "moins qu'un déjeuner" : "≈ un déjeuner"}</div>
            )}
            <div style={{ height: 1, background: "var(--hair)", margin: "16px 0" }} />
            {railActions}
            <div style={{ ...bodyMuted, fontSize: 12, marginTop: 14, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <LineIcon d={ICON.lock} size={13} color="var(--cream-muted)" /> Paiement sécurisé · Square
            </div>
          </aside>
          <div style={{ ...card, padding: 16 }}>
            <p style={{ ...bodyMuted, fontSize: 13 }}>
              <strong style={{ color: "var(--cream)" }}>L'appli We Do Transformations incluse</strong> + le challenge 21 jours (10 000 $ en jeu). Compris dès ton démarrage.
            </p>
          </div>
        </div>
      </div>

      {/* ── Barre de paiement collante (mobile) ── */}
      <div className="rb-paybar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 14, color: "var(--cream)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedProg ? `${prettyProgramName(selectedProg.name)} · ${selectedProg.price} €` : "Ta sélection"}
          </div>
          <div style={{ ...bodyMuted, fontSize: 11.5 }}>{selectedDaily != null ? `${formatEur(selectedDaily)} / jour · Square sécurisé` : "Paiement sécurisé · Square"}</div>
        </div>
        {paidConfirmed ? (
          <button type="button" onClick={() => navigate(`/qualif/${token}`)} style={{ ...ctaPrimary, padding: "13px 20px", fontSize: 15, whiteSpace: "nowrap" }}>Continuer →</button>
        ) : (
          <button type="button" disabled={payLoading} onClick={() => void startCheckout(selected)} style={{ ...ctaPrimary, padding: "13px 20px", fontSize: 15, whiteSpace: "nowrap", opacity: payLoading ? 0.6 : 1 }}>{payLoading ? "…" : "Je démarre →"}</button>
        )}
      </div>

      {/* ── BANDEAU « ET APRÈS » (pleine largeur) ── */}
      <section className="rb-after">
        <div className="rb-after-inner">
          <div style={eyebrow}>Et après ?</div>
          <h2 style={{ ...secTitleWrap, marginBottom: 4 }}>Une fois que tu <span style={publicGradText}>démarres</span></h2>
          <p style={{ ...bodyMuted, fontSize: 15, maxWidth: 560 }}>4 étapes simples, guidées, juste après ton paiement.</p>
          <div className="rb-steps">
            {QUALIF_STEPS.map((s) => (
              <div key={s.n} style={{ ...card, padding: 18 }}>
                <span style={{ fontFamily: PUBLIC_FONTS.impact, fontSize: 26, color: PUBLIC_TOKENS.teal, lineHeight: 1 }}>{s.n}</span>
                <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 15.5, color: "var(--cream)", marginTop: 8 }}>{s.t}</div>
                <p style={{ ...bodyMuted, fontSize: 13, marginTop: 5 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <div style={{ ...bodyMuted, textAlign: "center", fontSize: 12, marginTop: 34 }}>La Base 360 — Ce bilan est personnel et confidentiel.</div>
        </div>
      </section>
    </PublicShell>
  );
}

// ─── Sous-composant carte stat ───────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ ...bodyMuted, fontSize: 12.5 }}>{label}</div>
      <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 18, marginTop: 6, color: "var(--cream)" }}>{value}</div>
    </div>
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
// Badge carré arrondi teinté teal autour du picto (identité v2).
function IconBadge({ d }: { d: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
      background: withA(PUBLIC_TOKENS.teal, 0.12),
      border: `1px solid ${withA(PUBLIC_TOKENS.teal, 0.28)}`,
    }}>
      <LineIcon d={d} size={20} />
    </span>
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

const FAQ = [
  { q: "C'est des produits « miracle » ?", a: "Non. Ce sont des compléments nutritionnels qui remplacent un petit-déj ou une collation mal équilibrés. Le vrai moteur, c'est tes habitudes — {coach} t'aide à les replacer." },
  { q: "En combien de temps des résultats ?", a: "Beaucoup ressentent plus d'énergie dès les premières semaines. Pour le poids, on vise du progressif et durable — pas l'effet yo-yo. On mesure ensemble." },
  { q: "Je dois arrêter de manger normalement ?", a: "Pas du tout. Tu gardes de vrais repas (l'assiette équilibrée du plan). On structure juste le matin et les collations, là où ça pèche le plus." },
  { q: "Et si je n'aime pas le goût ?", a: "Tu choisis ta saveur au démarrage (vanille, chocolat, cookies…). Et si une ne te plaît pas, on en change, simplement." },
  { q: "Je suis suivi·e comment ?", a: "Par {coach}, directement : messages, ajustements, pesées, et le groupe pour la motivation. Tu n'es jamais seul·e avec un PDF." },
] as const;

// ─── Styles partagés (thème public V2, theme-aware via CSS vars) ─────────────
function withA(hex: string, a: number): string {
  return `color-mix(in srgb, ${hex} ${Math.round(a * 100)}%, transparent)`;
}
const card: React.CSSProperties = {
  background: "color-mix(in srgb, var(--cream) 3.5%, transparent)",
  border: "1px solid var(--hair)",
  borderRadius: 18,
  padding: 22,
};
const eyebrow: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 2.5,
  textTransform: "uppercase",
  color: PUBLIC_TOKENS.teal,
};
const secTitle: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 700,
  fontSize: "clamp(24px,4vw,30px)",
  lineHeight: 1.18,
  letterSpacing: "-0.4px",
  marginTop: 12,
  marginRight: 0,
  marginBottom: 8,
  marginLeft: 0,
  color: "var(--cream)",
};
const bodyText: React.CSSProperties = { margin: 0, fontFamily: PUBLIC_FONTS.body, fontSize: 16, lineHeight: 1.55, color: "var(--cream)" };
const bodyMuted: React.CSSProperties = { margin: 0, fontFamily: PUBLIC_FONTS.body, color: "var(--cream-muted)", lineHeight: 1.5 };
const linkBtn: React.CSSProperties = {
  marginTop: 10,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 600,
  fontSize: 13.5,
  color: PUBLIC_TOKENS.teal,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
};
const ctaPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 700,
  fontSize: 16,
  color: "#06241f",
  background: PUBLIC_TOKENS.gradCta,
  border: "none",
  borderRadius: 14,
  padding: "16px 30px",
  cursor: "pointer",
};

// ─── CSS scopé de l'entonnoir (structure + responsive) ───────────────────────
// Les couleurs viennent des vars du thème public (public-shell.css) → theme-aware
// automatiquement (dark ET light). On ne met ici QUE ce que le style inline ne
// peut pas faire : sticky, grille responsive, media queries, barre mobile.
const RB_CSS = `
.rb-header{position:sticky;top:0;z-index:50;background:color-mix(in srgb, var(--ink) 85%, transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--hair)}
.rb-header-inner{max-width:1180px;margin:0 auto;padding:11px 22px;display:flex;align-items:center;gap:18px}
.rb-logo{font-family:${PUBLIC_FONTS.display};font-weight:800;letter-spacing:.5px;font-size:17px;color:var(--cream);white-space:nowrap}
.rb-chapters{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.rb-chapters::-webkit-scrollbar{display:none}
.rb-chapter{font-family:${PUBLIC_FONTS.display};font-weight:600;font-size:13.5px;color:var(--cream-muted);background:transparent;border:1px solid transparent;border-radius:999px;padding:7px 14px;cursor:pointer;white-space:nowrap}
.rb-chapter.is-active{color:var(--teal);border-color:color-mix(in srgb,var(--teal) 40%,transparent);background:color-mix(in srgb,var(--teal) 10%,transparent)}
.rb-selpill{margin-left:auto;display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:var(--cream-muted);border:1px solid var(--hair-strong);border-radius:999px;padding:7px 14px;white-space:nowrap}
.rb-selpill strong{color:var(--cream)}
.rb-dot{width:7px;height:7px;border-radius:50%;background:var(--teal)}
.rb-shell{max-width:1180px;margin:0 auto;padding:8px 22px 120px;display:grid;grid-template-columns:minmax(0,1fr) 344px;gap:34px;align-items:start}
.rb-rail-wrap{position:sticky;top:84px;display:flex;flex-direction:column;gap:12px}
.rb-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px}
.rb-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.rb-paybar{display:none}
.rb-after{border-top:1px solid var(--hair);margin-top:20px}
.rb-after-inner{max-width:1180px;margin:0 auto;padding:40px 22px 80px}
.rb-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:20px}
@media(max-width:899px){
  .rb-shell{grid-template-columns:1fr;padding-bottom:100px}
  .rb-rail-wrap{display:none}
  .rb-selpill{display:none}
  .rb-paybar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:60;align-items:center;gap:12px;padding:10px 16px;padding-bottom:calc(10px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--ink) 92%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid var(--hair-strong)}
  .rb-steps{grid-template-columns:1fr 1fr}
}
@media(max-width:560px){
  .rb-stats{grid-template-columns:1fr 1fr}
  .rb-grid2{grid-template-columns:1fr}
  .rb-steps{grid-template-columns:1fr}
}
`;
