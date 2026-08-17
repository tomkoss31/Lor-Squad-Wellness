// =============================================================================
// CrmLeadsListView — vue liste compacte du CRM (chantier refonte CRM
// Liste/Pipeline, 2026-07). Vue par défaut demandée par Thomas (type Attio) :
// 1 ligne par lead, triable, avec un panneau d'actions inline au clic (pas de
// navigation de route en Phase 1 — la fiche dédiée /crm/leads/:id arrive en
// Phase 2, elle remplacera ce panneau accordéon sans changer la structure de
// la ligne).
//
// Pattern de table calqué sur src/pages/ClientsPage.tsx (header flex-div,
// bordure gauche colorée par statut, tri via <select> externe plutôt que
// sort-by-click). Ne fait AUCUN filtrage propre : reçoit `leads` déjà filtré
// par le parent (CrmPage), pour rester synchronisée avec la vue Pipeline.
// =============================================================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { CRM_EDITABLE_SOURCES, CRM_SOURCE_META, CRM_STATUS_META, prenomProvenance, provenanceTexte, statusOptionsFor, type CrmLead, type CrmSource, type CrmStatus, objectifCourt } from "../../hooks/useCrmLeads";
import { grouperParEcheance, pilule, pourquoi, teinteDe, type CleGroupe } from "../../features/crm/echeances";
import { FeuilleQualification } from "../../features/crm/FeuilleQualification";
import { estQualifiable } from "../../features/crm/ecrireQualification";
import type { Reponse } from "../../features/crm/qualification";
import { useLeadQuickActions } from "../../hooks/useLeadQuickActions";
import { buildCrmMailLink, buildCrmSmsLink, buildCrmWhatsAppLink, objetPourLead, type CrmMessageContext } from "../../lib/crmMessages";
import { formatLeadDate, relativeLeadDays } from "../../lib/leadDateFormat";
import { computeLeadScore, TEMP_META } from "../../lib/leadScoring";
import { isStagnant, stagnationDays } from "../../lib/leadActivity";
import { tableSupportsAssignment } from "../../lib/leadRouting";
import { EmptyState } from "../ui/EmptyState";

// « Par échéance » est le défaut : c'est le seul tri qui répond à « qu'est-ce
// que je fais maintenant ». Les trois autres restent — trier par arrivée sert
// encore quand on cherche quelqu'un de précis.
export type SortKey = "echeance" | "recent" | "oldest" | "name";

interface CrmLeadsListViewProps {
  leads: CrmLead[];
  msgCtx: CrmMessageContext;
  /** true en vue Endormis : bouton Réveiller au lieu d'Endormir. */
  archived: boolean;
  onStatusChange: (lead: CrmLead, next: CrmStatus) => void;
  onSourceChange: (lead: CrmLead, next: CrmSource) => void;
  onCopy: (text: string) => void;
  onAgenda: (lead: CrmLead) => void;
  dupeFlagFor: (lead: CrmLead) => { kind: "client" | "dupe"; label: string } | null;
  /** Les fiches repliées derrière celle-ci : même email ou même téléphone,
   *  saisis plusieurs fois. Rien n'est supprimé — c'est un regroupement
   *  d'affichage (2026-08-12). */
  doublonsDe?: Map<string, CrmLead[]>;
  onDormant: (lead: CrmLead) => void;
  onWake: (lead: CrmLead) => void;
  onDelete?: (lead: CrmLead) => void;
  /** « Et alors ? » — pose la suite depuis la liste, sans changer d'écran. */
  onQualifier: (lead: CrmLead, reponse: Reponse) => void;
  emptyMessage: string;
  /**
   * Masque le sélecteur de tri : il vit alors dans le panneau « Plus de
   * filtres » du parent. Le tri par défaut (par échéance) est celui qu'on veut
   * dans 99 % des cas, et ce menu prenait toute une ligne juste au-dessus de la
   * liste, entre le coach et le premier nom.
   */
  triExterne?: { valeur: SortKey; onChange: (v: SortKey) => void };
}

export const OPTIONS_DE_TRI: Array<{ valeur: SortKey; label: string }> = [
  { valeur: "echeance", label: "Par échéance" },
  { valeur: "recent", label: "Plus récents" },
  { valeur: "oldest", label: "Plus anciens" },
  { valeur: "name", label: "Nom A→Z" },
];

export function CrmLeadsListView({
  leads,
  msgCtx,
  archived,
  onStatusChange,
  onSourceChange,
  onCopy,
  onAgenda,
  dupeFlagFor,
  doublonsDe,
  onDormant,
  onWake,
  onDelete,
  onQualifier,
  emptyMessage,
  triExterne,
}: CrmLeadsListViewProps) {
  const { users } = useAppContext();
  // Les endormis sont une étagère, pas une file : les ranger par « quand »
  // afficherait « Aujourd'hui » au-dessus de gens qu'on a mis de côté exprès.
  const [sortInterne, setSortInterne] = useState<SortKey>(archived ? "recent" : "echeance");
  const sortKey = triExterne ? triExterne.valeur : sortInterne;
  const setSortKey = triExterne ? triExterne.onChange : setSortInterne;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Une seule lecture de l'horloge pour tout le rendu : sans ça, deux lignes
  // calculées à cheval sur minuit ne racontent pas la même journée.
  const maintenant = useMemo(() => new Date(), [leads]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupes = useMemo(
    () => (sortKey === "echeance" ? grouperParEcheance(leads, maintenant) : null),
    [leads, sortKey, maintenant],
  );

  const sorted = useMemo(() => {
    const arr = [...leads];
    if (sortKey === "recent") {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortKey === "oldest") {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      arr.sort((a, b) => a.firstName.localeCompare(b.firstName, "fr"));
    }
    return arr;
  }, [leads, sortKey]);

  // Le prénom de la personne d'équipe citée (vieilles lignes : la colonne ne
  // porte qu'un identifiant). Résolu une fois pour toutes les lignes, pas une
  // fois par ligne. Depuis le 17/08 le tunnel n'écrit plus d'identifiant du
  // tout — le prénom arrive en texte — mais les lignes du 16/08 existent.
  const prenomParUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users ?? []) {
      const prenom = u.name?.trim().split(/\s+/)[0];
      if (u.id && prenom) m.set(u.id, prenom);
    }
    return m;
  }, [users]);

  const renderRow = (lead: CrmLead, groupe: CleGroupe | null, isLast: boolean) => (
    <CrmLeadListRow
      key={lead.key}
      lead={lead}
      prenomCite={prenomProvenance(
        (lead.provenancePar && prenomParUserId.get(lead.provenancePar)) || null,
        lead.provenanceLibre,
      )}
      msgCtx={msgCtx}
      archived={archived}
      isLast={isLast}
      groupe={groupe}
      maintenant={maintenant}
      expanded={expandedKey === lead.key}
      onToggle={() => setExpandedKey((k) => (k === lead.key ? null : lead.key))}
      onStatusChange={(s) => onStatusChange(lead, s)}
      onSourceChange={lead.table === "prospect_leads" ? (s: CrmSource) => onSourceChange(lead, s) : undefined}
      onCopy={onCopy}
      onAgenda={() => onAgenda(lead)}
      dupeFlag={dupeFlagFor(lead)}
      doublons={doublonsDe?.get(lead.key) ?? null}
      onDormant={!archived ? () => onDormant(lead) : undefined}
      onWake={archived ? () => onWake(lead) : undefined}
      onDelete={onDelete ? () => onDelete(lead) : undefined}
      onQualifier={(r) => onQualifier(lead, r)}
    />
  );

  if (leads.length === 0) {
    return (
      <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14 }}>
        <EmptyState emoji="🎯" title="Aucun lead ici" description={emptyMessage} />
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .crm-list-row:hover { background: color-mix(in srgb, var(--ls-teal) 5%, transparent); }
      `}</style>

      {triExterne ? null : (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="Trier les leads"
            style={{
              height: 32,
              padding: "0 10px",
              borderRadius: 999,
              border: "1px solid var(--ls-border)",
              background: "var(--ls-surface)",
              color: "var(--ls-text)",
              fontSize: 12.5,
              fontFamily: "DM Sans, sans-serif",
              cursor: "pointer",
            }}
          >
            {OPTIONS_DE_TRI.map((o) => (
              <option key={o.valeur} value={o.valeur}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          overflow: "hidden",
          overflowX: "auto",
        }}
      >
        <div style={{ minWidth: 640 }}>
          {/* Header colonnes */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: "1px solid var(--ls-border)",
              background: "var(--ls-surface2)",
              gap: 8,
            }}
          >
            <div style={{ ...headCell, flex: 2 }}>Lead</div>
            <div style={{ ...headCell, flex: 1.2 }}>Source</div>
            <div style={{ ...headCell, flex: 1.4 }}>Contact</div>
            <div style={{ ...headCell, width: 130 }}>Statut</div>
            <div style={{ ...headCell, width: 60 }}>Reçu le</div>
            <div style={{ ...headCell, width: 20 }} />
          </div>

          {groupes
            ? groupes
                // Un groupe vide ne dit rien — on ne montre pas quatre titres
                // pour trois personnes.
                .filter((g) => g.leads.length > 0)
                .map((g, gi, visibles) => (
                  <div key={g.cle}>
                    <div style={groupHeader(g.teinte)}>
                      {/* La couleur passe par la pastille, pas par le texte :
                          coral et violet sur un fond teinté tombaient à 3,6:1,
                          sous le seuil lisible (mesuré, pas lu dans le CSS). */}
                      <span aria-hidden="true" style={pastille(g.teinte)} />
                      <span style={{ color: "var(--ls-text)", fontWeight: 700 }}>{g.titre}</span>
                      {/* Combien de personnes m'attendent : c'est une donnée,
                          pas une décoration. Elle se distingue du titre par le
                          poids, pas par un gris qui tombe à 4:1. */}
                      <span style={{ color: "var(--ls-text)", fontWeight: 500 }}>
                        · {g.leads.length}
                      </span>
                    </div>
                    {g.leads.map((lead, i) =>
                      renderRow(
                        lead,
                        g.cle,
                        gi === visibles.length - 1 && i === g.leads.length - 1,
                      ),
                    )}
                  </div>
                ))
            : sorted.map((lead, i) => renderRow(lead, null, i === sorted.length - 1))}
        </div>
      </div>
    </div>
  );
}

// ─── Ligne + accordéon d'actions ───────────────────────────────────────────

function CrmLeadListRow({
  lead,
  prenomCite,
  msgCtx,
  archived,
  isLast,
  groupe,
  maintenant,
  expanded,
  onToggle,
  onStatusChange,
  onSourceChange,
  onCopy,
  onAgenda,
  dupeFlag,
  doublons,
  onDormant,
  onWake,
  onDelete,
  onQualifier,
}: {
  lead: CrmLead;
  /** Le prénom cité par la personne, déjà résolu par le parent — que la
   *  réponse ait désigné un compte de l'équipe ou été tapée à la main. */
  prenomCite: string | null;
  msgCtx: CrmMessageContext;
  archived: boolean;
  isLast: boolean;
  /** Le groupe d'échéance qui porte cette ligne — `null` en tri à plat. */
  groupe: CleGroupe | null;
  maintenant: Date;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: CrmStatus) => void;
  onSourceChange?: (s: CrmSource) => void;
  onCopy: (text: string) => void;
  onAgenda: () => void;
  dupeFlag: { kind: "client" | "dupe"; label: string } | null;
  doublons: CrmLead[] | null;
  onDormant?: () => void;
  onWake?: () => void;
  onDelete?: () => void;
  onQualifier: (reponse: Reponse) => void;
}) {
  const src = CRM_SOURCE_META[lead.source];
  const statusMeta = CRM_STATUS_META[lead.status];
  const isIntentionSource = lead.source === "intention";
  const { message, messageLabel, aiMessage, setAiMessage, aiLoading, generateAi, lastTouch, recordTouch } =
    useLeadQuickActions(lead, msgCtx);
  // Score/température unifiés + badge de stagnation (Phase 3).
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);
  const { temperature, raison } = computeLeadScore(lead);
  const temp = TEMP_META[temperature];
  const stagnant = isStagnant(lead);
  // Le « quand » et le « pourquoi » n'existent qu'en rangement par échéance :
  // dans un tri à plat, une pilule « demain » sans groupe au-dessus ne veut
  // rien dire.
  const quand = groupe ? pilule(lead, groupe, maintenant) : null;
  const motif = groupe ? pourquoi(lead) : null;
  const teinteMotif = groupe ? teinteDe(lead, groupe) : "var(--ls-text-hint)";

  return (
    <div>
      <div
        className="crm-list-row"
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: 8,
          padding: "12px 14px",
          borderLeft: `3px solid ${statusMeta.color}`,
          borderBottom: isLast && !expanded ? "none" : "1px solid var(--ls-border)",
          background: "transparent",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Clic sur la ligne → fiche détail plein écran (Phase 2). Le
            chevron reste un accordéon d'actions rapides sans quitter la
            liste (WhatsApp/SMS/copier en 1 clic, cf. Phase 1). */}
        <Link
          to={`/crm/leads/${lead.key}`}
          style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, gap: 8, textDecoration: "none", color: "inherit" }}
        >
          <div style={{ flex: 2, minWidth: 0 }}>
            {/* Les badges passent à la ligne plutôt que de rogner le nom :
                sans ça, « Claire Dehaese » s'affichait « Claire De… » — on
                avait remonté le nom de famille pour le tronquer aussitôt. */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", rowGap: 4, fontSize: 13.5, fontWeight: 600, color: "var(--ls-text)" }}>
              {/* Nom de famille compris. Il était en base pour les 10 leads du
                  tunnel club et n'apparaissait qu'en tout petit, sur la ligne
                  du dessous, mélangé à la ville (demande Thomas 16/08). */}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead.firstName}
                {lead.lastName ? ` ${lead.lastName}` : ""}
              </span>
              {quand ? (
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 10.5,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    padding: "2px 8px",
                    borderRadius: 999,
                    color: teinteMotif,
                    // Pas de fond teinté : à 12 % il coûtait 1,4 point de
                    // contraste et faisait passer la pilule sous le seuil
                    // lisible dans les DEUX thèmes. La bordure suffit à en
                    // faire une pilule.
                    background: "transparent",
                    border: `1px solid color-mix(in srgb, ${teinteMotif} 38%, transparent)`,
                  }}
                >
                  {quand}
                </span>
              ) : null}
              {lead.callbackRequestedAt ? <span title="A demandé à être rappelé depuis sa page Résultat Bilan" aria-hidden="true">📞</span> : null}
              {/* En rangement par échéance, le 🔔 répéterait le titre du groupe. */}
              {lead.relanceDue && !groupe ? <span title="Relance due" aria-hidden="true">🔔</span> : null}
              {/* Le ⚠️ reste pour « déjà client » — une info différente. Le
                  regroupement, lui, se dit en clair : combien de fois cette
                  personne s'est inscrite, et quand. */}
              {dupeFlag && dupeFlag.kind === "client" ? (
                <span title={dupeFlag.label} aria-hidden="true">⚠️</span>
              ) : null}
              {doublons && doublons.length > 0 ? (
                <span
                  title={`S'est inscrit(e) ${doublons.length + 1} fois — ${
                    [lead, ...doublons]
                      .map((d) => new Date(d.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      }))
                      .join(" · ")
                  }. La fiche la plus récente porte le fil.`}
                  style={{
                    fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
                    color: "var(--ls-text-hint)",
                    border: "1px solid var(--ls-border)",
                    borderRadius: 8, padding: "1px 6px",
                  }}
                >
                  {doublons.length + 1} fiches
                </span>
              ) : null}
              {stagnant ? (
                <span
                  title={`Aucun mouvement depuis ${stagnationDays(lead)} jour(s)`}
                  style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ls-text-hint)", whiteSpace: "nowrap" }}
                >
                  ⏳ {stagnationDays(lead)}j
                </span>
              ) : null}
              {lead.abandonAvantCreneau ? (
                <span
                  title="A laissé ses coordonnées sur /reserver puis n'a jamais choisi de créneau. C'est le moment de rappeler."
                  style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ls-coral)", whiteSpace: "nowrap" }}
                >
                  ⛔ Sans créneau
                </span>
              ) : lead.rdvLabel ? (
                <span
                  title={`Créneau réservé : ${lead.rdvLabel}`}
                  style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ls-teal)", whiteSpace: "nowrap" }}
                >
                  🗓 {lead.rdvLabel}
                </span>
              ) : null}
              {!lead.ownerUserId && tableSupportsAssignment(lead.table) ? (
                <span title="Non attribué — ouvre la fiche pour assigner" style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ls-purple)", whiteSpace: "nowrap" }}>
                  👤 Non attribué
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {/* Ce qui s'est passé la dernière fois, en tête et en couleur :
                  c'est la seule ligne qui dise pourquoi cette personne est
                  encore là. Le reste (nom, ville, objectif) suit. */}
              {motif ? <span style={{ color: teinteMotif, fontWeight: 600 }}>{motif}</span> : null}
              {(() => {
                const reste = [
                  // Le nom de famille est remonté à côté du prénom : le laisser
                  // aussi ici l'écrirait deux fois sur la même ligne.
                  //
                  // Le prénom cité est affiché ICI, dans le texte joint, sans
                  // couleur ni marque : « 📬 Flyer de Camille » se lit d'un
                  // coup d'œil, et rien ne distingue un prénom tapé à la main
                  // d'un prénom d'équipe — c'est la même réponse à la même
                  // question (cf. `prenomProvenance`).
                  provenanceTexte(lead.provenanceCanal, prenomCite),
                  lead.viaName ? `via ${lead.viaName}` : lead.city,
                  lead.objectif ? objectifCourt(lead.objectif) : null,
                  lead.peopleCount === 2 ? "à deux" : null,
                ].filter(Boolean).join(" · ");
                // Le séparateur ne s'affiche que s'il sépare vraiment quelque
                // chose, et le tiret ne comble le vide que s'il n'y a rien du
                // tout — sinon on lirait « Jamais rappelé·e · — ».
                if (!reste) return motif ? null : "—";
                return motif ? ` · ${reste}` : reste;
              })()}
            </div>
          </div>
          <div style={{ flex: 1.2, fontSize: 12, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
            <span title={`${temp.label} — ${raison}`}>
              <span aria-hidden="true">{temp.emoji}</span>
              <span className="ls-sr-only">{temp.label} — {raison}</span>
            </span>
            {src.emoji} {lead.source === "inconnue" && lead.sourceRaw ? lead.sourceRaw : src.label}
          </div>
          <div style={{ flex: 1.4, fontSize: 12, color: "var(--ls-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.contact ?? (isIntentionSource ? "à demander au parrain" : "—")}
          </div>
          <div style={{ width: 130 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 10,
                fontSize: 10.5,
                fontWeight: 600,
                background: `color-mix(in srgb, ${statusMeta.color} 16%, transparent)`,
                color: statusMeta.color,
              }}
            >
              {statusMeta.emoji} {statusMeta.label}
            </span>
          </div>
          <div style={{ width: 60, fontSize: 11, color: "var(--ls-text-hint)" }}>{formatLeadDate(lead.createdAt)}</div>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Fermer les actions rapides" : "Actions rapides"}
          title="Actions rapides (WhatsApp/SMS/copier) sans quitter la liste"
          style={{
            width: 26,
            height: 26,
            flexShrink: 0,
            border: "none",
            background: "transparent",
            color: "var(--ls-text-hint)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded ? (
        <div
          style={{
            padding: "14px 16px 16px",
            borderLeft: `3px solid ${statusMeta.color}`,
            borderBottom: isLast ? "none" : "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {lastTouch ? (
            <div style={{ fontSize: 11.5, color: "var(--ls-teal)" }}>📨 contacté {relativeLeadDays(lastTouch)}</div>
          ) : null}

          {/* « Et alors ? » — le geste qui manquait. Jusqu'ici on pouvait
              écrire à quelqu'un depuis cette ligne, mais jamais dire ce qui
              s'était passé : la personne restait dans le même état pour
              toujours. Un tap ici, et sa date de retour est calée. */}
          {estQualifiable(lead.table) && !archived ? (
            feuilleOuverte ? (
              <FeuilleQualification
                prenom={lead.firstName}
                onChoisir={(r) => {
                  setFeuilleOuverte(false);
                  onQualifier(r);
                }}
                onIgnorer={() => setFeuilleOuverte(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setFeuilleOuverte(true)}
                style={{ ...actionBtn("var(--ls-teal)"), alignSelf: "flex-start", minHeight: 40 }}
              >
                🎯 Et alors ? — dire ce qui s'est passé
              </button>
            )
          ) : null}

          {/* Statut + source éditables */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={lead.status}
              onChange={(e) => onStatusChange(e.target.value as CrmStatus)}
              aria-label={`Statut de ${lead.firstName}`}
              style={selectStyle(statusMeta.color)}
            >
              {statusOptionsFor(lead.table).map((s) => (
                <option key={s} value={s}>
                  {CRM_STATUS_META[s].emoji} {CRM_STATUS_META[s].label}
                </option>
              ))}
              {!statusOptionsFor(lead.table).includes(lead.status) ? (
                <option value={lead.status}>
                  {statusMeta.emoji} {statusMeta.label}
                </option>
              ) : null}
            </select>
            {onSourceChange ? (
              <select
                value={lead.source}
                onChange={(e) => onSourceChange(e.target.value as CrmSource)}
                aria-label={`Source de ${lead.firstName}`}
                style={selectStyle("var(--ls-purple)")}
              >
                {CRM_EDITABLE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {CRM_SOURCE_META[s].emoji} {CRM_SOURCE_META[s].label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {/* Actions de contact */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {isIntentionSource && lead.parrainPhone ? (
              <a
                href={buildCrmWhatsAppLink(lead.parrainPhone, message)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={recordTouch}
                style={actionBtn("#25D366")}
              >
                📱 Demander à {(lead.viaName ?? "").split(/\s+/)[0] || "ton client"}
              </a>
            ) : null}
            {!isIntentionSource && lead.contactIsPhone ? (
              <>
                <a
                  href={buildCrmWhatsAppLink(lead.contact, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={recordTouch}
                  style={actionBtn("#25D366")}
                >
                  📱 WhatsApp
                </a>
                <a href={buildCrmSmsLink(lead.contact, message)} onClick={recordTouch} style={actionBtn("var(--ls-teal)")}>
                  💬 SMS
                </a>
              </>
            ) : null}
            {/* Sans téléphone, cette rangée n'offrait que « Copier » : le
                message était écrit, l'adresse à deux centimètres, et il fallait
                quand même faire l'aller-retour par la messagerie. */}
            {!isIntentionSource && lead.contact && !lead.contactIsPhone ? (
              <a
                href={buildCrmMailLink(lead.contact, message, objetPourLead(lead, msgCtx))}
                onClick={recordTouch}
                style={actionBtn("var(--ls-teal)")}
              >
                ✉️ Par mail
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                recordTouch();
                onCopy(message);
              }}
              style={actionBtn("var(--ls-teal)")}
            >
              📋 Copier {messageLabel.toLowerCase()}
            </button>
            {lead.status !== "converted" && lead.status !== "lost" ? (
              <button type="button" onClick={onAgenda} style={actionBtn("var(--ls-purple)")}>
                📅 Caler un RDV
              </button>
            ) : null}
            {/* Convertir en fiche client — ouvre la fiche avec le modal déjà
                ouvert (?convert=1). Bilans online non encore convertis. */}
            {lead.table === "online_bilans" && lead.status !== "converted" ? (
              <Link to={`/crm/leads/${lead.key}?convert=1`} style={actionBtn("var(--ls-teal)")}>
                ✅ Convertir en client
              </Link>
            ) : null}
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => {
                if (!window.confirm("✨ Noaly va rédiger un message personnalisé avec l'IA. Ça consomme des crédits — générer ?")) return;
                void generateAi();
              }}
              style={actionBtn("var(--ls-purple)")}
            >
              ✨ {aiLoading ? "Noaly écrit…" : "Noaly écrit un message IA"}
            </button>
          </div>

          {aiMessage ? (
            <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-purple)", marginBottom: 6 }}>
                ✨ Proposition de Noaly — édite avant d'envoyer
              </div>
              <textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: "1px solid var(--ls-border)",
                  background: "var(--ls-surface2)",
                  color: "var(--ls-text)",
                  fontSize: 12.5,
                  fontFamily: "DM Sans, sans-serif",
                  padding: 8,
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {!lead.contactIsPhone && lead.contact ? (
                  <a href={buildCrmMailLink(lead.contact, aiMessage, objetPourLead(lead, msgCtx))} style={actionBtn("var(--ls-teal)")}>
                    ✉️ Par mail
                  </a>
                ) : null}
                {lead.contactIsPhone ? (
                  <a href={buildCrmWhatsAppLink(lead.contact, aiMessage)} target="_blank" rel="noopener noreferrer" style={actionBtn("#25D366")}>
                    📱 WhatsApp
                  </a>
                ) : null}
                <button type="button" onClick={() => onCopy(aiMessage)} style={actionBtn("var(--ls-teal)")}>
                  📋 Copier
                </button>
                <button type="button" onClick={() => setAiMessage(null)} style={actionBtn("var(--ls-text-muted)")}>
                  ✕ Fermer
                </button>
              </div>
            </div>
          ) : null}

          {/* Endormir / Réveiller / Supprimer */}
          {(onDormant || onWake || onDelete) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {archived && onWake ? (
                <button type="button" onClick={onWake} style={cardActionBtn}>
                  ☀️ Réveiller
                </button>
              ) : null}
              {!archived && onDormant ? (
                <button type="button" onClick={onDormant} style={cardActionBtn} title="Mettre de côté — sort du flux, plus de relance">
                  💤 Endormir
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  style={{ ...cardActionBtn, color: "var(--ls-coral)", borderColor: "color-mix(in srgb, var(--ls-coral) 35%, var(--ls-border))" }}
                >
                  🗑 Supprimer
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

/** L'en-tête d'un groupe d'échéance — sticky pour qu'on sache toujours dans
 *  quelle journée on est en train de scroller. */
function pastille(teinte: string): React.CSSProperties {
  return { width: 7, height: 7, borderRadius: "50%", background: teinte, flex: "none" };
}

function groupHeader(teinte: string): React.CSSProperties {
  return {
    position: "sticky",
    top: 0,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 14px",
    fontSize: 11,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    fontFamily: "DM Sans, sans-serif",
    background: `color-mix(in srgb, ${teinte} 9%, var(--ls-surface2))`,
    borderTop: "1px solid var(--ls-border)",
    borderBottom: `1px solid color-mix(in srgb, ${teinte} 25%, var(--ls-border))`,
  };
}

const headCell: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
  fontWeight: 500,
};

function selectStyle(color: string): React.CSSProperties {
  return {
    height: 30,
    padding: "0 8px",
    borderRadius: 8,
    border: `1px solid color-mix(in srgb, ${color} 35%, var(--ls-border))`,
    background: "var(--ls-surface)",
    color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "DM Sans, sans-serif",
    cursor: "pointer",
  };
}

function actionBtn(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 11px",
    borderRadius: 8,
    border: `1px solid color-mix(in srgb, ${color} 35%, var(--ls-border))`,
    background: `color-mix(in srgb, ${color} 8%, var(--ls-surface))`,
    color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "DM Sans, sans-serif",
    textDecoration: "none",
    cursor: "pointer",
  };
}

const cardActionBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text-muted)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};
