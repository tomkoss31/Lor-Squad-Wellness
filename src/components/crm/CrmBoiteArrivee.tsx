// =============================================================================
// CrmBoiteArrivee — « Rien n'entre dans l'entonnoir sans ton geste. »
//
// Lot 2 du chantier CRM Board V2 (maquette Claude Design du 20/08).
//
// LE CONSTAT DE L'AUDIT : les 11 points d'entrée déversaient DIRECTEMENT dans
// les colonnes du pipeline — mélangés à des doublons, des bilans à peine
// commencés et des prénoms sans numéro. L'entonnoir ne disait donc plus qui en
// était où : il disait seulement « il s'est passé quelque chose quelque part ».
//
// Cette file d'attente s'intercale avant. Chaque carte porte UN geste explicite,
// et ce geste est le seul chemin vers l'entonnoir.
//
// ── CE QUI N'EST PAS UN OUBLI ─────────────────────────────────────────────
// • Elle ne répond NI à la recherche NI aux onglets. C'est une file d'attente,
//   pas une vue : la masquer derrière un filtre laisserait des gens à la porte
//   sans que personne le sache.
// • Hauteur bornée avec défilement interne. Le travers de l'écran actuel est
//   exactement là : chaque bloc ajouté en tête repousse le premier lead plus
//   bas. Ici la liste grandit à l'intérieur, jamais vers le bas.
// • Accepter ne pose AUCUNE date. Accepter, c'est dire « celui-là est un vrai
//   contact » — pas « je l'ai appelé ». La suite se cale avec « Et alors ? ».
// • Vide, le bloc disparaît complètement. Un « 0 à valider » permanent est du
//   bruit : on n'affiche une file d'attente que quand quelqu'un attend.
// =============================================================================

import { useState } from "react";
import { CRM_SOURCE_META, type CrmLead } from "../../hooks/useCrmLeads";
import { nomAffiche } from "../../features/crm/nomPropre";

interface Props {
  leads: CrmLead[];
  /** Fait entrer le lead dans l'entonnoir. Rend l'erreur, ou null. */
  onAccepter: (lead: CrmLead) => Promise<string | null>;
  /** Le met de côté sans le supprimer (archive « endormi »). */
  onRefuser: (lead: CrmLead) => Promise<string | null>;
  /** Ouvre sa fiche — pour décider en connaissance de cause. */
  onOuvrir: (lead: CrmLead) => void;
}

/** « il y a 25 min », « il y a 4 h », « hier ». Jamais une date absolue : ce
 *  qui compte dans une file d'attente, c'est depuis combien de temps ça attend. */
function depuis(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return j <= 1 ? "hier" : `il y a ${j} j`;
}

/**
 * Ce que la carte propose, selon d'où vient le lead. Un seul geste principal —
 * deux boutons de même poids obligent à réfléchir, ce qui est exactement ce
 * qu'une file d'attente doit éviter.
 */
function geste(lead: CrmLead): { principal: string; detail: string } {
  // ⚠️ Le libellé principal est le MÊME partout, et c'est voulu : la maquette
  // montre des gestes différents par source (« Confirmer + email », « Fusionner
  // les 2 »…) mais chacun déclenche un flux qui lui est propre. Ce lot pose la
  // file d'attente et le geste d'entrée ; les gestes spécialisés viendront
  // dessus, sans avoir à la redéfaire. Promettre « ⇥ Fusionner » avant que la
  // fusion existe serait un bouton menteur.
  switch (lead.table) {
    case "client_referral_intentions":
      return { principal: "✓ Accepter → Nouveau", detail: "Prénom confié — pas encore de numéro." };
    case "client_referrals":
      return { principal: "✓ Accepter → Nouveau", detail: "Recommandé par un client." };
    case "online_bilans":
      return { principal: "✓ Accepter → Nouveau", detail: "Bilan en ligne rempli." };
    default:
      return { principal: "✓ Accepter → Nouveau", detail: "" };
  }
}

const carte: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "12px 13px",
  borderRadius: 13,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
};

const boutonPrincipal: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 11,
  border: "1px solid color-mix(in srgb, var(--ls-teal) 45%, transparent)",
  background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const boutonDiscret: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 13px",
  borderRadius: 11,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12.5,
  cursor: "pointer",
};

export function CrmBoiteArrivee({ leads, onAccepter, onRefuser, onOuvrir }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  if (leads.length === 0) return null;

  async function agir(lead: CrmLead, action: (l: CrmLead) => Promise<string | null>) {
    if (busy) return;
    setBusy(lead.key);
    setErreur(null);
    const e = await action(lead);
    if (e) setErreur(e);
    setBusy(null);
  }

  return (
    <section
      aria-label="Boîte d'arrivée"
      style={{
        margin: "14px 0 0",
        padding: "14px 15px",
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "0.5px solid color-mix(in srgb, var(--ls-teal) 32%, var(--ls-border))",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, color: "var(--ls-text)" }}>
          📥 Arrivées
        </span>
        <span
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            padding: "2px 9px",
            borderRadius: 99,
            background: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
            color: "var(--ls-text)",
          }}
        >
          {leads.length} à valider
        </span>
      </div>
      <p style={{ margin: "5px 0 12px", fontSize: 12.5, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        Rien n'entre dans l'entonnoir sans ton geste.
      </p>

      {erreur ? (
        <div role="alert" style={{ marginBottom: 10, fontSize: 12.5, color: "var(--ls-coral)", lineHeight: 1.5 }}>
          {erreur}
        </div>
      ) : null}

      {/* Hauteur bornée : la file grandit à l'intérieur, elle ne pousse jamais
          l'entonnoir vers le bas. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, maxHeight: 340, overflowY: "auto" }}>
        {leads.map((lead) => {
          const g = geste(lead);
          const enCours = busy === lead.key;
          return (
            <div key={lead.key} style={carte}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => onOuvrir(lead)}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--ls-text)",
                    textAlign: "left",
                  }}
                >
                  {nomAffiche(lead.firstName, lead.lastName)}
                </button>
                <span style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>{depuis(lead.createdAt)}</span>
              </div>

              <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
                {[
                  `${CRM_SOURCE_META[lead.source].emoji} ${CRM_SOURCE_META[lead.source].label}`,
                  g.detail,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => void agir(lead, onAccepter)}
                  style={{ ...boutonPrincipal, opacity: enCours ? 0.6 : 1, cursor: enCours ? "wait" : "pointer" }}
                >
                  {enCours ? "…" : g.principal}
                </button>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => void agir(lead, onRefuser)}
                  title="Le met de côté sans rien supprimer"
                  style={boutonDiscret}
                >
                  Plus tard
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
