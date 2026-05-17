// =============================================================================
// LeadResponsePanel — section templates de réponse dans LeadDetailModal.
// Chantier #1 étape 1.8 (2026-05-17).
//
// Sélection template → preview éditable → boutons partage multi-canal :
// Copier, WhatsApp, SMS, Telegram. Pas de phone capturé sur le Lead V1,
// donc les liens ouvrent les apps avec text= seulement (le coach
// renseigne le destinataire dans l'app).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { LEAD_TEMPLATES } from "../../lib/leadResponseTemplates";
import type { OnlineBilanRow, LeadStatus } from "../../hooks/useOnlineBilans";

interface Props {
  bilan: OnlineBilanRow;
  coachFirstName: string;
  /** Optionnel : si déclenché par envoi, pousse le statut vers "contact". */
  onAfterSend?: (newStatus: LeadStatus) => Promise<void> | void;
}

export function LeadResponsePanel({ bilan, coachFirstName, onAfterSend }: Props) {
  const [activeId, setActiveId] = useState<string>(LEAD_TEMPLATES[0].id);
  const ctx = useMemo(
    () => ({ coachFirstName: coachFirstName || "ton coach", now: new Date() }),
    [coachFirstName],
  );
  const activeTemplate = LEAD_TEMPLATES.find((t) => t.id === activeId)!;
  const initialText = useMemo(
    () => activeTemplate.render(bilan, ctx),
    [activeTemplate, bilan, ctx],
  );
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);

  // Reset le texte quand on change de template
  useEffect(() => {
    setText(activeTemplate.render(bilan, ctx));
    setCopied(false);
  }, [activeId, activeTemplate, bilan, ctx]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      void onAfterSend?.("contact");
    } catch {
      /* ignore */
    }
  }

  const encoded = encodeURIComponent(text);
  const waUrl = `https://wa.me/?text=${encoded}`;
  const telegramUrl = `https://t.me/share/url?url=&text=${encoded}`;
  const smsUrl = `sms:?&body=${encoded}`;

  function trackSent() {
    void onAfterSend?.("contact");
  }

  return (
    <div className="lrp-root">
      <style>{STYLES}</style>

      <div className="lrp-header">
        <span className="lrp-section-title">Templates de réponse</span>
      </div>

      <div className="lrp-tabs">
        {LEAD_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`lrp-tab ${activeId === t.id ? "lrp-tab-active" : ""}`}
            onClick={() => setActiveId(t.id)}
            title={t.description}
          >
            <span className="lrp-tab-emoji">{t.emoji}</span>
            <span className="lrp-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      <textarea
        className="lrp-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        spellCheck
      />

      <div className="lrp-actions">
        <button
          type="button"
          className="lrp-btn lrp-btn-primary"
          onClick={() => void copyToClipboard()}
        >
          {copied ? "✓ Copié !" : "📋 Copier"}
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="lrp-btn lrp-btn-wa"
          onClick={trackSent}
        >
          WhatsApp
        </a>
        <a
          href={smsUrl}
          className="lrp-btn lrp-btn-sms"
          onClick={trackSent}
        >
          SMS
        </a>
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="lrp-btn lrp-btn-tg"
          onClick={trackSent}
        >
          Telegram
        </a>
      </div>

      <p className="lrp-hint">
        Le destinataire se renseigne dans l'app de ton canal (pas de
        téléphone capturé sur le Lead V1).
      </p>
    </div>
  );
}

const STYLES = `
  .lrp-root {
    background: var(--ls-surface2, #F9FAFB);
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .lrp-header { display: flex; align-items: center; justify-content: space-between; }
  .lrp-section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ls-gold, #C9A84C);
  }
  .lrp-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .lrp-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--ls-surface, #fff);
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--ls-text, #0F172A);
    cursor: pointer;
    font-family: inherit;
  }
  .lrp-tab:hover { border-color: var(--ls-gold, #C9A84C); }
  .lrp-tab-active {
    background: rgba(201, 168, 76, 0.12);
    border-color: var(--ls-gold, #C9A84C);
    color: #9A7F2A;
    font-weight: 600;
  }
  .lrp-tab-emoji { font-size: 14px; }

  .lrp-textarea {
    width: 100%;
    min-height: 180px;
    padding: 12px;
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 10px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ls-text, #0F172A);
    background: var(--ls-surface, #fff);
    resize: vertical;
    box-sizing: border-box;
  }
  .lrp-textarea:focus {
    outline: none;
    border-color: var(--ls-gold, #C9A84C);
    box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
  }

  .lrp-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 8px;
  }
  .lrp-btn {
    padding: 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    color: #fff;
    font-family: inherit;
    transition: opacity 160ms, transform 160ms;
    min-height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .lrp-btn:hover { opacity: 0.92; transform: translateY(-1px); }
  .lrp-btn-primary {
    background: linear-gradient(90deg, #C9A84C 0%, #E0BF6B 100%);
  }
  .lrp-btn-wa { background: #25D366; }
  .lrp-btn-sms { background: #0EA5E9; }
  .lrp-btn-tg { background: #2AABEE; }

  .lrp-hint {
    font-size: 12px;
    color: var(--ls-text-muted, #6B7280);
    margin: 0;
    line-height: 1.4;
  }
`;
