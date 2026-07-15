// =============================================================================
// useLeadQuickActions — logique message/canal/IA/touch d'un lead CRM.
//
// Extrait de LeadCard (CrmPage.tsx) — chantier refonte CRM Liste/Pipeline
// (2026-07). Objectif : que la vue Pipeline (LeadCard) ET la vue Liste
// (CrmLeadsListView) consomment la MÊME logique de génération de message,
// d'appel IA Noaly et de tracking « dernier contact » (localStorage), sans
// dupliquer ce code deux fois. Comportement identique à avant — pur refactor
// mécanique, aucune règle métier changée.
// =============================================================================

import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getSupabaseClient } from "../services/supabaseClient";
import {
  buildAskContactMessage,
  buildCrmMessage,
  buildCrmRelanceMessage,
  type CrmMessageContext,
} from "../lib/crmMessages";
import { CRM_SOURCE_META, type CrmLead } from "./useCrmLeads";

export interface LeadQuickActions {
  isIntention: boolean;
  message: string;
  messageLabel: string;
  aiMessage: string | null;
  setAiMessage: (v: string | null) => void;
  aiLoading: boolean;
  generateAi: () => Promise<void>;
  lastTouch: string | null;
  recordTouch: () => void;
}

export function useLeadQuickActions(lead: CrmLead, msgCtx: CrmMessageContext): LeadQuickActions {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const src = CRM_SOURCE_META[lead.source];

  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Wagon 3 chantier 7 : dernier contact (localStorage, par appareil). On
  // l'enregistre quand le coach déclenche un message, on l'affiche ici.
  const [lastTouch, setLastTouch] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`crm-touch-${lead.key}`);
    } catch {
      return null;
    }
  });

  function recordTouch() {
    const iso = new Date().toISOString();
    try {
      localStorage.setItem(`crm-touch-${lead.key}`, iso);
    } catch {
      /* ignore */
    }
    setLastTouch(iso);
  }

  async function generateAi() {
    setAiLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { data, error } = await sb.functions.invoke("noaly", {
        body: {
          mode: lead.status === "contacted" ? "relance" : "first_contact",
          coachFirstName: msgCtx.coachFirstName,
          coachUserId: currentUser?.id,
          bilanUrl: msgCtx.bilanUrl,
          // Bilan déjà fait (lead bilan online) → Noaly ne reproposera pas un bilan.
          bilanDone: lead.source === "bilan-online" || !!lead.resultToken,
          lead: {
            firstName: lead.firstName,
            source: lead.source,
            sourceLabel: src.label,
            viaName: lead.viaName,
            city: lead.city,
            status: lead.status,
            extra: lead.extra,
            notes: lead.notes,
          },
        },
      });
      const payload = data as { message?: string; error?: string; message_text?: string } | null;
      if (error || !payload?.message) {
        const reason =
          (payload as { message?: string } | null)?.message ||
          "IA indisponible — réessaie ou utilise le message pré-rédigé.";
        pushToast({ tone: "warning", title: "Noaly", message: reason });
        return;
      }
      setAiMessage(payload.message);
      recordTouch();
    } catch (e) {
      pushToast({
        tone: "warning",
        title: "Noaly",
        message: e instanceof Error ? e.message : "Erreur IA.",
      });
    } finally {
      setAiLoading(false);
    }
  }

  // Intentions : pas de contact direct → on écrit AU PARRAIN pour obtenir
  // le numéro. Sinon : 1er contact, puis relance douce une fois contacté.
  const isIntention = lead.source === "intention";
  const message = isIntention
    ? buildAskContactMessage(lead, msgCtx)
    : lead.status === "contacted"
      ? buildCrmRelanceMessage(lead, msgCtx)
      : buildCrmMessage(lead, msgCtx);
  const messageLabel = isIntention
    ? "Demander le contact"
    : lead.status === "contacted"
      ? "Relance douce"
      : "1er contact";

  return {
    isIntention,
    message,
    messageLabel,
    aiMessage,
    setAiMessage,
    aiLoading,
    generateAi,
    lastTouch,
    recordTouch,
  };
}
