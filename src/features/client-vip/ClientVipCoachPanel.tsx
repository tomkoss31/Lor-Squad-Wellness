// =============================================================================
// ClientVipCoachPanel — bloc coach sur la fiche client (Tier B Premium VIP)
// =============================================================================
//
// Affiche cote coach (sur ClientDetailPage / ActionsTab) :
//   - Status VIP du client (niveau + remise + PV cumule)
//   - Champ saisie ID Herbalife client (21XY123456 — 2 chiffres + 2 lettres + 6 chiffres)
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
import { VipProgramHelpModal } from "./VipProgramHelpModal";
import {
  getVipMeta,
  updateIntentionStatus,
  useClientVipIntentions,
  useClientVipStatus,
  useClientVipTree,
  type VipIntention,
  type VipTreeNode,
} from "./useClientVip";

interface Props {
  client: Client;
}

// Format ID VIP client Herbalife : 2 chiffres + 2 lettres + 6 chiffres
// (10 caracteres total, ex: 21XY010361). Different du format distri qui est
// 2 chiffres + 1 lettre + 7 chiffres (ex: 21Y0103610).
const HERBALIFE_VIP_ID_REGEX = /^\d{2}[A-Z]{2}\d{6}$/;

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

  // ─── Edition ajustement PV manuel (2026-04-29) ────────────────────────────
  // Permet de saisir le cumul PV historique recupere depuis myherbalife.com.
  const [editingPv, setEditingPv] = useState(false);
  const [pvAdjustment, setPvAdjustment] = useState<string>("");
  const [savingPv, setSavingPv] = useState(false);

  // ─── Modale doc VIP (2026-04-29) ──────────────────────────────────────────
  const [helpOpen, setHelpOpen] = useState(false);

  // ─── Activation manuelle VIP (2026-04-29) ─────────────────────────────────
  const [togglingActivation, setTogglingActivation] = useState(false);
  const vipActive = Boolean(
    (client as Client & { vipStartedAt?: string | null }).vipStartedAt,
  );

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
        message: "Format attendu : 21XY010361 (2 chiffres + 2 lettres + 6 chiffres)",
      });
      return;
    }
    setSavingId(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      // Decouplage activation VIP / ID Herbalife (2026-04-29) : ne plus
      // toucher a vip_started_at automatiquement. Le coach active le
      // programme via le bouton dedie "Activer le programme VIP".
      const { error } = await sb
        .from("clients")
        .update({
          vip_herbalife_id: trimmed || null,
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

  async function toggleVipActivation() {
    if (togglingActivation) return;
    setTogglingActivation(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const newValue = vipActive ? null : new Date().toISOString();
      const { error } = await sb
        .from("clients")
        .update({ vip_started_at: newValue })
        .eq("id", client.id);
      if (error) throw error;
      pushToast({
        tone: "success",
        title: vipActive
          ? "Programme VIP désactivé"
          : "🎉 Programme VIP activé",
        message: vipActive
          ? "Les PV ne comptent plus pour le palier VIP."
          : `Les PV à partir d'aujourd'hui compteront pour ${client.firstName}.`,
      });
      void status.reload();
      // Le client n'est pas refresh dans clients[] tant que AppContext
      // ne fait pas un refetch. En pratique c'est rapide via realtime.
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Erreur",
        message: err instanceof Error ? err.message : "Impossible d'activer/désactiver",
      });
    } finally {
      setTogglingActivation(false);
    }
  }

  async function savePvAdjustment() {
    const value = Number(pvAdjustment);
    if (Number.isNaN(value) || value < 0) {
      pushToast({
        tone: "warning",
        title: "Valeur invalide",
        message: "Saisis un nombre positif (ex: 1250).",
      });
      return;
    }
    setSavingPv(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { data, error } = await sb.rpc("set_client_vip_pv_adjustment", {
        p_client_id: client.id,
        p_adjustment: value,
      });
      if (error) throw error;
      const payload = (data ?? {}) as { error?: string };
      if (payload.error) throw new Error(payload.error);
      pushToast({
        tone: "success",
        title: "Cumul PV ajusté",
        message: `${value} PV enregistrés (cumul historique).`,
      });
      setEditingPv(false);
      void status.reload();
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Erreur",
        message: err instanceof Error ? err.message : "Impossible d'enregistrer",
      });
    } finally {
      setSavingPv(false);
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
    <>
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="at-label">⭐ Programme Client Privilégié</div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Comment ça marche"
            title="Comment ça marche"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "0.5px solid var(--ls-border)",
              background: "var(--ls-surface2)",
              color: "var(--ls-teal)",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            ?
          </button>
        </div>
        {status.data && status.data.level !== "none" ? (
          <ClientVipBadge level={status.data.level} size="full" showDiscount />
        ) : (
          <ClientVipBadge level="none" />
        )}
      </div>

      {/* Toggle activation manuelle (2026-04-29) — seulement visible quand
          inactif. Une fois actif, on affiche un petit chip "Programme actif
          depuis le X" + bouton discret pour desactiver (en bas du panel). */}
      {!vipActive ? (
        <div
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, var(--ls-border))",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 14,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 100,
              height: 100,
              background: "radial-gradient(circle, rgba(184,146,42,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-gold)",
                marginBottom: 6,
              }}
            >
              ⭐ Programme VIP non activé
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--ls-text-muted)",
                lineHeight: 1.5,
                margin: "0 0 12px",
              }}
            >
              Tant que tu n&apos;as pas activé manuellement, les commandes
              n&apos;incrementent pas le compteur VIP. Active le programme une
              fois que <strong>{client.firstName}</strong> a payé son pack
              avantage et est inscrit sur myherbalife.com.
            </p>
            <button
              type="button"
              onClick={() => void toggleVipActivation()}
              disabled={togglingActivation}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: togglingActivation ? "wait" : "pointer",
                boxShadow: "0 4px 14px rgba(186,117,23,0.35)",
                opacity: togglingActivation ? 0.7 : 1,
              }}
            >
              {togglingActivation ? "Activation…" : "🚀 Activer le programme VIP"}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 12px",
            background: "color-mix(in srgb, var(--ls-teal) 8%, transparent)",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
            borderRadius: 10,
            marginBottom: 14,
            fontSize: 11,
            color: "var(--ls-teal)",
          }}
        >
          <span>
            ✓ Programme actif depuis le{" "}
            <strong>
              {(() => {
                const d = (client as Client & { vipStartedAt?: string | null }).vipStartedAt;
                if (!d) return "—";
                return new Date(d).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
              })()}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Désactiver le programme VIP ? Les PV ne compteront plus pour le palier.")) {
                void toggleVipActivation();
              }
            }}
            disabled={togglingActivation}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ls-text-hint)",
              fontSize: 10,
              cursor: "pointer",
              textDecoration: "underline",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Désactiver
          </button>
        </div>
      )}

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
              placeholder="21XY010361"
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

      {/* Ajustement manuel PV lifetime (2026-04-29) */}
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
          Cumul PV historique (myherbalife)
        </div>
        {editingPv ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              min={0}
              step={1}
              value={pvAdjustment}
              onChange={(e) => setPvAdjustment(e.target.value)}
              placeholder="Ex: 1250"
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
            />
            <button
              type="button"
              onClick={() => void savePvAdjustment()}
              disabled={savingPv}
              style={{
                padding: "8px 14px",
                background: "var(--ls-gold)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: savingPv ? "wait" : "pointer",
              }}
            >
              {savingPv ? "…" : "OK"}
            </button>
            <button
              type="button"
              onClick={() => setEditingPv(false)}
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif",
                color: "var(--ls-text)",
              }}
            >
              {status.data?.pv_manual_adjustment
                ? `${status.data.pv_manual_adjustment} PV ajustés`
                : "Aucun ajustement (cumul = somme des commandes en base)"}
            </span>
            <button
              type="button"
              onClick={() => {
                setPvAdjustment(
                  String(
                    status.data?.pv_manual_adjustment ??
                      0,
                  ),
                );
                setEditingPv(true);
              }}
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
            <a
              href="https://www.myherbalife.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 11,
                color: "var(--ls-text-muted)",
                textDecoration: "underline",
              }}
            >
              Vérifier sur myherbalife
            </a>
          </div>
        )}
        <p
          style={{
            fontSize: 10,
            color: "var(--ls-text-muted)",
            marginTop: 4,
            fontStyle: "italic",
          }}
        >
          Pour migrer un client VIP existant : récupère son cumul PV sur
          myherbalife.com et saisis-le ici. S'ajoute au cumul calculé en base.
        </p>
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
              <IntentionRow key={it.id} intention={it} onChanged={() => void intentions.reload()} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
    {helpOpen ? <VipProgramHelpModal onClose={() => setHelpOpen(false)} /> : null}
    </>
  );
}

// ─── Sous-composant : ligne d intention avec boutons status (V2) ────────────

function IntentionRow({
  intention,
  onChanged,
}: {
  intention: VipIntention;
  onChanged: () => void;
}) {
  const { push: pushToast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [showActions, setShowActions] = useState(false);

  async function changeStatus(newStatus: VipIntention["status"]) {
    if (updating) return;
    setUpdating(true);
    try {
      const result = await updateIntentionStatus(intention.id, newStatus);
      if (result.success) {
        pushToast({
          tone: "success",
          title: "Statut mis à jour",
          message: `${intention.prospect_first_name} → ${STATUS_LABELS[newStatus]}`,
        });
        onChanged();
        setShowActions(false);
      } else {
        pushToast({
          tone: "error",
          title: "Erreur",
          message: result.error ?? "Mise à jour impossible",
        });
      }
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ls-text)" }}>
          {intention.prospect_first_name}
        </span>
        {intention.relationship ? (
          <span style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
            · {RELATION_LABELS[intention.relationship] ?? intention.relationship}
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
              intention.status === "converted"
                ? "color-mix(in srgb, var(--ls-teal) 18%, transparent)"
                : intention.status === "contacted"
                  ? "color-mix(in srgb, var(--ls-gold) 18%, transparent)"
                  : intention.status === "lost"
                    ? "color-mix(in srgb, var(--ls-coral) 18%, transparent)"
                    : "rgba(0,0,0,0.05)",
            color:
              intention.status === "converted"
                ? "var(--ls-teal)"
                : intention.status === "contacted"
                  ? "var(--ls-gold)"
                  : intention.status === "lost"
                    ? "var(--ls-coral)"
                    : "var(--ls-text-muted)",
            textTransform: "uppercase",
          }}
        >
          {STATUS_LABELS[intention.status] ?? intention.status}
        </span>
        <button
          type="button"
          onClick={() => setShowActions((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-hint)",
            fontSize: 11,
            cursor: "pointer",
            padding: 2,
            flexShrink: 0,
          }}
        >
          {showActions ? "▲" : "▼"}
        </button>
      </div>
      {showActions ? (
        <div
          style={{
            display: "flex",
            gap: 5,
            padding: "0 10px 8px",
            flexWrap: "wrap",
          }}
        >
          {intention.notes ? (
            <div
              style={{
                width: "100%",
                fontSize: 11,
                color: "var(--ls-text-muted)",
                fontStyle: "italic",
                marginBottom: 5,
              }}
            >
              💬 {intention.notes}
            </div>
          ) : null}
          {(["pending", "contacted", "converted", "lost"] as const).map((st) => {
            const isCurrent = intention.status === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => void changeStatus(st)}
                disabled={updating || isCurrent}
                style={{
                  padding: "4px 9px",
                  background: isCurrent
                    ? "var(--ls-surface)"
                    : "transparent",
                  border: "0.5px solid var(--ls-border)",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  color: isCurrent ? "var(--ls-text-hint)" : "var(--ls-text)",
                  cursor: isCurrent || updating ? "not-allowed" : "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {STATUS_LABELS[st]}
              </button>
            );
          })}
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
