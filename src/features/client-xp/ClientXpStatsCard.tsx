// =============================================================================
// ClientXpStatsCard — les XP d'une cliente, vus de la coach (fiche standard,
// onglet « Vue »). Réécrite le 24/09/2026 avec les jetons de la maison
// (`.jr[data-format="coach"]`, plus aucune couleur en dur) : niveau, barre,
// derniers gains, le geste « Donner des XP » et ses XP au bar.
//
// Source : RPC get_client_xp_stats(p_client_id) — admin OU référente.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { getXpAction, type ClientXpActionKey } from "./actions";
import { DonnerXpSheet } from "./DonnerXpSheet";
import { NiveauLigne } from "./XpNiveauxCarte";
import { XpBarCoach } from "./XpBarLigne";
import "../journal/journal.css";

interface RecentEvent {
  action_key: ClientXpActionKey;
  xp_amount: number;
  created_at: string;
}

interface XpStats {
  total_xp: number;
  level: number;
  prev_threshold: number;
  next_threshold: number;
  recent_events: RecentEvent[];
}

function ilYA(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const min = Math.floor((Date.now() - ts) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j === 1) return "hier";
  if (j < 7) return `il y a ${j} j`;
  const s = Math.floor(j / 7);
  if (s < 5) return `il y a ${s} sem.`;
  return `il y a ${Math.floor(j / 30)} mois`;
}

export function ClientXpStatsCard({ clientId, prenom }: { clientId: string; prenom?: string }) {
  const [stats, setStats] = useState<XpStats | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [donner, setDonner] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data, error } = await sb.rpc("get_client_xp_stats", { p_client_id: clientId });
      if (error) throw new Error(error.message);
      const p = (data ?? {}) as Partial<XpStats> & { error?: string };
      if (p.error) throw new Error(p.error);
      setStats({
        total_xp: p.total_xp ?? 0,
        level: p.level ?? 1,
        prev_threshold: p.prev_threshold ?? 0,
        next_threshold: p.next_threshold ?? 100,
        recent_events: p.recent_events ?? [],
      });
      setErreur(null);
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [clientId]);
  useEffect(() => { void charger(); }, [charger]);

  const qui = prenom?.trim() || "elle";
  const part = stats
    ? stats.next_threshold === stats.prev_threshold ? 1 : (stats.total_xp - stats.prev_threshold) / (stats.next_threshold - stats.prev_threshold)
    : 0;

  return (
    <div className="jr" data-format="coach">
      <section className="jr-card" aria-label="Ses XP">
        <div className="jr-row">
          <div className="jr-eye jr-grow">Sa régularité · XP</div>
          {stats ? <NiveauLigne total={stats.total_xp} niveau={stats.level} /> : null}
        </div>
        {erreur ? (
          <div className="jr-tiny">XP indisponibles ({erreur})</div>
        ) : !stats ? (
          <div className="jr-tiny">Ses XP arrivent…</div>
        ) : (
          <>
            <div className="jr-bar-jauge" aria-hidden="true"><i style={{ width: `${Math.max(2, Math.round(part * 100))}%` }} /></div>
            {stats.recent_events.length ? (
              <div style={{ marginTop: 8 }}>
                {stats.recent_events.slice(0, 5).map((ev, i) => {
                  const def = getXpAction(ev.action_key);
                  return (
                    <div key={`${ev.created_at}-${i}`} className="jr-xp-ligne">
                      <span><b>{def?.label ?? ev.action_key}</b><small>{ilYA(ev.created_at)}</small></span>
                      <span style={{ fontFamily: "var(--jr-fm)", fontWeight: 700, color: "var(--jr-acc-tx)" }}>+{ev.xp_amount}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="jr-tiny">Rien de gagné encore : son espace, son journal et ses visites au club lui donneront ses premiers XP.</div>
            )}
            <XpBarCoach clientId={clientId} format="coach" />
            <button type="button" className="jr-cta" style={{ marginTop: 10 }} onClick={() => setDonner(true)}>
              Donner des XP à {qui}
            </button>
            {info ? <div className="jr-tiny" style={{ textAlign: "center" }}>{info}</div> : null}
          </>
        )}
      </section>
      {donner ? (
        <DonnerXpSheet
          clientId={clientId}
          prenom={qui}
          total={stats?.total_xp ?? null}
          format="coach"
          onFermer={() => setDonner(false)}
          onDonne={(total, xp) => { setInfo(`+${xp} XP envoyés · ${qui} est à ${total} XP`); void charger(); }}
        />
      ) : null}
    </div>
  );
}
