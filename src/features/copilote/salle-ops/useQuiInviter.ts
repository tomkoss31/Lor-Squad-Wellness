// =============================================================================
// useQuiInviter — « Qui inviter aujourd'hui » du cockpit Salle des Opérations.
//
// Agrège, par priorité, de VRAIES personnes à (re)contacter :
//   1. Curieux  (chaud)  — ont commencé un bilan online sans le finir.
//   2. Dormants (warm)   — clients sans commande depuis longtemps + « jamais ».
//   3. Leads CRM (nouveau) — prospects entrants pas encore contactés.
//
// 100 % données réelles (hooks existants, RLS par coach). Best-effort, top N.
// =============================================================================

import { useMemo } from "react";
import { useAppContext } from "../../../context/AppContext";
import { useCuriousLeads } from "../../../hooks/useCuriousLeads";
import { useDormantClients, URGENCY_META } from "../../../hooks/useDormantClients";
import { useCrmLeads } from "../../../hooks/useCrmLeads";

export interface InviteCandidate {
  id: string;
  name: string;
  statusLabel: string;
  tone: "hot" | "warm" | "muted";
  /** Lien WhatsApp si on a un numéro, sinon undefined. */
  waLink?: string;
  /** Deep-link app (fiche client / CRM). */
  path: string;
}

function waLink(contact: string | null, isPhone: boolean): string | undefined {
  if (!contact || !isPhone) return undefined;
  const digits = contact.replace(/\D/g, "");
  return digits.length >= 6 ? `https://wa.me/${digits}` : undefined;
}

export function useQuiInviter(limit = 4): { candidates: InviteCandidate[]; loading: boolean } {
  const { currentUser } = useAppContext();
  const { curious, loading: lc } = useCuriousLeads();
  const { clients: dormant, loading: ld } = useDormantClients(currentUser?.id ?? null);
  const { leads, loading: ll } = useCrmLeads();

  const candidates = useMemo(() => {
    const out: InviteCandidate[] = [];

    // 1) Curieux = chaud (ils ont montré de l'intérêt).
    for (const c of curious) {
      out.push({
        id: `cur:${c.id}`,
        name: c.firstName,
        statusLabel: "A commencé un bilan · à relancer",
        tone: "hot",
        waLink: waLink(c.contact, c.contactIsPhone),
        path: "/crm",
      });
    }

    // 2) Dormants = warm (plus c'est dormant, plus c'est prioritaire).
    for (const d of dormant) {
      out.push({
        id: `dor:${d.client_id}`,
        name: d.client_name,
        statusLabel: URGENCY_META[d.urgency].label,
        tone: d.urgency === "high" || d.urgency === "never" ? "warm" : "muted",
        waLink: waLink(d.client_phone, true),
        path: `/clients/${d.client_id}`,
      });
    }

    // 3) Leads CRM nouveaux = à contacter.
    for (const l of leads) {
      if (l.status !== "new") continue;
      out.push({
        id: `crm:${l.key}`,
        name: l.firstName,
        statusLabel: "Nouveau lead · à contacter",
        tone: "muted",
        waLink: waLink(l.contact, l.contactIsPhone),
        path: "/crm",
      });
    }

    return out.slice(0, limit);
  }, [curious, dormant, leads, limit]);

  return { candidates, loading: lc || ld || ll };
}
