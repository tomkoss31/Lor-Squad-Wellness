// Chantier #3 étape 3.6 — Lien rapide Co-pilote "Prospecter maintenant".
// Petit widget gold/teal qui invite à lancer une session prospection,
// affiche les stats 7j si dispo.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { fetchProspectionStats, type ProspectionStats } from "../../hooks/useProspectionData";

export function ProspectionShortcut() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const [stats, setStats] = useState<ProspectionStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser?.id) return;
      const s = await fetchProspectionStats(currentUser.id);
      if (!cancelled) setStats(s);
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  if (!currentUser) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/prospection")}
      style={{
        width: "100%",
        background: "linear-gradient(135deg, rgba(45,212,191,0.10) 0%, rgba(201,168,76,0.10) 100%)",
        border: "1.5px solid rgba(201,168,76,0.35)",
        borderRadius: 16,
        padding: "16px 18px",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        color: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 4px 14px rgba(11,13,17,0.06)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(11,13,17,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(11,13,17,0.06)";
      }}
    >
      <span style={{
        flexShrink: 0,
        width: 46, height: 46, borderRadius: 12,
        background: "linear-gradient(135deg, var(--ls-gold, #C9A84C), #E5C97D)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24,
        boxShadow: "0 4px 12px rgba(201,168,76,0.35)",
      }} aria-hidden="true">
        🌍
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Syne', serif",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--ls-charcoal, var(--ls-text))",
          marginBottom: 2,
        }}>
          Prospecter maintenant
        </div>
        <div style={{
          fontSize: 12.5,
          color: "var(--ls-text-muted)",
          lineHeight: 1.45,
        }}>
          {stats && stats.total_7d > 0
            ? <>📊 <strong>{stats.total_7d}</strong> envois cette semaine · <strong>{stats.conversions_7d}</strong> conversion{stats.conversions_7d > 1 ? "s" : ""}</>
            : "Module 6 étapes : marché → profil → brief → cibler → messages → relance."}
        </div>
      </div>
      <span style={{
        flexShrink: 0,
        fontSize: 18,
        color: "var(--ls-gold, #C9A84C)",
        fontFamily: "'Syne', serif",
        fontWeight: 700,
      }}>
        →
      </span>
    </button>
  );
}
