// =============================================================================
// CrmBoiteArrivee — « Rien n'entre dans l'entonnoir sans ton geste. »
//
// Lot 2 du chantier CRM Board V2. RÉÉCRIT le 20/08 après que Thomas a regardé
// la première version : « c'est pourri et rien à voir avec le design ». Il
// avait raison — j'avais lu la spec ÉCRITE et jamais ouvert la maquette. Cette
// version est mesurée sur le rendu réel, élément par élément.
//
// ── CE QUI VIENT DE LA MAQUETTE, AU PIXEL ─────────────────────────────────
// Bloc : padding 18/18/14 · titre Syne 16px/800 en encre pleine · badge de
// compte à rayon 6px (PAS une pilule) · sous-titre 11.5px.
// Carte : rayon 13px, padding 12/13, gap 8 · nom 13.5px/700 en encre pleine ·
// horodatage 10.5px en teinte la plus faible · contexte 11.5px.
// Boutons : rayon 8px, 11.5px/800, gap 6.
//
// ── LA RÈGLE DE COULEUR, ET C'EST LE CŒUR DU DESIGN ───────────────────────
// Seules les cartes qui demandent une décision SPÉCIFIQUE sont colorées, et
// chacune a sa teinte : violet pour un RDV du club à confirmer, ambre pour un
// doublon. Bilan, intention et curieux restent neutres. Une file où tout
// clignote ne hiérarchise plus rien — c'est le contraire du but.
//
// ── CE QUI A ÉTÉ TRADUIT, ET POURQUOI ─────────────────────────────────────
// La maquette est en noir #07090B + lime + doré ; l'app est en vert profond et
// a purgé le doré. Décision de Thomas (20/08) : « la structure de la maquette,
// aux couleurs de l'app ». Les accents tombent juste — `--ls-purple` vaut
// EXACTEMENT le violet de la maquette (#A78BFA), `--ls-amber` et `--ls-lime`
// en sont les jumeaux. Seuls les fonds changent.
//
// ── CE QUI N'EST PAS REPRODUIT, ET C'EST VOULU ────────────────────────────
// • Les pastilles rondes numérotées (1, 2, 3…) sont les ANNOTATIONS de la
//   maquette — elle numérote ses propres zones pour les commenter. Les coder
//   afficherait un décompte qui ne veut rien dire dans le produit.
// • Les boutons font 35 px dans la maquette. On les monte à 44 px sous 1024 px
//   (arbitrage délégué par Thomas) : à la souris 35 suffit, au doigt non. Via
//   une CLASSE et pas un style en ligne — un style en ligne battrait la media
//   query, piège déjà payé sur la barre de relances le 18/08.
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

const CSS = `
.crm-arr-btn{min-height:35px}
.crm-arr-carte{border-radius:13px;padding:12px 13px}
@media (max-width: 1023.98px){
  /* Au doigt, 35 px ne suffit pas. La maquette est pensée à la souris. */
  .crm-arr-btn{min-height:44px !important}
}
`;

/** « il y a 25 min », « il y a 4 h », « hier » — la maquette compte le temps
 *  d'attente, jamais une date : dans une file, c'est l'attente qui presse. */
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
 * La teinte de la carte. `null` = neutre.
 *
 * La maquette ne colore QUE les deux cas qui demandent une décision qu'on ne
 * peut pas remettre : un rendez-vous du club qui attend sa confirmation, et un
 * doublon qui va créer deux fiches si on ne tranche pas.
 */
function teinteDe(lead: CrmLead, doublon: boolean): { fond: string; encre: string } | null {
  // Chaque teinte porte SON encre, comme dans la maquette (#1C1233 sur le
  // violet, #2A1E05 sur l'ambre). Une encre unique passerait sur l'une et
  // pas sur l'autre : l'ambre est bien plus lumineux que le violet.
  if (doublon) return { fond: "var(--ls-amber)", encre: "var(--ls-amber-ink)" };
  if (lead.source === "site-club") return { fond: "var(--ls-purple)", encre: "var(--ls-purple-ink)" };
  return null;
}

function detailDe(lead: CrmLead): string {
  switch (lead.table) {
    case "client_referral_intentions":
      return "Prénom confié — pas encore de numéro";
    case "client_referrals":
      return "Recommandé par un client";
    case "online_bilans":
      return "Bilan en ligne rempli";
    default:
      return "";
  }
}

export function CrmBoiteArrivee({ leads, onAccepter, onRefuser, onOuvrir }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  if (leads.length === 0) return null;

  // Un doublon d'arrivée = même téléphone ou même email qu'un autre en attente.
  // Détecté ICI et pas en base : c'est un état de la file, pas une donnée.
  const clefs = new Map<string, number>();
  for (const l of leads) {
    const k = (l.contact ?? "").trim().toLowerCase();
    if (k) clefs.set(k, (clefs.get(k) ?? 0) + 1);
  }

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
        padding: "18px 18px 14px",
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
      }}
    >
      <style>{CSS}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 16, color: "var(--ls-text)" }}>
          📥 Arrivées
        </span>
        {/* Rayon 6 px, pas une pilule : la maquette pose un rectangle arrondi. */}
        <span
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11.5,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 6,
            background: "var(--ls-lime)",
            // `--ls-lime` fonce aussi en thème clair (#5E7A09) : encre à jeton.
            color: "var(--ls-lime-ink)",
          }}
        >
          {leads.length} à valider
        </span>
      </div>
      <p style={{ margin: "6px 0 12px", fontSize: 11.5, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        Rien n'entre dans l'entonnoir sans ton geste. Objectif : répondre dans l'heure.
      </p>

      {erreur ? (
        <div role="alert" style={{ marginBottom: 10, fontSize: 11.5, color: "var(--ls-coral)", lineHeight: 1.5 }}>
          {erreur}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
        {leads.map((lead) => {
          const k = (lead.contact ?? "").trim().toLowerCase();
          const doublon = !!k && (clefs.get(k) ?? 0) > 1;
          const teinte = teinteDe(lead, doublon);
          const enCours = busy === lead.key;
          const src = CRM_SOURCE_META[lead.source];

          return (
            <div
              key={lead.key}
              className="crm-arr-carte"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "var(--ls-surface2)",
                border: `1px solid ${teinte ? `color-mix(in srgb, ${teinte.fond} 30%, transparent)` : "var(--ls-border)"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
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
                    fontSize: 13.5,
                    color: "var(--ls-text)",
                    textAlign: "left",
                  }}
                >
                  {nomAffiche(lead.firstName, lead.lastName)}
                </button>
                <span style={{ fontSize: 10.5, color: "var(--ls-text-muted)" }}>{depuis(lead.createdAt)}</span>
              </div>

              {/* La ligne de contexte : la source prend la teinte de la carte
                  quand il y en a une — c'est elle qui explique la couleur. */}
              <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", lineHeight: 1.45 }}>
                {/* ⚠️ La teinte ne porte JAMAIS le texte : mesuré 4,11:1 pour
                    le violet sur la surface de la carte. La maquette se le
                    permet sur un fond noir, pas nous. C'est la règle du projet
                    depuis le 18/08 — la couleur passe par le liseré et
                    l'aplat, jamais par l'encre. */}
                <span style={{ fontWeight: teinte ? 700 : 400, color: "var(--ls-text-muted)" }}>
                  {src.emoji} {src.label}
                </span>
                {doublon ? (
                  <>
                    {" · "}
                    <span style={{ fontWeight: 700, color: "var(--ls-text)" }}>2 fiches, même contact</span>
                  </>
                ) : detailDe(lead) ? (
                  <> · {detailDe(lead)}</>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="crm-arr-btn"
                  disabled={enCours}
                  onClick={() => void agir(lead, onAccepter)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: 0,
                    // Plein quand la carte demande une décision spécifique,
                    // discret sinon : c'est la hiérarchie de la maquette.
                    background: teinte?.fond ?? "var(--ls-surface)",
                    color: teinte?.encre ?? "var(--ls-text)",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: enCours ? "wait" : "pointer",
                    opacity: enCours ? 0.6 : 1,
                  }}
                >
                  {enCours ? "…" : "✓ Accepter → Nouveau"}
                </button>
                <button
                  type="button"
                  className="crm-arr-btn"
                  disabled={enCours}
                  onClick={() => void agir(lead, onRefuser)}
                  title="Le met de côté sans rien supprimer"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--ls-border)",
                    background: "var(--ls-surface)",
                    color: "var(--ls-text-muted)",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
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
