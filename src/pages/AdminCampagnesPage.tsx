// =============================================================================
// AdminCampagnesPage — liste des campagnes email (chantier Campagnes, étape 3).
// Route : /admin/campagnes (admin only, comme /admin/newsletters).
//
// Écran 1 de la maquette validée par Thomas (2026-07-31) : filtres par statut,
// bouton créer, une card par campagne avec ses stats (délivrés/ouverts/cliqués)
// affichées directement — pas besoin d'aller chez Resend.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { useToast } from "../context/ToastContext";
import { useAppContext } from "../context/AppContext";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "archived";
type CampaignType = "rich" | "plain";

interface CampaignRow {
  id: string;
  title: string;
  type: CampaignType;
  status: CampaignStatus;
  audience_label: string;
  recipient_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

type Filter = "all" | "draft" | "scheduled" | "sent";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Brouillon",
  scheduled: "Programmée",
  sending: "En envoi",
  sent: "Envoyée",
  archived: "Archivée",
};

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)} %`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function AdminCampagnesPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { currentUser } = useAppContext();

  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from("campaigns")
        .select(
          "id, title, type, status, audience_label, recipient_count, delivered_count, opened_count, clicked_count, scheduled_for, sent_at, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) push({ tone: "error", title: "Chargement impossible", message: error.message });
      setRows((data ?? []) as CampaignRow[]);
      setLoading(false);
    })();
  }, [push]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      draft: rows.filter((r) => r.status === "draft").length,
      scheduled: rows.filter((r) => r.status === "scheduled").length,
      sent: rows.filter((r) => r.status === "sent").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  async function createCampaign() {
    setCreating(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setCreating(false);
      return;
    }
    const { data, error } = await sb
      .from("campaigns")
      .insert({ title: "Sans titre", status: "draft", created_by_user_id: currentUser?.id ?? null })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) {
      push({ tone: "error", title: "Création impossible", message: error?.message ?? "" });
      return;
    }
    navigate(`/admin/campagnes/${(data as { id: string }).id}`);
  }

  async function deleteCampaign(id: string, title: string) {
    if (!window.confirm(`Supprimer « ${title || "Sans titre"} » ? Cette action est définitive.`)) return;
    const sb = await getSupabaseClient();
    if (!sb) return;
    // ON DELETE CASCADE retire aussi les destinataires. Réservé aux brouillons
    // (les campagnes envoyées gardent leurs stats — pas de bouton supprimer).
    const { error } = await sb.from("campaigns").delete().eq("id", id);
    if (error) {
      push({ tone: "error", title: "Suppression impossible", message: error.message });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    push({ tone: "success", title: "Brouillon supprimé", message: "" });
  }

  const FILTERS: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "Toutes", n: counts.all },
    { key: "draft", label: "Brouillons", n: counts.draft },
    { key: "scheduled", label: "Programmées", n: counts.scheduled },
    { key: "sent", label: "Envoyées", n: counts.sent },
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
      <style>{`
        .cmp-h1 { font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:30px; letter-spacing:.5px; margin:2px 0 3px; color:var(--ls-text); }
        .cmp-sub { color:var(--ls-text-muted); font-size:13.5px; margin:0 0 18px; line-height:1.5; }
        .cmp-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:14px; border-radius:14px; border:0; font:700 14.5px 'DM Sans'; cursor:pointer; background:var(--ls-teal); color:var(--ls-teal-contrast); margin-bottom:16px; }
        .cmp-btn:disabled { opacity:.6; cursor:default; }
        .cmp-filters { display:flex; gap:6px; overflow-x:auto; margin-bottom:14px; }
        .cmp-fchip { white-space:nowrap; font:600 12px 'DM Sans'; padding:7px 12px; border-radius:999px; border:1px solid var(--ls-border); background:var(--ls-surface); color:var(--ls-text-muted); cursor:pointer; }
        .cmp-fchip[data-on="1"] { background:var(--ls-surface2); color:var(--ls-text); border-color:var(--ls-border2); }
        .cmp-fchip b { color:var(--ls-teal); margin-left:3px; }
        .cmp-card { display:block; width:100%; text-align:left; background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:14px; padding:15px; margin-bottom:11px; cursor:pointer; color:var(--ls-text); font-family:'DM Sans',sans-serif; }
        .cmp-card:hover { border-color:var(--ls-border2); }
        .cmp-top { display:flex; align-items:center; gap:9px; margin-bottom:9px; }
        .cmp-tag { font:700 10px 'DM Sans'; letter-spacing:.05em; text-transform:uppercase; padding:3px 8px; border-radius:6px; }
        .cmp-tag.rich { background:var(--ls-purple-bg); color:var(--ls-purple); }
        .cmp-tag.plain { background:var(--ls-teal-bg); color:var(--ls-teal); }
        .cmp-st { margin-left:auto; font:600 11px 'DM Sans'; padding:3px 9px; border-radius:999px; }
        .cmp-st.draft { background:rgba(122,128,153,.14); color:var(--ls-text-muted); }
        .cmp-st.scheduled, .cmp-st.sending { background:var(--ls-teal-bg); color:var(--ls-teal); }
        .cmp-st.sent, .cmp-st.archived { background:var(--ls-teal-bg); color:var(--ls-teal); }
        .cmp-card h3 { font-size:15.5px; font-weight:700; margin:0 0 3px; color:var(--ls-text); }
        .cmp-meta { color:var(--ls-text-muted); font-size:12.5px; margin:0; }
        .cmp-stats { display:flex; gap:18px; margin-top:12px; padding-top:12px; border-top:1px solid var(--ls-border); }
        .cmp-stat .n { font-family:'JetBrains Mono',monospace; font-size:17px; font-weight:700; color:var(--ls-text); }
        .cmp-stat .n.g { color:var(--ls-teal); } .cmp-stat .n.o { color:var(--ls-teal); }
        .cmp-stat .l { font-size:10.5px; color:var(--ls-text-muted); text-transform:uppercase; letter-spacing:.04em; margin-top:1px; }
        .cmp-empty { text-align:center; color:var(--ls-text-muted); font-size:14px; padding:40px 16px; border:1px dashed var(--ls-border2); border-radius:16px; }
        .cmp-del { background:none; border:0; font-size:14px; cursor:pointer; opacity:.5; padding:2px 4px; border-radius:6px; line-height:1; }
        .cmp-del:hover { opacity:1; background:var(--ls-coral-bg); }
      `}</style>

      <h1 className="cmp-h1">Campagnes</h1>
      <p className="cmp-sub">
        Tes envois email — relances, annonces, offres. Ouvertures et clics suivis ici, pas besoin d'aller chez Resend.
      </p>

      <button type="button" className="cmp-btn" onClick={createCampaign} disabled={creating}>
        ＋ Nouvelle campagne
      </button>

      <div className="cmp-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className="cmp-fchip"
            data-on={filter === f.key ? "1" : "0"}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <b>{f.n}</b>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="cmp-sub">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="cmp-empty">
          {rows.length === 0
            ? "Aucune campagne pour l'instant. Crée la première ci-dessus."
            : "Aucune campagne dans ce filtre."}
        </div>
      ) : (
        filtered.map((r) => {
          const dateInfo =
            r.status === "sent" && r.sent_at
              ? `le ${fmtDate(r.sent_at)}`
              : r.status === "scheduled" && r.scheduled_for
                ? `départ le ${fmtDate(r.scheduled_for)}`
                : `créée le ${fmtDate(r.created_at)}`;
          return (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              className="cmp-card"
              onClick={() => navigate(`/admin/campagnes/${r.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(`/admin/campagnes/${r.id}`);
              }}
            >
              <div className="cmp-top">
                <span className={`cmp-tag ${r.type}`}>{r.type === "rich" ? "Riche" : "Texte"}</span>
                <span className={`cmp-st ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                {r.status === "draft" && (
                  <button
                    type="button"
                    className="cmp-del"
                    aria-label="Supprimer le brouillon"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteCampaign(r.id, r.title);
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
              <h3>{r.title || "Sans titre"}</h3>
              <p className="cmp-meta">
                {r.recipient_count > 0 ? `${r.recipient_count} destinataire${r.recipient_count > 1 ? "s" : ""}` : "Aucun destinataire"}
                {r.audience_label ? ` · ${r.audience_label}` : ""} · {dateInfo}
              </p>
              {r.status === "sent" && (
                <div className="cmp-stats">
                  <div className="cmp-stat">
                    <div className="n">{r.delivered_count}</div>
                    <div className="l">Délivrés</div>
                  </div>
                  <div className="cmp-stat">
                    <div className="n g">{r.opened_count}</div>
                    <div className="l">Ouverts {pct(r.opened_count, r.delivered_count)}</div>
                  </div>
                  <div className="cmp-stat">
                    <div className="n o">{r.clicked_count}</div>
                    <div className="l">Cliqués {pct(r.clicked_count, r.delivered_count)}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
