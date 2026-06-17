// =============================================================================
// CrmPage — CRM commun, tous les leads au même endroit (VIP-4 2026-06-10).
//
// Décision Thomas : « un pipeline pour tous — leads pro, bilan online,
// recos PWA, page VIP — juste avoir l'info d'où ça vient et la bonne route
// après. » + « plus pro avec les messages ».
//
// - Agrégation : hook useCrmLeads (online_bilans + prospect_leads +
//   client_referrals), statut normalisé new → contacted → qualified →
//   converted / lost.
// - Colonnes par statut (pattern LeadsKanban V1 : scroll horizontal +
//   select par card, pas de drag-drop).
// - Par card : badge source, « via X » pour les recos, message de premier
//   contact pro pré-rédigé selon la source (WhatsApp / SMS / copier),
//   relance douce, changement de statut.
// - Les bilans online gardent leur kanban détaillé (/clients?tab=leads)
//   pour la conversion en fiche client — lien direct sur la card.
//
// Accès : route protégée AppLayout, entrée sidebar « CRM ». RLS filtre par
// coach. Tokens var(--ls-*) uniquement.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import {
  computeCrmStats,
  CRM_SOURCE_META,
  CRM_STATUS_META,
  statusOptionsFor,
  useCrmLeads,
  type CrmLead,
  type CrmSource,
  type CrmStatus,
} from "../hooks/useCrmLeads";
import {
  buildAskContactMessage,
  buildCrmMessage,
  buildCrmRelanceMessage,
  buildCrmSmsLink,
  buildCrmWhatsAppLink,
} from "../lib/crmMessages";
import { ProspectFormModal } from "../components/prospect/ProspectFormModal";
import { getSupabaseClient } from "../services/supabaseClient";
import { useCuriousLeads } from "../hooks/useCuriousLeads";
import { useOnlineBilans } from "../hooks/useOnlineBilans";
import { LeadDetailModal } from "../components/leads/LeadDetailModal";
import { RdvBookingsWidget } from "../components/crm/RdvBookingsWidget";

const STATUS_ORDER: CrmStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function relativeDays(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days}j`;
}

export function CrmPage() {
  const { currentUser, clients, users } = useAppContext();
  const { push: pushToast } = useToast();
  const { leads, loading, error, refetch, updateStatus, setDormant, deleteLead } = useCrmLeads();
  // Vue : Actifs (pipeline ouvert) · Historique (convertis/perdus) · Endormis.
  const [view, setView] = useState<"active" | "historique" | "archived">("active");
  const isAdmin = currentUser?.role === "admin";

  // ── Filtre par ligne (2026-06-15) : par défaut chacun voit SES leads. Un
  // admin / référent (= a une downline) peut élargir à ligne 1, ligne 2, un
  // distri précis, ou tout. Empêche un membre (ex. Mandy) de voir les
  // prospects de son upline.
  const { line1Ids, line2Ids, downlineMembers, canFilterTeam } = useMemo(() => {
    const l1 = new Set<string>();
    const l2 = new Set<string>();
    const uid = currentUser?.id;
    if (uid) {
      for (const u of users ?? []) if (u.sponsorId === uid) l1.add(u.id);
      for (const u of users ?? []) if (u.sponsorId && l1.has(u.sponsorId)) l2.add(u.id);
    }
    const members = (users ?? [])
      .filter((u) => l1.has(u.id) || l2.has(u.id))
      .map((u) => ({ id: u.id, name: u.name, line: l1.has(u.id) ? 1 : 2 }))
      .sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
    return { line1Ids: l1, line2Ids: l2, downlineMembers: members, canFilterTeam: isAdmin || l1.size > 0 };
  }, [users, currentUser?.id, isAdmin]);

  // "me" | "l1" | "l2" | "all" | <userId>
  const [scope, setScope] = useState<string>("me");

  const [filterSource, setFilterSource] = useState<CrmSource | "all">("all");
  const [search, setSearch] = useState("");
  // Upgrade V1.1 : drag & drop des cards entre colonnes (HTML5 DnD —
  // desktop ; sur mobile le select par card reste le moyen principal).
  const [dragOverStatus, setDragOverStatus] = useState<CrmStatus | null>(null);
  // Wagon 2 chantier 3 : lead chaud → RDV agenda en 1 clic (prospect pré-rempli).
  const [agendaLead, setAgendaLead] = useState<CrmLead | null>(null);
  // Wagon 3 chantier 6 : panneau stats par source (toggle).
  const [showStats, setShowStats] = useState(false);
  // ONLINE-B : section « Curieux » (commencé le bilan, pas fini) — repliable.
  const { curious, completionRate, loading: curiousLoading } = useCuriousLeads();
  const [showCurious, setShowCurious] = useState(false);

  // Détail d'un lead bilan online (responses + conversion) — ouvert en place
  // dans le CRM (l'ancien kanban /clients?tab=leads a été consolidé ici).
  const onlineBilans = useOnlineBilans();
  const [detailBilanId, setDetailBilanId] = useState<string | null>(null);
  const detailBilan = detailBilanId
    ? onlineBilans.bilans.find((b) => b.id === detailBilanId) ?? null
    : null;

  useEffect(() => {
    document.title = "La Base 360 — CRM";
  }, []);

  const stats = useMemo(() => computeCrmStats(leads), [leads]);

  // Wagon 3 chantier 7 : anti-doublon. Index des téléphones déjà clients +
  // détection des leads en double dans le pipeline (même téléphone).
  const dupeInfo = useMemo(() => {
    const norm = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-9);
    const clientPhones = new Map<string, string>();
    for (const c of clients ?? []) {
      const p = norm(c.phone);
      if (p.length >= 6) clientPhones.set(p, `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim());
    }
    const leadPhoneCount = new Map<string, number>();
    for (const l of leads) {
      const p = norm(l.contact);
      if (p.length >= 6) leadPhoneCount.set(p, (leadPhoneCount.get(p) ?? 0) + 1);
    }
    return { norm, clientPhones, leadPhoneCount };
  }, [clients, leads]);

  function dupeFlagFor(lead: CrmLead): { kind: "client" | "dupe"; label: string } | null {
    const p = dupeInfo.norm(lead.contact);
    if (p.length < 6) return null;
    const clientName = dupeInfo.clientPhones.get(p);
    if (clientName) return { kind: "client", label: `déjà client (${clientName})` };
    if ((dupeInfo.leadPhoneCount.get(p) ?? 0) > 1) return { kind: "dupe", label: "doublon pipeline" };
    return null;
  }

  const msgCtx = useMemo(() => {
    const slug = normalizeSlug((currentUser?.name ?? "").split(/\s+/)[0] ?? "");
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return {
      coachFirstName: (currentUser?.name ?? "").split(/\s+/)[0] || "Ton coach",
      bilanUrl: `${origin}/bilan-online/${slug}`,
      vipUrl: `${origin}/vip/${slug}`,
    };
  }, [currentUser?.name]);

  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        // Répartition par vue :
        //   - Endormis  → uniquement les archivés (dormant)
        //   - Historique→ non-dormant + statut clos (converti / perdu)
        //   - Actifs    → non-dormant + pipeline ouvert (nouveau/contacté/qualifié)
        const closed = l.status === "converted" || l.status === "lost";
        if (l.dormant) {
          if (view !== "archived") return false;
        } else {
          if (view === "archived") return false;
          if (view === "historique" && !closed) return false;
          if (view === "active" && closed) return false;
        }
        // Périmètre par ligne. Sans droit d'équipe → toujours "moi".
        const effScope = canFilterTeam ? scope : "me";
        const owner = l.ownerUserId;
        if (effScope === "me") {
          if (owner !== currentUser?.id) return false;
        } else if (effScope === "l1") {
          if (!owner || !line1Ids.has(owner)) return false;
        } else if (effScope === "l2") {
          if (!owner || !line2Ids.has(owner)) return false;
        } else if (effScope === "all") {
          /* admin : aucun filtre propriétaire */
        } else {
          if (owner !== effScope) return false; // distributeur précis
        }
        if (filterSource !== "all" && l.source !== filterSource) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          if (
            !l.firstName.toLowerCase().includes(q) &&
            !(l.viaName ?? "").toLowerCase().includes(q) &&
            !(l.contact ?? "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [leads, filterSource, search, view, scope, canFilterTeam, currentUser?.id, line1Ids, line2Ids],
  );

  // Compteurs cohérents avec la vue Actifs (endormis hors flux) ET le périmètre.
  const counts = useMemo(() => {
    const by: Record<CrmStatus, number> = { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 };
    const effScope = canFilterTeam ? scope : "me";
    for (const l of leads) {
      if (l.dormant) continue;
      const owner = l.ownerUserId;
      if (effScope === "me") { if (owner !== currentUser?.id) continue; }
      else if (effScope === "l1") { if (!owner || !line1Ids.has(owner)) continue; }
      else if (effScope === "l2") { if (!owner || !line2Ids.has(owner)) continue; }
      else if (effScope !== "all") { if (owner !== effScope) continue; }
      by[l.status] += 1;
    }
    return by;
  }, [leads, scope, canFilterTeam, currentUser?.id, line1Ids, line2Ids]);
  const dormantCount = useMemo(() => leads.filter((l) => l.dormant).length, [leads]);
  const historiqueCount = useMemo(
    () => leads.filter((l) => !l.dormant && (l.status === "converted" || l.status === "lost")).length,
    [leads],
  );

  const sourcesPresent = useMemo(() => {
    const set = new Set<CrmSource>();
    for (const l of leads) set.add(l.source);
    return set;
  }, [leads]);

  async function handleStatusChange(lead: CrmLead, next: CrmStatus) {
    const err = await updateStatus(lead, next);
    if (err) {
      pushToast({ tone: "warning", title: "Statut non enregistré", message: err });
    }
  }

  async function handleDormant(lead: CrmLead, value: boolean) {
    const err = await setDormant(lead, value);
    pushToast(
      err
        ? { tone: "warning", title: "Action impossible", message: err }
        : { tone: "success", title: value ? "Lead endormi 💤" : "Lead réveillé", message: lead.firstName },
    );
  }

  async function handleDelete(lead: CrmLead) {
    if (typeof window !== "undefined" && !window.confirm(`Supprimer définitivement ${lead.firstName} ? Cette action est irréversible.`)) {
      return;
    }
    const err = await deleteLead(lead);
    pushToast(
      err
        ? { tone: "warning", title: "Suppression impossible", message: err }
        : { tone: "success", title: "Lead supprimé", message: lead.firstName },
    );
  }

  function handleDrop(leadKey: string, target: CrmStatus) {
    setDragOverStatus(null);
    const lead = leads.find((l) => l.key === leadKey);
    if (!lead || lead.status === target) return;
    if (!statusOptionsFor(lead.table).includes(target)) {
      pushToast({
        tone: "warning",
        title: "Pas par ici",
        message:
          lead.table === "online_bilans" && target === "converted"
            ? "Pour convertir un bilan en fiche client, ouvre-le avec le bouton 📂 Détails."
            : "Ce statut n'est pas disponible pour cette source.",
      });
      return;
    }
    void handleStatusChange(lead, target);
  }

  async function copyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast({ tone: "success", title: "Message copié", message: "Colle-le où tu veux." });
    } catch {
      pushToast({ tone: "warning", title: "Copie impossible", message: "" });
    }
  }

  return (
    <div style={pageWrap}>
      {/* Hero */}
      <header style={heroBox}>
        <div style={heroEyebrow}>🎯 CRM · Tous tes leads</div>
        <h1 style={heroTitle}>Un seul pipeline, toutes tes sources</h1>
        <p style={heroSubtitle}>
          Bilan online, Club VIP, opportunité, recos de tes clients — tout
          arrive ici. Contacte avec un message pro pré-rédigé, classe, convertis.
        </p>
        {/* Stats */}
        <div style={statsRow}>
          {STATUS_ORDER.map((s) => (
            <div key={s} style={statChip(CRM_STATUS_META[s].color)}>
              <span aria-hidden="true">{CRM_STATUS_META[s].emoji}</span>
              <strong style={{ fontFamily: "Syne, sans-serif" }}>{counts[s]}</strong>
              <span style={{ fontSize: 11 }}>{CRM_STATUS_META[s].label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* RDV demandés via le bilan en ligne (RDV V2 brique 4, 2026-06-14) —
          masqué s'il n'y en a pas. */}
      <RdvBookingsWidget />

      {error ? (
        <div style={errorBanner}>
          ⚠️ Une source n'a pas pu charger : {error}
          <button type="button" onClick={() => void refetch()} style={retryBtn}>
            Réessayer
          </button>
        </div>
      ) : null}

      {/* Filtre par ligne (admin / référent uniquement) */}
      {canFilterTeam && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "12px 0 0" }}>
          <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>Périmètre :</span>
          <button type="button" onClick={() => setScope("me")} style={sourceChip(scope === "me", "var(--ls-gold)")}>👤 Moi</button>
          {line1Ids.size > 0 && (
            <button type="button" onClick={() => setScope("l1")} style={sourceChip(scope === "l1", "var(--ls-teal)")}>
              Ligne 1 ({line1Ids.size})
            </button>
          )}
          {isAdmin && line2Ids.size > 0 && (
            <button type="button" onClick={() => setScope("l2")} style={sourceChip(scope === "l2", "var(--ls-teal)")}>
              Ligne 2 ({line2Ids.size})
            </button>
          )}
          {isAdmin && (
            <button type="button" onClick={() => setScope("all")} style={sourceChip(scope === "all", "var(--ls-purple)")}>
              Tous
            </button>
          )}
          {(isAdmin ? downlineMembers : downlineMembers.filter((m) => m.line === 1)).length > 0 && (
            <select
              value={["me", "l1", "l2", "all"].includes(scope) ? "" : scope}
              onChange={(e) => e.target.value && setScope(e.target.value)}
              aria-label="Filtrer par distributeur"
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
              <option value="">Un distributeur…</option>
              {(isAdmin ? downlineMembers : downlineMembers.filter((m) => m.line === 1)).map((m) => (
                <option key={m.id} value={m.id}>
                  L{m.line} · {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <button
          type="button"
          onClick={() => setFilterSource("all")}
          style={sourceChip(filterSource === "all", "var(--ls-text)")}
        >
          Toutes sources
        </button>
        {(Object.keys(CRM_SOURCE_META) as CrmSource[])
          .filter((s) => sourcesPresent.has(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSource(filterSource === s ? "all" : s)}
              style={sourceChip(filterSource === s, "var(--ls-teal)")}
            >
              {CRM_SOURCE_META[s].emoji} {CRM_SOURCE_META[s].label}
            </button>
          ))}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Nom, contact, parrain…"
          style={searchInput}
          aria-label="Rechercher un lead"
        />
        <button
          type="button"
          onClick={() => setShowStats((s) => !s)}
          style={sourceChip(showStats, "var(--ls-purple)")}
        >
          📊 Stats {showStats ? "▲" : "▼"}
        </button>
      </div>

      {/* Stats par source (wagon 3 chantier 6) */}
      {showStats ? (
        <div style={statsPanel}>
          <div style={statsPanelHead}>
            📊 Performance par source · {stats.overall.converted}/{stats.overall.total} convertis (
            {Math.round(stats.overall.conversionRate * 100)}%)
          </div>
          <div style={statsGrid}>
            {stats.bySource.map((s) => (
              <div key={s.source} style={statsCard}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ls-text)" }}>
                  {CRM_SOURCE_META[s.source].emoji} {CRM_SOURCE_META[s.source].label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "4px 0" }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--ls-teal)" }}>
                    {Math.round(s.conversionRate * 100)}%
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>conversion</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
                  {s.total} lead{s.total > 1 ? "s" : ""} · {s.active} actifs · {s.converted} convertis · {s.lost} perdus
                </div>
                {/* Barre conversion */}
                <div style={statsBarTrack}>
                  <div style={{ ...statsBarFill, width: `${Math.max(2, Math.round(s.conversionRate * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Section Curieux (ONLINE-B) : commencé le bilan, pas fini */}
      {!curiousLoading && (curious.length > 0 || completionRate > 0) ? (
        <div style={curiousPanel}>
          <button
            type="button"
            onClick={() => setShowCurious((s) => !s)}
            style={curiousHeader}
            aria-expanded={showCurious}
          >
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13.5 }}>
              💭 Curieux — {curious.length} {curious.length > 1 ? "ont commencé" : "a commencé"} sans finir
            </span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ls-text-muted)" }}>
              taux de complétion <strong style={{ color: "var(--ls-teal)" }}>{Math.round(completionRate * 100)}%</strong>
            </span>
            <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>{showCurious ? "▲" : "▼"}</span>
          </button>
          {showCurious ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              <p style={{ fontSize: 11.5, color: "var(--ls-text-muted)", margin: 0, lineHeight: 1.5 }}>
                Ces prospects ont saisi leur étape 1 mais n'ont pas terminé le bilan. Ils ne sont pas
                dans ton pipeline qualifié — relance-les en douceur, sans pression.
              </p>
              {curious.length === 0 ? (
                <div style={columnEmpty}>Aucun curieux en attente 👏</div>
              ) : (
                curious.map((c) => {
                  const msg = `Salut ${c.firstName} ! 🌿 Tu as commencé ton bilan bien-être mais tu ne l'as pas terminé — pas de souci. Si tu veux, on le finit ensemble en 2 minutes, ça me permet de te faire un retour perso. Dis-moi 🙂\n${msgCtx.coachFirstName}`;
                  return (
                    <div key={c.id} style={curiousRow}>
                      <span style={{ fontWeight: 700, fontFamily: "Syne, sans-serif", fontSize: 13 }}>
                        {c.firstName}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
                        {c.city ? `${c.city} · ` : ""}{c.contact ?? "—"}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ls-text-hint)" }}>
                        {formatDate(c.createdAt)}
                      </span>
                      {c.contactIsPhone ? (
                        <a
                          href={buildCrmWhatsAppLink(c.contact, msg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={actionBtn("#25D366")}
                          title="Relancer en douceur"
                        >
                          📱 Relancer
                        </a>
                      ) : (
                        <button type="button" onClick={() => void copyMessage(msg)} style={actionBtn("var(--ls-gold)")}>
                          📋 Message
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Toggle Actifs / Historique / Endormis */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {([
          { id: "active" as const, label: "📋 Actifs" },
          { id: "historique" as const, label: `📜 Historique${historiqueCount ? ` (${historiqueCount})` : ""}` },
          { id: "archived" as const, label: `💤 Endormis${dormantCount ? ` (${dormantCount})` : ""}` },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: view === t.id ? 700 : 500,
              background: view === t.id ? "var(--ls-text)" : "var(--ls-surface)",
              color: view === t.id ? "var(--ls-bg)" : "var(--ls-text-muted)",
              border: "1px solid var(--ls-border)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Pipeline */}
      {loading ? (
        <div style={hint}>Chargement de tes leads…</div>
      ) : filtered.length === 0 ? (
        <div style={emptyState}>
          {view === "archived"
            ? "Aucun lead endormi. Mets un lead froid de côté avec 💤 sur sa carte."
            : view === "historique"
            ? "Aucun converti ni perdu pour l'instant. Dès qu'un lead passe en ✅ Converti ou 🌙 Perdu, il arrive ici automatiquement."
            : leads.length === 0
            ? "Aucun lead pour l'instant. Partage ton lien bilan online ou ta page Club VIP pour remplir le pipeline 🌱"
            : "Aucun lead ne correspond aux filtres."}
        </div>
      ) : view === "archived" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 560 }}>
          {filtered.map((lead) => (
            <LeadCard
              key={lead.key}
              lead={lead}
              msgCtx={msgCtx}
              onStatusChange={(s) => void handleStatusChange(lead, s)}
              onCopy={(text) => void copyMessage(text)}
              onOpenBilans={() => setDetailBilanId(lead.id)}
              onAgenda={() => setAgendaLead(lead)}
              dupeFlag={dupeFlagFor(lead)}
              archived
              onWake={() => void handleDormant(lead, false)}
              onDelete={isAdmin ? () => void handleDelete(lead) : undefined}
            />
          ))}
        </div>
      ) : (
        <div style={columnsWrap}>
          {(view === "historique"
            ? (["converted", "lost"] as CrmStatus[])
            : (["new", "contacted", "qualified"] as CrmStatus[])
          ).map((status) => {
            const col = filtered.filter((l) => l.status === status);
            const isDragOver = dragOverStatus === status;
            return (
              <div
                key={status}
                style={{
                  ...column,
                  ...(isDragOver
                    ? {
                        borderColor: `color-mix(in srgb, ${CRM_STATUS_META[status].color} 60%, transparent)`,
                        background: `color-mix(in srgb, ${CRM_STATUS_META[status].color} 6%, var(--ls-surface2))`,
                      }
                    : {}),
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStatus(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(e.dataTransfer.getData("text/plain"), status);
                }}
              >
                <div style={columnHeader(CRM_STATUS_META[status].color)}>
                  <span aria-hidden="true">{CRM_STATUS_META[status].emoji}</span>{" "}
                  {CRM_STATUS_META[status].label}
                  <span style={columnCount}>{col.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {col.map((lead) => (
                    <LeadCard
                      key={lead.key}
                      lead={lead}
                      msgCtx={msgCtx}
                      onStatusChange={(s) => void handleStatusChange(lead, s)}
                      onCopy={(text) => void copyMessage(text)}
                      onOpenBilans={() => setDetailBilanId(lead.id)}
                      onAgenda={() => setAgendaLead(lead)}
                      dupeFlag={dupeFlagFor(lead)}
                      onDormant={() => void handleDormant(lead, true)}
                      onDelete={isAdmin ? () => void handleDelete(lead) : undefined}
                    />
                  ))}
                  {col.length === 0 ? <div style={columnEmpty}>—</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead → RDV agenda (wagon 2 chantier 3) : prospect pré-rempli, et le
          lead passe automatiquement en Qualifié/Contacté à la création. */}
      {agendaLead ? (
        <ProspectFormModal
          prefill={{
            firstName: agendaLead.firstName,
            phone: agendaLead.contactIsPhone ? agendaLead.contact ?? undefined : undefined,
            source:
              agendaLead.source === "reco-client" || agendaLead.source === "intention"
                ? "Parrainage"
                : "Autre",
            sourceDetail: `CRM · ${CRM_SOURCE_META[agendaLead.source].label}${agendaLead.viaName ? ` (via ${agendaLead.viaName})` : ""}`,
            note: agendaLead.notes ?? undefined,
          }}
          onClose={() => setAgendaLead(null)}
          onSaved={() => {
            const lead = agendaLead;
            setAgendaLead(null);
            if (lead) {
              const next: CrmStatus = statusOptionsFor(lead.table).includes("qualified")
                ? "qualified"
                : "contacted";
              void handleStatusChange(lead, next);
              pushToast({
                tone: "success",
                title: "RDV créé",
                message: `${lead.firstName} est dans l'agenda — lead passé en ${CRM_STATUS_META[next].label}.`,
              });
            }
          }}
        />
      ) : null}

      {/* Détail lead bilan online (responses + conversion) — ouvert depuis 📂 Détails */}
      {detailBilan ? (
        <LeadDetailModal
          bilan={detailBilan}
          onClose={() => setDetailBilanId(null)}
          onStatusChange={async (s) => {
            await onlineBilans.updateStatus(detailBilan.id, s);
            await refetch();
          }}
          onNotesChange={async (n) => {
            await onlineBilans.updateNotes(detailBilan.id, n);
          }}
          onRefresh={async () => {
            await onlineBilans.refetch();
            await refetch();
          }}
          onDelete={
            isAdmin
              ? async () => {
                  await onlineBilans.deleteBilan(detailBilan.id);
                  setDetailBilanId(null);
                  await refetch();
                }
              : undefined
          }
          onConverted={async (clientId) => {
            await onlineBilans.convertLead(detailBilan.id, clientId);
            setDetailBilanId(null);
            await refetch();
            pushToast({ tone: "success", title: "Lead converti", message: "Fiche client créée ✅" });
          }}
        />
      ) : null}

      <footer style={footerHint}>
        💡 Sur un lead <strong>Bilan online</strong>, le bouton <strong>📂 Détails</strong> ouvre
        toutes ses réponses et permet de le convertir en fiche client. Les{" "}
        <strong>💭 Intentions</strong> sont les prénoms confiés par tes clients dans leur
        simulateur VIP : pas encore de numéro — le bouton t'aide à le demander au parrain.
      </footer>
    </div>
  );
}

// ─── LeadCard ────────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  msgCtx,
  onStatusChange,
  onCopy,
  onOpenBilans,
  onAgenda,
  dupeFlag,
  onDormant,
  onWake,
  onDelete,
  archived,
}: {
  lead: CrmLead;
  msgCtx: { coachFirstName: string; bilanUrl: string; vipUrl: string };
  onStatusChange: (s: CrmStatus) => void;
  onCopy: (text: string) => void;
  onOpenBilans: () => void;
  onAgenda: () => void;
  dupeFlag: { kind: "client" | "dupe"; label: string } | null;
  onDormant?: () => void;
  onWake?: () => void;
  onDelete?: () => void;
  archived?: boolean;
}) {
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const src = CRM_SOURCE_META[lead.source];
  // Wagon 3 chantier 8 : message généré par Noaly (l'IA de La Base 360).
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div
      style={card}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.key);
        e.dataTransfer.effectAllowed = "move";
      }}
      title="Glisse-moi dans une autre colonne (ou utilise le sélecteur de statut)"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontFamily: "Syne, sans-serif", fontSize: 14, color: "var(--ls-text)" }}>
          {lead.firstName}
        </strong>
        <span style={srcBadge}>
          {src.emoji} {src.label}
        </span>
        {lead.relanceDue ? <span style={relanceBadge}>🔔 Relance due</span> : null}
        {dupeFlag ? (
          <span style={dupeFlag.kind === "client" ? clientBadge : dupeBadge}>⚠️ {dupeFlag.label}</span>
        ) : null}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ls-text-hint)" }}>
          {formatDate(lead.createdAt)}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        {lead.viaName ? <>🤝 via <strong>{lead.viaName}</strong> · </> : null}
        {lead.extra ? <>{lead.extra} · </> : null}
        {lead.city ? <>{lead.city} · </> : null}
        {lead.contact ?? (isIntention ? "contact à demander au parrain" : "pas de contact")}
        {lastTouch ? (
          <span style={{ color: "var(--ls-teal)" }}> · 📨 contacté {relativeDays(lastTouch)}</span>
        ) : null}
      </div>

      {/* Actions — menu déroulant (aéré sur mobile, Noaly explicite) */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          style={{ ...actionBtn("var(--ls-teal)"), fontWeight: 700 }}
        >
          ⚡ Actions {menuOpen ? "▴" : "▾"}
        </button>
        {menuOpen ? (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} aria-hidden="true" />
            <div style={actionMenu}>
              {isIntention && lead.parrainPhone ? (
                <MenuItem
                  onClick={() => {
                    recordTouch();
                    window.open(buildCrmWhatsAppLink(lead.parrainPhone!, message), "_blank", "noopener,noreferrer");
                    setMenuOpen(false);
                  }}
                >
                  📱 Demander à {(lead.viaName ?? "").split(/\s+/)[0] || "ton client"}
                </MenuItem>
              ) : null}
              {!isIntention && lead.contactIsPhone ? (
                <>
                  <MenuItem
                    onClick={() => {
                      recordTouch();
                      window.open(buildCrmWhatsAppLink(lead.contact, message), "_blank", "noopener,noreferrer");
                      setMenuOpen(false);
                    }}
                  >
                    📱 WhatsApp
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      recordTouch();
                      window.location.href = buildCrmSmsLink(lead.contact, message);
                      setMenuOpen(false);
                    }}
                  >
                    💬 SMS
                  </MenuItem>
                </>
              ) : null}
              <MenuItem
                onClick={() => {
                  recordTouch();
                  onCopy(message);
                  setMenuOpen(false);
                }}
              >
                📋 Copier {messageLabel.toLowerCase()}
              </MenuItem>
              {lead.status !== "converted" && lead.status !== "lost" ? (
                <MenuItem
                  onClick={() => {
                    onAgenda();
                    setMenuOpen(false);
                  }}
                >
                  📅 Caler un RDV
                </MenuItem>
              ) : null}
              {lead.table === "online_bilans" ? (
                <MenuItem
                  onClick={() => {
                    onOpenBilans();
                    setMenuOpen(false);
                  }}
                >
                  📂 Détails du bilan
                </MenuItem>
              ) : null}
              {lead.resultToken ? (
                <MenuItem
                  onClick={() => {
                    recordTouch();
                    const origin = typeof window !== "undefined" ? window.location.origin : "";
                    void navigator.clipboard?.writeText(`${origin}/resultat-bilan/${lead.resultToken}`).then(() =>
                      pushToast({
                        tone: "success",
                        title: "Lien Résultat copié",
                        message: "Page premium personnalisée — envoie-la à ton prospect 🌿",
                      }),
                    );
                    setMenuOpen(false);
                  }}
                >
                  🔗 Copier le lien Résultat
                </MenuItem>
              ) : null}
              <MenuItem
                disabled={aiLoading}
                onClick={() => {
                  setMenuOpen(false);
                  // Anti-gaspillage IA : génération seulement si confirmée.
                  if (
                    !window.confirm(
                      "✨ Noaly va rédiger un message personnalisé avec l'IA. Ça consomme des crédits — générer ?",
                    )
                  )
                    return;
                  void generateAi();
                }}
              >
                ✨ {aiLoading ? "Noaly écrit…" : "Noaly écrit un message IA"}
              </MenuItem>
            </div>
          </>
        ) : null}
      </div>

      {/* Message IA généré (wagon 3 chantier 8) */}
      {aiMessage ? (
        <div style={aiPanel}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-purple)", marginBottom: 6 }}>
            ✨ Proposition de Noaly — édite avant d'envoyer
          </div>
          <textarea
            value={aiMessage}
            onChange={(e) => setAiMessage(e.target.value)}
            rows={6}
            style={aiTextarea}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {lead.contactIsPhone ? (
              <a
                href={buildCrmWhatsAppLink(lead.contact, aiMessage)}
                target="_blank"
                rel="noopener noreferrer"
                style={actionBtn("#25D366")}
              >
                📱 WhatsApp
              </a>
            ) : null}
            {isIntention && lead.parrainPhone ? (
              <a
                href={buildCrmWhatsAppLink(lead.parrainPhone, aiMessage)}
                target="_blank"
                rel="noopener noreferrer"
                style={actionBtn("#25D366")}
              >
                📱 Au parrain
              </a>
            ) : null}
            <button type="button" onClick={() => onCopy(aiMessage)} style={actionBtn("var(--ls-gold)")}>
              📋 Copier
            </button>
            <button type="button" onClick={() => setAiMessage(null)} style={actionBtn("var(--ls-text-muted)")}>
              ✕ Fermer
            </button>
          </div>
        </div>
      ) : null}

      {/* Statut */}
      <select
        value={lead.status}
        onChange={(e) => onStatusChange(e.target.value as CrmStatus)}
        style={statusSelect(CRM_STATUS_META[lead.status].color)}
        aria-label={`Statut de ${lead.firstName}`}
      >
        {statusOptionsFor(lead.table).map((s) => (
          <option key={s} value={s}>
            {CRM_STATUS_META[s].emoji} {CRM_STATUS_META[s].label}
          </option>
        ))}
        {/* Statut courant hors options natives (ex: converti via kanban) */}
        {!statusOptionsFor(lead.table).includes(lead.status) ? (
          <option value={lead.status}>
            {CRM_STATUS_META[lead.status].emoji} {CRM_STATUS_META[lead.status].label}
          </option>
        ) : null}
      </select>

      {/* Actions endormir / réveiller / supprimer (2026-06-14) */}
      {(onDormant || onWake || onDelete) && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
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
            <button type="button" onClick={onDelete} style={{ ...cardActionBtn, color: "var(--ls-coral)", borderColor: "color-mix(in srgb, var(--ls-coral) 35%, var(--ls-border))" }}>
              🗑 Supprimer
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

const cardActionBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text-muted)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)), color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 28%, var(--ls-border))",
  borderRadius: 18,
  padding: "22px 20px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-teal)",
  marginBottom: 6,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 25,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const heroSubtitle: React.CSSProperties = {
  margin: "6px 0 14px",
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
  maxWidth: 600,
};

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const statChip = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 999,
  background: `color-mix(in srgb, ${color} 10%, var(--ls-surface))`,
  border: `0.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
  fontSize: 12.5,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
});

const errorBanner: React.CSSProperties = {
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 12,
  background: "color-mix(in srgb, var(--ls-coral) 10%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  fontSize: 12.5,
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const retryBtn: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text)",
  fontSize: 12,
  padding: "4px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const sourceChip = (active: boolean, color: string): React.CSSProperties => ({
  padding: "7px 13px",
  borderRadius: 999,
  fontSize: 12.5,
  fontWeight: active ? 700 : 500,
  fontFamily: "DM Sans, sans-serif",
  cursor: "pointer",
  background: active ? `color-mix(in srgb, ${color} 12%, var(--ls-surface))` : "var(--ls-surface)",
  border: active
    ? `0.5px solid color-mix(in srgb, ${color} 50%, transparent)`
    : "0.5px solid var(--ls-border)",
  color: active ? color : "var(--ls-text-muted)",
});

const searchInput: React.CSSProperties = {
  flex: "1 1 180px",
  minWidth: 160,
  padding: "7px 13px",
  borderRadius: 999,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 12.5,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
};

const columnsWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  overflowX: "auto",
  paddingBottom: 12,
  alignItems: "flex-start",
};

const column: React.CSSProperties = {
  flex: "0 0 290px",
  minWidth: 290,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 14,
  padding: 10,
};

const columnHeader = (color: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  color,
  padding: "4px 6px 10px",
});

const columnCount: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 11,
  fontWeight: 800,
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface)",
  borderRadius: 999,
  padding: "1px 8px",
  border: "0.5px solid var(--ls-border)",
};

const columnEmpty: React.CSSProperties = {
  textAlign: "center",
  color: "var(--ls-text-hint)",
  fontSize: 12,
  padding: "18px 0",
};

const card: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  padding: "12px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 9,
  fontFamily: "DM Sans, sans-serif",
  cursor: "grab",
};

const srcBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
  color: "var(--ls-teal)",
  whiteSpace: "nowrap",
};

const relanceBadge: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-coral) 12%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
  color: "var(--ls-coral)",
  whiteSpace: "nowrap",
};

const clientBadge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 40%, transparent)",
  color: "var(--ls-purple)",
  whiteSpace: "nowrap",
};

const dupeBadge: React.CSSProperties = {
  ...clientBadge,
  background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 45%, transparent)",
  color: "var(--ls-gold)",
};

const curiousPanel: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 16px",
  borderRadius: 14,
  background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
  border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 40%, var(--ls-border))",
};

const curiousHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--ls-text)",
  padding: 0,
  textAlign: "left",
  flexWrap: "wrap",
};

const curiousRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  padding: "9px 12px",
  borderRadius: 10,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  fontFamily: "DM Sans, sans-serif",
};

const statsPanel: React.CSSProperties = {
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 14,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
};

const statsPanelHead: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 13.5,
  color: "var(--ls-text)",
  marginBottom: 12,
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 10,
};

const statsCard: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
};

const statsBarTrack: React.CSSProperties = {
  marginTop: 8,
  width: "100%",
  height: 5,
  borderRadius: 100,
  background: "color-mix(in srgb, var(--ls-text) 8%, transparent)",
  overflow: "hidden",
};

const statsBarFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 100,
  background: "linear-gradient(90deg, var(--ls-teal), var(--ls-gold))",
};

const actionBtn = (accent: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  borderRadius: 9,
  background: `color-mix(in srgb, ${accent} 10%, var(--ls-surface2))`,
  border: `0.5px solid color-mix(in srgb, ${accent} 35%, transparent)`,
  color: "var(--ls-text)",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  fontFamily: "DM Sans, sans-serif",
});

const actionMenu: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: 6,
  minWidth: 220,
  maxWidth: "min(260px, 90vw)",
  zIndex: 41,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
  padding: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

function MenuItem({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 9,
        border: "none",
        background: "transparent",
        color: "var(--ls-text)",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "DM Sans, sans-serif",
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
        minHeight: 40,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--ls-surface2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

const aiPanel: React.CSSProperties = {
  marginTop: 4,
  padding: "10px 12px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-purple) 7%, var(--ls-surface2))",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, var(--ls-border))",
};

const aiTextarea: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 12.5,
  lineHeight: 1.5,
  fontFamily: "DM Sans, sans-serif",
  resize: "vertical",
  outline: "none",
};

const statusSelect = (color: string): React.CSSProperties => ({
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 9,
  border: `1px solid color-mix(in srgb, ${color} 45%, var(--ls-border))`,
  background: `color-mix(in srgb, ${color} 8%, var(--ls-surface2))`,
  color: "var(--ls-text)",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
});

const hint: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const emptyState: React.CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  color: "var(--ls-text-muted)",
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 14,
  fontSize: 13.5,
  lineHeight: 1.6,
  fontFamily: "DM Sans, sans-serif",
};

const footerHint: React.CSSProperties = {
  marginTop: 20,
  padding: "14px 16px",
  borderRadius: 12,
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.6,
  fontFamily: "DM Sans, sans-serif",
};

