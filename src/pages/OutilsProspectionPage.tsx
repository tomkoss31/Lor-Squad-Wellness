// =============================================================================
// OutilsProspectionPage — boite a outils marketing prospection (chantier 2026-11-07)
// =============================================================================
//
// Page admin only qui regroupe TOUS les liens et docs marketing partageables
// en un seul endroit. Permet :
//   - Copier en 1 clic les liens /opportunite et /simulateur (?ref=user_id auto)
//   - Ouvrir / imprimer les 3 docs HTML standalone
//   - Partage rapide via WhatsApp / SMS / Email avec message pre-redige
//   - Mode contextuel ?client=ID : envoi cible a un client precis (depuis
//     SendBusinessPlanButton "Voir tous les outils")
//
// Acces : /outils-prospection (admin only)
//   - Card sur /developpement (hub annexe distri)
//   - Raccourci sur ReferrerStatsCard du Co-pilote
//   - Lien "Voir tous les outils" depuis SendBusinessPlanButton fiche client
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { ReferrerStatsCard } from "../components/copilote/ReferrerStatsCard";
import type { Client } from "../types/domain";

interface ToolDef {
  id: string;
  category: "link" | "doc";
  emoji: string;
  title: string;
  description: string;
  /** URL relative ou path. ?ref=user_id ajoute automatiquement pour les links. */
  path: string;
  /** Type de doc pour bouton imprimer. */
  isPrintable?: boolean;
  /** Couleur accent (G3). */
  accent: "emerald" | "cyan" | "violet" | "gold";
  /** Tagline courte pour cards. */
  usage: string;
}

const TOOLS: ToolDef[] = [
  // ─── Liens à partager (pages React) ───────────────────────────────────────
  {
    id: "opportunite",
    category: "link",
    emoji: "🎯",
    title: "Page éducative",
    description:
      "Page complète qui présente l'opportunité business : 4 sources de revenus, 5 paliers, cas concret, FAQ, story. Form contact intégré en bas.",
    path: "/opportunite",
    accent: "emerald",
    usage: "Pour partage froid sur réseaux sociaux ou prospect intéressé",
  },
  {
    id: "simulateur",
    category: "link",
    emoji: "✨",
    title: "Simulateur de revenus",
    description:
      "Page interactive : le prospect saisit son objectif (€/mois) et son délai, l'app calcule un plan d'action concret (clients, prospects à approcher).",
    path: "/simulateur",
    accent: "cyan",
    usage: "Pour prospect qui veut du concret chiffré, en RDV",
  },

  // ─── Docs imprimables (HTML standalone) ───────────────────────────────────
  {
    id: "doc-prospect",
    category: "doc",
    emoji: "📄",
    title: "Plan prospect (PDF)",
    description:
      "Document complet pour recrutement client : 5 paliers vulgarisés, cas concret 10 programmes, pack 61,21 €, FAQ. A4 portrait ~5 pages.",
    path: "/marketing-plan-prospect.html",
    isPrintable: true,
    accent: "violet",
    usage: "Imprimer pour RDV physique ou envoyer en PDF par email",
  },
  {
    id: "doc-slides",
    category: "doc",
    emoji: "🎤",
    title: "Slides présentation",
    description:
      "12 slides format A4 paysage, 1 par page imprimable, navigation flèches. Couverture complète du plan marketing.",
    path: "/marketing-plan-slides.html",
    isPrintable: true,
    accent: "cyan",
    usage: "Présentation projection ou PDF deck pour réunion équipe",
  },
  {
    id: "doc-technique",
    category: "doc",
    emoji: "📚",
    title: "Plan technique distri",
    description:
      "Référence complète : paliers détaillés, formules royalty / overrides, conversion PV→€, règle de compression chaîne. Pour formation interne.",
    path: "/marketing-plan.html",
    isPrintable: true,
    accent: "gold",
    usage: "Formation distri / référence technique interne",
  },
];

function getOriginUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function OutilsProspectionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentUser, clients } = useAppContext();
  const { push: pushToast } = useToast();

  // ─── Mode contextuel : ?client=ID ─────────────────────────────────────────
  const clientId = params.get("client");
  const fromBusiness = params.get("from") === "business";
  const targetClient = useMemo<Client | null>(() => {
    if (!clientId) return null;
    return clients.find((c) => c.id === clientId) ?? null;
  }, [clientId, clients]);

  // ─── Sélecteur partage rapide (mode général) ──────────────────────────────
  const [shareLinkId, setShareLinkId] = useState<string>("opportunite");
  const [shareCustomMessage, setShareCustomMessage] = useState<string>("");

  useEffect(() => {
    document.title = "La Base 360 — Outils Prospection";
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function buildLink(path: string): string {
    const origin = getOriginUrl();
    if (!path.startsWith("/")) return `${origin}/${path}`;
    const sep = path.includes("?") ? "&" : "?";
    return currentUser?.id ? `${origin}${path}${sep}ref=${currentUser.id}` : `${origin}${path}`;
  }

  function buildDefaultMessage(toolTitle: string, link: string, firstName?: string): string {
    const greet = firstName ? `Salut ${firstName}` : "Salut";
    return (
      `${greet} !\n\n` +
      `J'ai un truc à te montrer — ça pourrait vraiment t'intéresser :\n\n` +
      `${link}\n\n` +
      `(${toolTitle})\n\n` +
      `On en parle quand tu veux ?`
    );
  }

  async function copyLink(path: string, toolTitle: string) {
    const link = buildLink(path);
    try {
      await navigator.clipboard.writeText(link);
      pushToast({
        tone: "success",
        title: "Lien copié",
        message: `${toolTitle} — colle où tu veux !`,
      });
    } catch {
      pushToast({
        tone: "warning",
        title: "Copie échouée",
        message: "Sélectionne le lien à la main.",
      });
    }
  }

  function openLink(path: string) {
    window.open(buildLink(path), "_blank", "noopener");
  }

  function openPrintable(path: string) {
    window.open(buildLink(path), "_blank", "noopener");
  }

  function shareViaWhatsApp(toolPath: string, toolTitle: string, phone?: string) {
    const link = buildLink(toolPath);
    const msg = buildDefaultMessage(toolTitle, link, targetClient?.firstName);
    const phoneClean = (phone ?? targetClient?.phone ?? "").replace(/[^\d+]/g, "");
    const phoneE164 = phoneClean.startsWith("+")
      ? phoneClean
      : phoneClean.startsWith("0")
        ? `+33${phoneClean.slice(1)}`
        : phoneClean;
    const url = `https://wa.me/${phoneE164.replace("+", "")}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  }

  function shareViaSMS(toolPath: string, toolTitle: string, phone?: string) {
    const link = buildLink(toolPath);
    const msg = buildDefaultMessage(toolTitle, link, targetClient?.firstName);
    const phoneClean = (phone ?? targetClient?.phone ?? "").replace(/[^\d+]/g, "");
    const phoneE164 = phoneClean.startsWith("+")
      ? phoneClean
      : phoneClean.startsWith("0")
        ? `+33${phoneClean.slice(1)}`
        : phoneClean;
    window.location.href = `sms:${phoneE164}?&body=${encodeURIComponent(msg)}`;
  }

  function shareViaEmail(toolPath: string, toolTitle: string, email?: string) {
    const link = buildLink(toolPath);
    const msg = buildDefaultMessage(toolTitle, link, targetClient?.firstName);
    const subject = encodeURIComponent(`${toolTitle} — La Base 360`);
    const targetEmail = email ?? targetClient?.email ?? "";
    if (!targetEmail) {
      pushToast({ tone: "warning", title: "Pas d'email", message: "Le destinataire n'a pas d'email." });
      return;
    }
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${encodeURIComponent(msg)}`;
  }

  // ─── Auth check : admin only ──────────────────────────────────────────────
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="op-page">
        <style>{OP_STYLES}</style>
        <div className="op-restricted">
          <h2>🔒 Accès admin uniquement</h2>
          <p>Cette page est réservée aux admins. Contacte ton coach référent.</p>
          <button onClick={() => navigate("/co-pilote")} className="op-btn-ghost">
            ← Retour Co-pilote
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="op-page">
      <style>{OP_STYLES}</style>

      {/* Hero header */}
      <header className="op-hero">
        <button onClick={() => navigate(-1)} className="op-back-btn" type="button">
          ← Retour
        </button>
        <div className="op-eyebrow">🎯 Outils Prospection</div>
        <h1>
          Tous tes <span className="op-accent">liens marketing</span> en un endroit
        </h1>
        <p className="op-lead">
          Copie, partage, imprime. Tous les liens embarquent ton ID coach{" "}
          <code className="op-code">?ref={currentUser.id?.slice(0, 8)}…</code> pour le tracking.
        </p>
      </header>

      {/* Mode contextuel : envoi à un client précis */}
      {targetClient ? (
        <div className="op-context-banner">
          <div className="op-context-icon">👤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="op-context-title">
              📨 Envoi à {targetClient.firstName} {targetClient.lastName}
            </div>
            <div className="op-context-meta">
              {fromBusiness && targetClient.businessInterestAmount
                ? `Ouvert·e au business · +${targetClient.businessInterestAmount} €/mois souhaités`
                : `${targetClient.phone ?? "—"} ${targetClient.email ? `· ${targetClient.email}` : ""}`}
            </div>
          </div>
          <button
            onClick={() => navigate("/outils-prospection")}
            className="op-btn-ghost-sm"
            type="button"
          >
            ✕ Mode général
          </button>
        </div>
      ) : null}

      {/* Stats rappel (réutilise ReferrerStatsCard) */}
      <div className="op-stats-wrap">
        <ReferrerStatsCard />
      </div>

      {/* Section Liens à partager */}
      <section className="op-section">
        <h2>
          🔗 Liens à <span className="op-accent-emerald">partager</span>
        </h2>
        <p className="op-section-sub">
          Pages React intégrées à l'app. Lien partageable, form contact qui te tracke comme
          referrer.
        </p>
        <div className="op-grid op-grid-2">
          {TOOLS.filter((t) => t.category === "link").map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              targetClient={targetClient}
              onCopy={() => void copyLink(tool.path, tool.title)}
              onOpen={() => openLink(tool.path)}
              onWA={() => shareViaWhatsApp(tool.path, tool.title)}
              onSMS={() => shareViaSMS(tool.path, tool.title)}
              onEmail={() => shareViaEmail(tool.path, tool.title)}
            />
          ))}
        </div>
      </section>

      {/* Section Docs imprimables */}
      <section className="op-section">
        <h2>
          🖨️ Docs <span className="op-accent-violet">imprimables</span>
        </h2>
        <p className="op-section-sub">
          Documents HTML autonomes — exportables en PDF (Ctrl+P), imprimables papier pour RDV
          physique ou club.
        </p>
        <div className="op-grid op-grid-3">
          {TOOLS.filter((t) => t.category === "doc").map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              targetClient={targetClient}
              onCopy={() => void copyLink(tool.path, tool.title)}
              onOpen={() => openLink(tool.path)}
              onPrint={() => openPrintable(tool.path)}
              onWA={() => shareViaWhatsApp(tool.path, tool.title)}
              onSMS={() => shareViaSMS(tool.path, tool.title)}
              onEmail={() => shareViaEmail(tool.path, tool.title)}
            />
          ))}
        </div>
      </section>

      {/* Section Partage rapide (mode général uniquement) */}
      {!targetClient ? (
        <section className="op-section op-share-section">
          <h2>
            💬 Partage <span className="op-accent-cyan">rapide</span>
          </h2>
          <p className="op-section-sub">
            Tu as un prospect en tête ? Choisis le lien et le canal — message pré-rempli.
          </p>
          <div className="op-share-card">
            <label className="op-share-label">
              <span>Lien à partager</span>
              <select
                value={shareLinkId}
                onChange={(e) => setShareLinkId(e.target.value)}
                className="op-select"
              >
                {TOOLS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="op-share-label">
              <span>Message personnalisé (optionnel)</span>
              <textarea
                value={shareCustomMessage}
                onChange={(e) => setShareCustomMessage(e.target.value)}
                placeholder="Salut [prénom] ! J'ai un truc à te montrer..."
                rows={3}
                className="op-textarea"
              />
            </label>
            <div className="op-share-buttons">
              {(() => {
                const tool = TOOLS.find((t) => t.id === shareLinkId)!;
                const link = buildLink(tool.path);
                const msg = shareCustomMessage.trim() || buildDefaultMessage(tool.title, link);
                const encodedMsg = encodeURIComponent(msg);
                return (
                  <>
                    <a
                      href={`https://wa.me/?text=${encodedMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="op-share-btn op-share-wa"
                    >
                      💬 WhatsApp
                    </a>
                    <a href={`sms:?&body=${encodedMsg}`} className="op-share-btn op-share-sms">
                      💬 SMS
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(tool.title + " — La Base 360")}&body=${encodedMsg}`}
                      className="op-share-btn op-share-mail"
                    >
                      ✉️ Email
                    </a>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(msg).then(() => {
                        pushToast({ tone: "success", title: "Message copié", message: "" });
                      })}
                      className="op-share-btn op-share-copy"
                    >
                      📋 Copier message
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </section>
      ) : null}

      {/* Footer */}
      <footer className="op-footer">
        <p>
          💡 <strong>Astuce</strong> : tous les liens embarquent ton ID en{" "}
          <code className="op-code">?ref=</code>. Les leads qui remplissent un form depuis tes
          liens partagés t'apparaissent dans la card "Tes leads ce mois" sur Co-pilote.
        </p>
      </footer>
    </div>
  );
}

// ─── Sous-composant ToolCard ──────────────────────────────────────────────
interface ToolCardProps {
  tool: ToolDef;
  targetClient: Client | null;
  onCopy: () => void;
  onOpen: () => void;
  onPrint?: () => void;
  onWA: () => void;
  onSMS: () => void;
  onEmail: () => void;
}

function ToolCard({
  tool,
  targetClient,
  onCopy,
  onOpen,
  onPrint,
  onWA,
  onSMS,
  onEmail,
}: ToolCardProps) {
  return (
    <article className={`op-tool op-tool-${tool.accent}`}>
      <div className="op-tool-icon">{tool.emoji}</div>
      <h3 className="op-tool-title">{tool.title}</h3>
      <p className="op-tool-desc">{tool.description}</p>
      <div className="op-tool-usage">{tool.usage}</div>

      {targetClient ? (
        <div className="op-tool-actions">
          <button onClick={onWA} className="op-action op-action-wa" type="button">
            💬 WhatsApp
          </button>
          <button onClick={onSMS} className="op-action op-action-sms" type="button">
            💬 SMS
          </button>
          {targetClient.email ? (
            <button onClick={onEmail} className="op-action op-action-mail" type="button">
              ✉️ Email
            </button>
          ) : null}
          <button onClick={onCopy} className="op-action op-action-copy" type="button">
            📋 Copier
          </button>
        </div>
      ) : (
        <div className="op-tool-actions">
          <button onClick={onCopy} className="op-action op-action-copy" type="button">
            📋 Copier
          </button>
          <button onClick={onOpen} className="op-action op-action-open" type="button">
            ↗ Ouvrir
          </button>
          {tool.isPrintable && onPrint ? (
            <button onClick={onPrint} className="op-action op-action-print" type="button">
              🖨️ PDF
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}

// ─── Styles (G3 La Base 360) ───────────────────────────────────────────────
const OP_STYLES = `
.op-page {
  --op-emerald: #10B981;
  --op-cyan: #06B6D4;
  --op-violet: #8B5CF6;
  --op-gold: #B8922A;
  --op-ink: var(--ls-text, #0F172A);
  --op-muted: var(--ls-text-muted, #64748b);
  --op-line: var(--ls-border, #e2e8f0);
  --op-surface: var(--ls-surface, #fff);
  --op-surface2: var(--ls-surface2, #f8fafc);
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--op-ink);
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.op-page * { box-sizing: border-box; }
.op-page h1, .op-page h2, .op-page h3 {
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  letter-spacing: -.02em;
  line-height: 1.1;
  margin: 0 0 .4em;
  color: var(--op-ink);
}

/* ── Restricted access ── */
.op-restricted {
  text-align: center;
  padding: 80px 20px;
  background: var(--op-surface);
  border-radius: 18px;
  border: 1px solid var(--op-line);
  margin: 80px auto;
  max-width: 480px;
}
.op-restricted h2 { font-size: 24px; margin-bottom: 12px; }
.op-restricted p { color: var(--op-muted); margin-bottom: 24px; }

/* ── Hero ── */
.op-hero {
  position: relative;
  padding: 32px 0 28px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--op-line);
}
.op-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 0.5px solid var(--op-line);
  color: var(--op-muted);
  padding: 7px 12px;
  border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 16px;
}
.op-back-btn:hover { border-color: var(--op-ink); color: var(--op-ink); }

.op-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--op-emerald);
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--op-emerald) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--op-emerald) 18%, transparent);
  margin-bottom: 14px;
}
.op-eyebrow::before {
  content: "";
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--op-emerald);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--op-emerald) 18%, transparent);
}

.op-page h1 {
  font-size: clamp(28px, 4vw, 44px);
  margin-bottom: 12px;
}
.op-accent {
  background: linear-gradient(120deg, var(--op-emerald), var(--op-cyan) 55%, var(--op-violet));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}
.op-accent-emerald { color: var(--op-emerald); font-style: italic; }
.op-accent-cyan { color: var(--op-cyan); font-style: italic; }
.op-accent-violet { color: var(--op-violet); font-style: italic; }
.op-accent-gold { color: var(--op-gold); font-style: italic; }

.op-lead {
  font-size: 15px;
  color: var(--op-muted);
  line-height: 1.55;
  max-width: 70ch;
  margin: 0;
}
.op-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: var(--op-surface2);
  padding: 2px 6px;
  border-radius: 4px;
  border: 0.5px solid var(--op-line);
  color: var(--op-ink);
}

/* ── Context banner (mode ?client=) ── */
.op-context-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  margin-bottom: 24px;
  border-radius: 14px;
  background: linear-gradient(135deg, color-mix(in oklab, var(--op-emerald) 8%, var(--op-surface)), color-mix(in oklab, var(--op-violet) 6%, var(--op-surface)));
  border: 1px solid color-mix(in oklab, var(--op-emerald) 25%, transparent);
}
.op-context-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--op-emerald), var(--op-cyan));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.op-context-title {
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  font-size: 15px;
  color: var(--op-ink);
  margin-bottom: 2px;
}
.op-context-meta {
  font-size: 12px;
  color: var(--op-muted);
}
.op-btn-ghost-sm {
  background: transparent;
  border: 0.5px solid var(--op-line);
  color: var(--op-muted);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
}
.op-btn-ghost-sm:hover { color: var(--op-ink); border-color: var(--op-ink); }

/* ── Stats wrap (réutilise ReferrerStatsCard) ── */
.op-stats-wrap {
  margin-bottom: 28px;
}

/* ── Sections ── */
.op-section {
  margin-bottom: 40px;
}
.op-section h2 {
  font-size: clamp(22px, 3vw, 28px);
  margin-bottom: 6px;
}
.op-section-sub {
  font-size: 13px;
  color: var(--op-muted);
  margin: 0 0 18px;
  max-width: 70ch;
}

/* ── Tool cards grid ── */
.op-grid {
  display: grid;
  gap: 16px;
}
.op-grid-2 { grid-template-columns: repeat(2, 1fr); }
.op-grid-3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 880px) {
  .op-grid-2, .op-grid-3 { grid-template-columns: 1fr; }
}

.op-tool {
  background: var(--op-surface);
  border: 1px solid var(--op-line);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.op-tool:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(15,23,42,0.08);
}
.op-tool-emerald { border-top: 4px solid var(--op-emerald); }
.op-tool-cyan { border-top: 4px solid var(--op-cyan); }
.op-tool-violet { border-top: 4px solid var(--op-violet); }
.op-tool-gold { border-top: 4px solid var(--op-gold); }
.op-tool-icon {
  font-size: 32px;
  line-height: 1;
}
.op-tool-title {
  font-size: 18px;
  margin: 0;
}
.op-tool-desc {
  font-size: 13px;
  color: var(--op-muted);
  line-height: 1.55;
  margin: 0;
  flex: 1;
}
.op-tool-usage {
  font-size: 11px;
  color: var(--op-emerald);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  padding: 6px 10px;
  background: color-mix(in oklab, var(--op-emerald) 8%, transparent);
  border-radius: 6px;
  margin-top: 4px;
}
.op-tool-cyan .op-tool-usage {
  color: var(--op-cyan);
  background: color-mix(in oklab, var(--op-cyan) 8%, transparent);
}
.op-tool-violet .op-tool-usage {
  color: var(--op-violet);
  background: color-mix(in oklab, var(--op-violet) 8%, transparent);
}
.op-tool-gold .op-tool-usage {
  color: var(--op-gold);
  background: color-mix(in oklab, var(--op-gold) 10%, transparent);
}

.op-tool-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.op-action {
  flex: 1 1 auto;
  min-width: fit-content;
  padding: 9px 12px;
  border-radius: 8px;
  border: 0.5px solid var(--op-line);
  background: var(--op-surface2);
  color: var(--op-ink);
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, border-color 0.15s;
  white-space: nowrap;
}
.op-action:hover { transform: translateY(-1px); }
.op-action-wa { background: color-mix(in oklab, #25D366 10%, var(--op-surface2)); border-color: #25D366; color: #1A8050; }
.op-action-sms { background: color-mix(in oklab, var(--op-cyan) 10%, var(--op-surface2)); border-color: var(--op-cyan); color: var(--op-cyan); }
.op-action-mail { background: color-mix(in oklab, var(--op-violet) 10%, var(--op-surface2)); border-color: var(--op-violet); color: var(--op-violet); }
.op-action-copy { background: var(--op-surface2); }
.op-action-open { background: color-mix(in oklab, var(--op-emerald) 10%, var(--op-surface2)); border-color: var(--op-emerald); color: var(--op-emerald); }
.op-action-print { background: color-mix(in oklab, var(--op-gold) 10%, var(--op-surface2)); border-color: var(--op-gold); color: var(--op-gold); }

/* ── Share section ── */
.op-share-section {
  margin-top: 32px;
}
.op-share-card {
  background: linear-gradient(135deg, color-mix(in oklab, var(--op-emerald) 5%, var(--op-surface)), color-mix(in oklab, var(--op-cyan) 4%, var(--op-surface)));
  border: 1px solid color-mix(in oklab, var(--op-emerald) 18%, var(--op-line));
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.op-share-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.op-share-label > span {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--op-muted);
}
.op-select, .op-textarea {
  font: inherit;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid var(--op-line);
  background: var(--op-surface);
  color: var(--op-ink);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
}
.op-select:focus, .op-textarea:focus {
  border-color: var(--op-emerald);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--op-emerald) 18%, transparent);
}
.op-textarea { resize: vertical; min-height: 80px; line-height: 1.55; }
.op-share-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.op-share-btn {
  flex: 1 1 calc(50% - 4px);
  min-width: 120px;
  padding: 12px 16px;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 13px;
  text-decoration: none;
  text-align: center;
  border: 0.5px solid;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.18s;
  background: var(--op-surface);
}
.op-share-btn:hover { transform: translateY(-1px); }
.op-share-wa { color: #1A8050; border-color: #25D366; background: color-mix(in oklab, #25D366 8%, var(--op-surface)); }
.op-share-sms { color: var(--op-cyan); border-color: var(--op-cyan); background: color-mix(in oklab, var(--op-cyan) 8%, var(--op-surface)); }
.op-share-mail { color: var(--op-violet); border-color: var(--op-violet); background: color-mix(in oklab, var(--op-violet) 8%, var(--op-surface)); }
.op-share-copy { color: var(--op-muted); border-color: var(--op-line); }

.op-btn-ghost {
  background: transparent;
  border: 0.5px solid var(--op-line);
  color: var(--op-muted);
  padding: 9px 16px;
  border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  cursor: pointer;
}
.op-btn-ghost:hover { border-color: var(--op-ink); color: var(--op-ink); }

/* ── Footer ── */
.op-footer {
  margin-top: 40px;
  padding: 18px 22px;
  background: color-mix(in oklab, var(--op-emerald) 4%, var(--op-surface2));
  border-radius: 12px;
  border: 0.5px dashed color-mix(in oklab, var(--op-emerald) 25%, transparent);
}
.op-footer p {
  font-size: 13px;
  color: var(--op-muted);
  line-height: 1.55;
  margin: 0;
}
`;
