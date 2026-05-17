// Chantier #3 V2 — Module Prospection cold mobile-first (2026-05-17, polish complet).
// Route: /prospection (authentifiée).
//
// Aligné pixel-near sur le mockup `docs/mockups/prospection-internationale.html`
// (validé Thomas) avec TOUT le contenu :
//   1. Marché (6 cards drapeau pays)
//   2. Profil cible (3 cards + astuce hashtags par profil)
//   3. Hashtags (chips copiables + astuce méthode)
//   4. Messages :
//      - Banner timing + cultural tip du marché (peach gradient)
//      - Cards script avec label détaillé + langue + badge "Relance J+3"
//      - Toggle "Voir FR" sur scripts non-FR
//      - Arborescence relance (3 cards : ✅ positif / ⏳ J+3 / ❌ J+7)
//      - Box bilan link
//
// Animations CSS pures, palette gold/teal vive, ombres marquées.

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import {
  filterHashtags,
  filterScripts,
  PLATFORM_GRADIENTS,
  PLATFORM_ICONS,
  PLATFORM_LABELS,
  useProspectionData,
  type ProspectionScript,
} from "../hooks/useProspectionData";

type Step = 1 | 2 | 3 | 4;

export function ProspectionPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const data = useProspectionData();

  const [step, setStep] = useState<Step>(1);
  const [marketCode, setMarketCode] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  const market = useMemo(
    () => data.markets.find((m) => m.code === marketCode) ?? null,
    [data.markets, marketCode],
  );
  const profile = useMemo(
    () => data.profiles.find((p) => p.slug === profileSlug) ?? null,
    [data.profiles, profileSlug],
  );
  const marketTip = useMemo(
    () => data.marketTips.find((t) => t.market_code === marketCode) ?? null,
    [data.marketTips, marketCode],
  );
  const hashtags = useMemo(
    () => filterHashtags(data.hashtags, marketCode, profileSlug),
    [data.hashtags, marketCode, profileSlug],
  );
  const scripts = useMemo(
    () => filterScripts(data.scripts, marketCode, profileSlug),
    [data.scripts, marketCode, profileSlug],
  );

  // Lien bilan online perso (chantier #1).
  const coachSlug = (currentUser?.name ?? "")
    .toLowerCase()
    .normalize("NFD")
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)[0]
    ?.replace(/[^a-z0-9]/g, "") ?? "";
  const bilanLink = coachSlug
    ? `${window.location.origin}/bilan-online/${coachSlug}`
    : `${window.location.origin}/bilan-online`;

  // Scroll to top on step change for natural progression.
  useEffect(() => {
    if (step > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  if (data.loading) {
    return <PageShell><Skeleton /></PageShell>;
  }
  if (data.error) {
    return <PageShell><ErrorBanner>{data.error}</ErrorBanner></PageShell>;
  }

  return (
    <PageShell>
      <style>{KEYFRAMES}</style>
      <Header />
      <Stepper step={step} />

      {step === 1 && (
        <Section
          tag="Étape 1 sur 4"
          title="Quel marché tu cibles ? 🌍"
          subtitle="Chaque marché a sa langue, son réseau social dominant, son timing optimal."
        >
          <div style={gridStyle(3, 480)}>
            {data.markets.map((m) => (
              <ChoiceCard
                key={m.code}
                selected={marketCode === m.code}
                onClick={() => {
                  setMarketCode(m.code);
                  setTimeout(() => setStep(2), 200);
                }}
              >
                <span style={flagStyle}>{m.flag}</span>
                <span style={labelStyle}>{m.label}</span>
                {m.description && (
                  <span style={subStyle}>{m.description}</span>
                )}
              </ChoiceCard>
            ))}
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section
          tag="Étape 2 sur 4"
          title="Quel profil tu vises ? 🎯"
          subtitle="3 profils prioritaires La Base 360. À élargir à terme (admin pourra ajouter prof, chômeur, etc.)."
        >
          <div style={gridStyle(3, 360)}>
            {data.profiles.map((p) => (
              <ChoiceCard
                key={p.slug}
                selected={profileSlug === p.slug}
                onClick={() => {
                  setProfileSlug(p.slug);
                  setTimeout(() => setStep(3), 200);
                }}
              >
                <span style={emojiStyle}>{p.emoji}</span>
                <span style={labelStyle}>{p.label}</span>
                {p.description && (
                  <span style={subStyle}>{p.description}</span>
                )}
              </ChoiceCard>
            ))}
          </div>
          <NavRow onBack={() => setStep(1)} />
        </Section>
      )}

      {step === 3 && profile && (
        <Section
          tag="Étape 3 sur 4"
          title="Cible avec les bons hashtags 🔍"
          subtitle={`Recherche ces hashtags sur Instagram / Facebook / TikTok. Tap pour copier.`}
        >
          {hashtags.length === 0 ? (
            <EmptyState>Aucun hashtag pour cette combinaison.</EmptyState>
          ) : (
            <div style={hashtagsListStyle}>
              {hashtags.map((h) => (
                <HashtagChip key={h.id} value={h.hashtag} />
              ))}
            </div>
          )}

          {profile.hashtag_advice && (
            <TipBanner emoji="💡" title="Astuce méthode">
              {profile.hashtag_advice}
            </TipBanner>
          )}

          <NavRow
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextLabel="Voir mes messages →"
          />
        </Section>
      )}

      {step === 4 && market && profile && (
        <Section
          tag="Étape 4 sur 4"
          title="Tes messages prêts à copier 📨"
          subtitle="Personnalise le [prénom] et un [détail vu sur son profil]. Authentique > Parfait."
        >
          {marketTip && (
            <MarketTimingBanner
              flag={market.flag}
              marketLabel={market.label}
              languageLabel={marketTip.language_label}
              timing={marketTip.timing}
              culturalTip={marketTip.cultural_tip}
            />
          )}

          {scripts.length === 0 ? (
            <EmptyState>
              🌱 <strong>Messages bientôt disponibles</strong> pour ce combo ({market.label} · {profile.label}).<br />
              <span style={{ fontSize: 12 }}>Thomas peut en rédiger depuis Supabase.</span>
            </EmptyState>
          ) : (
            <div>
              {scripts.map((s) => (
                <ScriptCard
                  key={s.id}
                  script={s}
                  marketCode={marketCode ?? ""}
                />
              ))}
            </div>
          )}

          <RelanceTree bilanLink={bilanLink} />

          <BilanLinkBox link={bilanLink} />

          <NavRow
            onBack={() => setStep(3)}
            onNext={() => {
              setMarketCode(null);
              setProfileSlug(null);
              setStep(1);
            }}
            nextLabel="↻ Recommencer (autre marché)"
          />
        </Section>
      )}

      <Footer onBack={() => navigate(-1)} />
    </PageShell>
  );
}

// ============================================================================
// Shell + Header + Stepper
// ============================================================================

const KEYFRAMES = `
  @keyframes ls-prospec-fade {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes ls-prospec-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.35); }
    50% { box-shadow: 0 0 0 8px rgba(201,168,76,0); }
  }
  @keyframes ls-prospec-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ls-prospec-fade, .ls-prospec-glow, .ls-prospec-shimmer { animation: none !important; }
  }
`;

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--ls-cream, #FBF7F0)",
      color: "var(--ls-text, #1F2937)",
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: 15,
      lineHeight: 1.5,
      paddingBottom: 40,
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{
      padding: "36px 22px 28px",
      textAlign: "center",
      background: `
        radial-gradient(circle at 20% 20%, rgba(201,168,76,0.18), transparent 50%),
        radial-gradient(circle at 80% 30%, rgba(45,212,191,0.14), transparent 50%),
        linear-gradient(180deg, #FAEEDA 0%, var(--ls-cream, #FBF7F0) 100%)
      `,
      borderBottom: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        fontFamily: "'Syne', serif", fontSize: 13, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--ls-gold, #C9A84C)",
        marginBottom: 14,
      }}>
        La Base 360
        <span style={{
          display: "inline-block", width: 6, height: 6, borderRadius: "50%",
          background: "var(--ls-teal, #2DD4BF)", margin: "0 8px",
          transform: "translateY(-2px)",
          boxShadow: "0 0 8px rgba(45,212,191,0.5)",
        }} />
        Prospection
      </div>
      <h1 style={{
        fontFamily: "'Syne', serif",
        fontSize: "clamp(26px, 6vw, 36px)",
        fontWeight: 700,
        lineHeight: 1.15,
        margin: 0,
        marginBottom: 10,
        color: "var(--ls-charcoal, #0B0D11)",
      }}>
        Le monde,<br />en messages prêts.
      </h1>
      <p style={{
        fontSize: 14,
        color: "var(--ls-text-muted, #4B5563)",
        margin: 0,
        maxWidth: 440,
        marginInline: "auto",
        lineHeight: 1.55,
      }}>
        Choisis ton marché, ton profil cible, ta plateforme.<br />
        <strong style={{ color: "var(--ls-charcoal, #0B0D11)" }}>Copie-colle. Relance. Convertis.</strong>
      </p>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center", gap: 0,
      padding: "16px 20px",
      background: "var(--ls-surface, white)",
      borderBottom: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
      position: "sticky", top: 0, zIndex: 10,
      boxShadow: "0 2px 12px rgba(11,13,17,0.04)",
    }}>
      {([1, 2, 3, 4] as Step[]).map((n, i) => (
        <span key={n} style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{
            width: 30, height: 30, borderRadius: "50%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            background:
              n === step
                ? "linear-gradient(135deg, var(--ls-gold, #C9A84C), #E5C97D)"
                : n < step
                  ? "linear-gradient(135deg, var(--ls-teal, #2DD4BF), #5EEAD4)"
                  : "var(--ls-surface2, #F7F3EC)",
            color:
              n === step
                ? "var(--ls-charcoal, #0B0D11)"
                : n < step
                  ? "white"
                  : "var(--ls-text-hint, #9CA3AF)",
            transform: n === step ? "scale(1.15)" : "none",
            boxShadow: n === step
              ? "0 4px 14px rgba(201,168,76,0.45), 0 0 0 4px rgba(201,168,76,0.18)"
              : n < step
                ? "0 2px 8px rgba(45,212,191,0.30)"
                : "none",
            fontFamily: "'Syne', serif",
          }}>
            {n < step ? "✓" : n}
          </span>
          {i < 3 && (
            <span style={{
              width: 36, height: 3,
              borderRadius: 2,
              background: n < step
                ? "linear-gradient(90deg, var(--ls-teal, #2DD4BF), var(--ls-border, rgba(11,13,17,0.10)))"
                : "var(--ls-border, rgba(11,13,17,0.10))",
              transition: "background 0.3s",
            }} />
          )}
        </span>
      ))}
    </div>
  );
}

function Section({
  tag, title, subtitle, children,
}: { tag: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div
      className="ls-prospec-fade"
      style={{
        padding: "24px 20px",
        animation: "ls-prospec-fade 0.35s ease-out both",
      }}
    >
      <div style={{
        display: "inline-block",
        fontSize: 10, fontWeight: 700,
        letterSpacing: "0.16em", textTransform: "uppercase",
        padding: "5px 12px", borderRadius: 999,
        background: "linear-gradient(135deg, rgba(45,212,191,0.18), rgba(45,212,191,0.08))",
        color: "var(--ls-teal-dark, #0F766E)",
        marginBottom: 12,
        border: "1px solid rgba(45,212,191,0.25)",
      }}>
        {tag}
      </div>
      <h2 style={{
        fontFamily: "'Syne', serif",
        fontSize: "clamp(22px, 5vw, 28px)",
        fontWeight: 700,
        lineHeight: 1.25, margin: 0, marginBottom: 10,
        color: "var(--ls-charcoal, #0B0D11)",
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          fontSize: 14,
          color: "var(--ls-text-muted, #4B5563)",
          margin: 0, marginBottom: 20,
          lineHeight: 1.55,
        }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// Choice cards (marché + profil)
// ============================================================================

function ChoiceCard({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected
          ? "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(45,212,191,0.08))"
          : "var(--ls-surface, white)",
        border: `2px solid ${selected ? "var(--ls-gold, #C9A84C)" : "var(--ls-border, rgba(11,13,17,0.10))"}`,
        borderRadius: 14,
        padding: "18px 12px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: selected
          ? "0 8px 24px rgba(201,168,76,0.28), 0 0 0 4px rgba(201,168,76,0.10)"
          : "0 2px 8px rgba(11,13,17,0.04)",
        fontFamily: "inherit",
        color: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        transform: selected ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = "0 6px 18px rgba(11,13,17,0.10)";
          e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(11,13,17,0.04)";
          e.currentTarget.style.borderColor = "var(--ls-border, rgba(11,13,17,0.10))";
        }
      }}
    >
      {children}
    </button>
  );
}

const gridStyle = (cols: 2 | 3, _maxWidth: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: 10,
});

const flagStyle: CSSProperties = {
  fontSize: 36, lineHeight: 1, display: "block", marginBottom: 4,
};

const emojiStyle: CSSProperties = {
  fontSize: 38, lineHeight: 1, display: "block", marginBottom: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 14, fontWeight: 700,
  fontFamily: "'Syne', serif",
  color: "var(--ls-text, #1F2937)",
};

const subStyle: CSSProperties = {
  fontSize: 11, fontWeight: 500,
  color: "var(--ls-text-muted, #4B5563)",
};

// ============================================================================
// Hashtags
// ============================================================================

const hashtagsListStyle: CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 16px",
};

function HashtagChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => { /* silent */ });
      }}
      style={{
        background: copied
          ? "linear-gradient(135deg, var(--ls-teal, #2DD4BF), #5EEAD4)"
          : "var(--ls-surface, white)",
        border: `1.5px solid ${copied ? "var(--ls-teal, #2DD4BF)" : "var(--ls-border, rgba(11,13,17,0.10))"}`,
        color: copied ? "white" : "var(--ls-text, #1F2937)",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
        boxShadow: copied ? "0 4px 12px rgba(45,212,191,0.30)" : "0 1px 3px rgba(11,13,17,0.04)",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "linear-gradient(135deg, var(--ls-gold, #C9A84C), #E5C97D)";
          e.currentTarget.style.color = "var(--ls-charcoal, #0B0D11)";
          e.currentTarget.style.borderColor = "var(--ls-gold, #C9A84C)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "var(--ls-surface, white)";
          e.currentTarget.style.color = "var(--ls-text, #1F2937)";
          e.currentTarget.style.borderColor = "var(--ls-border, rgba(11,13,17,0.10))";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {copied ? "✓ Copié" : value}
    </button>
  );
}

// ============================================================================
// Étape 4 — Banner timing + tip culturel du marché
// ============================================================================

function MarketTimingBanner({
  flag, marketLabel, languageLabel, timing, culturalTip,
}: {
  flag: string; marketLabel: string; languageLabel: string;
  timing: string; culturalTip: string;
}) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #FAEEDA 0%, #FBF7F0 100%)",
      borderRadius: 14,
      padding: "16px 18px",
      marginBottom: 18,
      border: "1px solid rgba(201,168,76,0.30)",
      boxShadow: "0 4px 14px rgba(201,168,76,0.10)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 13, fontWeight: 700,
        color: "#8B5A1B",
        marginBottom: 10,
        fontFamily: "'Syne', serif",
      }}>
        <span style={{ fontSize: 20 }} aria-hidden="true">{flag}</span>
        {marketLabel} · {languageLabel}
      </div>
      <div style={{
        fontSize: 13,
        color: "var(--ls-text, #1F2937)",
        marginBottom: 6,
        lineHeight: 1.5,
      }}>
        {timing}
      </div>
      <div style={{
        fontSize: 13,
        color: "var(--ls-text-muted, #4B5563)",
        lineHeight: 1.5,
      }}>
        {culturalTip}
      </div>
    </div>
  );
}

// ============================================================================
// Étape 4 — Script card avec label + langue + badge J+3
// ============================================================================

const KIND_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  j3_followup: { label: "Relance J+3",     bg: "linear-gradient(135deg, #F59E0B, #FBBF24)", color: "white" },
  referral:    { label: "Après reco",      bg: "linear-gradient(135deg, #2DD4BF, #5EEAD4)", color: "white" },
  pitch:       { label: "Pitch business",  bg: "linear-gradient(135deg, #8B5CF6, #A78BFA)", color: "white" },
  direct:      { label: "Contact direct",  bg: "rgba(45,212,191,0.15)", color: "#0F766E" },
  first_contact: { label: "", bg: "", color: "" },
};

function ScriptCard({
  script, marketCode,
}: { script: ProspectionScript; marketCode: string }) {
  const [copied, setCopied] = useState(false);
  const [showFr, setShowFr] = useState(false);
  const hasTranslation = !!script.body_fr && marketCode !== "fr";
  const badge = KIND_BADGES[script.kind];
  const label = script.label || PLATFORM_LABELS[script.platform];
  const lang = script.language_label;

  function copy() {
    navigator.clipboard.writeText(script.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* silent */ });
  }

  const bodyHtml = useMemo(() => highlightVariables(script.body), [script.body]);
  const bodyFrHtml = useMemo(
    () => script.body_fr ? highlightVariables(script.body_fr) : null,
    [script.body_fr],
  );

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      border: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
      overflow: "hidden",
      marginBottom: 14,
      boxShadow: "0 4px 16px rgba(11,13,17,0.06)",
    }}>
      <div style={{
        padding: "14px 16px",
        background: "linear-gradient(135deg, #FAEEDA, #FBF7F0)",
        borderBottom: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{
          width: 38, height: 38, borderRadius: 10,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, flexShrink: 0,
          background: PLATFORM_GRADIENTS[script.platform],
          color: "white",
          boxShadow: "0 2px 8px rgba(11,13,17,0.15)",
        }} aria-hidden="true">
          {PLATFORM_ICONS[script.platform]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Syne', serif",
            fontSize: 14, fontWeight: 700,
            color: "var(--ls-text, #1F2937)",
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          }}>
            {label}
            {badge?.label && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: "3px 8px", borderRadius: 999,
                background: badge.bg,
                color: badge.color,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {badge.label}
              </span>
            )}
          </div>
          {lang && (
            <div style={{
              fontSize: 11,
              color: "var(--ls-text-muted, #4B5563)",
              marginTop: 2,
            }}>
              {lang}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "16px 18px",
          background: "var(--ls-surface2, #F7F3EC)",
          fontSize: 14.5,
          lineHeight: 1.65,
          color: "var(--ls-text, #1F2937)",
          whiteSpace: "pre-wrap",
        }}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {showFr && bodyFrHtml && (
        <div style={{
          padding: "12px 18px 16px",
          background: "linear-gradient(135deg, rgba(45,212,191,0.08), rgba(45,212,191,0.03))",
          borderTop: "1px dashed rgba(45,212,191,0.30)",
          fontSize: 13,
          lineHeight: 1.6,
          color: "var(--ls-text-muted, #4B5563)",
          whiteSpace: "pre-wrap",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ls-teal-dark, #0F766E)",
            marginBottom: 8,
          }}>
            🇫🇷 Traduction française · pour comprendre ce que tu envoies
          </div>
          <div dangerouslySetInnerHTML={{ __html: bodyFrHtml }} />
        </div>
      )}

      {script.tip && (
        <div style={{
          fontSize: 12,
          color: "var(--ls-text-hint, #9CA3AF)",
          fontStyle: "italic",
          padding: "10px 18px",
          background: "var(--ls-surface2, #F7F3EC)",
          borderTop: "1px dashed var(--ls-border, rgba(11,13,17,0.10))",
        }}>
          💡 {script.tip}
        </div>
      )}

      <div style={{
        padding: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
        background: "white",
      }}>
        <button
          type="button"
          onClick={copy}
          style={{
            flex: 1,
            background: copied
              ? "linear-gradient(135deg, var(--ls-teal, #2DD4BF), #5EEAD4)"
              : "linear-gradient(135deg, var(--ls-charcoal, #0B0D11), #1F2937)",
            color: copied ? "white" : "var(--ls-cream, #FBF7F0)",
            border: "none",
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Syne', serif",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: copied
              ? "0 4px 14px rgba(45,212,191,0.35)"
              : "0 4px 14px rgba(11,13,17,0.25)",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {copied ? "✓ Copié !" : "📋 Copier le message"}
        </button>
        {hasTranslation && (
          <button
            type="button"
            onClick={() => setShowFr((v) => !v)}
            style={{
              background: showFr
                ? "linear-gradient(135deg, var(--ls-teal-dark, #0F766E), var(--ls-teal, #2DD4BF))"
                : "var(--ls-surface2, #F7F3EC)",
              color: showFr ? "white" : "var(--ls-text-muted, #4B5563)",
              border: `1.5px solid ${showFr ? "var(--ls-teal, #2DD4BF)" : "var(--ls-border, rgba(11,13,17,0.10))"}`,
              padding: "11px 13px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
            title={showFr ? "Cacher la traduction" : "Voir la traduction FR"}
          >
            {showFr ? "✕ FR" : "🇫🇷 Voir FR"}
          </button>
        )}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function highlightVariables(body: string): string {
  return escapeHtml(body).replace(
    /\[([^\]]+)\]/g,
    (_, inner) =>
      `<strong style="background: linear-gradient(135deg, rgba(201,168,76,0.25), rgba(229,201,125,0.18)); padding: 2px 6px; border-radius: 5px; color: #633806; font-weight: 600; box-shadow: 0 1px 2px rgba(201,168,76,0.15);">[${inner}]</strong>`,
  );
}

// ============================================================================
// Étape 4 — Arborescence relance (3 cards : ✅ / ⏳ / ❌)
// ============================================================================

function RelanceTree({ bilanLink }: { bilanLink: string }) {
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{
        fontFamily: "'Syne', serif",
        fontSize: 22,
        fontWeight: 700,
        margin: 0,
        marginBottom: 8,
        color: "var(--ls-charcoal, #0B0D11)",
      }}>
        📅 Arborescence de relance
      </h2>
      <p style={{
        fontSize: 13,
        color: "var(--ls-text-muted, #4B5563)",
        margin: 0, marginBottom: 16,
        lineHeight: 1.55,
      }}>
        Ce que tu fais après envoi du 1er message, selon la réponse.
      </p>

      <RelanceCard
        accent="#16A34A"
        bgGradient="linear-gradient(135deg, rgba(22,163,74,0.08), rgba(22,163,74,0.02))"
        trigger="✅ Si réponse positive / curieuse"
      >
        → Continue la conversation, qualifie son objectif précis (combien de kilos ? quel sport ? quel budget ?). À la fin, propose le lien bilan :{" "}
        <code style={{
          background: "rgba(22,163,74,0.12)",
          padding: "2px 6px",
          borderRadius: 5,
          fontSize: 12,
          fontWeight: 600,
          color: "#15803D",
          fontFamily: "ui-monospace, monospace",
        }}>
          {bilanLink.replace(`${window.location.origin}/`, "")}
        </code>{" "}
        ou doc opportunité business.
      </RelanceCard>

      <RelanceCard
        accent="#F59E0B"
        bgGradient="linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03))"
        trigger="⏳ Si pas de réponse à J+3"
      >
        → Envoie un message de relance soft (voir scripts <strong>Relance J+3</strong> ci-dessus). Question ouverte, pas de pitch. <strong>Pas de pression.</strong>
      </RelanceCard>

      <RelanceCard
        accent="#6B7280"
        bgGradient="linear-gradient(135deg, rgba(107,114,128,0.08), rgba(107,114,128,0.02))"
        trigger="❌ Si pas de réponse à J+7"
      >
        → Abandon respectueux. <em>« On insiste pas, peut-être plus tard 🙏 »</em>. Garder le contact pour un réveil saisonnier 3-6 mois plus tard (rentrée, janvier, printemps).
      </RelanceCard>
    </div>
  );
}

function RelanceCard({
  accent, bgGradient, trigger, children,
}: { accent: string; bgGradient: string; trigger: string; children: ReactNode }) {
  return (
    <div style={{
      background: bgGradient,
      borderRadius: 12,
      padding: "14px 16px",
      borderLeft: `4px solid ${accent}`,
      marginBottom: 10,
      boxShadow: "0 2px 8px rgba(11,13,17,0.04)",
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: accent,
        marginBottom: 6,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {trigger}
      </div>
      <div style={{
        fontSize: 13.5,
        color: "var(--ls-text, #1F2937)",
        lineHeight: 1.6,
      }}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Bilan link box
// ============================================================================

function BilanLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      marginTop: 24,
      padding: 18,
      background: "linear-gradient(135deg, rgba(45,212,191,0.12), rgba(201,168,76,0.08))",
      border: "1.5px solid var(--ls-teal, #2DD4BF)",
      borderRadius: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        top: -20, right: -20,
        width: 80, height: 80,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(45,212,191,0.18), transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        fontFamily: "'Syne', serif", fontSize: 16, fontWeight: 700,
        marginBottom: 6,
        color: "var(--ls-charcoal, #0B0D11)",
        position: "relative",
      }}>
        🎁 Ton lien bilan online perso
      </div>
      <p style={{
        fontSize: 12.5,
        color: "var(--ls-text-muted, #4B5563)",
        margin: 0, marginBottom: 12,
        lineHeight: 1.55,
        position: "relative",
      }}>
        Une fois la conversation engagée, partage ce lien à la cible pour
        qu'elle remplisse un mini-bilan en 2 min. Tu reçois le Lead direct
        dans <strong>/clients · onglet Leads</strong>.
      </p>
      <div style={{ display: "flex", gap: 8, position: "relative" }}>
        <input
          readOnly
          value={link}
          onClick={(e) => e.currentTarget.select()}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "white",
            border: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
            borderRadius: 10,
            fontSize: 12,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            color: "var(--ls-text, #1F2937)",
            outline: "none",
            minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(link).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => { /* silent */ });
          }}
          style={{
            background: copied
              ? "linear-gradient(135deg, var(--ls-teal, #2DD4BF), #5EEAD4)"
              : "linear-gradient(135deg, var(--ls-gold, #C9A84C), #E5C97D)",
            color: copied ? "white" : "var(--ls-charcoal, #0B0D11)",
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Syne', serif",
            whiteSpace: "nowrap",
            boxShadow: copied
              ? "0 4px 12px rgba(45,212,191,0.35)"
              : "0 4px 12px rgba(201,168,76,0.30)",
            transition: "all 0.2s",
          }}
        >
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Tip banner générique (étape 3 astuce hashtags)
// ============================================================================

function TipBanner({
  emoji, title, children,
}: { emoji: string; title: string; children: ReactNode }) {
  return (
    <div style={{
      marginTop: 6,
      padding: "14px 16px",
      background: "linear-gradient(135deg, rgba(201,168,76,0.10), rgba(201,168,76,0.04))",
      border: "1px solid rgba(201,168,76,0.30)",
      borderRadius: 12,
      fontSize: 13.5,
      lineHeight: 1.55,
      color: "var(--ls-text, #1F2937)",
    }}>
      <div style={{
        fontWeight: 700,
        marginBottom: 4,
        color: "#8B5A1B",
        fontFamily: "'Syne', serif",
        fontSize: 13,
      }}>
        {emoji} {title}
      </div>
      <div style={{ color: "var(--ls-text-muted, #4B5563)" }}>{children}</div>
    </div>
  );
}

// ============================================================================
// Navigation row, Footer, Skeleton, Error, Empty
// ============================================================================

function NavRow({
  onBack, onNext, nextLabel = "Suivant →",
}: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div style={{
      display: "flex",
      gap: 10,
      marginTop: 24,
    }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "var(--ls-surface, white)",
            color: "var(--ls-text-muted, #4B5563)",
            border: "1.5px solid var(--ls-border, rgba(11,13,17,0.10))",
            padding: "13px 20px",
            borderRadius: 12,
            fontFamily: "'Syne', serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.18s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--ls-text-muted, #4B5563)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--ls-border, rgba(11,13,17,0.10))";
          }}
        >
          ← Retour
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            background: "linear-gradient(135deg, var(--ls-gold, #C9A84C), #E5C97D)",
            color: "var(--ls-charcoal, #0B0D11)",
            border: "none",
            padding: "13px 20px",
            borderRadius: 12,
            fontFamily: "'Syne', serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(201,168,76,0.35)",
            transition: "all 0.2s",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(201,168,76,0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(201,168,76,0.35)";
          }}
        >
          {nextLabel}
        </button>
      )}
    </div>
  );
}

function Footer({ onBack }: { onBack: () => void }) {
  return (
    <div style={{
      padding: "28px 20px",
      textAlign: "center",
      color: "var(--ls-text-hint, #9CA3AF)",
      fontSize: 12,
      borderTop: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
      marginTop: 28,
    }}>
      <p style={{ margin: 0, marginBottom: 12, lineHeight: 1.55 }}>
        💡 La meilleure prospection :<br />
        <strong style={{ color: "var(--ls-gold, #C9A84C)", fontSize: 13 }}>
          1 message authentique &gt; 100 copier-coller.
        </strong>
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--ls-text-muted, #4B5563)",
          fontSize: 12,
          textDecoration: "underline",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ← Retour à l'app
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: 20 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          height: 80,
          marginBottom: 10,
          background: "linear-gradient(90deg, var(--ls-surface2, #F7F3EC) 0%, rgba(255,255,255,0.6) 50%, var(--ls-surface2, #F7F3EC) 100%)",
          backgroundSize: "200% 100%",
          animation: "ls-prospec-shimmer 1.5s linear infinite",
          borderRadius: 14,
        }} />
      ))}
    </div>
  );
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: 20, margin: 20,
      background: "rgba(251,113,133,0.10)",
      border: "1px solid var(--ls-coral, #FB7185)",
      borderRadius: 12,
      color: "var(--ls-coral, #FB7185)",
      fontSize: 14,
    }}>
      ⚠️ {children}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: 28, textAlign: "center",
      background: "var(--ls-surface, white)",
      border: "1.5px dashed var(--ls-border, rgba(11,13,17,0.10))",
      borderRadius: 14,
      color: "var(--ls-text-muted, #4B5563)",
      fontSize: 13.5,
      lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}
