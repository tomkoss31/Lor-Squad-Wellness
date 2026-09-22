// =============================================================================
// Comment joindre la personne d'un rendez-vous — UN seul bloc pour tout l'agenda
// (22/09/2026, Thomas : « Mélanie ne voit pas son numéro pour l'appeler et doit
// retourner vers le CRM sur la version standard… il faut standardiser, voir les
// bonnes valeurs partout »).
//
// Le numéro lisible et le mail, puis Appeler · SMS · WhatsApp · Mail. Les valeurs
// viennent d'`agenda_du_club`, qui les complète depuis la fiche du CRM : ce que le
// CRM sait, l'agenda le montre. Utilisé par la fiche d'un rendez-vous (BbcAgenda) et
// par « Comment ça s'est passé ? » (QualifierRdvClubSheet), « Pas venue » compris.
// =============================================================================

import type { CSSProperties } from "react";
import { lienWhatsApp } from "../../../lib/utils/lienWhatsApp";
import { contactDe, telLisible, type RdvClub } from "./agendaClub";

export function ContactRdv({ rdv }: { rdv: RdvClub }) {
  const { tel, mail } = contactDe(rdv);
  if (!tel && !mail) {
    return <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>Ni téléphone ni mail sur ce rendez-vous, ni dans sa fiche du CRM.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.45, overflowWrap: "anywhere" }}>
        {[tel ? telLisible(tel) : null, mail].filter(Boolean).join(" · ")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tel ? (
          <>
            <a href={`tel:${tel}`} style={lien}>📞 Appeler</a>
            <a href={`sms:${tel}`} style={lien}>💬 SMS</a>
            <a href={lienWhatsApp(tel, "")} target="_blank" rel="noreferrer" style={lien}>WhatsApp</a>
          </>
        ) : null}
        {mail ? <a href={`mailto:${mail}`} style={lien}>✉️ Mail</a> : null}
      </div>
    </div>
  );
}

const lien: CSSProperties = {
  flex: "1 1 30%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 12,
  border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "0 10px",
};
