// Chantier #3 — Module Prospection cold mobile-first (2026-05-17).
// Route: /prospection (authentifiée, distri + admin + référent).
//
// Implémente strictement le mockup validé Thomas
// `docs/mockups/prospection-internationale.html` (branche
// claude/fix-mobile-chat-history-d1jFW). 4 étapes :
//   1. Marché (drapeau pays)
//   2. Profil cible (perte de poids / sport / business)
//   3. Hashtags (chips copiables)
//   4. Messages (scripts par plateforme + toggle traduction FR)
//
// Toggle traduction FR : pour les scripts non-FR, le coach peut afficher
// la version française du body pour comprendre ce qu'il s'apprête à
// copier-coller. Demande Thomas.

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
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

  const hashtags = useMemo(
    () => filterHashtags(data.hashtags, marketCode, profileSlug),
    [data.hashtags, marketCode, profileSlug],
  );
  const scripts = useMemo(
    () => filterScripts(data.scripts, marketCode, profileSlug),
    [data.scripts, marketCode, profileSlug],
  );

  // Lien bilan online perso du coach (chantier #1).
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

  if (data.loading) {
    return <PageShell><Skeleton /></PageShell>;
  }
  if (data.error) {
    return (
      <PageShell>
        <ErrorBanner>{data.error}</ErrorBanner>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <style>{KEYFRAMES}</style>
      <Header />
      <Stepper step={step} />

      {step === 1 && (
        <Section
          tag="ÉTAPE 1 / 4"
          title="Choisis ton marché"
          subtitle="Sur quel pays / quelle langue tu veux prospecter ?"
        >
          <div style={gridStyle(2)}>
            {data.markets.map((m) => (
              <ChoiceCard
                key={m.code}
                selected={marketCode === m.code}
                onClick={() => setMarketCode(m.code)}
              >
                <span style={emojiStyle}>{m.flag}</span>
                <span style={labelStyle}>{m.label}</span>
                {m.description && (
                  <span style={subStyle}>{m.description}</span>
                )}
              </ChoiceCard>
            ))}
          </div>
          <NavRow
            disableNext={!marketCode}
            onNext={() => setStep(2)}
          />
        </Section>
      )}

      {step === 2 && (
        <Section
          tag="ÉTAPE 2 / 4"
          title="Profil cible"
          subtitle={market ? `Sur ${market.label}, qui tu vises ?` : ""}
        >
          <div style={gridStyle(3)}>
            {data.profiles.map((p) => (
              <ChoiceCard
                key={p.slug}
                selected={profileSlug === p.slug}
                onClick={() => setProfileSlug(p.slug)}
              >
                <span style={emojiStyle}>{p.emoji}</span>
                <span style={labelStyle}>{p.label}</span>
                {p.description && (
                  <span style={subStyle}>{p.description}</span>
                )}
              </ChoiceCard>
            ))}
          </div>
          <NavRow
            onBack={() => setStep(1)}
            disableNext={!profileSlug}
            onNext={() => setStep(3)}
          />
        </Section>
      )}

      {step === 3 && (
        <Section
          tag="ÉTAPE 3 / 4"
          title="Hashtags à utiliser"
          subtitle={
            market && profile
              ? `Cible ${profile.label.toLowerCase()} sur ${market.label}. Clique pour copier.`
              : ""
          }
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
          <NavRow
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        </Section>
      )}

      {step === 4 && (
        <Section
          tag="ÉTAPE 4 / 4"
          title="Premier contact"
          subtitle={
            market
              ? `Scripts par plateforme. Clique sur "Copier", colle, personnalise les ${"[crochets]"} avec le prénom de la cible.`
              : ""
          }
        >
          {scripts.length === 0 ? (
            <EmptyState>Aucun script pour cette combinaison. Essaie une autre plateforme ou demande à Thomas de t'en rédiger.</EmptyState>
          ) : (
            <div>
              {scripts.map((s) => (
                <ScriptCard
                  key={s.id}
                  script={s}
                  marketLabel={market?.label ?? ""}
                  marketCode={marketCode ?? ""}
                />
              ))}
            </div>
          )}

          <BilanLinkBox link={bilanLink} />

          <NavRow
            onBack={() => setStep(3)}
            nextLabel="↑ Retour au début"
            onNext={() => {
              setMarketCode(null);
              setProfileSlug(null);
              setStep(1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </Section>
      )}

      <Footer onBack={() => navigate(-1)} />
    </PageShell>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sous-composants UI
// ────────────────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes ls-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ls-prospection-fade { animation: none !important; }
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
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{
      padding: "32px 20px 20px",
      textAlign: "center",
      background: "linear-gradient(180deg, #FAEEDA 0%, var(--ls-cream, #FBF7F0) 100%)",
    }}>
      <div style={{
        fontFamily: "'Syne', serif", fontSize: 13, fontWeight: 700,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--ls-gold, #C9A84C)",
        marginBottom: 10,
      }}>
        La Base 360
        <span style={{
          display: "inline-block", width: 5, height: 5, borderRadius: "50%",
          background: "var(--ls-teal, #2DD4BF)", margin: "0 6px",
          transform: "translateY(-2px)",
        }} />
        Prospection
      </div>
      <h1 style={{
        fontFamily: "'Syne', serif", fontSize: 26, fontWeight: 700,
        lineHeight: 1.25, margin: 0, marginBottom: 8,
      }}>
        Le monde, en messages prêts.
      </h1>
      <p style={{
        fontSize: 14, color: "var(--ls-text-muted, #4B5563)",
        margin: 0, maxWidth: 480, marginInline: "auto",
      }}>
        Choisis ton marché, ton profil cible, ta plateforme. Copie-colle. Relance. Convertis.
      </p>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div style={{
      display: "flex", justifyContent: "center", gap: 6,
      padding: "14px 20px",
      background: "var(--ls-surface, white)",
      borderBottom: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
      position: "sticky", top: 0, zIndex: 10,
    }}>
      {([1, 2, 3, 4] as Step[]).map((n, i) => (
        <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 24, height: 24, borderRadius: "50%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
            transition: "all 0.2s",
            background:
              n === step
                ? "var(--ls-gold, #C9A84C)"
                : n < step
                  ? "var(--ls-teal, #2DD4BF)"
                  : "var(--ls-surface2, #F7F3EC)",
            color:
              n === step
                ? "var(--ls-charcoal, #0B0D11)"
                : n < step
                  ? "white"
                  : "var(--ls-text-hint, #9CA3AF)",
            transform: n === step ? "scale(1.1)" : "none",
            boxShadow: n === step ? "0 0 0 4px rgba(201,168,76,0.2)" : "none",
          }}>
            {n}
          </span>
          {i < 3 && (
            <span style={{
              width: 24, height: 2,
              background: "var(--ls-border, rgba(11,13,17,0.10))",
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
      className="ls-prospection-fade"
      style={{
        padding: 20,
        animation: "ls-fade-up 0.3s ease-out both",
      }}
    >
      <div style={{
        display: "inline-block", fontSize: 10, fontWeight: 700,
        letterSpacing: "0.14em", textTransform: "uppercase",
        padding: "4px 10px", borderRadius: 12,
        background: "rgba(45,212,191,0.12)",
        color: "var(--ls-teal-dark, #0F766E)",
        marginBottom: 10,
      }}>
        {tag}
      </div>
      <h2 style={{
        fontFamily: "'Syne', serif", fontSize: 22, fontWeight: 700,
        lineHeight: 1.3, margin: 0, marginBottom: 8,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 14, color: "var(--ls-text-muted, #4B5563)", margin: 0, marginBottom: 16 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

function ChoiceCard({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: selected
          ? "linear-gradient(135deg, rgba(201,168,76,0.10), rgba(45,212,191,0.06))"
          : "var(--ls-surface, white)",
        border: `1.5px solid ${selected ? "var(--ls-gold, #C9A84C)" : "var(--ls-border, rgba(11,13,17,0.10))"}`,
        borderRadius: 12,
        padding: "16px 12px",
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.18s",
        boxShadow: selected ? "0 4px 14px rgba(201,168,76,0.18)" : "none",
        fontFamily: "inherit",
        color: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
}

const gridStyle = (cols: 2 | 3): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gap: cols === 2 ? 10 : 8,
});

const emojiStyle: CSSProperties = {
  fontSize: 32, lineHeight: 1, display: "block",
};

const labelStyle: CSSProperties = {
  fontSize: 13, fontWeight: 700,
  color: "var(--ls-text, #1F2937)",
};

const subStyle: CSSProperties = {
  fontSize: 10, fontWeight: 500,
  color: "var(--ls-text-muted, #4B5563)",
};

const hashtagsListStyle: CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0",
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
        background: copied ? "var(--ls-teal, #2DD4BF)" : "var(--ls-surface, white)",
        border: `1px solid ${copied ? "var(--ls-teal, #2DD4BF)" : "var(--ls-border, rgba(11,13,17,0.10))"}`,
        color: copied ? "white" : "var(--ls-text, #1F2937)",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "var(--ls-gold, #C9A84C)";
          e.currentTarget.style.color = "var(--ls-charcoal, #0B0D11)";
          e.currentTarget.style.borderColor = "var(--ls-gold, #C9A84C)";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.background = "var(--ls-surface, white)";
          e.currentTarget.style.color = "var(--ls-text, #1F2937)";
          e.currentTarget.style.borderColor = "var(--ls-border, rgba(11,13,17,0.10))";
        }
      }}
    >
      {copied ? "✓ Copié" : value}
    </button>
  );
}

function ScriptCard({
  script, marketLabel, marketCode,
}: { script: ProspectionScript; marketLabel: string; marketCode: string }) {
  const [copied, setCopied] = useState(false);
  const [showFr, setShowFr] = useState(false);
  const hasTranslation = script.body_fr && marketCode !== "fr";

  function copy() {
    navigator.clipboard.writeText(script.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* silent */ });
  }

  // Highlight [variables] dans le body
  const bodyHtml = useMemo(
    () => highlightVariables(script.body),
    [script.body],
  );
  const bodyFrHtml = useMemo(
    () => script.body_fr ? highlightVariables(script.body_fr) : null,
    [script.body_fr],
  );

  return (
    <div style={{
      background: "white",
      borderRadius: 14,
      border: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
      overflow: "hidden",
      marginBottom: 12,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        padding: "12px 16px",
        background: "linear-gradient(135deg, #FAEEDA, #FBF7F0)",
        borderBottom: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
          background: PLATFORM_GRADIENTS[script.platform],
          color: "white",
        }} aria-hidden="true">
          {PLATFORM_ICONS[script.platform]}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ls-text, #1F2937)" }}>
            {PLATFORM_LABELS[script.platform]}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted, #4B5563)" }}>
            {marketLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "14px 16px",
          background: "var(--ls-surface2, #F7F3EC)",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--ls-text, #1F2937)",
          whiteSpace: "pre-wrap",
        }}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {showFr && bodyFrHtml && (
        <div
          style={{
            padding: "10px 16px 14px",
            background: "rgba(45,212,191,0.06)",
            borderTop: "1px dashed var(--ls-border, rgba(11,13,17,0.10))",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--ls-text-muted, #4B5563)",
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ls-teal-dark, #0F766E)",
            marginBottom: 6,
          }}>
            🇫🇷 Traduction française (pour comprendre ce que tu copies)
          </div>
          <div dangerouslySetInnerHTML={{ __html: bodyFrHtml }} />
        </div>
      )}

      {script.tip && (
        <div style={{
          fontSize: 11,
          color: "var(--ls-text-hint, #9CA3AF)",
          fontStyle: "italic",
          padding: "8px 16px",
          background: "var(--ls-surface2, #F7F3EC)",
          borderTop: "1px dashed var(--ls-border, rgba(11,13,17,0.10))",
        }}>
          💡 {script.tip}
        </div>
      )}

      <div style={{
        padding: 10,
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
            background: copied ? "var(--ls-teal, #2DD4BF)" : "var(--ls-charcoal, #0B0D11)",
            color: copied ? "white" : "var(--ls-cream, #FBF7F0)",
            border: "none",
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Syne', serif",
            cursor: "pointer",
            transition: "all 0.18s",
          }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {copied ? "✓ Copié !" : "Copier le message"}
        </button>
        {hasTranslation && (
          <button
            type="button"
            onClick={() => setShowFr((v) => !v)}
            style={{
              background: showFr ? "var(--ls-teal-dark, #0F766E)" : "var(--ls-surface2, #F7F3EC)",
              color: showFr ? "white" : "var(--ls-text-muted, #4B5563)",
              border: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
            title={showFr ? "Cacher la traduction" : "Voir la traduction FR"}
          >
            {showFr ? "👁 Masquer FR" : "👁 Voir FR"}
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
  // Surligne en gold les segments [entre crochets]. Le coach doit personnaliser.
  return escapeHtml(body).replace(
    /\[([^\]]+)\]/g,
    (_, inner) =>
      `<strong style="background: rgba(201,168,76,0.18); padding: 1px 4px; border-radius: 4px; color: #633806; font-weight: 600;">[${inner}]</strong>`,
  );
}

function BilanLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      marginTop: 20,
      padding: 16,
      background: "linear-gradient(135deg, rgba(45,212,191,0.10), rgba(201,168,76,0.06))",
      border: "1px solid var(--ls-teal, #2DD4BF)",
      borderRadius: 14,
    }}>
      <div style={{
        fontFamily: "'Syne', serif", fontSize: 14, fontWeight: 700,
        marginBottom: 6,
      }}>
        🎁 Ton lien bilan online perso
      </div>
      <p style={{
        fontSize: 12, color: "var(--ls-text-muted, #4B5563)",
        margin: 0, marginBottom: 10,
      }}>
        Une fois la conversation engagée, partage ce lien à la cible pour
        qu'elle remplisse un mini-bilan en 2 min. Tu reçois le Lead direct.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          readOnly
          value={link}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "white",
            border: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
            borderRadius: 8,
            fontSize: 11,
            fontFamily: "monospace",
            color: "var(--ls-text, #1F2937)",
            outline: "none",
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
            background: copied ? "var(--ls-teal, #2DD4BF)" : "var(--ls-gold, #C9A84C)",
            color: copied ? "white" : "var(--ls-charcoal, #0B0D11)",
            border: "none",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Syne', serif",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

function NavRow({
  onBack, onNext, disableNext, nextLabel = "Suivant →",
}: { onBack?: () => void; onNext?: () => void; disableNext?: boolean; nextLabel?: string }) {
  return (
    <div style={{
      display: "flex",
      gap: 8,
      marginTop: 24,
    }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "var(--ls-surface2, #F7F3EC)",
            color: "var(--ls-text-muted, #4B5563)",
            border: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
            padding: "12px 18px",
            borderRadius: 10,
            fontFamily: "'Syne', serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={disableNext}
          style={{
            flex: 1,
            background: disableNext
              ? "var(--ls-surface2, #F7F3EC)"
              : "linear-gradient(135deg, var(--ls-gold, #C9A84C), #E5C97D)",
            color: disableNext
              ? "var(--ls-text-hint, #9CA3AF)"
              : "var(--ls-charcoal, #0B0D11)",
            border: "none",
            padding: "12px 18px",
            borderRadius: 10,
            fontFamily: "'Syne', serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: disableNext ? "not-allowed" : "pointer",
            boxShadow: disableNext ? "none" : "0 4px 16px rgba(201,168,76,0.3)",
            transition: "transform 0.18s",
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
      padding: "24px 20px",
      textAlign: "center",
      color: "var(--ls-text-hint, #9CA3AF)",
      fontSize: 11,
      borderTop: "1px solid var(--ls-border, rgba(11,13,17,0.10))",
      marginTop: 20,
    }}>
      <p style={{ margin: 0, marginBottom: 10 }}>
        💡 La meilleure prospection : <strong style={{ color: "var(--ls-gold, #C9A84C)" }}>1 message authentique &gt; 100 copier-coller.</strong>
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--ls-text-muted, #4B5563)",
          fontSize: 11,
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
          background: "var(--ls-surface2, #F7F3EC)",
          borderRadius: 12,
          opacity: 0.5,
        }} />
      ))}
    </div>
  );
}

function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: 20,
      margin: 20,
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
      padding: 24,
      textAlign: "center",
      background: "var(--ls-surface2, #F7F3EC)",
      border: "1px dashed var(--ls-border, rgba(11,13,17,0.10))",
      borderRadius: 12,
      color: "var(--ls-text-muted, #4B5563)",
      fontSize: 13,
    }}>
      {children}
    </div>
  );
}
