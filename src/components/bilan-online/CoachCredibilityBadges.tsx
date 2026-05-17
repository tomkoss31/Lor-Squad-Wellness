// =============================================================================
// CoachCredibilityBadges — Chantier #10 (2026-05-17)
//
// Affiche 3 badges crédibilité coach (rang Herbalife + nb bilans réalisés
// + ancienneté) sur les pages publiques de conversion. 3 variants visuels :
//   - "welcome"    : sous la coach-card de BilanOnlineWelcomePage (chip pills)
//   - "business"   : page /business (grid 3 colonnes, plus généreux)
//   - "newsletter" : footer newsletter publique (ligne compacte serif)
//
// La source de données est la RPC `get_coach_credibility(_by_slug)`
// (migration 20261112000000_coach_credibility.sql). Échec silencieux : si
// la RPC renvoie null ou plante (réseau, slug bidon), le composant ne rend
// rien — la page reste utilisable.
//
// Avis ⭐ : volontairement out of scope V1. Sera branché quand le chantier
// #11 (témoignages clients) livrera la donnée. Voir BRAINSTORM Égypte § #11.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { BO } from "./BilanOnlineShell";

export interface CoachCredibility {
  user_id: string;
  first_name: string | null;
  name: string | null;
  rank: string;
  rank_label: string;
  bilans_count: number;
  tenure_months: number;
}

type Variant = "welcome" | "business" | "newsletter";

interface Props {
  coachSlug?: string | null;
  coachUserId?: string | null;
  variant?: Variant;
  /** Données préchargées (optionnel) — évite un fetch supplémentaire. */
  preloaded?: CoachCredibility | null;
  /** Notif au parent : on a résolu le coach (utile pour afficher le nom officiel). */
  onResolved?: (data: CoachCredibility | null) => void;
}

function formatTenure(months: number): string {
  if (months < 12) {
    return `${months} mois d'expérience`;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) {
    return `${years} an${years > 1 ? "s" : ""} d'expérience`;
  }
  return `${years} an${years > 1 ? "s" : ""} d'expérience`;
}

export function CoachCredibilityBadges({
  coachSlug,
  coachUserId,
  variant = "welcome",
  preloaded,
  onResolved,
}: Props) {
  const [data, setData] = useState<CoachCredibility | null>(preloaded ?? null);
  const [loading, setLoading] = useState<boolean>(!preloaded && !!(coachSlug || coachUserId));

  useEffect(() => {
    if (preloaded) {
      setData(preloaded);
      setLoading(false);
      return;
    }
    if (!coachSlug && !coachUserId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) { setData(null); setLoading(false); }
          return;
        }
        const { data: rpc, error } = coachUserId
          ? await sb.rpc("get_coach_credibility", { p_user_id: coachUserId })
          : await sb.rpc("get_coach_credibility_by_slug", { p_slug: coachSlug });
        if (cancelled) return;
        if (error || !rpc) {
          setData(null);
        } else {
          const parsed = rpc as CoachCredibility;
          setData(parsed);
          onResolved?.(parsed);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // onResolved is callback-stable enough (called once per resolve)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachSlug, coachUserId, preloaded]);

  if (loading) {
    return <BadgesSkeleton variant={variant} />;
  }
  if (!data) return null;

  const items = [
    { icon: "🏆", label: data.rank_label, key: "rank" },
    { icon: "📋", label: `${data.bilans_count} bilan${data.bilans_count > 1 ? "s" : ""} réalisé${data.bilans_count > 1 ? "s" : ""}`, key: "bilans" },
    { icon: "🗓", label: formatTenure(data.tenure_months), key: "tenure" },
  ];

  if (variant === "newsletter") {
    return (
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14,
        fontFamily: BO.fontBody, fontSize: 12, color: BO.textMuted,
        lineHeight: 1.4,
      }}>
        {items.map((it, i) => (
          <span key={it.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden="true">{it.icon}</span>{it.label}
            {i < items.length - 1 && (
              <span style={{ marginLeft: 14, opacity: 0.4 }} aria-hidden="true">·</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  if (variant === "business") {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
        margin: "0 auto", maxWidth: 520,
      }}>
        {items.map((it) => (
          <div key={it.key} style={{
            background: "white", borderRadius: 14,
            border: `1px solid ${BO.border}`,
            padding: "16px 12px", textAlign: "center",
            boxShadow: "0 2px 10px rgba(11,13,17,0.04)",
          }}>
            <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 8 }} aria-hidden="true">{it.icon}</div>
            <div style={{
              fontFamily: BO.fontDisplay, fontSize: 14, fontWeight: 700,
              color: BO.text, lineHeight: 1.25,
            }}>{it.label}</div>
          </div>
        ))}
      </div>
    );
  }

  // welcome (default) : chips horizontales discrètes, alignées sur coach-card
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8,
      marginBottom: 24,
      animation: "bo-fadeIn 0.4s ease-out 0.1s both",
    }}>
      {items.map((it) => (
        <span key={it.key} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 12px",
          background: "white",
          border: `1px solid ${BO.border}`,
          borderRadius: 999,
          fontFamily: BO.fontBody, fontSize: 12, fontWeight: 600,
          color: BO.text,
          boxShadow: "0 2px 8px rgba(11, 13, 17, 0.04)",
        }}>
          <span aria-hidden="true" style={{ fontSize: 13 }}>{it.icon}</span>
          {it.label}
        </span>
      ))}
    </div>
  );
}

function BadgesSkeleton({ variant }: { variant: Variant }) {
  const count = 3;
  if (variant === "business") {
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
        margin: "0 auto", maxWidth: 520,
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{
            height: 76, background: BO.surface2, borderRadius: 14,
            opacity: 0.5,
          }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8,
      marginBottom: 24,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          width: 110, height: 28,
          background: BO.surface2, borderRadius: 999,
          opacity: 0.5,
        }} />
      ))}
    </div>
  );
}
