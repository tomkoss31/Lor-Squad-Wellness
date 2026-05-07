// =============================================================================
// SimulateurPage — V2 funnel business (chantier 2026-11-07)
// Refonte 2026-05-08 : hypotheses recalibrees suite retour Thomas.
// =============================================================================
//
// Mini-simulateur de revenus complementaires : le prospect saisit son objectif
// EUR/mois + un delai cible, l'app calcule un plan d'action concret
// (clients reguliers, nouveaux par mois, prospects a approcher).
//
// HYPOTHESES (validees Thomas 2026-05-08) :
//   - Prix moyen programme : 200 EUR retail
//   - Marge moyenne palier Success Builder : 42% = 84 EUR / programme
//     (palier vise par defaut chez Lor'Squad — accessible des le mois 2-3
//     avec 1000 PV cumul sur 3 mois consecutifs)
//   - Engagement client : 1 programme par mois (cycle F1 ~21 jours,
//     arrondi mensuel pour simplifier)
//   - Taux conversion prospect -> client : 25% (1 sur 4)
//   - Buffer churn : 20% pour anticiper les pertes
//
// Design coherent avec /opportunite (Claude Design pixel-perfect).
// Form contact final reutilise la meme edge function `submit-prospect-lead`.
// =============================================================================

import { useState, useMemo, useEffect, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";

// ─── Hypotheses metier (transparentes en footnote) ─────────────────────────
// V2 (2026-05-08) recalibrees : palier defaut Success Builder 42% (au lieu
// de Senior Consultant 35%) + 1 prog/mois (au lieu de 1/1.5 mois).
const AVG_PROGRAM_PRICE = 200; // EUR retail moyen programme
const AVG_MARGIN_PCT = 0.42; // Success Builder 42% (palier vise par defaut)
const PROGRAMS_PER_CLIENT_MONTH = 1; // 1 programme par mois (cycle F1 ~21j)
const PROSPECT_TO_CLIENT_RATIO = 0.25; // 1 prospect sur 4 devient client
const CHURN_BUFFER = 1.2; // marge de 20% pour anticiper le churn

// ─── Presets objectif ──────────────────────────────────────────────────────
const PRESET_AMOUNTS = [100, 300, 500, 1000];
const PRESET_MONTHS = [3, 6, 12];

interface SimulationResult {
  programsPerMonth: number;
  clientsNeeded: number;
  newClientsPerMonth: number;
  prospectsPerMonth: number;
  targetTier: string;
  caRetailMonthly: number;
}

function simulate(targetEuros: number, targetMonths: number): SimulationResult {
  // V2 (2026-05-08) : palier defaut = Success Builder (42%) + 1 prog/mois
  // Marge typique : 200 × 0.42 = 84 EUR par programme
  const marginPerProgram = AVG_PROGRAM_PRICE * AVG_MARGIN_PCT;
  const programsPerMonth = targetEuros / marginPerProgram;
  // Avec 1 prog/mois par client → clientsNeeded = programsPerMonth (entier)
  const clientsNeeded = Math.ceil(programsPerMonth / PROGRAMS_PER_CLIENT_MONTH);
  const newClientsPerMonth = Math.ceil((clientsNeeded / targetMonths) * CHURN_BUFFER);
  const prospectsPerMonth = Math.ceil(newClientsPerMonth / PROSPECT_TO_CLIENT_RATIO);
  const caRetailMonthly = programsPerMonth * AVG_PROGRAM_PRICE;

  // Palier suggere selon ambition cible :
  // - jusqu'a ~600 EUR/mois : Success Builder 42% (default)
  // - 600-1500 EUR/mois     : Supervisor 50% atteignable (4000 PV/mois)
  // - au-dela                : World Team / paliers eleves
  let targetTier = "Success Builder (42%)";
  if (targetEuros >= 1500) {
    targetTier = "World Team (50% + royalty)";
  } else if (targetEuros >= 600) {
    targetTier = "Supervisor (50%)";
  }

  return {
    programsPerMonth: Math.ceil(programsPerMonth),
    clientsNeeded,
    newClientsPerMonth,
    prospectsPerMonth,
    targetTier,
    caRetailMonthly,
  };
}

type FormStatus = "idle" | "submitting" | "success" | "error";

export function SimulateurPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const referrerId = params.get("ref");

  const [target, setTarget] = useState<number>(500);
  const [customTarget, setCustomTarget] = useState<string>("");
  const [months, setMonths] = useState<number>(6);
  const [showResult, setShowResult] = useState(false);

  // Form
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<{ firstName?: boolean; phone?: boolean; city?: boolean }>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = "La Base 360 — Simulateur de revenus";
    return () => {
      document.title = prev;
    };
  }, []);

  const result = useMemo(() => simulate(target, months), [target, months]);

  function handleCalculate() {
    const finalTarget = customTarget ? Number(customTarget) : target;
    if (Number.isFinite(finalTarget) && finalTarget > 0) {
      setTarget(finalTarget);
    }
    setShowResult(true);
    setTimeout(() => {
      document.getElementById("sim-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

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
      const { data, error } = await sb.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: firstName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          referrer_user_id: referrerId ?? undefined,
          source: "simulateur",
          // Bonus : on inclut le plan calcule en metadata pour aider le distri au rappel
          metadata: {
            target_euros: target,
            target_months: months,
            clients_needed: result.clientsNeeded,
            target_tier: result.targetTier,
          },
        },
      });
      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        const friendly = raw === "rate_limited"
          ? "Trop de tentatives — réessaie dans une heure."
          : raw;
        throw new Error(friendly);
      }
      setStatus("success");
    } catch (e2) {
      setErrorMsg(e2 instanceof Error ? e2.message : "Erreur inconnue.");
      setStatus("error");
    }
  }

  return (
    <div className="sim-page">
      <style>{SIM_STYLES}</style>

      {/* TOP BAR */}
      <header className="topbar">
        <div className="topbar-inner">
          <a href="/welcome" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              La Base 360
              <small>The wellness nutrition club · depuis 2022</small>
            </span>
          </a>
          <div className="top-actions">
            <button onClick={() => navigate("/opportunite")} className="back-btn" type="button">
              ← Retour
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="sim-hero">
        <div className="sim-hero-bg" aria-hidden="true" />
        <div className="wrap sim-hero-content">
          <span className="eyebrow reveal-now">Simulateur · 60 secondes</span>
          <h1>
            Combien tu veux <span className="accent">gagner</span>&#160;?
          </h1>
          <p className="sim-hero-sub">
            Choisis ton objectif, ton délai. On te montre exactement combien de personnes tu dois accompagner pour y arriver.
          </p>
        </div>
      </section>

      {/* ÉTAPE 1 — OBJECTIF */}
      <section>
        <div className="wrap">
          <div className="step-card">
            <div className="step-num">01</div>
            <h2>Quel est ton objectif&#160;?</h2>
            <p className="step-helper">Combien tu aimerais gagner par mois en complément&#160;?</p>

            <div className="presets-grid">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`preset-btn ${target === amt && !customTarget ? "active" : ""}`}
                  onClick={() => {
                    setTarget(amt);
                    setCustomTarget("");
                  }}
                >
                  <span className="preset-num">+{amt}€</span>
                  <span className="preset-label">/ mois</span>
                </button>
              ))}
            </div>

            <div className="custom-row">
              <span className="custom-label">Ou saisis ton montant :</span>
              <div className="custom-input-wrap">
                <input
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={50000}
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder="Ex: 750"
                  className="custom-input"
                />
                <span className="custom-suffix">€ / mois</span>
              </div>
            </div>
          </div>

          {/* ÉTAPE 2 — DÉLAI */}
          <div className="step-card">
            <div className="step-num">02</div>
            <h2>En combien de temps&#160;?</h2>
            <p className="step-helper">Plus c'est court, plus il faut t'investir. Tu choisis ton tempo.</p>

            <div className="months-grid">
              {PRESET_MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`months-btn ${months === m ? "active" : ""}`}
                  onClick={() => setMonths(m)}
                >
                  <span className="months-num">{m} mois</span>
                  <span className="months-label">
                    {m === 3 ? "Sprint" : m === 6 ? "Équilibre" : "Marathon"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button onClick={handleCalculate} className="cta-calc" type="button">
              Calcule mon plan d'action →
            </button>
          </div>
        </div>
      </section>

      {/* ÉTAPE 3 — RÉSULTAT */}
      {showResult ? (
        <>
          <section id="sim-result" className="result-section">
            <div className="wrap">
              <span className="eyebrow">Ton plan personnalisé</span>
              <h2>
                Pour <span className="accent">{customTarget || target}€/mois</span> en{" "}
                <span className="accent">{months} mois</span>
              </h2>
              <p className="step-helper">Voici exactement ce qu'il te faut viser. Concret. Faisable.</p>

              <div className="result-grid">
                <div className="result-card">
                  <div className="result-icon">👥</div>
                  <div className="result-num">{result.clientsNeeded}</div>
                  <div className="result-label">CLIENTS</div>
                  <div className="result-sub">
                    réguliers à fidéliser
                    <br />
                    en {months} mois
                  </div>
                </div>
                <div className="result-card alt">
                  <div className="result-icon">📈</div>
                  <div className="result-num">{result.newClientsPerMonth}</div>
                  <div className="result-label">PAR MOIS</div>
                  <div className="result-sub">
                    nouveaux clients
                    <br />à recruter
                  </div>
                </div>
                <div className="result-card alt2">
                  <div className="result-icon">🎯</div>
                  <div className="result-num">{result.prospectsPerMonth}</div>
                  <div className="result-label">PROSPECTS</div>
                  <div className="result-sub">
                    à aborder par mois
                    <br />
                    (1 sur 4 convertit)
                  </div>
                </div>
              </div>

              <div className="result-summary">
                <div className="summary-line">
                  <span>🎖️ Palier visé</span>
                  <strong>{result.targetTier}</strong>
                </div>
                <div className="summary-line">
                  <span>💰 Marge typique</span>
                  <strong>~ 84 € par programme vendu</strong>
                </div>
                <div className="summary-line">
                  <span>📦 Programmes / mois</span>
                  <strong>{result.programsPerMonth} programmes</strong>
                </div>
              </div>

              {/* V2 (2026-05-08) refonte : tableau progression 3 paliers
                  pour montrer concretement comment le revenu evolue selon
                  le nombre de clients reguliers fideliser. */}
              <div className="progression-block">
                <div className="progression-title">
                  <span aria-hidden="true">📈</span> Voici comment ton revenu évolue
                </div>
                <div className="progression-list">
                  <div className="progression-row">
                    <span className="progression-badge bronze">🥉</span>
                    <div className="progression-info">
                      <strong>Senior Consultant 35 %</strong>
                      <span>5 clients réguliers · 5 programmes/mois</span>
                    </div>
                    <span className="progression-amount">~ 350 €<small>/mois</small></span>
                  </div>
                  <div className="progression-row highlight">
                    <span className="progression-badge silver">🥈</span>
                    <div className="progression-info">
                      <strong>Success Builder 42 %</strong>
                      <span>10 clients réguliers · 10 programmes/mois</span>
                    </div>
                    <span className="progression-amount">~ 840 €<small>/mois</small></span>
                  </div>
                  <div className="progression-row">
                    <span className="progression-badge gold">🥇</span>
                    <div className="progression-info">
                      <strong>Supervisor 50 %</strong>
                      <span>20 clients réguliers · 20 programmes/mois</span>
                    </div>
                    <span className="progression-amount">~ 2 000 €<small>/mois</small></span>
                  </div>
                </div>
              </div>

              {/* V2 (2026-05-08) : effet equipe — bonus royalty 5% si un
                  ami demarre comme toi. Royalty Override Herbalife reel. */}
              <div className="team-bonus-block">
                <div className="team-bonus-title">
                  <span aria-hidden="true">✨</span> Et si un ami démarre avec toi ?
                </div>
                <p className="team-bonus-desc">
                  Tu touches <strong>5 % de royalty</strong> sur sa production
                  tant qu'il vend. Sans rien faire de plus que l'avoir
                  accompagné au démarrage.
                </p>
                <div className="team-bonus-example">
                  <div className="team-bonus-row">
                    <span>Ton ami fait 10 clients (Success Builder)</span>
                    <strong>2 000 € CA / mois</strong>
                  </div>
                  <div className="team-bonus-row plus">
                    <span>Tu gagnes 5 % de royalty</span>
                    <strong>+ 100 € / mois</strong>
                  </div>
                  <div className="team-bonus-total">
                    <span>Ton revenu combiné (toi + royalty)</span>
                    <strong>~ 940 € / mois</strong>
                  </div>
                </div>
              </div>

              <p className="hypotheses-note">
                💡 Calcul basé sur&#160;: programme moyen 200 € retail · marge
                moyenne 42 % (palier Success Builder accessible avec 1 000 PV
                cumulés sur 3 mois consécutifs) · 1 programme par mois par client
                régulier (cycle F1 ~21 jours) · taux de conversion prospect →
                client de 25 % · buffer churn de 20 % sur le recrutement
                mensuel.
              </p>
            </div>
          </section>

          {/* CTA — formulaire contact */}
          <section className="final-cta" id="contact">
            <div className="wrap">
              <div className="final-cta-grid">
                <div>
                  <div className="promise">On te rappelle dans les 48h max.</div>
                  <h2>
                    Tu veux qu'on construise <span className="accent-light">ce plan</span> ensemble&#160;?
                  </h2>
                  <p className="final-cta-lead">
                    On t'appelle pour échanger sur ton plan personnalisé{" "}
                    <strong>+{customTarget || target}€/mois en {months} mois</strong>.
                    Aucune obligation. Juste une discussion concrète sur si c'est faisable
                    pour toi.
                  </p>
                  <ul className="cta-list">
                    <li>· On regarde ensemble si l'objectif est réaliste</li>
                    <li>· On adapte le plan à ton temps disponible</li>
                    <li>· Tu décides ensuite si tu veux démarrer ou pas</li>
                  </ul>
                </div>

                <div className={`form-card ${status === "success" ? "sent" : ""}`}>
                  <h3>Réserver mon échange</h3>
                  <p className="helper">Ton plan est prêt. Plus qu'à en parler.</p>
                  <form onSubmit={handleSubmit} noValidate>
                    <div className={`field ${errors.firstName ? "error" : ""}`}>
                      <label htmlFor="sim-firstname">Prénom</label>
                      <input
                        id="sim-firstname"
                        type="text"
                        autoComplete="given-name"
                        placeholder="Prénom"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (errors.firstName) setErrors((p) => ({ ...p, firstName: false }));
                        }}
                      />
                      <div className="field-error">Indique ton prénom.</div>
                    </div>
                    <div className={`field ${errors.phone ? "error" : ""}`}>
                      <label htmlFor="sim-phone">Téléphone</label>
                      <input
                        id="sim-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="06 12 34 56 78"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (errors.phone) setErrors((p) => ({ ...p, phone: false }));
                        }}
                      />
                      <div className="field-error">Numéro à 10 chiffres requis.</div>
                    </div>
                    <div className={`field ${errors.city ? "error" : ""}`}>
                      <label htmlFor="sim-city">Ville</label>
                      <input
                        id="sim-city"
                        type="text"
                        autoComplete="address-level2"
                        placeholder="Ville (ou région)"
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (errors.city) setErrors((p) => ({ ...p, city: false }));
                        }}
                      />
                      <div className="field-error">Indique ta ville ou région.</div>
                    </div>
                    <button type="submit" className="submit-btn" disabled={status === "submitting"}>
                      {status === "submitting" ? "Envoi..." : "On m'appelle dans les 48h →"}
                    </button>
                    {status === "error" ? <p className="form-error-msg">{errorMsg}</p> : null}
                    <p className="legal">
                      En envoyant, tu acceptes d'être recontacté·e par La Base 360.
                    </p>
                  </form>
                  <div className="form-success">
                    <div className="success-icon">✓</div>
                    <h3>C'est noté {firstName}&#160;!</h3>
                    <p>
                      Ton plan <strong>+{customTarget || target}€/mois en {months} mois</strong>{" "}
                      est partagé avec notre équipe. On te rappelle <strong>dans les 48h</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <footer className="sim-footer">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            La Base 360<small>The wellness nutrition club · depuis 2022</small>
          </span>
        </div>
        <p>© 2026 La Base 360 — Simulation pédagogique. Les revenus réels dépendent de l'engagement et de l'activité.</p>
      </footer>
    </div>
  );
}

const SIM_STYLES = `
.sim-page {
  --sim-emerald: #10B981;
  --sim-cyan: #06B6D4;
  --sim-violet: #8B5CF6;
  --sim-gold: #B8922A;
  --sim-ink: #0F172A;
  --sim-ink-soft: #1e293b;
  --sim-muted: #64748b;
  --sim-line: #e2e8f0;
  --sim-mist: #FAFAFC;
  --sim-shadow-sm: 0 1px 2px rgba(15,23,42,.04), 0 2px 6px rgba(15,23,42,.04);
  --sim-shadow-md: 0 4px 12px rgba(15,23,42,.06), 0 12px 32px rgba(15,23,42,.06);
  --sim-shadow-lg: 0 8px 24px rgba(15,23,42,.08), 0 24px 60px rgba(15,23,42,.10);
  --sim-radius: 14px;
  --sim-radius-lg: 22px;
  --sim-maxw: 1180px;
  --sim-font-display: "Sora", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --sim-font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-family: var(--sim-font-body);
  color: var(--sim-ink);
  background: var(--sim-mist);
  line-height: 1.55;
  font-size: 17px;
  -webkit-font-smoothing: antialiased;
}
.sim-page *, .sim-page *::before, .sim-page *::after { box-sizing: border-box; }
.sim-page button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
.sim-page a { color: inherit; text-decoration: none; }
.sim-page input { font: inherit; color: inherit; }
.sim-page h1, .sim-page h2, .sim-page h3 {
  font-family: var(--sim-font-display); font-weight: 800; letter-spacing: -.02em;
  line-height: 1.08; margin: 0 0 .4em; color: var(--sim-ink); text-wrap: balance;
}
.sim-page p { margin: 0 0 1em; }
.sim-page p:last-child { margin-bottom: 0; }

.sim-page .wrap { max-width: var(--sim-maxw); margin: 0 auto; padding: 0 24px; }
.sim-page section { padding: 80px 0; position: relative; }
@media (max-width: 720px) { .sim-page section { padding: 56px 0; } }

.sim-page .topbar {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in oklab, var(--sim-mist) 88%, transparent);
  backdrop-filter: saturate(140%) blur(10px);
  border-bottom: 1px solid color-mix(in oklab, var(--sim-ink) 6%, transparent);
}
.sim-page .topbar-inner {
  max-width: var(--sim-maxw); margin: 0 auto; padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.sim-page .brand { display: flex; align-items: center; gap: 10px; font-family: var(--sim-font-display); font-weight: 800; letter-spacing: -.02em; }
.sim-page .brand-mark {
  width: 28px; height: 28px; border-radius: 8px;
  background: conic-gradient(from 200deg at 50% 50%, var(--sim-emerald), var(--sim-cyan), var(--sim-violet), var(--sim-emerald));
  position: relative;
}
.sim-page .brand-mark::after { content: ""; position: absolute; inset: 6px; border-radius: 4px; background: var(--sim-mist); }
.sim-page .brand-text { font-size: 16px; }
.sim-page .brand-text small { display: block; font-family: var(--sim-font-body); font-weight: 500; font-size: 11px; color: var(--sim-muted); letter-spacing: 0; }
.sim-page .back-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 600; font-size: 14px; padding: 9px 14px; border-radius: 10px;
  border: 1px solid var(--sim-line); background: white; color: var(--sim-ink);
}
.sim-page .back-btn:hover { border-color: var(--sim-ink); }

.sim-page .eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--sim-font-body); font-weight: 700; font-size: 12px;
  letter-spacing: .14em; text-transform: uppercase; color: var(--sim-emerald);
  padding: 6px 12px; border-radius: 999px;
  background: color-mix(in oklab, var(--sim-emerald) 10%, white);
  border: 1px solid color-mix(in oklab, var(--sim-emerald) 18%, transparent);
}
.sim-page .eyebrow::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: var(--sim-emerald);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--sim-emerald) 18%, transparent);
}

/* HERO */
.sim-page .sim-hero {
  position: relative; text-align: center; padding: 80px 0 50px; overflow: hidden;
}
.sim-page .sim-hero-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.sim-page .sim-hero-bg::before, .sim-page .sim-hero-bg::after {
  content: ""; position: absolute; border-radius: 50%; filter: blur(80px); opacity: .55;
}
.sim-page .sim-hero-bg::before {
  width: 480px; height: 480px; left: -120px; top: -120px;
  background: radial-gradient(closest-side, color-mix(in oklab, var(--sim-cyan) 50%, transparent), transparent);
}
.sim-page .sim-hero-bg::after {
  width: 520px; height: 520px; right: -120px; top: 0;
  background: radial-gradient(closest-side, color-mix(in oklab, var(--sim-emerald) 40%, transparent), transparent);
}
.sim-page .sim-hero-content { position: relative; z-index: 1; }
.sim-page .sim-hero h1 {
  font-size: clamp(36px, 6vw, 64px); margin: 18px auto 16px; max-width: 14ch;
}
.sim-page .sim-hero h1 .accent {
  background: linear-gradient(120deg, var(--sim-emerald), var(--sim-cyan) 55%, var(--sim-violet));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.sim-page .sim-hero-sub {
  font-size: clamp(16px, 1.8vw, 19px); color: var(--sim-ink-soft);
  max-width: 56ch; margin: 0 auto;
}

/* STEP CARDS */
.sim-page .step-card {
  background: white; border: 1px solid var(--sim-line); border-radius: var(--sim-radius-lg);
  padding: 36px clamp(24px, 4vw, 48px); margin-bottom: 24px;
  position: relative;
  box-shadow: var(--sim-shadow-sm);
}
.sim-page .step-num {
  position: absolute; top: -16px; left: 32px;
  background: linear-gradient(135deg, var(--sim-emerald), var(--sim-cyan), var(--sim-violet));
  color: white; padding: 6px 14px; border-radius: 999px;
  font-family: var(--sim-font-display); font-weight: 800; font-size: 13px;
  letter-spacing: .08em; box-shadow: 0 6px 18px rgba(16,185,129,.32);
}
.sim-page .step-card h2 { font-size: clamp(22px, 3vw, 30px); margin: 8px 0 6px; }
.sim-page .step-helper { color: var(--sim-muted); font-size: 15px; margin-bottom: 24px; }

/* PRESETS */
.sim-page .presets-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;
}
.sim-page .preset-btn {
  background: white; border: 1.5px solid var(--sim-line); border-radius: 14px;
  padding: 18px 12px; transition: all .15s ease;
  display: flex; flex-direction: column; gap: 4px; align-items: center;
}
.sim-page .preset-btn:hover { border-color: var(--sim-emerald); transform: translateY(-2px); }
.sim-page .preset-btn.active {
  border-color: var(--sim-emerald); border-width: 2px;
  background: color-mix(in oklab, var(--sim-emerald) 8%, white);
  box-shadow: 0 6px 18px rgba(16,185,129,.18);
}
.sim-page .preset-num {
  font-family: var(--sim-font-display); font-weight: 800; font-size: clamp(20px, 3vw, 28px);
  color: var(--sim-ink); letter-spacing: -.02em;
}
.sim-page .preset-btn.active .preset-num {
  background: linear-gradient(120deg, var(--sim-emerald), var(--sim-cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.sim-page .preset-label { font-size: 12px; color: var(--sim-muted); }
@media (max-width: 720px) { .sim-page .presets-grid { grid-template-columns: repeat(2, 1fr); } }

.sim-page .custom-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding-top: 16px; border-top: 1px solid var(--sim-line);
}
.sim-page .custom-label { color: var(--sim-muted); font-size: 14px; }
.sim-page .custom-input-wrap {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--sim-mist); border: 1px solid var(--sim-line);
  border-radius: 10px; padding: 4px 14px;
  flex: 1; max-width: 280px;
}
.sim-page .custom-input {
  border: none; background: transparent; padding: 8px 0;
  font-size: 16px; width: 100%; outline: none;
}
.sim-page .custom-suffix { color: var(--sim-muted); font-size: 14px; white-space: nowrap; }

/* MONTHS */
.sim-page .months-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}
.sim-page .months-btn {
  background: white; border: 1.5px solid var(--sim-line); border-radius: 14px;
  padding: 22px 16px; transition: all .15s ease;
  display: flex; flex-direction: column; gap: 4px; align-items: center;
}
.sim-page .months-btn:hover { border-color: var(--sim-cyan); transform: translateY(-2px); }
.sim-page .months-btn.active {
  border-color: var(--sim-cyan); border-width: 2px;
  background: color-mix(in oklab, var(--sim-cyan) 8%, white);
  box-shadow: 0 6px 18px rgba(6,182,212,.18);
}
.sim-page .months-num {
  font-family: var(--sim-font-display); font-weight: 800; font-size: clamp(22px, 3vw, 28px);
  color: var(--sim-ink); letter-spacing: -.02em;
}
.sim-page .months-btn.active .months-num {
  background: linear-gradient(120deg, var(--sim-cyan), var(--sim-violet));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.sim-page .months-label { font-size: 12px; color: var(--sim-muted); text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }

/* CTA CALC */
.sim-page .cta-calc {
  background: var(--sim-ink); color: white;
  padding: 16px 32px; border-radius: 14px;
  font-family: var(--sim-font-display); font-weight: 700; font-size: 17px;
  box-shadow: var(--sim-shadow-md);
  transition: transform .15s ease, box-shadow .2s ease;
}
.sim-page .cta-calc:hover { transform: translateY(-1px); box-shadow: var(--sim-shadow-lg); }

/* RESULT */
.sim-page .result-section {
  background: linear-gradient(180deg, var(--sim-mist), white);
  scroll-margin-top: 80px;
}
.sim-page .result-section h2 {
  font-size: clamp(28px, 4vw, 44px); margin-bottom: 12px;
}
.sim-page .result-section h2 .accent {
  background: linear-gradient(120deg, var(--sim-emerald), var(--sim-cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.sim-page .result-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 36px;
}
.sim-page .result-card {
  background: white; border: 1px solid var(--sim-line); border-radius: var(--sim-radius-lg);
  padding: 32px 24px; text-align: center;
  border-top: 4px solid var(--sim-emerald);
  box-shadow: var(--sim-shadow-sm);
}
.sim-page .result-card.alt { border-top-color: var(--sim-cyan); }
.sim-page .result-card.alt2 { border-top-color: var(--sim-violet); }
.sim-page .result-icon { font-size: 36px; margin-bottom: 12px; }
.sim-page .result-num {
  font-family: var(--sim-font-display); font-weight: 800; font-size: clamp(48px, 7vw, 80px);
  letter-spacing: -.04em; line-height: 1;
  background: linear-gradient(120deg, var(--sim-emerald), var(--sim-cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin-bottom: 8px;
}
.sim-page .result-card.alt .result-num { background: linear-gradient(120deg, var(--sim-cyan), var(--sim-violet)); -webkit-background-clip: text; background-clip: text; }
.sim-page .result-card.alt2 .result-num { background: linear-gradient(120deg, var(--sim-violet), var(--sim-gold)); -webkit-background-clip: text; background-clip: text; }
.sim-page .result-label {
  font-family: var(--sim-font-display); font-weight: 800; font-size: 13px;
  letter-spacing: .12em; color: var(--sim-ink-soft); margin-bottom: 8px;
}
.sim-page .result-sub { color: var(--sim-muted); font-size: 14px; line-height: 1.5; }
@media (max-width: 880px) { .sim-page .result-grid { grid-template-columns: 1fr; } }

.sim-page .result-summary {
  background: var(--sim-ink); color: white; border-radius: var(--sim-radius-lg);
  padding: 28px 32px; margin-top: 24px;
}
.sim-page .summary-line {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.1); gap: 16px;
}
.sim-page .summary-line:last-child { border-bottom: 0; }
.sim-page .summary-line span { color: rgba(255,255,255,.7); font-size: 14px; }
.sim-page .summary-line strong { font-family: var(--sim-font-display); font-size: 16px; letter-spacing: -.01em; }

.sim-page .hypotheses-note {
  margin-top: 24px; font-size: 13px; color: var(--sim-muted);
  font-style: italic; line-height: 1.6; padding: 16px 20px;
  background: var(--sim-mist); border-radius: 12px;
}

/* V2 progression 3 paliers (chantier 2026-05-08) */
.sim-page .progression-block {
  margin-top: 24px; background: white;
  border: 1.5px solid var(--sim-line); border-radius: var(--sim-radius-lg);
  padding: 24px 28px;
}
.sim-page .progression-title {
  font-family: var(--sim-font-display); font-weight: 800;
  font-size: 18px; margin-bottom: 18px;
  display: flex; align-items: center; gap: 10px;
  color: var(--sim-ink);
}
.sim-page .progression-list {
  display: flex; flex-direction: column; gap: 10px;
}
.sim-page .progression-row {
  display: grid; grid-template-columns: 48px 1fr auto; gap: 14px;
  align-items: center; padding: 14px 16px;
  border: 1px solid var(--sim-line); border-radius: 12px;
  background: var(--sim-mist);
  transition: transform .18s ease, border-color .18s ease;
}
.sim-page .progression-row:hover { transform: translateY(-1px); }
.sim-page .progression-row.highlight {
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--sim-emerald) 8%, white) 0%,
    color-mix(in oklab, var(--sim-cyan) 6%, white) 50%,
    color-mix(in oklab, var(--sim-violet) 8%, white) 100%);
  border-color: color-mix(in oklab, var(--sim-emerald) 30%, var(--sim-line));
  box-shadow: 0 4px 14px -6px color-mix(in oklab, var(--sim-emerald) 35%, transparent);
}
.sim-page .progression-badge {
  font-size: 28px; line-height: 1; text-align: center;
}
.sim-page .progression-info {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.sim-page .progression-info strong {
  font-family: var(--sim-font-display); font-weight: 700;
  font-size: 15px; color: var(--sim-ink); letter-spacing: -.005em;
}
.sim-page .progression-info span {
  font-size: 12.5px; color: var(--sim-muted); font-weight: 500;
}
.sim-page .progression-amount {
  font-family: var(--sim-font-display); font-weight: 800;
  font-size: 22px; letter-spacing: -.02em;
  background: linear-gradient(135deg, var(--sim-emerald), var(--sim-cyan), var(--sim-violet));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  white-space: nowrap;
}
.sim-page .progression-amount small {
  font-size: 12px; font-weight: 500;
  -webkit-text-fill-color: var(--sim-muted);
  background: none;
}

/* V2 effet equipe / ami filleul (chantier 2026-05-08) */
.sim-page .team-bonus-block {
  margin-top: 16px;
  background: linear-gradient(135deg,
    color-mix(in oklab, var(--sim-violet) 12%, white) 0%,
    color-mix(in oklab, var(--sim-emerald) 8%, white) 100%);
  border: 1.5px solid color-mix(in oklab, var(--sim-violet) 28%, var(--sim-line));
  border-radius: var(--sim-radius-lg);
  padding: 24px 28px;
  position: relative; overflow: hidden;
}
.sim-page .team-bonus-block::before {
  content: ""; position: absolute; top: -80px; right: -60px;
  width: 220px; height: 220px;
  background: radial-gradient(circle, color-mix(in oklab, var(--sim-violet) 20%, transparent), transparent 65%);
  pointer-events: none; filter: blur(8px);
}
.sim-page .team-bonus-title {
  font-family: var(--sim-font-display); font-weight: 800;
  font-size: 18px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 10px;
  color: var(--sim-ink); position: relative; z-index: 1;
}
.sim-page .team-bonus-desc {
  margin: 0 0 16px; font-size: 14px; color: var(--sim-ink);
  line-height: 1.55; opacity: 0.85; position: relative; z-index: 1;
}
.sim-page .team-bonus-desc strong {
  background: linear-gradient(135deg, var(--sim-emerald), var(--sim-cyan));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  font-weight: 800;
}
.sim-page .team-bonus-example {
  background: white; border-radius: 12px; padding: 14px 18px;
  position: relative; z-index: 1;
  border: 1px solid color-mix(in oklab, var(--sim-violet) 14%, var(--sim-line));
}
.sim-page .team-bonus-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; gap: 12px; font-size: 14px;
  border-bottom: 1px solid var(--sim-line);
}
.sim-page .team-bonus-row span { color: var(--sim-ink); opacity: 0.85; }
.sim-page .team-bonus-row strong {
  font-family: var(--sim-font-display); font-weight: 700;
  font-size: 15px; color: var(--sim-ink); white-space: nowrap;
}
.sim-page .team-bonus-row.plus strong {
  color: var(--sim-emerald);
}
.sim-page .team-bonus-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0 4px; gap: 12px;
  border-top: none;
}
.sim-page .team-bonus-total span {
  font-size: 13px; color: var(--sim-ink); opacity: 0.7;
  text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
}
.sim-page .team-bonus-total strong {
  font-family: var(--sim-font-display); font-weight: 800;
  font-size: 22px; letter-spacing: -.02em;
  background: linear-gradient(135deg, var(--sim-emerald), var(--sim-cyan), var(--sim-violet));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  white-space: nowrap;
}
@media (max-width: 880px) {
  .sim-page .progression-row {
    grid-template-columns: 36px 1fr; grid-template-rows: auto auto;
    padding: 12px 14px;
  }
  .sim-page .progression-amount {
    grid-column: 1 / -1; text-align: right; font-size: 18px;
  }
  .sim-page .team-bonus-row, .sim-page .team-bonus-total {
    flex-direction: column; align-items: flex-start; gap: 4px;
  }
}

/* FINAL CTA / FORM (similaire OpportunitePage) */
.sim-page .final-cta {
  background: var(--sim-ink); color: white; position: relative; overflow: hidden;
}
.sim-page .final-cta::before {
  content: ""; position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
  width: 800px; height: 800px;
  background: radial-gradient(closest-side, color-mix(in oklab, var(--sim-emerald) 18%, transparent), transparent 70%);
  pointer-events: none;
}
.sim-page .final-cta-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 56px;
  align-items: center; position: relative; z-index: 1;
}
.sim-page .final-cta h2 { color: white; font-size: clamp(28px, 4vw, 44px); }
.sim-page .final-cta h2 .accent-light {
  background: linear-gradient(120deg, var(--sim-emerald), var(--sim-cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.sim-page .final-cta-lead {
  color: rgba(255,255,255,.78); font-size: 17px;
  max-width: 50ch; margin-bottom: 24px;
}
.sim-page .cta-list {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 10px;
  color: rgba(255,255,255,.78); font-size: 15px;
}
.sim-page .promise {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 14px; border-radius: 999px;
  background: color-mix(in oklab, var(--sim-emerald) 18%, transparent);
  border: 1px solid color-mix(in oklab, var(--sim-emerald) 30%, transparent);
  font-size: 13px; font-weight: 600; color: var(--sim-emerald); margin-bottom: 14px;
}
.sim-page .promise::before {
  content: ""; width: 8px; height: 8px; border-radius: 50%;
  background: var(--sim-emerald);
  box-shadow: 0 0 0 5px color-mix(in oklab, var(--sim-emerald) 22%, transparent);
  animation: sim-pulse 2s ease-in-out infinite;
}
@keyframes sim-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }

.sim-page .form-card {
  background: white; color: var(--sim-ink);
  border-radius: 24px; padding: 32px;
  box-shadow: var(--sim-shadow-lg);
}
.sim-page .form-card h3 { font-size: 22px; margin-bottom: 4px; }
.sim-page .form-card .helper { color: var(--sim-muted); font-size: 14px; margin-bottom: 22px; }
.sim-page .field { margin-bottom: 14px; }
.sim-page .field label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px; color: var(--sim-ink-soft); }
.sim-page .field input {
  width: 100%; padding: 13px 14px; border-radius: 10px;
  border: 1px solid var(--sim-line); background: var(--sim-mist); font-size: 16px;
  transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
}
.sim-page .field input:focus {
  outline: none; border-color: var(--sim-emerald); background: white;
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--sim-emerald) 18%, transparent);
}
.sim-page .field.error input { border-color: #ef4444; background: #fef2f2; }
.sim-page .field-error { color: #ef4444; font-size: 12px; margin-top: 4px; display: none; }
.sim-page .field.error .field-error { display: block; }
.sim-page .submit-btn {
  width: 100%; margin-top: 8px;
  background: var(--sim-emerald); color: white;
  padding: 16px; border-radius: 12px;
  font-weight: 700; font-size: 16px;
  box-shadow: 0 8px 22px color-mix(in oklab, var(--sim-emerald) 32%, transparent);
}
.sim-page .submit-btn:hover:not(:disabled) { transform: translateY(-1px); }
.sim-page .submit-btn:disabled { opacity: 0.7; cursor: wait; }
.sim-page .form-error-msg { color: #dc2626; font-size: 13px; margin-top: 10px; }
.sim-page .form-success { display: none; text-align: center; padding: 20px 0; }
.sim-page .form-card.sent .form-success { display: block; }
.sim-page .form-card.sent form { display: none; }
.sim-page .success-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: color-mix(in oklab, var(--sim-emerald) 14%, white); color: var(--sim-emerald);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 32px; font-weight: 800; margin-bottom: 16px;
}
.sim-page .legal { font-size: 12px; color: var(--sim-muted); text-align: center; margin-top: 12px; }
@media (max-width: 880px) { .sim-page .final-cta-grid { grid-template-columns: 1fr; gap: 32px; } }

/* FOOTER */
.sim-page .sim-footer {
  padding: 36px 24px; text-align: center; color: var(--sim-muted); font-size: 13px;
  border-top: 1px solid var(--sim-line); background: var(--sim-mist);
}
.sim-page .sim-footer .brand { justify-content: center; margin-bottom: 8px; }
`;
