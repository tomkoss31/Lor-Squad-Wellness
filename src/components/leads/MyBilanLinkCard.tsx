// =============================================================================
// MyBilanLinkCard — bandeau "Mon lien bilan online" en haut de l'onglet Leads.
// Chantier #1 (2026-05-17) — discoverability du lien perso à partager.
//
// Affiche : URL complète /bilan-online/<prénom-normalisé> + boutons
// Copier / Ouvrir / Partager (WhatsApp / SMS / Instagram-bio).
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function MyBilanLinkCard() {
  const { currentUser } = useAppContext();
  const [copied, setCopied] = useState(false);

  const firstName = (currentUser?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const slug = normalizeSlug(firstName);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullUrl = slug ? `${origin}/bilan-online/${slug}` : "";

  const shareText = useMemo(
    () =>
      `Salut ! J'ai un bilan en 2 min qui me permet de t'orienter sur ton objectif (perte de poids, énergie, sport…). C'est gratuit, c'est ici : ${fullUrl}`,
    [fullUrl],
  );

  async function copy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  if (!slug) {
    return (
      <div className="mblc-root mblc-warn">
        <style>{STYLES}</style>
        <div className="mblc-warn-emoji">⚠️</div>
        <div>
          <strong>Lien indisponible</strong> — ton compte n'a pas de prénom
          renseigné. Va dans <code>Paramètres</code> pour le compléter.
        </div>
      </div>
    );
  }

  const encoded = encodeURIComponent(shareText);
  const waUrl = `https://wa.me/?text=${encoded}`;
  const smsUrl = `sms:?&body=${encoded}`;

  return (
    <div className="mblc-root">
      <style>{STYLES}</style>

      <div className="mblc-header">
        <span className="mblc-emoji">🌱</span>
        <div className="mblc-titles">
          <div className="mblc-title">Ton lien bilan perso</div>
          <div className="mblc-sub">Partage-le sur Insta, WhatsApp, bio…</div>
        </div>
      </div>

      <div className="mblc-url-row">
        <code className="mblc-url" onClick={() => void copy()}>
          {fullUrl}
        </code>
        <button
          type="button"
          className="mblc-btn mblc-btn-copy"
          onClick={() => void copy()}
        >
          {copied ? "✓ Copié" : "📋 Copier"}
        </button>
      </div>

      <div className="mblc-actions">
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mblc-btn mblc-btn-ghost"
        >
          👁️ Aperçu
        </a>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mblc-btn mblc-btn-wa"
        >
          WhatsApp
        </a>
        <a href={smsUrl} className="mblc-btn mblc-btn-sms">
          SMS
        </a>
      </div>
    </div>
  );
}

const STYLES = `
  .mblc-root {
    background: linear-gradient(135deg, rgba(201, 168, 76, 0.12) 0%, rgba(45, 212, 191, 0.08) 100%);
    border: 1px solid rgba(201, 168, 76, 0.30);
    border-radius: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }
  .mblc-warn {
    background: rgba(245, 158, 11, 0.10);
    border-color: rgba(245, 158, 11, 0.40);
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  .mblc-warn-emoji { font-size: 24px; flex-shrink: 0; }
  .mblc-warn code {
    background: rgba(0, 0, 0, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }

  .mblc-header { display: flex; align-items: center; gap: 12px; }
  .mblc-emoji { font-size: 28px; }
  .mblc-titles { display: flex; flex-direction: column; }
  .mblc-title {
    font-family: 'Syne', 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: var(--ls-text, #0F172A);
  }
  .mblc-sub {
    font-size: 13px;
    color: var(--ls-text-muted, #6B7280);
  }

  .mblc-url-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .mblc-url {
    flex: 1 1 240px;
    background: var(--ls-surface, #fff);
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    color: var(--ls-gold, #C9A84C);
    font-family: 'SFMono-Regular', Consolas, monospace;
    word-break: break-all;
    cursor: pointer;
  }
  .mblc-url:hover { border-color: var(--ls-gold, #C9A84C); }

  .mblc-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mblc-btn {
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
    text-decoration: none;
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
  }
  .mblc-btn-copy {
    background: linear-gradient(90deg, #C9A84C 0%, #E0BF6B 100%);
    flex-shrink: 0;
  }
  .mblc-btn-ghost {
    background: var(--ls-surface, #fff);
    color: var(--ls-text, #0F172A);
    border-color: var(--ls-border, #E5E7EB);
  }
  .mblc-btn-wa { background: #25D366; }
  .mblc-btn-sms { background: #0EA5E9; }
`;
