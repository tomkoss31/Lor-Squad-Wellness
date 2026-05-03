// =============================================================================
// DistriOnboardingChecklist — feature #10 (2026-11-04)
//
// Sequence d accueil J0-J7 pour les nouveaux distri. S affiche sur Co-pilote
// pendant les 7 premiers jours apres user.createdAt.
//
// 6 etapes (texte uniquement V1, vocaux en V2) :
//   J0 — Bienvenue + acces Academy
//   J1 — Charte distributeur (signature)
//   J2 — Liste de connaissances (M1.2)
//   J3 — Premier message a un prospect
//   J5 — Premier client / bilan
//   J7 — Bilan onboarding (5 invits faites ?)
//
// Persistance localStorage par user (ls-onboarding-checks-{userId}).
// Auto-cache si user.createdAt > 7j ou si toutes les etapes cochees.
//
// Pas de DB / migration / cron — V1 texte pure UI driven, persistance
// locale. Si besoin cross-device V2 : table user_onboarding_steps.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const STORAGE_PREFIX = "ls-onboarding-checks-";

interface OnboardingStep {
  day: number;
  emoji: string;
  title: string;
  description: string;
  cta?: { label: string; to: string };
  copySnippet?: string; // Texte template a copier pour message prospect
}

const STEPS: OnboardingStep[] = [
  {
    day: 0,
    emoji: "🎉",
    title: "Bienvenue dans Lor'Squad",
    description:
      "Prends 5 minutes pour explorer l'app. Co-pilote, Agenda, Clients, Formation. Touche tout sans pression.",
    cta: { label: "Découvrir l'Academy", to: "/academy" },
  },
  {
    day: 1,
    emoji: "✍️",
    title: "Signe ta charte distributeur",
    description:
      "Ta charte = ta boussole. 5 engagements + ton « pourquoi » + objectif 12 mois. Imprime-la, accroche-la.",
    cta: { label: "Signer ma charte", to: "/formation/charte" },
  },
  {
    day: 2,
    emoji: "📋",
    title: "Liste de connaissances (M1.2)",
    description:
      "Note 30 personnes que tu connais — sans filtrer. Famille, collègues, voisins, anciens amis. Pas de jugement à ce stade.",
    cta: { label: "Module M1.2", to: "/formation/parcours/demarrer" },
  },
  {
    day: 3,
    emoji: "💬",
    title: "Premier message à un prospect",
    description:
      "Choisis 1 personne dans ta liste. Pas la plus facile, pas la plus difficile. Envoie ce message.",
    copySnippet:
      "Salut {prénom} ! Je teste un truc bien-être en ce moment, et j'ai pensé à toi. Pas pour te vendre quoi que ce soit — juste partager. Tu serais ouvert·e à un café 15 min cette semaine ?",
  },
  {
    day: 5,
    emoji: "🤝",
    title: "Premier bilan / RDV client",
    description:
      "Premier RDV programmé ? Bravo. Sinon, relance 2-3 personnes de ta liste avec un autre angle.",
    cta: { label: "Lancer un bilan", to: "/clients/nouveau" },
  },
  {
    day: 7,
    emoji: "🎯",
    title: "Bilan onboarding — 5 invits faites ?",
    description:
      "Compte tes invitations envoyées cette semaine. Objectif : 5 minimum. Si moins, pas grave — on rectifie le tir avec ton coach.",
  },
];

interface OnboardingChecks {
  [day: string]: boolean;
}

function readChecks(userId: string): OnboardingChecks {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return {};
    return JSON.parse(raw) as OnboardingChecks;
  } catch {
    return {};
  }
}

function writeChecks(userId: string, value: OnboardingChecks): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

function daysSince(iso?: string | null): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((Date.now() - t) / 86400000);
}

export function DistriOnboardingChecklist() {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const userCreatedAt = currentUser?.createdAt ?? null;
  const [checks, setChecks] = useState<OnboardingChecks>({});
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    setChecks(readChecks(userId));
  }, [userId]);

  const dayNumber = useMemo(() => daysSince(userCreatedAt), [userCreatedAt]);
  const allDone = STEPS.every((s) => checks[String(s.day)]);
  const doneCount = STEPS.filter((s) => checks[String(s.day)]).length;

  // Auto-cache si > 7j ET tout fait, ou si > 14j (donne du tampon)
  // Garde affichage si user fresh (< 14j) meme si pas tout fait, pour
  // permettre rattrapage.
  if (!userId) return null;
  if (dayNumber > 14) return null;
  if (allDone) return null;

  function toggle(day: number) {
    if (!userId) return;
    const k = String(day);
    setChecks((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      writeChecks(userId, next);
      return next;
    });
  }

  function handleCopy(snippet: string, day: number) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(day);
      window.setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <section
      style={{
        padding: "20px 22px",
        borderRadius: 18,
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 4%, var(--ls-surface)) 100%)",
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
        boxShadow: "0 6px 22px -12px color-mix(in srgb, var(--ls-gold) 30%, transparent)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-gold)",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 4,
            }}
          >
            ✦ Tes 7 premiers jours
          </div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 18,
              color: "var(--ls-text)",
              margin: 0,
              letterSpacing: "-0.012em",
            }}
          >
            Onboarding distributeur
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            padding: "6px 12px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface))",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          }}
        >
          <span
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 18,
              color: "var(--ls-gold)",
              lineHeight: 1,
            }}
          >
            {doneCount}
          </span>
          <span
            style={{
              fontFamily: "Syne, serif",
              fontSize: 13,
              color: "var(--ls-text-muted)",
              fontWeight: 600,
            }}
          >
            / {STEPS.length}
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          margin: "0 0 16px",
          lineHeight: 1.55,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Une étape par jour pour ne jamais lâcher en zone critique. Coche ce qui
        est fait, prends ton temps sur ce qui reste.
      </p>

      {/* Steps */}
      <ol
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {STEPS.map((step) => {
          const isOn = !!checks[String(step.day)];
          const isCurrent = !isOn && dayNumber >= step.day;
          const isFuture = dayNumber < step.day;
          const opacity = isFuture ? 0.55 : 1;

          return (
            <li
              key={step.day}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: isOn
                  ? "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface2))"
                  : isCurrent
                    ? "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2))"
                    : "var(--ls-surface2)",
                border: isOn
                  ? "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)"
                  : isCurrent
                    ? "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)"
                    : "0.5px solid var(--ls-border)",
                opacity,
                transition: "all 250ms ease",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                {/* Day badge */}
                <button
                  type="button"
                  onClick={() => toggle(step.day)}
                  aria-pressed={isOn}
                  aria-label={`Marquer J${step.day} comme ${isOn ? "non fait" : "fait"}`}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: isOn
                      ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, var(--ls-bg)) 100%)"
                      : "var(--ls-surface)",
                    border: isOn ? "none" : "1px solid var(--ls-border)",
                    color: isOn ? "var(--ls-bg)" : "var(--ls-text-hint)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Syne, serif",
                    fontWeight: 800,
                    fontSize: 11,
                    cursor: "pointer",
                    flexShrink: 0,
                    boxShadow: isOn
                      ? "0 2px 8px color-mix(in srgb, var(--ls-teal) 35%, transparent)"
                      : "none",
                    transition: "all 200ms ease",
                  }}
                >
                  {isOn ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    `J${step.day}`
                  )}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 3,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 16 }} aria-hidden="true">
                      {step.emoji}
                    </span>
                    <span
                      style={{
                        fontFamily: "Syne, serif",
                        fontWeight: 700,
                        fontSize: 14,
                        color: isOn ? "var(--ls-text-muted)" : "var(--ls-text)",
                        textDecoration: isOn ? "line-through" : "none",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {step.title}
                    </span>
                    {isCurrent ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "var(--ls-gold)",
                          color: "var(--ls-bg)",
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        Aujourd&apos;hui
                      </span>
                    ) : null}
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ls-text-muted)",
                      margin: 0,
                      lineHeight: 1.55,
                    }}
                  >
                    {step.description}
                  </p>

                  {/* CTA */}
                  {step.cta && !isOn ? (
                    <Link
                      to={step.cta.to}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 10,
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "color-mix(in srgb, var(--ls-gold) 14%, var(--ls-surface))",
                        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
                        color: "var(--ls-gold)",
                        fontSize: 11.5,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      {step.cta.label} →
                    </Link>
                  ) : null}

                  {/* Copy template */}
                  {step.copySnippet && !isOn ? (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: "var(--ls-surface)",
                          border: "0.5px dashed color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))",
                          fontSize: 12,
                          color: "var(--ls-text)",
                          fontStyle: "italic",
                          lineHeight: 1.55,
                          marginBottom: 6,
                        }}
                      >
                        « {step.copySnippet} »
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(step.copySnippet ?? "", step.day)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          background:
                            copied === step.day
                              ? "var(--ls-teal)"
                              : "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface))",
                          border:
                            copied === step.day
                              ? "0.5px solid var(--ls-teal)"
                              : "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
                          color: copied === step.day ? "var(--ls-bg)" : "var(--ls-teal)",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 180ms ease",
                        }}
                      >
                        {copied === step.day ? "✓ Copié" : "📋 Copier le message"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p
        style={{
          fontSize: 10.5,
          color: "var(--ls-text-hint)",
          margin: "14px 0 0",
          fontStyle: "italic",
          textAlign: "center",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        🔒 Tes coches restent enregistrées sur ton appareil. Tu peux revenir
        cocher à tout moment.
      </p>
    </section>
  );
}
