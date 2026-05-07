// =============================================================================
// OpportunitePage — V2 port Claude Design (chantier 2026-11-07)
// =============================================================================
//
// Refonte complete suite a brief sur Claude Design + retour Thomas "incroyable".
// Port pixel-perfect du design Claude Design HTML standalone vers React,
// avec ajout des CONNECTEURS techniques que Claude Design ne pouvait pas faire :
//   - Form qui appelle reellement l'edge function `submit-prospect-lead`
//   - Tracking `?ref=[user_id]` capte et envoye en backend (V2 referrer)
//   - Bouton retour Welcome (coherence app)
//   - Reveal animations via IntersectionObserver (port en useEffect)
//   - FAQ accordion (port en useState)
//
// Le design HTML standalone original reste accessible sous /opportunite-claude.html
// pour archivage et comparaison.
// =============================================================================

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function OpportunitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const referrerId = params.get("ref"); // V2 tracking : qui a partage la page

  // ─── Form state ─────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<{ firstName?: boolean; phone?: boolean; city?: boolean }>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ─── FAQ accordion state ────────────────────────────────────────────────
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ─── Reveal animations (port IntersectionObserver Claude Design) ────────
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ─── Page title ─────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.title;
    document.title = "La Base 360 — L'opportunité";
    return () => {
      document.title = prev;
    };
  }, []);

  // ─── Form submit avec edge function reelle ──────────────────────────────
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
          // V2 : tracking referrer pour stats Co-pilote
          referrer_user_id: referrerId ?? undefined,
          source: "opportunite",
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
      // Smooth scroll vers le form pour montrer le success message
      window.scrollTo({
        top: (document.getElementById("formCard")?.getBoundingClientRect().top ?? 0) + window.scrollY - 80,
        behavior: "smooth",
      });
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : "Erreur inconnue.";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  function clearError(field: keyof typeof errors) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  }

  return (
    <div ref={containerRef} className="opp-page">
      <style>{OPP_STYLES}</style>

      {/* TOP BAR */}
      <header className="topbar">
        <div className="topbar-inner">
          <a href="#top" className="brand" aria-label="La Base 360">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              La Base 360
              <small>The wellness nutrition club · depuis 2022</small>
            </span>
          </a>
          <div className="top-actions">
            <button
              className="back-btn"
              onClick={() => navigate("/welcome")}
              type="button"
              aria-label="Retour Welcome"
            >
              ← Welcome
            </button>
            <button
              className="print-btn"
              onClick={() => window.print()}
              type="button"
              aria-label="Imprimer ou exporter en PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Imprimer / PDF
            </button>
          </div>
        </div>
      </header>

      <a id="top" />

      {/* 1. HERO */}
      <section className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-bg" aria-hidden="true" />
        <div className="wrap hero-content">
          <span className="eyebrow hero-eyebrow reveal">Opportunité 2026 · Ouverte aux nouveaux</span>
          <h1 className="reveal">
            Et si tu transformais ce que tu fais déjà en{" "}
            <span className="accent">revenu</span>&#160;?
          </h1>
          <p className="hero-sub reveal">
            Manger mieux. Te sentir mieux. Et le partager autour de toi. C'est tout ce que ça demande pour démarrer.
          </p>
          <div className="hero-cta reveal">
            <a href="#contact" className="btn btn-primary">
              Réserver mon échange
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a href="#why" className="btn btn-ghost">
              Découvrir comment
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </a>
          </div>
          <div className="hero-meta reveal">
            <span><b>4 ans</b> sur le terrain</span>
            <span><b>200+</b> distributeurs accompagnés</span>
            <span><b>0€</b> de stock obligatoire</span>
          </div>
        </div>
      </section>

      {/* 2. POURQUOI */}
      <section id="why">
        <div className="wrap">
          <span className="eyebrow reveal">Pourquoi nous rejoindre</span>
          <h2 className="h-section reveal">
            La santé est devenue un sujet de société.
            <br />Et un vrai marché.
          </h2>
          <p className="reveal" style={{ color: "var(--opp-muted)", maxWidth: "60ch", marginTop: 8 }}>
            Les chiffres parlent d'eux-mêmes. Aider les gens à se sentir mieux, c'est un service qui se paie — et qui se développe partout en France.
          </p>

          <div className="stats-row reveal" style={{ marginTop: 40 }}>
            <div className="stat-card">
              <div className="stat-num">1 / 2</div>
              <div className="stat-label">Français en surpoids ou en situation d'obésité.</div>
            </div>
            <div className="stat-card alt">
              <div className="stat-num">7 / 10</div>
              <div className="stat-label">Adultes disent manquer d'énergie au quotidien.</div>
            </div>
          </div>

          <div className="pillars">
            <div className="pillar reveal">
              <div className="pillar-num">01</div>
              <div className="pillar-title">Marque mondiale</div>
              <div className="pillar-text">40 ans d'expérience, présente dans 90 pays, gamme nutrition reconnue.</div>
            </div>
            <div className="pillar reveal">
              <div className="pillar-num">02</div>
              <div className="pillar-title">Modèle simple</div>
              <div className="pillar-text">Pas d'invention à faire. Tu suis un système qui a fait ses preuves.</div>
            </div>
            <div className="pillar reveal">
              <div className="pillar-num">03</div>
              <div className="pillar-title">Équipe formée</div>
              <div className="pillar-text">Un mentor te suit dès le jour 1. Tu n'es jamais seul·e face au démarrage.</div>
            </div>
            <div className="pillar reveal">
              <div className="pillar-num">04</div>
              <div className="pillar-title">Liberté totale</div>
              <div className="pillar-text">Pas de patron, pas d'horaires. Tu décides du rythme et des objectifs.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TROIS FAÇONS */}
      <section style={{ background: "white" }}>
        <div className="wrap">
          <span className="eyebrow reveal">Trois façons de gagner</span>
          <h2 className="h-section reveal">
            Choisis ton point de départ.
            <br />Et fais évoluer le projet à ton rythme.
          </h2>

          <div className="ways">
            <article className="way w1 reveal">
              <div className="way-step">Étape 01</div>
              <h3>Consommer</h3>
              <p>Tu utilises les produits pour toi et ta famille, et tu profites du tarif distributeur.</p>
              <div className="way-figure">−25 à −50%</div>
              <p>de remise sur tes commandes personnelles selon ton palier.</p>
            </article>
            <article className="way w2 reveal">
              <div className="way-step">Étape 02</div>
              <h3>Partager</h3>
              <p>Tu accompagnes des clients dans leur démarche bien-être, à temps choisi.</p>
              <div className="way-figure">25 à 50%</div>
              <p>de marge sur chaque programme vendu en direct.</p>
            </article>
            <article className="way w3 reveal">
              <div className="way-step">Étape 03</div>
              <h3>Construire</h3>
              <p>Tu formes ton équipe et tu construis un revenu démultiplié, à long terme.</p>
              <div className="way-figure">+5%</div>
              <p>de royalty sur le volume des 3 premiers niveaux Supervisor sous toi.</p>
            </article>
          </div>
        </div>
      </section>

      {/* 4. PALIERS */}
      <section>
        <div className="wrap">
          <span className="eyebrow reveal">5 paliers progressifs</span>
          <h2 className="h-section reveal">
            Tu démarres à ton niveau.
            <br />Et tu montes à ton rythme.
          </h2>
          <p className="reveal" style={{ color: "var(--opp-muted)", maxWidth: "60ch" }}>
            Chaque palier débloque une remise plus élevée et un revenu potentiel plus important. Aucune obligation de monter — tu choisis.
          </p>

          <div className="tiers">
            {[
              { num: "01", name: "Client privilégié", sub: "Premier accès au tarif préférentiel. Aucun engagement.", bar: 70, pct: "−15%", cls: "t1" },
              { num: "02", name: "Distributor", sub: "Tu commences à partager. Tarif distributeur officiel.", bar: 50, pct: "−25%", cls: "t2" },
              { num: "03", name: "Senior Consultant", sub: "500 PV cumulés sur 2 mois consécutifs — activité régulière confirmée.", bar: 30, pct: "−35%", cls: "t3" },
              { num: "04", name: "Success Builder", sub: "1 000 PV cumulés sur 3 mois consécutifs — tu construis une vraie clientèle.", bar: 16, pct: "−42%", cls: "t4" },
              { num: "05", name: "Supervisor", sub: "4 000 PV en 1 mois OU 12 mois cumulés glissants — palier de référence du métier.", bar: 0, pct: "−50%", cls: "t5" },
            ].map((t) => (
              <div key={t.num} className={`tier ${t.cls} reveal`}>
                <div className="tier-num">{t.num}</div>
                <div>
                  <div className="tier-name">{t.name}</div>
                  <div className="tier-sub">{t.sub}</div>
                </div>
                <div className="tier-bar">
                  <div className="tier-bar-fill" style={{ clipPath: `inset(0 ${t.bar}% 0 0)` }} />
                </div>
                <div className="tier-discount">{t.pct}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CAS CONCRET */}
      <section style={{ background: "white" }}>
        <div className="wrap">
          <span className="eyebrow reveal">Cas concret</span>
          <h2 className="h-section reveal">Pas de jargon. Juste les chiffres.</h2>

          <div className="case reveal">
            <div className="case-grid">
              <div>
                <span className="eyebrow">Exemple chiffré</span>
                <div className="case-quote">Imagine&#160;: tu vends 10 programmes ce mois.</div>
                <p className="case-note">
                  Au palier <b style={{ color: "var(--opp-violet)" }}>Supervisor</b> (−50%), voici ce qui rentre vraiment dans ton portefeuille — sans tableur compliqué, sans points obscurs.
                </p>
              </div>
              <div className="case-calc">
                <div className="calc-row">
                  <span className="calc-label">Prix retail public</span>
                  <span className="calc-val">200,00 €</span>
                </div>
                <div className="calc-row neg">
                  <span className="calc-label">Ton prix distributeur (−50%)</span>
                  <span className="calc-val">100,00 €</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Prix de vente client</span>
                  <span className="calc-val">200,00 €</span>
                </div>
                <div className="calc-row pos">
                  <span className="calc-label">Marge par programme</span>
                  <span className="calc-val">+ 100,00 €</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">× 10 programmes vendus</span>
                  <span className="calc-val">10 × 100 €</span>
                </div>
                <div className="calc-total">
                  <div>
                    <div className="calc-total-label">Argent dans ton portefeuille</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Sur le mois, en direct.</div>
                  </div>
                  <div className="calc-total-val">1 000 €</div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <button
                type="button"
                onClick={() => navigate(referrerId ? `/simulateur?ref=${referrerId}` : "/simulateur")}
                className="btn btn-primary"
                style={{ background: "var(--opp-emerald)" }}
              >
                ✨ Calcule TON plan personnalisé →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PACK AMBASSADEUR */}
      <section>
        <div className="wrap">
          <span className="eyebrow reveal">Pack Ambassadeur</span>
          <h2 className="h-section reveal">
            Un seul investissement de départ.
            <br />Tout ce qu'il faut pour lancer.
          </h2>

          <div className="pack">
            <div className="pack-visual reveal">
              <div className="pack-price">
                <span className="label">Pack de démarrage</span>
                <span className="num">60<sup>€</sup></span>
              </div>
            </div>
            <ul className="pack-list reveal">
              {[
                ["Une boîte Formula 1", "Pour tester le produit phare et te faire ta propre opinion."],
                ["Plateforme distributeur", "Ton espace personnel pour passer commandes et suivre ton activité."],
                ["Outils digitaux", "Supports prêts à l'emploi pour partager autour de toi (visuels, scripts, fiches)."],
                ["Accompagnement mentor jour 1", "Un appel d'onboarding et un mentor dédié pour démarrer dans le bon sens."],
              ].map(([title, sub], i) => (
                <li key={i}>
                  <span className="pack-check">✓</span>
                  <div>
                    <strong>{title}</strong>
                    <span>{sub}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 7. ACCOMPAGNEMENT */}
      <section style={{ background: "white" }}>
        <div className="wrap">
          <span className="eyebrow reveal">Accompagnement</span>
          <h2 className="h-section reveal">
            Tu n'es jamais seul·e.
            <br />Quatre piliers, dès le premier jour.
          </h2>

          <div className="support">
            {[
              ["🎓", "Formation Académie", "12 modules vidéo pas-à-pas, du démarrage à l'autonomie complète."],
              ["🧭", "Mentor 1-to-1", "Un référent humain qui te suit, te débloque, et t'aide à fixer tes objectifs."],
              ["📱", "App La Base 360", "Suivi clients, rentabilité en temps réel, formations — tout dans ta poche."],
              ["💎", "Communauté entraide", "Un groupe actif. On célèbre les wins. On débloque les blocages, ensemble."],
            ].map(([icon, title, desc], i) => (
              <article key={i} className="support-card reveal">
                <div className="support-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <span className="eyebrow reveal">Les vraies questions</span>
          <h2 className="h-section reveal">
            Ce que tu te poses
            <br />(et qu'on s'est posé aussi).
          </h2>

          <div className="faq reveal">
            {[
              ["Combien de temps par semaine ?", "5 à 10h/semaine pour démarrer en complément, en gardant ton activité actuelle. Beaucoup commencent le soir et le week-end. Au-delà, c'est toi qui choisis le rythme."],
              ["Quel statut juridique ?", "Le statut le plus simple en France est la micro-entreprise (auto-entrepreneur). On t'accompagne pour la créer en ligne — ça prend 15 minutes et c'est gratuit."],
              ["Et si je n'aime pas vendre ?", "On ne « vend » pas — on partage une expérience qu'on vit nous-mêmes. Si tu sais raconter ton histoire et écouter, tu sais déjà faire le travail."],
              ["Combien de temps pour les premiers euros ?", "La plupart des démarrages voient les premiers revenus dans les 2 à 4 premières semaines. Tout dépend du temps que tu y mets et de ton réseau de départ."],
              ["Je peux arrêter quand je veux ?", "Oui, à tout moment, sans frais ni pénalité. Tu n'es pas salarié·e — tu es indépendant·e."],
              ["Faut-il stocker des produits ?", "Non. Les commandes sont expédiées directement depuis l'entrepôt à tes clients. Pas de garage à transformer en dépôt, pas de logistique à gérer."],
              ["C'est légal ?", "Oui. C'est de la vente directe, encadrée en France par la Fédération de la Vente Directe (FVD) et soumise au Code de la consommation. Tu factures, tu déclares, c'est carré."],
              ["Et si ça ne marche pas pour moi ?", "Tu n'as perdu que 60€ et le temps que tu y as mis. Tu repars avec une formation, des outils, et une expérience entrepreneuriale concrète. On t'aura prévenu·e : la seule règle, c'est de démarrer."],
            ].map(([q, a], i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    className="faq-q"
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                  >
                    {q}
                    <span className="faq-icon" aria-hidden="true" />
                  </button>
                  <div className="faq-a">
                    <div className="faq-a-inner">{a}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. STORIES */}
      <section className="story-section">
        <div className="wrap">
          <span className="eyebrow reveal">Ils l'ont fait</span>
          <h2 className="h-section reveal">
            Deux trajectoires.
            <br />Une seule règle commune.
          </h2>

          <div className="stories">
            <article className="story s1 reveal">
              <div className="story-head">
                <div className="avatar">T</div>
                <div>
                  <div className="story-name">Thomas</div>
                  <div className="story-role">Ex-conducteur d'engins · BTP, 15 ans</div>
                </div>
              </div>
              <p>
                Démarre en mai 2022. Perd 4 kg en 21 jours. Premier mois&#160;: <b>1 800 €</b>. Quatre ans plus tard, il accompagne une équipe de plus de 200 distributeurs.
              </p>
              <div className="story-stats">
                <div>
                  <div className="story-stat-num">−4 kg</div>
                  <div className="story-stat-label">en 21 jours</div>
                </div>
                <div>
                  <div className="story-stat-num">200+</div>
                  <div className="story-stat-label">équipe distri</div>
                </div>
                <div>
                  <div className="story-stat-num">4 000€+</div>
                  <div className="story-stat-label">revenu mensuel constant</div>
                </div>
              </div>
              <p>
                Objectif 2026-2027&#160;: <b>aider 1&#160;000 personnes</b> à reprendre la main sur leur santé et leurs finances.
              </p>
            </article>

            <article className="story s2 reveal">
              <div className="story-head">
                <div className="avatar">M</div>
                <div>
                  <div className="story-name">Mélanie</div>
                  <div className="story-role">Ex-Royal Canin, 11 ans · maman de 2 enfants</div>
                </div>
              </div>
              <p>
                Rejoint l'aventure en novembre 2024. Choisit son terrain de jeu&#160;: les <b>mamans en post-partum</b>, qui veulent retrouver énergie et équilibre sans culpabilité.
              </p>
              <div className="story-stats">
                <div>
                  <div className="story-stat-num">11 ans</div>
                  <div className="story-stat-label">en grand groupe</div>
                </div>
                <div>
                  <div className="story-stat-num">2 enfants</div>
                  <div className="story-stat-label">6 et 8 ans</div>
                </div>
                <div>
                  <div className="story-stat-num">Nov 2024</div>
                  <div className="story-stat-label">démarrage</div>
                </div>
              </div>
              <p>Niche claire, communauté qui grandit chaque semaine, et un projet qui s'aligne enfin avec sa vie de famille.</p>
            </article>
          </div>

          <p className="story-signature reveal">« La seule règle&#160;: démarrer. Et ne jamais abandonner. »</p>
        </div>
      </section>

      {/* 10. FINAL CTA + FORM */}
      <section className="final-cta" id="contact">
        <div className="wrap">
          <div className="final-cta-grid">
            <div>
              <div className="promise reveal">On te rappelle dans les 48h max.</div>
              <h2 className="reveal">Le seul vrai geste qui change tout&#160;: décrocher.</h2>
              <p className="final-cta-lead reveal">
                Laisse tes coordonnées. On t'appelle pour un échange simple, sans pression&#160;: tu poses tes questions, on regarde ensemble si ça colle, et tu décides.
              </p>
              <ul className="cta-list reveal">
                <li>· 20 minutes au téléphone, pas plus.</li>
                <li>· Aucun engagement à la fin de l'appel.</li>
                <li>· Tu repars avec une vision claire, dans tous les cas.</li>
              </ul>
              {referrerId ? (
                <p className="referrer-note reveal">
                  ★ Page partagée par un membre de l'équipe.
                </p>
              ) : null}
            </div>

            <div className={`form-card reveal ${status === "success" ? "sent" : ""}`} id="formCard">
              <h3>Réserver mon échange</h3>
              <p className="helper">Trois infos, et c'est tout.</p>
              <form onSubmit={handleSubmit} noValidate>
                <div className={`field ${errors.firstName ? "error" : ""}`}>
                  <label htmlFor="opp-firstname">Prénom</label>
                  <input
                    id="opp-firstname"
                    name="firstname"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      clearError("firstName");
                    }}
                    required
                  />
                  <div className="field-error">Indique ton prénom.</div>
                </div>
                <div className={`field ${errors.phone ? "error" : ""}`}>
                  <label htmlFor="opp-phone">Téléphone</label>
                  <input
                    id="opp-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="06 12 34 56 78"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearError("phone");
                    }}
                    required
                  />
                  <div className="field-error">Numéro à 10 chiffres requis.</div>
                </div>
                <div className={`field ${errors.city ? "error" : ""}`}>
                  <label htmlFor="opp-city">Ville</label>
                  <input
                    id="opp-city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    placeholder="Ville (ou région)"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      clearError("city");
                    }}
                    required
                  />
                  <div className="field-error">Indique ta ville ou région.</div>
                </div>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Envoi..." : "On m'appelle dans les 48h →"}
                </button>
                {status === "error" ? (
                  <p className="form-error-msg">{errorMsg}</p>
                ) : null}
                <p className="legal">
                  En envoyant, tu acceptes d'être recontacté·e par La Base 360. Aucune donnée ne sera transmise à un tiers.
                </p>
              </form>
              <div className="form-success">
                <div className="success-icon">✓</div>
                <h3>C'est noté {firstName}&#160;!</h3>
                <p>
                  On te rappelle <b>dans les 48h</b>. Garde ton téléphone à portée 📞
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="opp-footer">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            La Base 360<small>The wellness nutrition club · depuis 2022</small>
          </span>
        </div>
        <p>© 2026 La Base 360 — Distribution indépendante. Activité de vente directe encadrée par la FVD.</p>
      </footer>
    </div>
  );
}

// ─── CSS (port pixel-perfect Claude Design + namespacé .opp-page) ─────────
// Tous les styles sont scopés dans .opp-page pour ne pas polluer l'app.
const OPP_STYLES = `
.opp-page {
  --opp-emerald: #10B981;
  --opp-cyan: #06B6D4;
  --opp-violet: #8B5CF6;
  --opp-gold: #B8922A;
  --opp-ink: #0F172A;
  --opp-ink-soft: #1e293b;
  --opp-muted: #64748b;
  --opp-line: #e2e8f0;
  --opp-mist: #FAFAFC;
  --opp-shadow-sm: 0 1px 2px rgba(15,23,42,.04), 0 2px 6px rgba(15,23,42,.04);
  --opp-shadow-md: 0 4px 12px rgba(15,23,42,.06), 0 12px 32px rgba(15,23,42,.06);
  --opp-shadow-lg: 0 8px 24px rgba(15,23,42,.08), 0 24px 60px rgba(15,23,42,.10);
  --opp-radius: 14px;
  --opp-radius-lg: 22px;
  --opp-maxw: 1180px;
  --opp-font-display: "Sora", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --opp-font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-family: var(--opp-font-body);
  color: var(--opp-ink);
  background: var(--opp-mist);
  line-height: 1.55;
  font-size: 17px;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.opp-page *, .opp-page *::before, .opp-page *::after { box-sizing: border-box; }
.opp-page { scroll-behavior: smooth; }
.opp-page img, .opp-page svg { display: block; max-width: 100%; }
.opp-page button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
.opp-page a { color: inherit; text-decoration: none; }
.opp-page input, .opp-page textarea, .opp-page select { font: inherit; color: inherit; }
.opp-page h1, .opp-page h2, .opp-page h3, .opp-page h4 {
  font-family: var(--opp-font-display); font-weight: 800; letter-spacing: -0.02em;
  line-height: 1.08; margin: 0 0 .4em; color: var(--opp-ink); text-wrap: balance;
}
.opp-page p { margin: 0 0 1em; }
.opp-page p:last-child { margin-bottom: 0; }

.opp-page .wrap { max-width: var(--opp-maxw); margin: 0 auto; padding: 0 24px; }
.opp-page section { padding: 96px 0; position: relative; }
@media (max-width: 720px) { .opp-page section { padding: 64px 0; } }

.opp-page .eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--opp-font-body); font-weight: 700; font-size: 12px;
  letter-spacing: .14em; text-transform: uppercase; color: var(--opp-emerald);
  padding: 6px 12px; border-radius: 999px;
  background: color-mix(in oklab, var(--opp-emerald) 10%, white);
  border: 1px solid color-mix(in oklab, var(--opp-emerald) 18%, transparent);
}
.opp-page .eyebrow::before {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: var(--opp-emerald);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--opp-emerald) 18%, transparent);
}
.opp-page .h-section { font-size: clamp(28px, 4vw, 44px); }

.opp-page .topbar {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in oklab, var(--opp-mist) 88%, transparent);
  backdrop-filter: saturate(140%) blur(10px);
  -webkit-backdrop-filter: saturate(140%) blur(10px);
  border-bottom: 1px solid color-mix(in oklab, var(--opp-ink) 6%, transparent);
}
.opp-page .topbar-inner {
  max-width: var(--opp-maxw); margin: 0 auto; padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.opp-page .brand { display: flex; align-items: center; gap: 10px; font-family: var(--opp-font-display); font-weight: 800; letter-spacing: -.02em; }
.opp-page .brand-mark {
  width: 28px; height: 28px; border-radius: 8px;
  background: conic-gradient(from 200deg at 50% 50%, var(--opp-emerald), var(--opp-cyan), var(--opp-violet), var(--opp-emerald));
  position: relative;
}
.opp-page .brand-mark::after { content: ""; position: absolute; inset: 6px; border-radius: 4px; background: var(--opp-mist); }
.opp-page .brand-text { font-size: 16px; }
.opp-page .brand-text small { display: block; font-family: var(--opp-font-body); font-weight: 500; font-size: 11px; color: var(--opp-muted); letter-spacing: 0; }
.opp-page .top-actions { display: flex; gap: 10px; align-items: center; }
.opp-page .print-btn, .opp-page .back-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 600; font-size: 14px; padding: 9px 14px; border-radius: 10px;
  border: 1px solid var(--opp-line); background: white; color: var(--opp-ink);
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.opp-page .print-btn:hover, .opp-page .back-btn:hover { border-color: var(--opp-ink); box-shadow: var(--opp-shadow-sm); }

.opp-page .btn {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--opp-font-body); font-weight: 600; font-size: 16px;
  padding: 14px 22px; border-radius: 12px;
  transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
  white-space: nowrap;
}
.opp-page .btn-primary { background: var(--opp-ink); color: white; box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, var(--opp-shadow-md); }
.opp-page .btn-primary:hover { transform: translateY(-1px); box-shadow: var(--opp-shadow-lg); }
.opp-page .btn-ghost { background: transparent; color: var(--opp-ink); border: 1px solid var(--opp-ink); }
.opp-page .btn-ghost:hover { background: var(--opp-ink); color: white; }

/* HERO */
.opp-page .hero { position: relative; text-align: center; padding: 96px 0 80px; overflow: hidden; }
.opp-page .hero-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.opp-page .hero-bg::before, .opp-page .hero-bg::after { content: ""; position: absolute; border-radius: 50%; filter: blur(80px); opacity: .55; }
.opp-page .hero-bg::before { width: 520px; height: 520px; left: -120px; top: -120px; background: radial-gradient(closest-side, color-mix(in oklab, var(--opp-emerald) 50%, transparent), transparent); }
.opp-page .hero-bg::after { width: 600px; height: 600px; right: -160px; top: 40px; background: radial-gradient(closest-side, color-mix(in oklab, var(--opp-violet) 40%, transparent), transparent); }
.opp-page .hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(to right, rgba(15,23,42,.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15,23,42,.04) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%);
}
.opp-page .hero-content { position: relative; z-index: 1; }
.opp-page .hero-eyebrow { margin-bottom: 28px; }
.opp-page .hero h1 { font-size: clamp(36px, 6.4vw, 72px); margin: 0 auto 24px; max-width: 14ch; }
.opp-page .hero h1 .accent {
  background: linear-gradient(120deg, var(--opp-emerald), var(--opp-cyan) 55%, var(--opp-violet));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.opp-page .hero-sub { font-size: clamp(17px, 2vw, 20px); color: var(--opp-ink-soft); max-width: 56ch; margin: 0 auto 36px; }
.opp-page .hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 56px; }
.opp-page .hero-meta { display: flex; justify-content: center; gap: 28px; flex-wrap: wrap; color: var(--opp-muted); font-size: 14px; }
.opp-page .hero-meta b { color: var(--opp-ink); font-weight: 700; }

/* STATS ROW */
.opp-page .stats-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 56px; }
.opp-page .stat-card { padding: 28px; border-radius: var(--opp-radius-lg); background: white; border: 1px solid var(--opp-line); box-shadow: var(--opp-shadow-sm); }
.opp-page .stat-num {
  font-family: var(--opp-font-display); font-weight: 800; font-size: clamp(40px, 6vw, 64px);
  letter-spacing: -.04em; line-height: 1;
  background: linear-gradient(120deg, var(--opp-emerald), var(--opp-cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin-bottom: 10px;
}
.opp-page .stat-card.alt .stat-num { background: linear-gradient(120deg, var(--opp-violet), var(--opp-cyan)); -webkit-background-clip: text; background-clip: text; }
.opp-page .stat-label { color: var(--opp-ink-soft); font-size: 15px; line-height: 1.45; }
@media (max-width: 720px) { .opp-page .stats-row { grid-template-columns: 1fr; } }

.opp-page .pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.opp-page .pillar { background: white; border: 1px solid var(--opp-line); border-radius: var(--opp-radius); padding: 22px; }
.opp-page .pillar-num { font-family: var(--opp-font-display); font-weight: 800; font-size: 14px; color: var(--opp-gold); letter-spacing: 0; margin-bottom: 8px; }
.opp-page .pillar-title { font-family: var(--opp-font-display); font-weight: 800; font-size: 17px; letter-spacing: -.02em; margin-bottom: 6px; }
.opp-page .pillar-text { color: var(--opp-muted); font-size: 14px; line-height: 1.5; }
@media (max-width: 900px) { .opp-page .pillars { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .opp-page .pillars { grid-template-columns: 1fr; } }

/* THREE WAYS */
.opp-page .ways { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 48px; }
.opp-page .way { position: relative; background: white; border-radius: var(--opp-radius-lg); padding: 32px; border: 1px solid var(--opp-line); overflow: hidden; transition: transform .25s ease, box-shadow .25s ease; }
.opp-page .way:hover { transform: translateY(-4px); box-shadow: var(--opp-shadow-lg); }
.opp-page .way::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
.opp-page .way.w1::before { background: var(--opp-emerald); }
.opp-page .way.w2::before { background: var(--opp-cyan); }
.opp-page .way.w3::before { background: var(--opp-violet); }
.opp-page .way-step { font-family: var(--opp-font-display); font-weight: 800; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 12px; }
.opp-page .way.w1 .way-step { color: var(--opp-emerald); }
.opp-page .way.w2 .way-step { color: var(--opp-cyan); }
.opp-page .way.w3 .way-step { color: var(--opp-violet); }
.opp-page .way h3 { font-size: 26px; margin-bottom: 12px; }
.opp-page .way-figure { font-family: var(--opp-font-display); font-weight: 800; font-size: clamp(32px, 4vw, 44px); letter-spacing: -.03em; margin: 16px 0 8px; }
.opp-page .way.w1 .way-figure { color: var(--opp-emerald); }
.opp-page .way.w2 .way-figure { color: var(--opp-cyan); }
.opp-page .way.w3 .way-figure { color: var(--opp-violet); }
.opp-page .way p { color: var(--opp-ink-soft); font-size: 15px; }
@media (max-width: 880px) { .opp-page .ways { grid-template-columns: 1fr; } }

/* TIERS */
.opp-page .tiers { display: flex; flex-direction: column; gap: 14px; margin-top: 48px; }
.opp-page .tier { display: grid; grid-template-columns: 56px 1fr auto auto; align-items: center; gap: 24px; padding: 22px 28px; background: white; border: 1px solid var(--opp-line); border-radius: var(--opp-radius); transition: border-color .2s ease, transform .2s ease; }
.opp-page .tier:hover { border-color: var(--opp-ink); transform: translateX(4px); }
.opp-page .tier-num { font-family: var(--opp-font-display); font-weight: 800; font-size: 24px; color: var(--opp-muted); letter-spacing: -.03em; }
.opp-page .tier-name { font-family: var(--opp-font-display); font-weight: 800; font-size: 19px; letter-spacing: -.02em; margin-bottom: 2px; }
.opp-page .tier-sub { color: var(--opp-muted); font-size: 14px; }
.opp-page .tier-discount { font-family: var(--opp-font-display); font-weight: 800; font-size: 28px; letter-spacing: -.03em; }
.opp-page .tier-bar { width: 140px; height: 6px; border-radius: 999px; background: var(--opp-line); overflow: hidden; position: relative; }
.opp-page .tier-bar-fill { position: absolute; inset: 0; border-radius: 999px; background: linear-gradient(90deg, var(--opp-emerald), var(--opp-cyan), var(--opp-violet)); }
.opp-page .tier.t1 .tier-discount { color: var(--opp-ink-soft); }
.opp-page .tier.t2 .tier-discount { color: var(--opp-emerald); }
.opp-page .tier.t3 .tier-discount { color: var(--opp-cyan); }
.opp-page .tier.t4 .tier-discount { color: var(--opp-violet); }
.opp-page .tier.t5 .tier-discount { color: var(--opp-gold); }
@media (max-width: 720px) { .opp-page .tier { grid-template-columns: 40px 1fr auto; gap: 12px; padding: 16px 18px; } .opp-page .tier-bar { display: none; } .opp-page .tier-num { font-size: 18px; } .opp-page .tier-name { font-size: 16px; } .opp-page .tier-discount { font-size: 22px; } }

/* CASE STUDY */
.opp-page .case { background: var(--opp-ink); color: white; border-radius: 28px; padding: clamp(32px, 5vw, 56px); margin-top: 40px; position: relative; overflow: hidden; }
.opp-page .case::before { content: ""; position: absolute; width: 460px; height: 460px; right: -120px; bottom: -180px; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in oklab, var(--opp-emerald) 50%, transparent), transparent); pointer-events: none; }
.opp-page .case-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; position: relative; z-index: 1; }
.opp-page .case h2 { color: white; font-size: clamp(26px, 3.4vw, 38px); }
.opp-page .case .eyebrow { background: color-mix(in oklab, var(--opp-emerald) 18%, transparent); border-color: color-mix(in oklab, var(--opp-emerald) 28%, transparent); color: var(--opp-emerald); }
.opp-page .case-quote { font-family: var(--opp-font-display); font-weight: 800; font-size: clamp(22px, 2.6vw, 30px); letter-spacing: -.02em; line-height: 1.18; margin: 16px 0 20px; }
.opp-page .case-note { color: rgba(255,255,255,.7); font-size: 15px; }
.opp-page .case-calc { background: color-mix(in oklab, white 6%, transparent); border: 1px solid rgba(255,255,255,.10); border-radius: 18px; padding: 24px; }
.opp-page .calc-row { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.08); gap: 16px; }
.opp-page .calc-row:last-of-type { border-bottom: 0; }
.opp-page .calc-label { color: rgba(255,255,255,.7); font-size: 14px; }
.opp-page .calc-val { font-family: var(--opp-font-display); font-weight: 700; font-size: 18px; letter-spacing: -.02em; color: white; }
.opp-page .calc-row.neg .calc-val { color: #fb7185; }
.opp-page .calc-row.pos .calc-val { color: var(--opp-emerald); }
.opp-page .calc-total { margin-top: 18px; padding: 18px 20px; border-radius: 14px; background: linear-gradient(120deg, var(--opp-emerald), var(--opp-cyan)); display: flex; justify-content: space-between; align-items: center; color: white; }
.opp-page .calc-total-label { font-family: var(--opp-font-body); font-weight: 600; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; opacity: .9; }
.opp-page .calc-total-val { font-family: var(--opp-font-display); font-weight: 800; font-size: clamp(28px, 4vw, 40px); letter-spacing: -.03em; }
@media (max-width: 880px) { .opp-page .case-grid { grid-template-columns: 1fr; gap: 28px; } }

/* PACK */
.opp-page .pack { display: grid; grid-template-columns: 1.05fr 1fr; gap: 48px; align-items: center; margin-top: 40px; }
.opp-page .pack-visual { position: relative; aspect-ratio: 4/5; border-radius: 24px; background: linear-gradient(135deg, color-mix(in oklab, var(--opp-emerald) 14%, white), color-mix(in oklab, var(--opp-cyan) 12%, white) 50%, color-mix(in oklab, var(--opp-violet) 12%, white)); border: 1px solid var(--opp-line); overflow: hidden; display: flex; align-items: center; justify-content: center; }
.opp-page .pack-price { text-align: center; }
.opp-page .pack-price .label { display: block; font-family: var(--opp-font-body); font-weight: 600; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--opp-ink-soft); margin-bottom: 12px; }
.opp-page .pack-price .num { font-family: var(--opp-font-display); font-weight: 800; font-size: clamp(80px, 12vw, 140px); letter-spacing: -.05em; line-height: 1; background: linear-gradient(120deg, var(--opp-emerald), var(--opp-violet)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.opp-page .pack-price .num sup { font-size: .42em; vertical-align: 0.6em; margin-left: 4px; -webkit-text-fill-color: var(--opp-ink-soft); }
.opp-page .pack-list { list-style: none; padding: 0; margin: 24px 0 0; display: flex; flex-direction: column; gap: 14px; }
.opp-page .pack-list li { display: grid; grid-template-columns: 28px 1fr; gap: 14px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid var(--opp-line); }
.opp-page .pack-list li:last-child { border-bottom: 0; }
.opp-page .pack-check { width: 24px; height: 24px; border-radius: 50%; background: color-mix(in oklab, var(--opp-emerald) 14%, white); color: var(--opp-emerald); display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; }
.opp-page .pack-list strong { font-family: var(--opp-font-display); font-weight: 800; letter-spacing: -.01em; display: block; margin-bottom: 2px; }
.opp-page .pack-list span { color: var(--opp-muted); font-size: 14px; }
@media (max-width: 880px) { .opp-page .pack { grid-template-columns: 1fr; } }

/* SUPPORT PILLARS */
.opp-page .support { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 48px; }
.opp-page .support-card { padding: 28px; background: white; border: 1px solid var(--opp-line); border-radius: var(--opp-radius); transition: transform .2s ease, box-shadow .2s ease; }
.opp-page .support-card:hover { transform: translateY(-3px); box-shadow: var(--opp-shadow-md); }
.opp-page .support-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; font-size: 22px; }
.opp-page .support-card:nth-child(1) .support-icon { background: color-mix(in oklab, var(--opp-emerald) 14%, white); }
.opp-page .support-card:nth-child(2) .support-icon { background: color-mix(in oklab, var(--opp-cyan) 14%, white); }
.opp-page .support-card:nth-child(3) .support-icon { background: color-mix(in oklab, var(--opp-violet) 14%, white); }
.opp-page .support-card:nth-child(4) .support-icon { background: color-mix(in oklab, var(--opp-gold) 18%, white); }
.opp-page .support-card h3 { font-size: 17px; margin-bottom: 8px; }
.opp-page .support-card p { color: var(--opp-muted); font-size: 14px; line-height: 1.5; margin: 0; }
@media (max-width: 880px) { .opp-page .support { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .opp-page .support { grid-template-columns: 1fr; } }

/* FAQ */
.opp-page .faq { margin-top: 40px; border-top: 1px solid var(--opp-line); }
.opp-page .faq-item { border-bottom: 1px solid var(--opp-line); }
.opp-page .faq-q { width: 100%; text-align: left; padding: 22px 0; display: flex; justify-content: space-between; align-items: center; gap: 24px; font-family: var(--opp-font-display); font-weight: 800; font-size: clamp(17px, 1.6vw, 19px); letter-spacing: -.01em; color: var(--opp-ink); transition: color .15s ease; }
.opp-page .faq-q:hover { color: var(--opp-emerald); }
.opp-page .faq-icon { width: 28px; height: 28px; border-radius: 50%; background: var(--opp-mist); border: 1px solid var(--opp-line); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform .25s ease, background .2s ease; position: relative; }
.opp-page .faq-icon::before, .opp-page .faq-icon::after { content: ""; position: absolute; background: var(--opp-ink); border-radius: 1px; }
.opp-page .faq-icon::before { width: 11px; height: 1.5px; }
.opp-page .faq-icon::after { width: 1.5px; height: 11px; transition: transform .25s ease; }
.opp-page .faq-item.open .faq-icon { background: var(--opp-ink); }
.opp-page .faq-item.open .faq-icon::before, .opp-page .faq-item.open .faq-icon::after { background: white; }
.opp-page .faq-item.open .faq-icon::after { transform: scaleY(0); }
.opp-page .faq-a { max-height: 0; overflow: hidden; transition: max-height .35s ease; }
.opp-page .faq-a-inner { padding: 0 0 24px; color: var(--opp-ink-soft); font-size: 16px; max-width: 70ch; }
.opp-page .faq-item.open .faq-a { max-height: 320px; }

/* STORY */
.opp-page .story-section { background: linear-gradient(180deg, white, var(--opp-mist)); }
.opp-page .stories { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; }
.opp-page .story { background: white; border: 1px solid var(--opp-line); border-radius: var(--opp-radius-lg); padding: 32px; position: relative; overflow: hidden; }
.opp-page .story::before { content: ""; position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
.opp-page .story.s1::before { background: var(--opp-emerald); }
.opp-page .story.s2::before { background: var(--opp-violet); }
.opp-page .story-head { display: flex; align-items: center; gap: 16px; margin-bottom: 22px; }
.opp-page .avatar { width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: var(--opp-font-display); font-weight: 800; color: white; font-size: 20px; letter-spacing: -.02em; }
.opp-page .story.s1 .avatar { background: linear-gradient(135deg, var(--opp-emerald), var(--opp-cyan)); }
.opp-page .story.s2 .avatar { background: linear-gradient(135deg, var(--opp-violet), var(--opp-cyan)); }
.opp-page .story-name { font-family: var(--opp-font-display); font-weight: 800; font-size: 22px; letter-spacing: -.02em; margin-bottom: 2px; }
.opp-page .story-role { color: var(--opp-muted); font-size: 14px; }
.opp-page .story-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 20px 0; padding: 18px 0; border-top: 1px solid var(--opp-line); border-bottom: 1px solid var(--opp-line); }
.opp-page .story-stat-num { font-family: var(--opp-font-display); font-weight: 800; font-size: 22px; letter-spacing: -.03em; }
.opp-page .story.s1 .story-stat-num { color: var(--opp-emerald); }
.opp-page .story.s2 .story-stat-num { color: var(--opp-violet); }
.opp-page .story-stat-label { font-size: 11px; color: var(--opp-muted); text-transform: uppercase; letter-spacing: .08em; line-height: 1.3; }
.opp-page .story p { color: var(--opp-ink-soft); font-size: 15px; line-height: 1.6; }
.opp-page .story-signature { margin-top: 56px; text-align: center; font-family: var(--opp-font-display); font-weight: 800; letter-spacing: -.02em; font-size: clamp(22px, 3vw, 32px); line-height: 1.2; color: var(--opp-ink); max-width: 28ch; margin-left: auto; margin-right: auto; }
.opp-page .story-signature::before { content: ""; display: block; width: 40px; height: 3px; background: var(--opp-gold); margin: 0 auto 22px; border-radius: 2px; }
@media (max-width: 880px) { .opp-page .stories { grid-template-columns: 1fr; } }

/* FINAL CTA */
.opp-page .final-cta { background: var(--opp-ink); color: white; position: relative; overflow: hidden; }
.opp-page .final-cta::before { content: ""; position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; background: radial-gradient(closest-side, color-mix(in oklab, var(--opp-emerald) 18%, transparent), transparent 70%); pointer-events: none; }
.opp-page .final-cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; position: relative; z-index: 1; }
.opp-page .final-cta h2 { color: white; font-size: clamp(32px, 4.6vw, 52px); }
.opp-page .final-cta-lead { color: rgba(255,255,255,.78); font-size: 17px; max-width: 50ch; margin-bottom: 28px; }
.opp-page .cta-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; color: rgba(255,255,255,.78); font-size: 15px; }
.opp-page .promise { display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 999px; background: color-mix(in oklab, var(--opp-emerald) 18%, transparent); border: 1px solid color-mix(in oklab, var(--opp-emerald) 30%, transparent); font-size: 14px; font-weight: 600; color: var(--opp-emerald); margin-bottom: 16px; }
.opp-page .promise::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--opp-emerald); box-shadow: 0 0 0 5px color-mix(in oklab, var(--opp-emerald) 22%, transparent); animation: opp-pulse 2s ease-in-out infinite; }
@keyframes opp-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
.opp-page .referrer-note { margin-top: 18px; font-size: 12px; color: rgba(255,255,255,.55); font-style: italic; }
.opp-page .form-card { background: white; color: var(--opp-ink); border-radius: 24px; padding: 32px; box-shadow: var(--opp-shadow-lg); }
.opp-page .form-card h3 { font-size: 22px; margin-bottom: 4px; }
.opp-page .form-card .helper { color: var(--opp-muted); font-size: 14px; margin-bottom: 22px; }
.opp-page .field { margin-bottom: 14px; }
.opp-page .field label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 6px; color: var(--opp-ink-soft); }
.opp-page .field input { width: 100%; padding: 13px 14px; border-radius: 10px; border: 1px solid var(--opp-line); background: var(--opp-mist); font-size: 16px; transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
.opp-page .field input:focus { outline: none; border-color: var(--opp-emerald); background: white; box-shadow: 0 0 0 4px color-mix(in oklab, var(--opp-emerald) 18%, transparent); }
.opp-page .field.error input { border-color: #ef4444; background: #fef2f2; }
.opp-page .field-error { color: #ef4444; font-size: 12px; margin-top: 4px; display: none; }
.opp-page .field.error .field-error { display: block; }
.opp-page .submit-btn { width: 100%; margin-top: 8px; background: var(--opp-emerald); color: white; padding: 16px; border-radius: 12px; font-weight: 700; font-size: 16px; transition: transform .15s ease, box-shadow .2s ease, background .2s ease; box-shadow: 0 8px 22px color-mix(in oklab, var(--opp-emerald) 32%, transparent); }
.opp-page .submit-btn:hover:not(:disabled) { transform: translateY(-1px); background: color-mix(in oklab, var(--opp-emerald) 90%, black); }
.opp-page .submit-btn:disabled { opacity: 0.7; cursor: wait; }
.opp-page .form-error-msg { color: #dc2626; font-size: 13px; margin-top: 10px; padding: 8px 12px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; }
.opp-page .form-success { display: none; text-align: center; padding: 20px 0; }
.opp-page .form-card.sent .form-success { display: block; }
.opp-page .form-card.sent form { display: none; }
.opp-page .success-icon { width: 64px; height: 64px; border-radius: 50%; background: color-mix(in oklab, var(--opp-emerald) 14%, white); color: var(--opp-emerald); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; margin-bottom: 16px; }
.opp-page .form-success h3 { color: var(--opp-ink); }
.opp-page .form-success p { color: var(--opp-muted); font-size: 15px; }
.opp-page .legal { font-size: 12px; color: var(--opp-muted); text-align: center; margin-top: 12px; }
@media (max-width: 880px) { .opp-page .final-cta-grid { grid-template-columns: 1fr; gap: 32px; } }

/* FOOTER */
.opp-page .opp-footer { padding: 36px 24px; text-align: center; color: var(--opp-muted); font-size: 13px; border-top: 1px solid var(--opp-line); background: var(--opp-mist); }
.opp-page .opp-footer .brand { justify-content: center; margin-bottom: 8px; }

/* REVEAL ANIMATIONS */
.opp-page .reveal { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s ease; }
.opp-page .reveal.in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .opp-page *, .opp-page *::before, .opp-page *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  .opp-page .reveal { opacity: 1; transform: none; }
}

/* PRINT */
@media print {
  .opp-page { --opp-mist: #ffffff; background: white; font-size: 12pt; }
  .opp-page .topbar, .opp-page .print-btn, .opp-page .back-btn, .opp-page .hero-cta, .opp-page .submit-btn, .opp-page .form-card, .opp-page .promise, .opp-page .hero-grid { display: none !important; }
  .opp-page section { padding: 24pt 0; page-break-inside: avoid; }
  .opp-page .hero { padding: 24pt 0; }
  .opp-page .case, .opp-page .final-cta { background: white !important; color: var(--opp-ink) !important; }
  .opp-page .case h2, .opp-page .final-cta h2, .opp-page .case-quote, .opp-page .calc-val, .opp-page .calc-label { color: var(--opp-ink) !important; }
  .opp-page .case-calc { border: 1px solid #cbd5e1; }
  .opp-page .calc-row { border-color: #e2e8f0 !important; }
  .opp-page .calc-total { background: #f1f5f9 !important; color: var(--opp-ink) !important; }
  .opp-page .calc-total-val { color: var(--opp-emerald) !important; }
  .opp-page .reveal { opacity: 1 !important; transform: none !important; }
  .opp-page .faq-item .faq-a { max-height: none !important; }
  .opp-page .faq-item .faq-a-inner { padding-bottom: 12pt; }
  .opp-page .faq-icon { display: none; }
  .opp-page .way:hover, .opp-page .tier:hover, .opp-page .support-card:hover { transform: none; box-shadow: none; }
  .opp-page a { color: var(--opp-ink); text-decoration: none; }
  .opp-page .final-cta::before, .opp-page .case::before, .opp-page .hero-bg { display: none; }
  .opp-page .story-signature, .opp-page h1, .opp-page h2, .opp-page h3 { color: var(--opp-ink) !important; }
}
`;
