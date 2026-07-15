// =============================================================================
// CrmResponsePanel — sélecteur de ton + preview éditable + envoi multi-canal,
// pour N'IMPORTE QUEL lead CRM (remplace LeadResponsePanel, online_bilans
// uniquement).
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 4 (2026-07-16).
// Utilisé dans CrmLeadDetailPage, sous le bloc actions rapides (1-clic) déjà
// en place depuis la Phase 2 — celui-ci reste pour l'action réflexe, celui-ci
// pour composer un message plus travaillé (5 tons, WhatsApp/SMS si
// téléphone dispo, Telegram, copier).
// =============================================================================

import { useEffect, useState } from "react";
import { CRM_TONES, findCrmTone, type CrmToneId } from "../../lib/crmResponseTemplates";
import { buildCrmSmsLink, buildCrmTelegramLink, buildCrmWhatsAppLink, type CrmMessageContext } from "../../lib/crmMessages";
import type { CrmLead, CrmStatus } from "../../hooks/useCrmLeads";
import { useToast } from "../../context/ToastContext";

interface Props {
  lead: CrmLead;
  msgCtx: CrmMessageContext;
  /** Appelé après un envoi/copie — le parent peut bump le statut (new → contacted). */
  onAfterSend?: (next: CrmStatus) => void;
}

export function CrmResponsePanel({ lead, msgCtx, onAfterSend }: Props) {
  const { push: pushToast } = useToast();
  const [activeId, setActiveId] = useState<CrmToneId>("auto");
  const [text, setText] = useState(() => findCrmTone("auto").render(lead, msgCtx));

  // Reset le texte au changement de ton OU de lead (navigation vers un autre
  // lead) — pas à chaque frappe, la textarea reste éditable librement.
  useEffect(() => {
    setText(findCrmTone(activeId).render(lead, msgCtx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, lead.key]);

  const isIntention = lead.source === "intention";
  const targetContact = isIntention ? lead.parrainPhone : lead.contact;
  const targetIsPhone = isIntention ? Boolean(lead.parrainPhone) : lead.contactIsPhone;

  function trackSent() {
    onAfterSend?.("contacted");
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard?.writeText(text);
      pushToast({ tone: "success", title: "Copié ✓" });
      trackSent();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="crp-root">
      <style>{STYLES}</style>

      <div className="crp-tabs">
        {CRM_TONES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`crp-tab ${activeId === t.id ? "crp-tab-active" : ""}`}
            onClick={() => setActiveId(t.id)}
            title={t.description}
          >
            <span className="crp-tab-emoji" aria-hidden="true">{t.emoji}</span>
            <span className="crp-tab-label">{t.label}</span>
          </button>
        ))}
      </div>

      <textarea
        className="crp-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        spellCheck
      />

      <div className="crp-actions">
        <button type="button" className="crp-btn crp-btn-primary" onClick={() => void copyToClipboard()}>
          📋 Copier
        </button>
        {targetIsPhone ? (
          <a
            href={buildCrmWhatsAppLink(targetContact, text)}
            target="_blank"
            rel="noopener noreferrer"
            className="crp-btn crp-btn-wa"
            onClick={trackSent}
          >
            WhatsApp
          </a>
        ) : null}
        {targetIsPhone ? (
          <a href={buildCrmSmsLink(targetContact, text)} className="crp-btn crp-btn-sms" onClick={trackSent}>
            SMS
          </a>
        ) : null}
        <a
          href={buildCrmTelegramLink(text)}
          target="_blank"
          rel="noopener noreferrer"
          className="crp-btn crp-btn-tg"
          onClick={trackSent}
        >
          Telegram
        </a>
      </div>

      {isIntention ? (
        <p className="crp-hint">
          Envoyé au parrain{lead.viaName ? ` (${lead.viaName})` : ""} — pas de contact direct
          pour ce prospect tant qu'il n'a pas été transmis.
        </p>
      ) : !targetIsPhone ? (
        <p className="crp-hint">
          Pas de téléphone pour ce lead — WhatsApp/SMS masqués, utilise Copier ou Telegram.
        </p>
      ) : null}
    </div>
  );
}

const STYLES = `
  .crp-root {
    background: var(--ls-surface2, #F9FAFB);
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .crp-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .crp-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--ls-surface, #fff);
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12.5px;
    color: var(--ls-text, #0F172A);
    cursor: pointer;
    font-family: inherit;
  }
  .crp-tab:hover { border-color: var(--ls-gold, #C9A84C); }
  .crp-tab-active {
    background: color-mix(in srgb, var(--ls-gold, #C9A84C) 14%, transparent);
    border-color: var(--ls-gold, #C9A84C);
    color: var(--ls-gold, #C9A84C);
    font-weight: 600;
  }
  .crp-tab-emoji { font-size: 14px; }

  .crp-textarea {
    width: 100%;
    min-height: 160px;
    padding: 12px;
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 10px;
    font-family: inherit;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--ls-text, #0F172A);
    background: var(--ls-surface, #fff);
    resize: vertical;
    box-sizing: border-box;
  }
  .crp-textarea:focus {
    outline: none;
    border-color: var(--ls-gold, #C9A84C);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ls-gold, #C9A84C) 15%, transparent);
  }

  .crp-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
  }
  .crp-btn {
    padding: 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    color: #fff;
    font-family: inherit;
    transition: opacity 160ms, transform 160ms;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .crp-btn:hover { opacity: 0.92; transform: translateY(-1px); }
  .crp-btn-primary { background: linear-gradient(90deg, var(--ls-gold, #C9A84C) 0%, #E0BF6B 100%); }
  .crp-btn-wa { background: #25D366; }
  .crp-btn-sms { background: #0EA5E9; }
  .crp-btn-tg { background: #2AABEE; }

  .crp-hint {
    font-size: 11.5px;
    color: var(--ls-text-muted, #6B7280);
    margin: 0;
    line-height: 1.4;
  }
`;
