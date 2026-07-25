// =============================================================================
// BbcBilan10 — le bilan des 10 visites (chantier BBC).
// Le rendez-vous charnière : à la 10ᵉ visite, 9 étapes dans l'ordre
// (module Formation 04). Coché = persisté dans club_bilans.steps ; quand tout
// est coché, completed_at est posé.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

export const BILAN10_STEPS: Array<{ key: string; label: string; hint: string }> = [
  { key: "scan", label: "Refaire le scan corporel", hint: "on compare avec le point de départ" },
  { key: "objectifs", label: "Objectifs + victoires hors balance", hint: "énergie, sommeil, vêtements — pas que le poids" },
  { key: "grand_pot", label: "Proposer le format économique", hint: "le grand pot : mieux pour lui, mieux pour toi" },
  { key: "carte", label: "Renouveler la carte de visites", hint: "10 ou 30 visites — on enchaîne, on ne s'arrête pas" },
  { key: "appel", label: "Inscrire à l'Appel Ambassadeur", hint: "on réserve le créneau MAINTENANT, pas « plus tard »" },
  { key: "ardoise", label: "Ardoise + vidéo témoignage", hint: "sa progression affichée au club" },
  { key: "reseaux", label: "Partager sur les réseaux", hint: "avant/après + ressenti, avec son accord" },
  { key: "google", label: "Demander un avis Google", hint: "le moment idéal : il est content de ses résultats" },
  { key: "recos", label: "Demander les recommandations", hint: "« qui connais-tu qui pourrait en bénéficier ? »" },
];

interface BbcBilan10Props {
  clientId: string;
  clientName: string;
  coachUserId: string;
  onClose: () => void;
  onDone?: () => void;
}

export function BbcBilan10({ clientId, clientName, coachUserId, onClose, onDone }: BbcBilan10Props) {
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  // Verrou : deux cases cochées coup sur coup ne doivent pas créer DEUX
  // lignes de bilan (la 2e écraserait la 1re et perdrait des étapes).
  // La ref est la source de vérité (lisible tout de suite, sans re-render).
  const rowIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<string | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  // Charge (ou prépare) le bilan en cours pour ce membre.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb
          .from("club_bilans")
          .select("id, steps, completed_at")
          .eq("client_id", clientId)
          .eq("coach_user_id", coachUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        const row = data as { id: string; steps: Record<string, boolean>; completed_at: string | null } | null;
        if (row) {
          rowIdRef.current = row.id;
          setSteps(row.steps ?? {});
          setCompletedAt(row.completed_at);
        }
      } catch {
        // silent-fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, coachUserId]);

  const persist = useCallback(
    async (next: Record<string, boolean>) => {
      const allDone = BILAN10_STEPS.every((s) => next[s.key]);
      const completed = allDone ? new Date().toISOString() : null;
      setCompletedAt(completed);
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;

        // 1) Une création déjà en vol ? On l'attend au lieu d'en lancer une 2e.
        if (!rowIdRef.current && creatingRef.current) {
          await creatingRef.current;
        }

        if (rowIdRef.current) {
          await sb.from("club_bilans").update({ steps: next, completed_at: completed }).eq("id", rowIdRef.current);
        } else {
          creatingRef.current = (async () => {
            const { data } = await sb
              .from("club_bilans")
              .insert({ client_id: clientId, coach_user_id: coachUserId, steps: next, completed_at: completed })
              .select("id")
              .maybeSingle();
            const id = data ? String((data as { id: string }).id) : null;
            if (id) rowIdRef.current = id;
            return id;
          })();
          await creatingRef.current;
          creatingRef.current = null;
        }
        if (allDone) onDone?.();
      } catch {
        creatingRef.current = null;
      }
    },
    [clientId, coachUserId, onDone],
  );

  function toggle(key: string) {
    const next = { ...steps, [key]: !steps[key] };
    setSteps(next);
    void persist(next);
  }

  const done = BILAN10_STEPS.filter((s) => steps[s.key]).length;
  const pct = Math.round((done / BILAN10_STEPS.length) * 100);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="bbc-mode" style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line2)", borderRadius: "24px 24px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-coral)", fontWeight: 700 }}>le rendez-vous charnière</div>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.1, marginTop: 3 }}>Bilan des 10 · {clientName}</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15, flex: "none" }}>✕</button>
        </div>

        {/* progression */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 16px" }}>
          <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--ls-bbc-s2)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: completedAt ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime)", transition: "width .25s" }} />
          </div>
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, fontWeight: 700, color: completedAt ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime-text)" }}>{done}/{BILAN10_STEPS.length}</span>
        </div>

        {completedAt ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(45,212,191,.12)", border: "1px solid rgba(45,212,191,.3)", marginBottom: 14 }}>
            <span aria-hidden="true">✅</span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Bilan terminé — {clientName} est prêt pour la suite.</span>
          </div>
        ) : null}

        {loading ? (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)", padding: "10px 0" }}>chargement…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {BILAN10_STEPS.map((s, i) => {
              const on = Boolean(steps[s.key]);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggle(s.key)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 13, background: on ? "rgba(197,248,42,.08)" : "var(--ls-bbc-s2)", border: `1px solid ${on ? "rgba(197,248,42,.32)" : "var(--ls-bbc-line)"}`, color: "var(--ls-bbc-text)" }}
                >
                  <span style={{ width: 26, height: 26, borderRadius: 999, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: on ? "var(--ls-bbc-lime)" : "transparent", border: `1px solid ${on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, color: on ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-hint)" }}>
                    {on ? "✓" : i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-text)" }}>{s.label}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 2, lineHeight: 1.45 }}>{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", textAlign: "center", marginTop: 14 }}>
          les 9 étapes · module Formation 04 · sauvegarde auto
        </div>
      </div>
    </div>
  );
}
