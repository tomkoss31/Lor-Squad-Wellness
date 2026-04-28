// =============================================================================
// ClientVipCoachPanel — bloc coach sur la fiche client (Tier B Premium VIP)
// =============================================================================
//
// Affiche cote coach (sur ClientDetailPage / ActionsTab) :
//   - Status VIP du client (niveau + remise + PV cumule)
//   - Champ saisie ID Herbalife client (21XY1234567)
//   - Champ "Parraine par" (autre client de la base)
//   - Vue arbre récursif des descendants (qui ce client a parraine)
//   - Liste des prospects renseignes par le client (form sandbox)
//
// 100 % var(--ls-*) — suit le toggle clair/dark.
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Client } from "../../types/domain";
import { ClientVipBadge } from "./ClientVipBadge";
import {
  getVipMeta,
  useClientVipIntentions,
  useClientVipStatus,
  useClientVipTree,
  type VipTreeNode,
} from "./useClientVip";

interface Props {
  client: Client;
}

const HERBALIFE_VIP_ID_REGEX = /^\d{2}[A-Z]{2}\d{7}$/;

export function ClientVipCoachPanel({ client }: Props) {
  const { clients } = useAppContext();
  const { push: pushToast } = useToast();
  const status = useClientVipStatus(client.id);
  const tree = useClientVipTree(client.id);
  const intentions = useClientVipIntentions(client.id);

  // ─── Edition ID Herbalife + sponsor ────────────────────────────────────────
  const [editingId, setEditingId] = useState(false);
  const [vipId, setVipId] = useState(
    (client as Client & { vipHerbalifeId?: string | null }).vipHerbalifeId ?? "",
  );
  const [editingSponsor, setEditingSponsor] = useState(false);
  const [sponsorId, setSponsorId] = useState(
    (client as Client & { vipSponsorClientId?: string | null }).vipSponsorClientId ?? "",
  );
  const [savingId, setSavingId] = useState(false);
  const [savingSponsor, setSavingSponsor] = useState(false);

  // Sponsor candidates : tous les autres clients du coach.
  const sponsorCandidates = useMemo(
    () => clients.filter((c) => c.id !== client.id),
    [clients, client.id],
  );

  async function saveVipId() {
    const trimmed = vipId.trim().toUpperCase();
    if (trimmed && !HERBALIFE_VIP_ID_REGEX.test(trimmed)) {
      pushToast({
        tone: "warning",
        title: "Format ID invalide",
        message: "Format attendu : 21XY1234567 (2 chiffres + 2 lettres + 7 chiffres)",
      });
      return;
    }
    setSavingId(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { error } = await sb
        .from("clients")
        .update({
          vip_herbalife_id: trimmed || null,
          vip_started_at: trimmed ? new Date().toISOString() : null,
        })
        .eq("id", client.id);
      if (error) throw error;
      pushToast({ tone: "success", title: "ID VIP enregistré" });
      setEditingId(false);
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Erreur",
        message: err instanceof Error ? err.message : "Impossible d'enregistrer",
      });
    } finally {
      setSavingId(false);
    }
  }

  async function saveSponsor() {
    setSavingSponsor(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { error } = await sb
        .from("clients")
        .update({ vip_sponsor_client_id: sponsorId || null })
        .eq("id", client.id);
      if (error) throw error;
      pushToast({ tone: "success", title: "Parrain mis à jour" });
      setEditingSponsor(false);
      // Reload status car l arbre a change
      void status.reload();
      void tree.reload();
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Erreur",
        message: err instanceof Error ? err.message : "Impossible d'enregistrer",
      });
    } finally {
      setSavingSponsor(false);
    }
  }

  const meta = status.data ? getVipMeta(status.data.level) : null;
  const ratio = useMemo(() => {
    if (!status.data) return 0;
    const range = status.data.next_threshold;
    if (range === 0) return 1;
    if (status.data.level === "ambassador") return 1;
    // A ce point level est garanti non-ambassador → on utilise pv_lifetime.
    return Math.min(1, status.data.pv_lifetime / range);
  }, [status.data]);

  return (
    <div
      className="at-card"
      style={{
        padding: 16,
        background: "var(--ls-surface)",
        borderRadius: 14,
        border: "0.5px solid var(--ls-border)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div className="at-label">⭐ Programme Client Privilégié</div>
        {status.data && status.data.level !== "none" ? (
          <ClientVipBadge level={status.data.level} size="full" showDiscount />
        ) : (
          <ClientVipBadge level="none" />
        )}
      </div>

      {/* Status + barre progression */}
      {status.loading && !status.data ? (
        <div style={{ fontSize: 12, color: "var(--ls-text-muted)", padding: "8px 0" }}>
          Chargement du statut VIP…
        </div>
      ) : status.data ? (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: "Syne, serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: meta?.color ?? "var(--ls-text)",
                }}
              >
                {status.data.pv_lifetime} PV
              </span>
              <span style={{ fontSize: 11, color: "var(--ls-text-muted)", marginLeft: 6 }}>
                cumul lifetime
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ls-text-muted)",
              }}
            >
              {status.data.descendants_count} filleul
              {status.data.descendants_count > 1 ? "s" : ""} ·{" "}
              {status.data.direct_referrals_count} directs
            </div>
          </div>
          <div
            style={{
              height: 8,
              background: "var(--ls-border)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round(ratio * 100)}%`,
                height: "100%",
                background:
                  status.data.level === "ambassador"
                    ? "linear-gradient(90deg, #7C3AED, #C084FC)"
                    : status.data.level === "gold"
                      ? "linear-gradient(90deg, #B8922A, #FFE873)"
                      : status.data.level === "silver"
                        ? "linear-gradient(90deg, #6B7280, #D1D5DB)"
                        : "linear-gradient(90deg, #B87333, #DA9E5C)",
                transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
          {status.data.level !== "ambassador" ? (
            <div
              style={{
                fontSize: 11,
                color: "var(--ls-text-muted)",
                marginTop: 5,
              }}
            >
              {status.data.level === "gold"
                ? `Ambassadeur : ${status.data.pv_3m} / 1 000 PV en 3 mois`
                : `Prochain palier : ${status.data.next_threshold - status.data.pv_lifetime} PV restants`}
            </div>
          ) : (
            <div
              style={{
                fontSize: 11,
                color: "var(--ls-purple)",
                marginTop: 5,
                fontWeight: 600,
              }}
            >
              💎 Niveau Ambassadeur (-42 %) — bravo !
            </div>
          )}
        </div>
      ) : null}

      {/* ID Herbalife VIP */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-text-hint)",
            marginBottom: 4,
          }}
        >
          ID client privilégié Herbalife
        </div>
        {editingId ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={vipId}
              onChange={(e) => setVipId(e.target.value.toUpperCase())}
              placeholder="21XY1234567"
              maxLength={11}
              style={{
                flex: 1,
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif",
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                color: "var(--ls-text)",
                outline: "none",
                letterSpacing: 1,
              }}
            />
            <button
              type="button"
              onClick={() => void saveVipId()}
              disabled={savingId}
              style={{
                padding: "8px 14px",
                background: "var(--ls-gold)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: savingId ? "wait" : "pointer",
              }}
            >
              {savingId ? "…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(false)}
              disabled={savingId}
              style={{
                padding: "8px 12px",
                background: "transparent",
                color: "var(--ls-text-muted)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                color: vipId ? "var(--ls-text)" : "var(--ls-text-hint)",
                letterSpacing: 1,
              }}
            >
              {vipId || "Non renseigné"}
            </span>
            <button
              type="button"
              onClick={() => setEditingId(true)}
              style={{
                padding: "4px 10px",
                background: "transparent",
                color: "var(--ls-gold)",
                border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {vipId ? "Modifier" : "Saisir"}
            </button>
          </div>
        )}
      </div>

      {/* Sponsor (parrainé par) */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-text-hint)",
            marginBottom: 4,
          }}
        >
          Parrainé par
        </div>
        {editingSponsor ? (
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={sponsorId}
              onChange={(e) => setSponsorId(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif",
                background: "var(--ls-surface2)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                color: "var(--ls-text)",
                outline: "none",
              }}
            >
              <option value="">— Personne (toi le coach) —</option>
              {sponsorCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void saveSponsor()}
              disabled={savingSponsor}
              style={{
                padding: "8px 14px",
                background: "var(--ls-gold)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: savingSponsor ? "wait" : "pointer",
              }}
            >
              {savingSponsor ? "…" : "OK"}
            </button>
            <button
              type="button"
              onClick={() => setEditingSponsor(false)}
              style={{
                padding: "8px 12px",
                background: "transparent",
                color: "var(--ls-text-muted)",
                border: "0.5px solid var(--ls-border)",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif",
                color: sponsorId ? "var(--ls-text)" : "var(--ls-text-hint)",
              }}
            >
              {sponsorId
                ? clients.find((c) => c.id === sponsorId)?.firstName +
                  " " +
                  clients.find((c) => c.id === sponsorId)?.lastName
                : "Personne (toi le coach directement)"}
            </span>
            <button
              type="button"
              onClick={() => setEditingSponsor(true)}
              style={{
                padding: "4px 10px",
                background: "transparent",
                color: "var(--ls-teal)",
                border: "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
                borderRadius: 7,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Modifier
            </button>
          </div>
        )}
      </div>

      {/* Arbre des filleuls */}
      {tree.data && tree.data.nodes.length > 1 ? (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-hint)",
              marginBottom: 8,
            }}
          >
            🌳 Arbre des filleuls ({tree.data.nodes.length - 1} descendants)
          </div>
          <ReferralTreeView nodes={tree.data.nodes} rootId={tree.data.root_client_id} />
        </div>
      ) : null}

      {/* Intentions / prospects renseignes par le client */}
      {intentions.data.length > 0 ? (
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-hint)",
              marginBottom: 8,
            }}
          >
            📋 Prospects renseignés par le client
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {intentions.data.map((it) => (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  background: "var(--ls-surface2)",
                  border: "0.5px solid var(--ls-border)",
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ls-text)",
                  }}
                >
                  {it.prospect_first_name}
                </span>
                {it.relationship ? (
                  <span style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
                    · {RELATION_LABELS[it.relationship] ?? it.relationship}
                  </span>
                ) : null}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: "2px 6px",
                    borderRadius: 5,
                    background:
                      it.status === "converted"
                        ? "color-mix(in srgb, var(--ls-teal) 18%, transparent)"
                        : it.status === "contacted"
                          ? "color-mix(in srgb, var(--ls-gold) 18%, transparent)"
                          : it.status === "lost"
                            ? "color-mix(in srgb, var(--ls-coral) 18%, transparent)"
                            : "rgba(0,0,0,0.05)",
                    color:
                      it.status === "converted"
                        ? "var(--ls-teal)"
                        : it.status === "contacted"
                          ? "var(--ls-gold)"
                          : it.status === "lost"
                            ? "var(--ls-coral)"
                            : "var(--ls-text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {STATUS_LABELS[it.status] ?? it.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const RELATION_LABELS: Record<string, string> = {
  family: "Famille",
  work: "Travail",
  sport: "Sport",
  friend: "Ami.e",
  other: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "À contacter",
  contacted: "Contacté",
  converted: "Converti ✓",
  lost: "Perdu",
};

// ─── Sous-composant : arbre récursif ────────────────────────────────────────

function ReferralTreeView({ nodes, rootId }: { nodes: VipTreeNode[]; rootId: string }) {
  // Build child map
  const childrenOf = useMemo(() => {
    const map = new Map<string, VipTreeNode[]>();
    nodes.forEach((n) => {
      const key = n.parent_id ?? "_root";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    });
    return map;
  }, [nodes]);

  function renderNode(nodeId: string, depth: number): React.ReactNode {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return null;
    const isRoot = nodeId === rootId;
    const children = childrenOf.get(nodeId) ?? [];

    return (
      <div key={nodeId} style={{ marginLeft: depth * 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            background: isRoot
              ? "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))"
              : "var(--ls-surface2)",
            border: isRoot
              ? "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)"
              : "0.5px solid var(--ls-border)",
            borderRadius: 8,
            marginBottom: 4,
          }}
        >
          {depth > 0 ? (
            <span
              style={{
                color: "var(--ls-text-hint)",
                fontSize: 11,
                marginLeft: -4,
              }}
            >
              ├
            </span>
          ) : null}
          <span style={{ fontSize: 13, fontWeight: isRoot ? 700 : 500, color: "var(--ls-text)" }}>
            {node.full_name}
          </span>
          {node.vip_status && node.vip_status !== "none" ? (
            <ClientVipBadge level={node.vip_status} />
          ) : null}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {node.pv_personal} PV
            {node.pv_personal_3m > 0 ? (
              <span style={{ color: "var(--ls-purple)", marginLeft: 4 }}>
                · {node.pv_personal_3m} sur 3m
              </span>
            ) : null}
          </span>
        </div>
        {children.map((c) => renderNode(c.id, depth + 1))}
      </div>
    );
  }

  return <div>{renderNode(rootId, 0)}</div>;
}
