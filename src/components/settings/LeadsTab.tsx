// Chantier Admin Leads (2026-04-24).
// Onglet admin /parametres?tab=leads : consulte les prospects qui ont
// rempli le formulaire Welcome → table avec filtres status + action
// WhatsApp + marquer contacté/converti/perdu.

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useToast } from "../../context/ToastContext";

type LeadStatus = "new" | "contacted" | "converted" | "lost";

interface Lead {
  id: string;
  first_name: string;
  phone: string;
  city: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  contacted_at: string | null;
  assigned_to_user_id: string | null;
}

const STATUS_META: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new: { label: "Nouveau", color: "#BA7517", bg: "rgba(239,159,39,0.12)" },
  contacted: { label: "Contacté", color: "#0F6E56", bg: "rgba(29,158,117,0.14)" },
  converted: { label: "Converti", color: "#1D9E75", bg: "rgba(29,158,117,0.18)" },
  lost: { label: "Perdu", color: "#8B1F1F", bg: "rgba(226,75,74,0.1)" },
};

function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / (60 * 1000));
    if (mins < 1) return "à l'instant";
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function buildWhatsAppUrl(phone: string, firstName: string): string {
  const digits = phone.replace(/\D/g, "");
  const msg = `Salut ${firstName} ! Je te recontacte suite à ta demande sur Lor'Squad Wellness 💪`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function LeadsTab() {
  const { push: pushToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error } = await sb
        .from("prospect_leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads((data ?? []) as Lead[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Chargement leads", message: msg });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: LeadStatus) {
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const patch: Record<string, unknown> = { status };
      if (status === "contacted" || status === "converted") {
        patch.contacted_at = new Date().toISOString();
      }
      const { error } = await sb.from("prospect_leads").update(patch).eq("id", id);
      if (error) throw error;
      pushToast({ tone: "success", title: `Marqué ${STATUS_META[status].label.toLowerCase()}` });
      void load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      pushToast({ tone: "error", title: "Mise à jour impossible", message: msg });
    }
  }

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.first_name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.city ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts: Record<LeadStatus | "all", number> = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ls-text)" }}>
            🔥 Prospects entrants
          </h3>
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
            {leads.length} lead{leads.length > 1 ? "s" : ""} au total
          </span>
        </div>

        {/* Filtres pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {(["all", "new", "contacted", "converted", "lost"] as const).map((f) => {
            const isActive = filter === f;
            const count = counts[f];
            const label = f === "all" ? "Tous" : STATUS_META[f as LeadStatus].label;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${isActive ? "#EF9F27" : "var(--ls-border)"}`,
                  background: isActive ? "rgba(239,159,39,0.1)" : "transparent",
                  color: isActive ? "#BA7517" : "var(--ls-text-muted)",
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label} · {count}
              </button>
            );
          })}
        </div>

        {/* Recherche */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un prénom, téléphone, ville..."
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            color: "var(--ls-text)",
            fontSize: 13,
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 14,
            boxSizing: "border-box",
          }}
        />

        {/* Liste */}
        {loading ? (
          <div style={{ fontSize: 13, color: "var(--ls-text-muted)", textAlign: "center", padding: 30 }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ls-text-muted)", textAlign: "center", padding: 30 }}>
            {leads.length === 0
              ? "Aucun lead reçu pour le moment. Le formulaire Welcome enverra les prochains ici."
              : "Aucun lead ne correspond aux filtres."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((lead) => {
              const meta = STATUS_META[lead.status];
              return (
                <div
                  key={lead.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--ls-surface2)",
                    border: "1px solid var(--ls-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", fontFamily: "Syne, sans-serif" }}>
                      {lead.first_name}
                    </span>
                    {lead.city ? (
                      <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>· {lead.city}</span>
                    ) : null}
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 600,
                        background: meta.bg,
                        color: meta.color,
                        marginLeft: "auto",
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
                    📞 {lead.phone} · Reçu {formatRelative(lead.created_at)}
                    {lead.source ? ` · Source : ${lead.source}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <a
                      href={buildWhatsAppUrl(lead.phone, lead.first_name)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "#25D366",
                        color: "#FFFFFF",
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      📱 WhatsApp
                    </a>
                    {lead.status !== "contacted" && lead.status !== "converted" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "contacted")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "1px solid rgba(29,158,117,0.35)",
                          color: "#0F6E56",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        ✓ Contacté
                      </button>
                    ) : null}
                    {lead.status !== "converted" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "converted")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "1px solid rgba(239,159,39,0.35)",
                          color: "#BA7517",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        🎉 Converti
                      </button>
                    ) : null}
                    {lead.status !== "lost" && lead.status !== "converted" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(lead.id, "lost")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: "transparent",
                          border: "1px solid var(--ls-border)",
                          color: "var(--ls-text-muted)",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        ✕ Perdu
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
