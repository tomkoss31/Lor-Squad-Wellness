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
import { PUBLIC_TOKENS, PUBLIC_FONTS } from "../../styles/public-tokens";

export interface CoachCredibility {
  user_id: string;
  first_name: string | null;
  name: string | null;
  rank: string;
  rank_label: string;
  city: string | null;
  coaching_since: string | null;
  tenure_months: number | null;
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
  /** Masque le badge rang Herbalife (ex: fiche publique distri où le rang
   *  interne ne parle pas aux prospects). Défaut false. */
  hideRank?: boolean;
}

function formatTenure(months: number): string {
  if (months < 12) {
    return `${months} mois d'expérience`;
  }
  const years = Math.floor(months / 12);
  return `${years} an${years > 1 ? "s" : ""} d'expérience`;
}

export function CoachCredibilityBadges({
  coachSlug,
  coachUserId,
  variant = "welcome",
  preloaded,
  onResolved,
  hideRank = false,
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

  const items: Array<{ icon: string; label: string; key: string }> = [];
  if (!hideRank) {
    items.push({ icon: "🏆", label: data.rank_label, key: "rank" });
  }
  if (data.city && data.city.trim().length > 0) {
    items.push({ icon: "📍", label: data.city.trim(), key: "city" });
  }
  if (typeof data.tenure_months === "number" && data.tenure_months >= 1) {
    items.push({ icon: "🗓", label: formatTenure(data.tenure_months), key: "tenure" });
  }
  // Si plus rien à afficher (rang masqué + ni ville ni ancienneté) → rien.
  if (items.length === 0) return null;

  if (variant === "newsletter") {
    return (
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14,
        fontFamily: PUBLIC_FONTS.body, fontSize: 12,
        color: "var(--cream-muted)",
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
        display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12,
        margin: "0 auto", maxWidth: items.length >= 3 ? 520 : items.length * 170,
      }}>
        {items.map((it) => (
          <div key={it.key} style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 14,
            border: "1px solid var(--hair)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "16px 12px", textAlign: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.20)",
          }}>
            <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 8 }} aria-hidden="true">{it.icon}</div>
            <div style={{
              fontFamily: PUBLIC_FONTS.display, fontSize: 14, fontWeight: 600,
              color: "var(--cream)", lineHeight: 1.25,
            }}>{it.label}</div>
          </div>
        ))}
      </div>
    );
  }

  // welcome (default) : chips horizontales glassmorphism dark
  return (
    <div className="ps-fade-in" style={{
      display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8,
      marginBottom: 24,
    }}>
      {items.map((it) => (
        <span key={it.key} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--hair)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: 999,
          fontFamily: PUBLIC_FONTS.body, fontSize: 12, fontWeight: 500,
          color: "var(--cream)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
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
            height: 76, background: "rgba(255,255,255,0.04)", borderRadius: 14,
            opacity: 0.4,
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
          background: "rgba(255,255,255,0.04)", borderRadius: 999,
          opacity: 0.4,
        }} />
      ))}
    </div>
  );
}
// PUBLIC_TOKENS imported pour le typage des accents (utilise indirectement via var(--cream)).
void PUBLIC_TOKENS;
