// =============================================================================
// LE CANAL DE CONTACT — la règle que j'avais perdue en supprimant les 3 rendus.
//
// Trouvé par la revue d'avant-prod du 31/08 : le bouton « Écrire » envoyait
// TOUJOURS sur WhatsApp. Or `buildCrmWhatsAppLink` retire tout ce qui n'est pas
// un chiffre : « sarah2024@gmail.com » devenait `wa.me/2024`, un destinataire
// inventé. Et comme « Appeler » est masqué faute de numéro, ce lead n'avait
// plus AUCUN moyen d'être contacté depuis la liste.
//
// Le formulaire du bilan en ligne accepte « un téléphone OU un email » : ce
// n'est donc pas un cas tordu, c'est un chemin de saisie prévu.
//
// Si quelqu'un re-branche « Écrire » sur WhatsApp sans regarder le contact,
// c'est ici que ça doit casser.
// =============================================================================

import { describe, it, expect } from "vitest";
import { buildCrmWhatsAppLink, buildCrmMailLink } from "../../../lib/crmMessages";

/** La règle appliquée par `ecrireAuLead` (CrmPage). Reproduite ici à
 *  l'identique : c'est elle qu'on verrouille, pas le composant. */
function canalPour(lead: { phone?: string | null; email?: string | null; contact?: string | null; contactIsPhone?: boolean }) {
  const tel = lead.phone ?? (lead.contactIsPhone ? lead.contact : null);
  if (tel) return { canal: "whatsapp" as const, cible: tel };
  const mail = lead.email ?? (lead.contact && !lead.contactIsPhone ? lead.contact : null);
  if (mail) return { canal: "mail" as const, cible: mail };
  return { canal: "aucun" as const, cible: null };
}

describe("le canal de contact suit ce qu'on a vraiment", () => {
  it("un numéro → WhatsApp", () => {
    expect(canalPour({ phone: "0612345678", contact: "0612345678", contactIsPhone: true }))
      .toEqual({ canal: "whatsapp", cible: "0612345678" });
  });

  it("une adresse seule → MAIL, jamais WhatsApp", () => {
    // Le bug exact : ce lead partait sur wa.me/2024.
    expect(canalPour({ phone: null, email: null, contact: "sarah2024@gmail.com", contactIsPhone: false }))
      .toEqual({ canal: "mail", cible: "sarah2024@gmail.com" });
  });

  it("une adresse sans aucun chiffre aussi", () => {
    expect(canalPour({ contact: "sarah@gmail.com", contactIsPhone: false }).canal).toBe("mail");
  });

  it("le téléphone prime quand on a les deux", () => {
    expect(canalPour({ phone: "0612345678", email: "x@y.fr", contactIsPhone: true }).canal).toBe("whatsapp");
  });

  it("ni l'un ni l'autre → on le dit, on n'invente pas", () => {
    expect(canalPour({ phone: null, email: null, contact: null }).canal).toBe("aucun");
  });
});

describe("pourquoi la règle compte : ce que produisaient les constructeurs", () => {
  it("WhatsApp fabrique un numéro à partir d'une adresse — la preuve du bug", () => {
    const url = buildCrmWhatsAppLink("sarah2024@gmail.com", "Bonjour");
    expect(url).toContain("2024");
    expect(url).not.toContain("@");
  });

  it("le lien mail, lui, garde l'adresse entière", () => {
    const url = buildCrmMailLink("sarah2024@gmail.com", "Bonjour", "Ton bilan");
    expect(url.startsWith("mailto:sarah2024@gmail.com?")).toBe(true);
  });

  it("un mailto sans adresse valide ne prétend pas en avoir une", () => {
    expect(buildCrmMailLink("pas-une-adresse", "Bonjour", "Objet").startsWith("mailto:?")).toBe(true);
  });
});
