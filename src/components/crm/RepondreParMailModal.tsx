// =============================================================================
// RepondreParMailModal — répondre à un lead depuis le CRM, sans passer par sa
// messagerie.
//
// Maquette validée : public/mockups/crm-repondre-mail.html
//
// Ce qu'elle remplace (Thomas, 17/08, sur le cas Malone) : « faut que je copie
// l'adresse, aller sur Gmail, ensuite aller re-copier son message pré-écrit sur
// l'app » — puis, une fois envoyé : « message simple, aucune signature, que
// dalle ». Deux allers-retours pour finir par un mail nu, alors que ceux de
// l'app sont soignés.
//
// Le mail part avec l'identité de la maison d'où vient la personne — club ou
// app — et la mise en forme est faite côté serveur (edge `crm-repondre-lead`).
// Ici, le coach n'écrit QUE son texte.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { CrmLead } from "../../hooks/useCrmLeads";

/** Le club a sa propre identité : ces gens ne connaissent pas « La Base 360 ». */
function vientDuClub(lead: CrmLead): boolean {
  return lead.table === "prospect_leads" && lead.source === "site-club";
}

export function RepondreParMailModal({
  lead,
  objetInitial,
  messageInitial,
  prenomCoach,
  onClose,
  onEnvoye,
}: {
  lead: CrmLead;
  objetInitial: string;
  messageInitial: string;
  prenomCoach: string;
  onClose: () => void;
  onEnvoye: (destinataire: string) => void;
}) {
  const [objet, setObjet] = useState(objetInitial);
  const [message, setMessage] = useState(messageInitial);
  const [avecBouton, setAvecBouton] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // L'aperçu est demandé AU SERVEUR : ce qu'on regarde est très exactement ce
  // qui partira, gabarit compris. Une reconstitution côté navigateur finirait
  // par diverger du vrai mail, et c'est précisément ce qu'on veut éviter ici.
  const [onglet, setOnglet] = useState<"edit" | "apercu">("edit");
  const [apercu, setApercu] = useState<string | null>(null);
  const [chargeApercu, setChargeApercu] = useState(false);

  // Échap ferme, comme partout ailleurs dans l'app.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape" && !envoi) onClose(); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onClose, envoi]);

  async function chargerApercu() {
    setOnglet("apercu");
    if (apercu || chargeApercu) return;
    setChargeApercu(true);
    try {
      const sb = await getSupabaseClient();
      const { data } = (await sb?.functions.invoke("crm-repondre-lead", {
        body: {
          table: lead.table, leadId: lead.id,
          objet: objet.trim() || "(sans objet)", message: message.trim() || "…",
          avecBoutonRdv: avecBouton, apercu: true,
        },
      })) ?? { data: null };
      const rep = data as { html?: string } | null;
      if (rep?.html) setApercu(rep.html);
    } catch { /* l'aperçu est un confort, jamais un obstacle à l'envoi */ }
    finally { setChargeApercu(false); }
  }

  const club = vientDuClub(lead);
  const destinataire = lead.contact ?? "";

  async function envoyer() {
    if (envoi) return;
    if (!objet.trim() || !message.trim()) {
      setErreur("Il manque l'objet ou le message.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Connexion indisponible.");
      const { data, error } = await sb.functions.invoke("crm-repondre-lead", {
        body: {
          table: lead.table,
          leadId: lead.id,
          objet: objet.trim(),
          message: message.trim(),
          avecBoutonRdv: avecBouton,
        },
      });
      const rep = data as { success?: boolean; error?: string; envoyeA?: string } | null;
      if (error || !rep?.success) {
        // On dit ce qui s'est passé, pas « une erreur est survenue » : le coach
        // doit savoir s'il peut réessayer ou s'il doit décrocher son téléphone.
        const motif =
          rep?.error === "pas_d_email" ? "Cette personne n'a pas laissé d'adresse mail."
          : rep?.error === "lead_introuvable" ? "Cette fiche ne t'est pas accessible."
          : rep?.error === "non_authentifie" || rep?.error === "session_invalide"
            ? "Ta session a expiré — reconnecte-toi."
            : "Le mail n'est pas parti. Réessaie dans un instant.";
        setErreur(motif);
        return;
      }
      onEnvoye(rep.envoyeA ?? destinataire);
    } catch {
      setErreur("Le mail n'est pas parti. Réessaie dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div
      onClick={() => { if (!envoi) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Répondre à ${lead.firstName}`}
        style={{
          width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto",
          background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
          borderRadius: 18, color: "var(--ls-text)",
        }}
      >
        <div style={{ padding: "18px 20px 0" }}>
          <p style={{ margin: 0, fontFamily: "Syne, sans-serif", fontSize: 19, fontWeight: 700 }}>
            Répondre à {lead.firstName}
          </p>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--ls-text-muted)" }}>
            {club
              ? "Aux couleurs du Breakfast Club — c'est de là que vient cette personne."
              : "Aux couleurs de La Base 360."}{" "}
            Sa réponse arrive dans ta boîte.
          </p>
          <div style={bascule}>
            <button type="button" onClick={() => setOnglet("edit")} style={ongletBtn(onglet === "edit")}>Éditer</button>
            <button type="button" onClick={() => void chargerApercu()} style={ongletBtn(onglet === "apercu")}>Aperçu</button>
          </div>
        </div>

        <div style={ligne}>
          <span style={cle}>À</span>
          <span style={{ fontSize: 13.5, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
            {destinataire}
          </span>
        </div>
        <div style={ligne}>
          <label htmlFor="rpm-objet" style={cle}>Objet</label>
          <input
            id="rpm-objet"
            value={objet}
            onChange={(e) => { setObjet(e.target.value); setApercu(null); }}
            style={{
              flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none",
              color: "var(--ls-text)", fontFamily: "inherit", fontSize: 13.5,
            }}
          />
        </div>

        {onglet === "apercu" ? (
          <div style={{ padding: "14px 20px 0" }}>
            {chargeApercu ? (
              <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>Rendu du mail…</p>
            ) : apercu ? (
              <iframe
                title="Aperçu du mail"
                srcDoc={apercu}
                sandbox=""
                style={{ width: "100%", height: 460, border: "1px solid var(--ls-border)", borderRadius: 12, background: "#fff" }}
              />
            ) : (
              <p style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
                L'aperçu n'a pas pu être chargé — ça n'empêche pas l'envoi.
              </p>
            )}
          </div>
        ) : (
        <div style={{ padding: "14px 20px 0" }}>
          <label htmlFor="rpm-message" style={{ display: "none" }}>Message</label>
          <textarea
            id="rpm-message"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setApercu(null); }}
            rows={9}
            style={{
              width: "100%", boxSizing: "border-box", minHeight: 190,
              background: "var(--ls-surface2)", color: "var(--ls-text)",
              border: "1px solid var(--ls-border)", borderRadius: 12, padding: "12px 13px",
              fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.6, resize: "vertical", outline: "none",
            }}
          />
          <p style={{ margin: "9px 0 0", fontSize: 12, lineHeight: 1.55, color: "var(--ls-text-muted)" }}>
            Le logo, la mise en page et ta signature (<strong style={{ color: "var(--ls-text)" }}>{prenomCoach}</strong>)
            sont ajoutés automatiquement — tu n'écris que le message.
          </p>

          <label style={{
            display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14,
            padding: "12px 14px", borderRadius: 12, background: "var(--ls-surface2)",
            border: "1px solid var(--ls-border)", cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={avecBouton}
              onChange={(e) => { setAvecBouton(e.target.checked); setApercu(null); }}
              style={{ marginTop: 2, width: 17, height: 17, flex: "none", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.5 }}>
              {club ? "Ajouter le bouton « Choisir mon créneau au club »" : "Ajouter le bouton « Prendre rendez-vous avec moi »"}
              <span style={{ display: "block", fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 }}>
                {club
                  ? "Mène au tunnel de réservation du club."
                  : "Mène à TON tunnel de rendez-vous : le créneau atterrit dans ton agenda."}
              </span>
            </span>
          </label>
        </div>
        )}

        {erreur ? (
          <div role="alert" style={{
            margin: "14px 20px 0", padding: "10px 12px", borderRadius: 11, fontSize: 13,
            color: "var(--ls-coral)",
            background: "color-mix(in srgb, var(--ls-coral) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
          }}>
            {erreur}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 9, flexWrap: "wrap", padding: "16px 20px 20px", alignItems: "center" }}>
          <button type="button" onClick={() => void envoyer()} disabled={envoi} style={boutonPlein}>
            {envoi ? "Envoi…" : "✉️ Envoyer"}
          </button>
          <button type="button" onClick={onClose} disabled={envoi} style={boutonNu}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const ligne: React.CSSProperties = {
  display: "flex", gap: 10, alignItems: "baseline",
  padding: "13px 20px", borderTop: "1px solid var(--ls-border)", marginTop: 0,
};

const cle: React.CSSProperties = {
  flex: "none", width: 56, fontSize: 12, fontWeight: 600, color: "var(--ls-text-muted)",
};

const boutonPlein: React.CSSProperties = {
  minHeight: 44, padding: "11px 18px", borderRadius: 11, border: "1px solid var(--ls-teal)",
  background: "var(--ls-teal)", color: "var(--ls-teal-contrast, #0B0D11)",
  fontFamily: "DM Sans, sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
};

const bascule: React.CSSProperties = {
  display: "inline-flex", gap: 4, marginTop: 12, padding: 4, borderRadius: 11,
  background: "var(--ls-surface2)", border: "1px solid var(--ls-border)",
};

function ongletBtn(actif: boolean): React.CSSProperties {
  return {
    minHeight: 36, padding: "7px 16px", borderRadius: 8, border: 0,
    background: actif ? "var(--ls-surface)" : "transparent",
    color: actif ? "var(--ls-text)" : "var(--ls-text-muted)",
    fontFamily: "DM Sans, sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  };
}

const boutonNu: React.CSSProperties = {
  minHeight: 44, padding: "11px 16px", borderRadius: 11, border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)", color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
};
