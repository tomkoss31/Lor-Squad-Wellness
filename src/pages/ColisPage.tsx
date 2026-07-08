// =============================================================================
// ColisPage — funnel « Pass Découverte » colis (chantier 2026-07-08).
//
// Route publique /colis (pas de slug coach — décision Thomas : le colis est
// géré par le club, pas un distri individuel). Reprend fidèlement la logique
// du tunnel validé (tunnel_colis_demo.html) : arrivée → 4 questions → capture
// (prénom + téléphone + email obligatoire) → confirmation à 3 branches.
//
// Identité visuelle dédiée à cette campagne (comme BusinessPage a --biz-*) :
// fond quasi-noir, accent teal unique #34e3c8, Archivo Black + JetBrains Mono
// + Archivo — PAS les tokens teal/violet/corail des autres pages publiques.
//
// Capture : réutilise l'edge submit-prospect-lead (étendue avec `email`),
// source='colis'. Attribution par défaut = Mélanie (résolue par slug côté
// client, même pattern que VipClubPage — pas de coach_slug dans le body,
// on résout et on passe directement referrer_user_id).
// =============================================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";

/** Slug du compte par défaut pour cette campagne (décision Thomas 2026-07-08).
 *  Si le slug réel de Mélanie diffère (homonyme, pseudo), changer cette seule
 *  constante suffit — rien d'autre n'en dépend en dur. */
const DEFAULT_COACH_SLUG = "melanie";

type Energie = "top" | "ca_va" | "a_plat" | "vide";
type Sommeil = "tres_bien" | "correct" | "difficile" | "pas_terrible";
type Objectif = "poids" | "muscle" | "energie" | "mieux";
type Dispo = "semaine" | "mois" | "sans_pression";
type NextAction = "rdv" | "bilan" | "email_only";

const ENERGIE_OPTS: { value: Energie; label: string }[] = [
  { value: "top", label: "Au top" },
  { value: "ca_va", label: "Ça va" },
  { value: "a_plat", label: "Souvent à plat" },
  { value: "vide", label: "Vidé·e en ce moment" },
];
const SOMMEIL_OPTS: { value: Sommeil; label: string }[] = [
  { value: "tres_bien", label: "Je dors très bien" },
  { value: "correct", label: "Correct" },
  { value: "difficile", label: "Difficile" },
  { value: "pas_terrible", label: "Vraiment pas terrible" },
];
const OBJECTIF_OPTS: { value: Objectif; label: string }[] = [
  { value: "poids", label: "Perdre du poids" },
  { value: "muscle", label: "Prendre du muscle" },
  { value: "energie", label: "Retrouver de l'énergie" },
  { value: "mieux", label: "Juste me sentir mieux" },
];
const DISPO_OPTS: { value: Dispo; label: string }[] = [
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois-ci" },
  { value: "sans_pression", label: "Je verrai, sans pression" },
];

const TOTAL_STEPS = 6;

export function ColisPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [energie, setEnergie] = useState<Energie | null>(null);
  const [sommeil, setSommeil] = useState<Sommeil | null>(null);
  const [objectif, setObjectif] = useState<Objectif | null>(null);
  const [dispo, setDispo] = useState<Dispo | null>(null);

  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [melanieUserId, setMelanieUserId] = useState<string | null>(null);

  // Résolution du compte par défaut (même pattern que VipClubPage) — best
  // effort : si la RPC échoue, le lead part simplement sans referrer_user_id
  // (visible/assignable manuellement dans le CRM).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb.rpc("get_coach_credibility_by_slug", {
          p_slug: DEFAULT_COACH_SLUG,
        });
        if (!cancelled) {
          const id = (data as { user_id?: string } | null)?.user_id ?? null;
          setMelanieUserId(id);
        }
      } catch {
        /* silencieux — le lead part sans referrer, assignable à la main */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function go(next: number) {
    setStep(next);
    window.scrollTo(0, 0);
  }

  function pickEnergie(v: Energie) { setEnergie(v); window.setTimeout(() => go(2), 220); }
  function pickSommeil(v: Sommeil) { setSommeil(v); window.setTimeout(() => go(3), 220); }
  function pickObjectif(v: Objectif) { setObjectif(v); window.setTimeout(() => go(4), 220); }
  function pickDispo(v: Dispo) { setDispo(v); window.setTimeout(() => go(5), 220); }

  const bilanOnlineUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (firstName.trim()) params.set("firstName", firstName.trim());
    const qs = params.toString();
    return `/bilan-online/${DEFAULT_COACH_SLUG}/formulaire${qs ? `?${qs}` : ""}`;
  }, [firstName]);
  const rdvUrl = `/rdv/${DEFAULT_COACH_SLUG}`;

  async function submitLead(nextAction: NextAction) {
    setError(null);
    if (firstName.trim().length < 2) { setError("Indique ton prénom."); return false; }
    if (phone.replace(/\D/g, "").length < 6) { setError("Indique un numéro de téléphone valide."); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Indique un email valide."); return false; }
    if (!consent) { setError("Coche la case pour qu'on puisse te recontacter."); return false; }

    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error: fnErr } = await sb.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: firstName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          source: "colis",
          referrer_user_id: melanieUserId ?? undefined,
          consent_recontact: consent,
          metadata: {
            program: "colis_pass_decouverte",
            colis_answers: { energie, sommeil, objectif, dispo },
            colis_next_action: nextAction,
          },
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible, réessaie.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    // Étape de capture : on enregistre déjà le lead en "email_only" — si la
    // personne choisit ensuite RDV ou bilan sur l'écran suivant, on ne
    // renvoie pas une 2e requête (le lead existe déjà, le choix reste dans
    // colis_next_action pour la 1ère soumission — suffisant pour le tri CRM).
    const ok = await submitLead("email_only");
    if (ok) go(6);
  }

  function handleChooseRdv() {
    void submitLead("rdv");
    navigate(rdvUrl);
  }
  function handleChooseBilan() {
    void submitLead("bilan");
    navigate(bilanOnlineUrl);
  }

  function reset() {
    setEnergie(null); setSommeil(null); setObjectif(null); setDispo(null);
    setFirstName(""); setPhone(""); setEmail(""); setConsent(false); setError(null);
    go(0);
  }

  return (
    <div style={pageStyle}>
      <div style={phoneStyle}>
        <div style={barStyle}>
          <div style={brandRowStyle}>
            <span className="mono" style={{ color: "var(--colis-teal)" }}>◖ TON PASS · DÉJÀ VALIDÉ</span>
            <span className="mono" style={{ color: "var(--colis-muted)" }}>LB-360</span>
          </div>
          <div style={progressTrackStyle}>
            <div style={{ ...progressFillStyle, width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {step === 0 && (
          <section style={screenStyle}>
            <div style={eyebrowStyle}>TU VIENS DE SCANNER TON COLIS ✓</div>
            <h1 style={h1Style}>PLUS QU'UNE<br />ÉTAPE AVANT<br />TES <span style={accentStyle}>2 CADEAUX</span></h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
              <GiftRow n="CADEAU 01" title="Réduction au bar" sub="1ʳᵉ conso · prochaine visite" value="−10%" />
              <GiftRow n="CADEAU 02" title="Bilan bien-être 30 min" sub="énergie · sommeil · objectifs" value="OFFERT" was="60€" />
            </div>
            <div style={metaStyle}>4 QUESTIONS · 40 SECONDES · SANS ENGAGEMENT</div>
            <div style={ctaWrapStyle}>
              <button type="button" style={btnStyle} onClick={() => go(1)}>C'est parti →</button>
            </div>
          </section>
        )}

        {step === 1 && (
          <QuestionScreen n={1} title={<>Ton énergie<br />en ce moment ?</>} onBack={() => go(0)}>
            {ENERGIE_OPTS.map((o) => (
              <OptionButton key={o.value} label={o.label} selected={energie === o.value} onClick={() => pickEnergie(o.value)} />
            ))}
          </QuestionScreen>
        )}

        {step === 2 && (
          <QuestionScreen n={2} title={<>Et côté<br />sommeil ?</>} onBack={() => go(1)}>
            {SOMMEIL_OPTS.map((o) => (
              <OptionButton key={o.value} label={o.label} selected={sommeil === o.value} onClick={() => pickSommeil(o.value)} />
            ))}
          </QuestionScreen>
        )}

        {step === 3 && (
          <QuestionScreen n={3} title={<>Ton objectif<br />n°1 ?</>} onBack={() => go(2)}>
            {OBJECTIF_OPTS.map((o) => (
              <OptionButton key={o.value} label={o.label} selected={objectif === o.value} onClick={() => pickObjectif(o.value)} />
            ))}
          </QuestionScreen>
        )}

        {step === 4 && (
          <QuestionScreen n={4} title={<>Tu passes<br />au club quand ?</>} onBack={() => go(3)}>
            {DISPO_OPTS.map((o) => (
              <OptionButton key={o.value} label={o.label} selected={dispo === o.value} onClick={() => pickDispo(o.value)} />
            ))}
          </QuestionScreen>
        )}

        {step === 5 && (
          <section style={screenStyle}>
            <button type="button" style={backStyle} onClick={() => go(4)}>← retour</button>
            <div style={eyebrowStyle}>DERNIÈRE ÉTAPE</div>
            <h1 style={h1Style}>ON GARDE TES<br />2 CADEAUX<br /><span style={accentStyle}>AU CHAUD</span></h1>
            <p style={leadStyle}>Dis-nous juste où t'envoyer ton pass. <b>C'est instantané.</b></p>
            <form onSubmit={handleCapture} style={{ display: "flex", flexDirection: "column" }}>
              <Field label="PRÉNOM"><input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ton prénom" /></Field>
              <Field label="TÉLÉPHONE"><input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 ..." /></Field>
              <Field label="EMAIL"><input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="toi@exemple.fr" /></Field>
              <label style={consentStyle}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor: "var(--colis-teal)", width: 16, height: 16, flexShrink: 0 }} />
                <span>J'accepte d'être recontacté·e par La Base 360 pour mon bilan. Aucune donnée revendue.</span>
              </label>
              {error ? <div style={errorStyle}>{error}</div> : null}
              <div style={ctaWrapStyle}>
                <button type="submit" style={btnStyle} disabled={sending}>
                  {sending ? "Envoi…" : "Recevoir mes 2 cadeaux →"}
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 6 && (
          <section style={screenStyle}>
            <div style={badgeStyle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--colis-on-accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" width={38} height={38}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 style={h1Style}>C'EST <span style={accentStyle}>VALIDÉ</span> !</h1>
            <p style={leadStyle}>Tes 2 cadeaux sont à toi. <b>Garde cet écran</b> ou fais une capture.</p>
            <div style={codeBoxStyle}>
              <div style={codeKeyStyle}>CADEAU 01 · À MONTRER AU BAR</div>
              <div style={codeValStyle}>−10% · BASE10</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <GiftRow n="CADEAU 02 · BILAN OFFERT" title="Réserve ton créneau 30 min" />
            </div>
            <div style={ctaWrapStyle}>
              <button type="button" style={btnStyle} onClick={handleChooseRdv}>Réserver mon bilan →</button>
              <button type="button" style={ghostBtnStyle} onClick={handleChooseBilan}>Je préfère faire mon bilan en ligne complet</button>
              <button type="button" style={dimBtnStyle} onClick={reset}>↺ Revoir la démo</button>
            </div>
          </section>
        )}

        <div style={footStyle}>LA BASE 360® — CLUB NUTRITION · VERDUN</div>
      </div>

      {/* Tokens dédiés à cette campagne (namespace isolé, comme --biz-*). */}
      <style>{`
        :root {
          --colis-bg: #080b0a;
          --colis-card: #0e1513;
          --colis-ink: #f2f5f4;
          --colis-muted: #8a9794;
          --colis-teal: #34e3c8;
          --colis-line: #1f2a28;
          --colis-on-accent: #04110f;
        }
      `}</style>
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function QuestionScreen({
  n, title, onBack, children,
}: { n: number; title: React.ReactNode; onBack: () => void; children: React.ReactNode }) {
  return (
    <section style={screenStyle}>
      <button type="button" style={backStyle} onClick={onBack}>← retour</button>
      <div style={qcountStyle}>QUESTION {n} / 4</div>
      <div style={qtitleStyle}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 22 }}>{children}</div>
    </section>
  );
}

function OptionButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...optionStyle, ...(selected ? optionSelStyle : {}) }}>
      <span style={{ ...dotStyle, ...(selected ? dotSelStyle : {}) }} />
      {label}
    </button>
  );
}

function GiftRow({ n, title, sub, value, was }: { n: string; title: string; sub?: string; value?: string; was?: string }) {
  return (
    <div style={giftStyle}>
      <div>
        <div style={giftNStyle}>{n}</div>
        <h3 style={giftTitleStyle}>{title}</h3>
        {sub ? <small style={giftSubStyle}>{sub}</small> : null}
      </div>
      {value ? (
        <div style={giftValStyle}>
          {was ? <span style={giftWasStyle}>{was}</span> : null}
          {value}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <label style={fieldLabelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  background: "#1a1d1c", minHeight: "100vh", display: "flex",
  justifyContent: "center", alignItems: "flex-start", padding: 20,
  fontFamily: "'Archivo', system-ui, sans-serif", color: "var(--colis-ink)",
};
const phoneStyle: React.CSSProperties = {
  width: "100%", maxWidth: 430, background: "var(--colis-bg)", borderRadius: 26,
  border: "1px solid #232e2b", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)",
  minHeight: 760, display: "flex", flexDirection: "column", position: "relative",
};
const barStyle: React.CSSProperties = { padding: "18px 22px 0", display: "flex", flexDirection: "column", gap: 14 };
const brandRowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em" };
const progressTrackStyle: React.CSSProperties = { height: 5, background: "#16201d", borderRadius: 99, overflow: "hidden" };
const progressFillStyle: React.CSSProperties = { display: "block", height: "100%", background: "var(--colis-teal)", borderRadius: 99, transition: "width .35s ease" };
const screenStyle: React.CSSProperties = { flex: 1, padding: "26px 22px 30px", display: "flex", flexDirection: "column" };
const eyebrowStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", color: "var(--colis-teal)", fontSize: 11, letterSpacing: "0.16em", marginBottom: 14 };
const h1Style: React.CSSProperties = { fontFamily: "'Archivo Black', sans-serif", textTransform: "uppercase", lineHeight: 0.92, letterSpacing: "-0.01em", fontSize: 38, margin: 0 };
const accentStyle: React.CSSProperties = { color: "var(--colis-teal)" };
const leadStyle: React.CSSProperties = { color: "#cfd8d5", fontSize: 16, lineHeight: 1.5, marginTop: 16 };
const metaStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", color: "var(--colis-muted)", fontSize: 11, letterSpacing: "0.06em", marginTop: 20, textAlign: "center", lineHeight: 1.7 };
const qcountStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", color: "var(--colis-muted)", fontSize: 11, letterSpacing: "0.14em", marginBottom: 10 };
const qtitleStyle: React.CSSProperties = { fontFamily: "'Archivo Black', sans-serif", fontSize: 28, lineHeight: 1.05, textTransform: "uppercase" };
const optionStyle: React.CSSProperties = {
  background: "var(--colis-card)", border: "1.5px solid var(--colis-line)", borderRadius: 13,
  padding: "17px 18px", fontSize: 16, fontWeight: 700, color: "var(--colis-ink)", cursor: "pointer",
  textAlign: "left", display: "flex", alignItems: "center", gap: 13, fontFamily: "inherit",
};
const optionSelStyle: React.CSSProperties = { borderColor: "var(--colis-teal)", background: "#0d1c19" };
const dotStyle: React.CSSProperties = { width: 18, height: 18, borderRadius: "50%", border: "2px solid #3a4744", flexShrink: 0 };
const dotSelStyle: React.CSSProperties = { borderColor: "var(--colis-teal)", background: "var(--colis-teal)", boxShadow: "inset 0 0 0 3px #0d1c19" };
const fieldLabelStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.1em", color: "var(--colis-muted)" };
const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: 7, background: "var(--colis-card)", border: "1.5px solid var(--colis-line)",
  borderRadius: 12, padding: "15px 16px", color: "var(--colis-ink)", fontSize: 16, fontFamily: "'Archivo', sans-serif", outline: "none",
};
const consentStyle: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", marginTop: 18, color: "var(--colis-muted)", fontSize: 12, lineHeight: 1.5 };
const errorStyle: React.CSSProperties = { marginTop: 12, color: "#ff8a80", fontSize: 12.5 };
const badgeStyle: React.CSSProperties = { width: 76, height: 76, borderRadius: "50%", background: "var(--colis-teal)", display: "flex", alignItems: "center", justifyContent: "center", margin: "6px 0 20px" };
const codeBoxStyle: React.CSSProperties = { background: "var(--colis-card)", border: "1.5px dashed var(--colis-teal)", borderRadius: 14, padding: "16px 18px", marginTop: 14, textAlign: "center" };
const codeKeyStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", color: "var(--colis-muted)", fontSize: 10, letterSpacing: "0.16em" };
const codeValStyle: React.CSSProperties = { fontFamily: "'Archivo Black', sans-serif", fontSize: 30, letterSpacing: "0.08em", color: "var(--colis-teal)", marginTop: 4 };
const ctaWrapStyle: React.CSSProperties = { marginTop: "auto", paddingTop: 22, display: "flex", flexDirection: "column", gap: 11 };
const btnStyle: React.CSSProperties = {
  width: "100%", background: "var(--colis-teal)", color: "var(--colis-on-accent)", border: "none", borderRadius: 13,
  padding: 17, fontFamily: "'Archivo Black', sans-serif", textTransform: "uppercase", fontSize: 16, letterSpacing: "0.02em", cursor: "pointer",
};
const ghostBtnStyle: React.CSSProperties = { ...btnStyle, background: "transparent", color: "var(--colis-teal)", border: "1.5px solid var(--colis-teal)" };
const dimBtnStyle: React.CSSProperties = {
  background: "none", border: "none", color: "var(--colis-muted)", fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12, letterSpacing: "0.1em", cursor: "pointer", padding: "6px 0",
};
const backStyle: React.CSSProperties = {
  background: "none", border: "none", color: "var(--colis-muted)", fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12, letterSpacing: "0.1em", cursor: "pointer", padding: "6px 0", marginBottom: 2, textAlign: "left",
};
const footStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", color: "#465350", fontSize: 9, letterSpacing: "0.1em",
  textAlign: "center", padding: 14, borderTop: "1px solid #131b19",
};
const giftStyle: React.CSSProperties = {
  background: "var(--colis-card)", border: "1px solid var(--colis-line)", borderRadius: 14,
  padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
};
const giftNStyle: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", color: "var(--colis-muted)", fontSize: 10, letterSpacing: "0.14em" };
const giftTitleStyle: React.CSSProperties = { fontSize: 17, fontWeight: 800, marginTop: 3, fontFamily: "'Archivo', sans-serif" };
const giftSubStyle: React.CSSProperties = { color: "var(--colis-muted)", fontSize: 12 };
const giftValStyle: React.CSSProperties = { fontFamily: "'Archivo Black', sans-serif", color: "var(--colis-teal)", textTransform: "uppercase", fontSize: 26, whiteSpace: "nowrap", textAlign: "right", lineHeight: 1 };
const giftWasStyle: React.CSSProperties = { display: "block", fontFamily: "'Archivo', sans-serif", fontWeight: 700, fontSize: 12, color: "#5a6764", textDecoration: "line-through" };
