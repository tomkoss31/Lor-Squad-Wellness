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
// Refonte V1 (2026-07-09) : sous-titres/best-seller par ID (plus d'index),
// fallback analyse Noaly, violet→teal/lime (v2), copy « nos formules ».
// Reste (V2/V3) : stratégies dérivées de l'objectif, de-emoji complet, sécuriser
// l'écran « payé » (preuve serveur au lieu de ?paid=1 nu).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  PublicShell,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";
import { TestimonialsCarousel } from "../components/testimonials/TestimonialsCarousel";
import { getSupabaseClient } from "../services/supabaseClient";

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
  };
  coach: { name: string; slug: string | null; userId: string | null };
  programmes: ProgrammeDTO[];
  produits: { id: string; name: string; category: string; price: number; quantiteLabel: string }[];
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

export function BilanResultatPremiumPage() {
  const { token } = useParams<{ token: string }>();
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
        // Présélectionne le best-seller (Premium) par ID stable. Fallback = 1er
        // programme (jamais un index positionnel, qui casse si l'ordre change /
        // si des programmes sport entrent dans le catalogue).
        const best = payload.programmes.find((p) => p.id === "premium");
        setSelected(best?.id ?? payload.programmes[0]?.id ?? null);
        setStatus("ok");
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const firstName = useMemo(() => capitalize((data?.bilan.firstName ?? "").trim()), [data]);
  const primaryObjective = useMemo(() => {
    const first = data?.bilan.objectives?.[0];
    return first ? OBJECTIVE_LABELS[first] ?? capitalize(first.replace(/_/g, " ")) : null;
  }, [data]);

  if (status === "loading") {
    return (
      <PublicShell defaultTheme="dark">
        <div style={{ padding: "90px 24px", textAlign: "center", color: "var(--cream-muted)" }}>
          <div style={{ fontSize: 30, marginBottom: 12 }}>✨</div>
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
          <div style={{ fontSize: 30, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: PUBLIC_FONTS.display, fontSize: 18, color: "var(--cream)" }}>
            {status === "notfound" ? "Ce lien n'est plus valide" : "Oups, un souci de chargement"}
          </div>
          <div style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 14, marginTop: 8 }}>
            Demande à ton coach de te renvoyer ton lien 🙂
          </div>
        </div>
      </PublicShell>
    );
  }

  const { bilan, coach, programmes } = data;
  const selectedProg = programmes.find((p) => p.id === selected) ?? null;

  return (
    <PublicShell defaultTheme="dark">
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 22px 90px" }}>
        {/* ── Topbar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0" }}>
          <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 800, letterSpacing: 0.5, fontSize: 17 }}>
            LA&nbsp;BASE&nbsp;<span style={{ color: PUBLIC_TOKENS.teal }}>360</span>
          </div>
          <span style={pill}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: PUBLIC_TOKENS.teal, display: "inline-block" }} />
            Ton analyse est prête
          </span>
        </div>

        {/* ── 1 · HERO ── */}
        <section style={{ paddingTop: 24 }}>
          <div style={eyebrow}>Analyse personnalisée</div>
          <h1 style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 800, fontSize: "clamp(30px,6vw,48px)", lineHeight: 1.1, letterSpacing: "-1px", margin: "16px 0 4px", color: "var(--cream)" }}>
            Salut {firstName || "à toi"},<br />voici ce que <span style={publicGradText}>ton bilan révèle.</span>
          </h1>
          <p style={{ ...bodyMuted, fontSize: 17, color: "var(--cream-soft, var(--cream))", maxWidth: 560, marginTop: 18 }}>
            Tu as pris le temps de faire ton bilan — et ça, c'est déjà un vrai pas vers une meilleure
            version de toi. 🎯 Voici ta lecture personnalisée, et le plan que {coach.name} te propose.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: PUBLIC_TOKENS.gradCta, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: PUBLIC_FONTS.display, fontWeight: 700, color: "#06241f" }}>
              {coach.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--cream)" }}>Préparé par {coach.name}</div>
              <div style={{ ...bodyMuted, fontSize: 13 }}>Coach bien-être · La Base 360</div>
            </div>
          </div>
        </section>

        {/* ── 2 · BILAN EN UN COUP D'ŒIL ── */}
        <section style={sectionTop}>
          <div style={kicker}>Ton bilan en un coup d'œil</div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {primaryObjective && <StatCard label="Objectif" value={primaryObjective} />}
            {bilan.currentWeightKg != null && <StatCard label="Poids actuel" value={`${bilan.currentWeightKg} kg`} />}
            {bilan.weightLossTargetKg != null && <StatCard label="Objectif poids" value={`−${bilan.weightLossTargetKg} kg`} />}
            {bilan.motivationScore != null && <StatCard label="Ta motivation" value={`${bilan.motivationScore}/10`} />}
            {bilan.age != null && <StatCard label="Âge" value={`${bilan.age} ans`} />}
          </div>
        </section>

        {/* ── 3 · ANALYSE DE NOALY (fallback si pas d'IA — plus de trou silencieux) ── */}
        <section style={sectionTop}>
          <div style={{ ...card, border: `1px solid ${withA(PUBLIC_TOKENS.teal, 0.32)}`, background: `linear-gradient(180deg, ${withA(PUBLIC_TOKENS.teal, 0.08)}, ${withA(PUBLIC_TOKENS.lime, 0.03)})` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }} aria-hidden="true">✨</span>
              <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 15, color: PUBLIC_TOKENS.teal }}>
                L'analyse de Noaly
              </div>
            </div>
            {bilan.aiAnalysis ? (
              <>
                <p style={{ ...bodyText, whiteSpace: "pre-wrap" }}>{bilan.aiAnalysis}</p>
                <div style={{ ...bodyMuted, fontSize: 12, marginTop: 14 }}>
                  Lecture générée à partir de ton bilan · validée par ton coach
                </div>
              </>
            ) : (
              <p style={{ ...bodyText }}>
                {coach.name} prépare ta lecture personnalisée à partir de ton bilan — tu la recevras
                lors de votre échange. En attendant, voici tes fondations et les formules ci-dessous.
              </p>
            )}
          </div>
        </section>

        {/* ── 4 · 5 STRATÉGIES ── */}
        <section style={sectionTop}>
          <div style={eyebrow}>Ton plan</div>
          <h2 style={secTitle}>
            Tes 5 stratégies <span style={publicGradText}>essentielles</span>
          </h2>
          <p style={{ ...bodyMuted, fontSize: 15.5, maxWidth: 560, marginBottom: 24 }}>
            Souvent, ce sont les petits ajustements qui font les plus grands changements. On commence
            par les fondations.
          </p>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {STRATEGIES.map((s) => (
              <div key={s.n} style={{ ...card, ...(s.foundation ? { border: `1px solid ${withA(PUBLIC_TOKENS.teal, 0.35)}` } : {}) }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 26 }} aria-hidden="true">{s.emoji}</span>
                  {s.foundation && <span style={{ ...pill, color: PUBLIC_TOKENS.teal, borderColor: withA(PUBLIC_TOKENS.teal, 0.4) }}>Fondation</span>}
                </div>
                <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 16.5, color: "var(--cream)" }}>{s.n} · {s.title}</div>
                <p style={{ ...bodyMuted, fontSize: 14, marginTop: 7 }}>{s.problem}</p>
                {s.solution && (
                  <p style={{ ...bodyText, fontSize: 14, marginTop: 10 }}>
                    <strong style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>💡 {s.solutionLabel} </strong>
                    {s.solution}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        <div style={divider} />

        {/* ── 5 · LES PROGRAMMES ── */}
        <section style={{ paddingTop: 40 }}>
          <div style={eyebrow}>Nos formules</div>
          <h2 style={secTitle}>
            Le programme qui <span style={publicGradText}>te correspond</span>
          </h2>
          <p style={{ ...bodyMuted, fontSize: 15.5, maxWidth: 580, marginBottom: 24 }}>
            Plusieurs niveaux. On démarre où tu te sens prêt·e — et on fait évoluer ton pack selon
            tes résultats. {coach.name} t'aide à choisir.
          </p>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            {programmes.map((p) => {
              const best = p.id === "premium";
              const isSel = selected === p.id;
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
                      : best
                        ? `1px solid ${withA(PUBLIC_TOKENS.lime, 0.45)}`
                        : "1px solid var(--hair)",
                    background: best || isSel ? `linear-gradient(180deg, ${withA(PUBLIC_TOKENS.teal, 0.10)}, ${withA(PUBLIC_TOKENS.lime, 0.04)})` : card.background,
                  }}
                >
                  {best && (
                    <div style={{ position: "absolute", top: -11, left: 18, background: PUBLIC_TOKENS.gradCta, color: "#06241f", fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: "4px 11px", borderRadius: 999 }}>
                      ★ BEST-SELLER
                    </div>
                  )}
                  <div style={{ ...bodyMuted, fontSize: 12.5, fontWeight: 600 }}>{PROGRAMME_SUBTITLE_BY_ID[p.id] ?? "Pour aller plus loin"}</div>
                  <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 19, marginTop: 4, color: "var(--cream)" }}>{prettyProgramName(p.name)}</div>
                  <div style={{ margin: "12px 0" }}>
                    <span style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 800, fontSize: 30, color: "var(--cream)" }}>{p.price}&nbsp;€</span>
                  </div>
                  <ul style={{ listStyle: "none", display: "grid", gap: 7, margin: 0, padding: 0, flex: 1 }}>
                    {p.products.slice(0, 4).map((pr) => (
                      <li key={pr.id} style={{ ...bodyText, fontSize: 13.5 }}>• {pr.name}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 14, fontSize: 12.5, fontWeight: 600, color: isSel ? PUBLIC_TOKENS.teal : "var(--cream-muted)" }}>
                    {isSel ? "✓ Sélectionné" : "Choisir"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* À l'unité / combos */}
          <div style={{ ...card, marginTop: 14, display: "flex", alignItems: "flex-start", gap: 12, background: withA(PUBLIC_TOKENS.teal, 0.05), borderColor: withA(PUBLIC_TOKENS.teal, 0.2) }}>
            <span style={{ fontSize: 20 }} aria-hidden="true">🧩</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--cream)" }}>Plutôt à l'unité ou un petit combo ?</div>
              <p style={{ ...bodyMuted, fontSize: 13.5, marginTop: 4 }}>
                Pas envie d'un pack complet ? On peut partir sur un seul produit ou une petite combinaison
                (ex : Formula 1 + Thé). Dis-le à {coach.name}, on cale ça ensemble.
              </p>
            </div>
          </div>

          {/* Durée — règle honnête */}
          <div style={{ ...card, marginTop: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 20 }} aria-hidden="true">⏳</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--cream)" }}>Combien de temps dure un pack ?</div>
              <p style={{ ...bodyMuted, fontSize: 13.5, marginTop: 4 }}>
                Ça dépend de ton rythme — on le calcule ensemble à ton démarrage, pas de durée imposée.
                L'idée : que ton pack te serve vraiment, sans gaspillage.
              </p>
            </div>
          </div>
        </section>

        {/* ── 6 · POURQUOI DÉMARRER ── */}
        <section style={sectionTop}>
          <div style={eyebrow}>L'accompagnement</div>
          <h2 style={secTitle}>
            Pourquoi démarrer <span style={publicGradText}>avec nous</span>
          </h2>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 22 }}>
            {WHY.map((w) => (
              <div key={w.title} style={card}>
                <span style={{ fontSize: 24 }} aria-hidden="true">{w.emoji}</span>
                <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 700, fontSize: 16, marginTop: 8, color: "var(--cream)" }}>{w.title}</div>
                <p style={{ ...bodyMuted, fontSize: 14, marginTop: 6 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div style={divider} />

        {/* ── 7 · TÉMOIGNAGES ── */}
        <section style={{ paddingTop: 40 }}>
          <div style={eyebrow}>Ils ont commencé comme toi</div>
          <h2 style={{ ...secTitle, marginBottom: 22 }}>
            Ce qu'en disent <span style={publicGradText}>les autres</span>
          </h2>
          <TestimonialsCarousel variant="business" coachId={coach.userId ?? undefined} limit={3} />
        </section>

        {/* ── 8 · FAQ ── */}
        <section style={sectionTop}>
          <div style={eyebrow}>Tout est clair ?</div>
          <h2 style={{ ...secTitle, marginBottom: 22 }}>
            Tes questions, <span style={publicGradText}>mes réponses</span>
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {FAQ.map((f) => (
              <div key={f.q} style={card}>
                <div style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 600, fontSize: 15.5, color: "var(--cream)" }}>{f.q}</div>
                <p style={{ ...bodyMuted, fontSize: 14, marginTop: 7 }}>{f.a.replace("{coach}", coach.name)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 9 · CTA ── */}
        <section style={sectionTop}>
          <div style={{ ...card, textAlign: "center", border: "1px solid var(--hair-strong)", background: `linear-gradient(180deg, ${withA(PUBLIC_TOKENS.teal, 0.08)}, ${withA(PUBLIC_TOKENS.lime, 0.05)})`, padding: "38px 24px" }}>
            <h2 style={{ fontFamily: PUBLIC_FONTS.display, fontWeight: 800, fontSize: "clamp(24px,4.6vw,32px)", lineHeight: 1.15, color: "var(--cream)" }}>
              Prêt·e à démarrer, <span style={publicGradText}>{firstName || "toi"}</span> ?
            </h2>
            <p style={{ ...bodyText, fontSize: 16, maxWidth: 460, margin: "14px auto 24px" }}>
              {selectedProg
                ? <>Ton choix : <strong style={{ color: "var(--cream)" }}>{prettyProgramName(selectedProg.name)} · {selectedProg.price} €</strong>. On démarre quand tu veux.</>
                : <>On démarre quand tu veux. La première étape, c'est juste un échange — sans pression.</>}
            </p>
            {justPaid ? (
              <div style={{ ...card, background: withA(PUBLIC_TOKENS.teal, 0.1), borderColor: withA(PUBLIC_TOKENS.teal, 0.35), maxWidth: 460, margin: "0 auto", textAlign: "left" }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--cream)" }}>🎉 Paiement reçu, merci {firstName} !</div>
                <p style={{ ...bodyMuted, fontSize: 14, marginTop: 6 }}>
                  C'est officiel, tu démarres. {coach.name} te contacte très vite pour ton
                  programme, ta saveur et ta première pesée. Bienvenue 🌿
                </p>
              </div>
            ) : !started ? (
              <button
                type="button"
                disabled={payLoading}
                onClick={() => void startCheckout(selected)}
                style={{ ...ctaPrimary, opacity: payLoading ? 0.6 : 1, cursor: payLoading ? "wait" : "pointer" }}
              >
                {payLoading ? "Ouverture de la caisse…" : "Je démarre mon programme →"}
              </button>
            ) : (
              <div style={{ ...card, background: withA(PUBLIC_TOKENS.teal, 0.08), borderColor: withA(PUBLIC_TOKENS.teal, 0.3), maxWidth: 460, margin: "0 auto", textAlign: "left" }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--cream)" }}>🔒 Super, {firstName} !</div>
                <p style={{ ...bodyMuted, fontSize: 14, marginTop: 6 }}>
                  {coach.name} va t'envoyer ton lien de paiement sécurisé pour finaliser
                  {selectedProg ? <> ton pack <strong style={{ color: "var(--cream)" }}>{prettyProgramName(selectedProg.name)}</strong></> : " ton démarrage"}.
                  Réponds simplement à son message 🙂
                </p>
              </div>
            )}
            <div style={{ ...bodyMuted, fontSize: 12.5, marginTop: 22 }}>
              💬 Une question ? Réponds simplement au message de {coach.name}, il·elle est là.
            </div>
          </div>
          <div style={{ ...bodyMuted, textAlign: "center", fontSize: 12, marginTop: 30 }}>
            La Base 360 — Ce bilan est personnel et confidentiel.
          </div>
        </section>
      </div>
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

// ─── Contenu fixe ────────────────────────────────────────────────────────────
const STRATEGIES = [
  { n: 1, emoji: "🥤", title: "Le petit-déjeuner", foundation: true, problem: "Un petit-déj pauvre en protéines ralentit ton métabolisme dès le matin et grignote ta masse musculaire.", solutionLabel: "La solution :", solution: "un petit-déjeuner sous forme de boisson nutritionnelle calibrée — protéines, vitamines, minéraux, calories maîtrisées." },
  { n: 2, emoji: "🍎", title: "Les collations", foundation: true, problem: "Les coups de mou de l'après-midi viennent souvent de là : pas d'en-cas structuré, donc fringale et écart.", solutionLabel: "L'idéal :", solution: "10 g de protéines + ~150 kcal + un fruit, entre tes repas." },
  { n: 3, emoji: "🍽", title: "L'assiette équilibrée", foundation: false, problem: "Midi : ¼ protéines · ¼ glucides complexes · ½ légumes + filet d'huile d'olive. Soir : protéines + légumes, on allège les glucides.", solutionLabel: "", solution: "" },
  { n: 4, emoji: "💧", title: "L'hydratation", foundation: false, problem: "≥ 2 L par jour. Eau, infusions ou thés non sucrés, eau citronnée. Ça soutient la digestion et calme les fringales.", solutionLabel: "", solution: "" },
  { n: 5, emoji: "🏃", title: "L'activité physique", foundation: false, problem: "Pas besoin de t'épuiser : vise 30 min de marche par jour (en une fois ou en sessions de 10-15 min). Pour aller plus loin, un défi 21 jours avec des séances vidéo de 20 min.", solutionLabel: "", solution: "" },
] as const;

// Sous-titre par ID de programme (robuste : survit à l'ordre + aux nouveaux
// programmes, ex. sport, contrairement à un index positionnel).
const PROGRAMME_SUBTITLE_BY_ID: Record<string, string> = {
  starter: "Pour démarrer en douceur",
  premium: "Le choix le plus complet",
  "booster-1": "Pour accélérer",
  "booster-2": "Pour pousser plus loin",
};

const WHY = [
  { emoji: "👥", title: "Une vraie communauté", body: "Un groupe privé motivant où on avance ensemble, on partage, on se tire vers le haut. Tu n'es jamais seul·e." },
  { emoji: "🤝", title: "« We Do » — on le fait ensemble", body: "Pas de PDF lâché dans la nature. On ajuste ton plan au fil des semaines, selon tes résultats et ta vie." },
  { emoji: "📱", title: "L'app de coaching sport", body: "Tes séances vidéo de 20 min, le défi 21 jours, ton suivi d'évolution — tout dans ta poche, à ton rythme." },
  { emoji: "📊", title: "Un suivi qui se voit", body: "Pesées, mensurations, courbe d'évolution : on mesure pour célébrer chaque progrès, pas pour culpabiliser." },
] as const;

const FAQ = [
  { q: "🥤 C'est des produits « miracle » ?", a: "Non. Ce sont des compléments nutritionnels qui remplacent un petit-déj ou une collation mal équilibrés. Le vrai moteur, c'est tes habitudes — {coach} t'aide à les replacer." },
  { q: "⏱ En combien de temps des résultats ?", a: "Beaucoup ressentent plus d'énergie dès les premières semaines. Pour le poids, on vise du progressif et durable — pas l'effet yo-yo. On mesure ensemble." },
  { q: "🍽 Je dois arrêter de manger normalement ?", a: "Pas du tout. Tu gardes de vrais repas (l'assiette équilibrée du plan). On structure juste le matin et les collations, là où ça pèche le plus." },
  { q: "😋 Et si je n'aime pas le goût ?", a: "Tu choisis ta saveur au démarrage (vanille, chocolat, cookies…). Et si une ne te plaît pas, on en change, simplement." },
  { q: "🤝 Je suis suivi·e comment ?", a: "Par {coach}, directement : messages, ajustements, pesées, et le groupe pour la motivation. Tu n'es jamais seul·e avec un PDF." },
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
const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12.5,
  fontWeight: 600,
  padding: "6px 13px",
  borderRadius: 999,
  border: "1px solid var(--hair-strong)",
  color: "var(--cream)",
};
const eyebrow: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 2.5,
  textTransform: "uppercase",
  color: PUBLIC_TOKENS.teal,
};
const kicker: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--cream-muted)",
  marginBottom: 14,
};
const secTitle: React.CSSProperties = {
  fontFamily: PUBLIC_FONTS.display,
  fontWeight: 700,
  fontSize: "clamp(24px,4vw,30px)",
  lineHeight: 1.18,
  letterSpacing: "-0.4px",
  margin: "12px 0 8px",
  color: "var(--cream)",
};
const bodyText: React.CSSProperties = { margin: 0, fontFamily: PUBLIC_FONTS.body, fontSize: 16, lineHeight: 1.55, color: "var(--cream)" };
const bodyMuted: React.CSSProperties = { margin: 0, fontFamily: PUBLIC_FONTS.body, color: "var(--cream-muted)", lineHeight: 1.5 };
const sectionTop: React.CSSProperties = { paddingTop: 56 };
const divider: React.CSSProperties = { height: 1, background: "var(--hair)", marginTop: 56 };
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
