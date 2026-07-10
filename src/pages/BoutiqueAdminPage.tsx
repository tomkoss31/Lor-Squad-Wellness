// =============================================================================
// BoutiqueAdminPage — Cockpit « Ma boutique HL SKIN » (hub Mon business).
// Route : /ma-boutique (authentifié, dans AppLayout).
//
// La distri configure et pilote SA boutique : activation, nom, slug, vidéo hero,
// téléphone ; crée SES codes promo ; voit ses stats (visites/commandes/inscrits),
// ses commandes récentes ; (admin) installe les photos produits.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getSupabaseClient } from "../services/supabaseClient";
import { formatEuro } from "../lib/format";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const card: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ls-text-muted)",
  marginBottom: 6,
  fontFamily: "DM Sans, sans-serif",
};
const input: React.CSSProperties = {
  width: "100%",
  background: "var(--ls-surface-2, var(--ls-bg))",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
  padding: "11px 13px",
  color: "var(--ls-text)",
  fontSize: 14,
  fontFamily: "DM Sans, sans-serif",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--ls-teal)",
  color: "#04120f",
  border: "none",
  borderRadius: 10,
  padding: "11px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "Syne, sans-serif",
};
const cardTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: "var(--ls-text)",
  marginBottom: 14,
};

type PromoCode = {
  id: string;
  code: string;
  kind: string;
  value: number;
  active: boolean;
  used_count: number;
};
type Order = {
  id: string;
  customer_first_name: string | null;
  total_cents: number;
  status: string;
  created_at: string;
};
type ShopProductRow = { id: string; name: string; slug: string; images: { url: string }[] };

export function BoutiqueAdminPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const uid = currentUser?.id;
  const isAdmin = currentUser?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config boutique
  const [active, setActive] = useState(false);
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // Données
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [leadsCount, setLeadsCount] = useState(0);
  const [visits, setVisits] = useState<{ total: number; today: number }>({ total: 0, today: 0 });
  const [products, setProducts] = useState<ShopProductRow[]>([]);

  // Création code promo
  const [newCode, setNewCode] = useState("");
  const [newPct, setNewPct] = useState("10");

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const boutiqueUrl = slug ? `${origin}/boutique/${slug}` : "";

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const [u, pc, ord, leads, vis, prods] = await Promise.all([
        sb
          .from("users")
          .select("shop_name, boutique_slug, boutique_active, shop_contact_phone, boutique_hero_video_url")
          .eq("id", uid)
          .maybeSingle(),
        sb.from("promo_codes").select("id, code, kind, value, active, used_count").eq("coach_user_id", uid).order("created_at"),
        sb
          .from("shop_orders")
          .select("id, customer_first_name, total_cents, status, created_at")
          .eq("coach_user_id", uid)
          .order("created_at", { ascending: false })
          .limit(20),
        sb.from("shop_leads").select("id", { count: "exact", head: true }).eq("coach_user_id", uid),
        sb.from("shop_visit_daily").select("day, count").eq("coach_user_id", uid),
        isAdmin ? sb.from("shop_products").select("id, name, slug, images").order("sort_order") : Promise.resolve({ data: [] }),
      ]);
      if (u.data) {
        setActive(!!u.data.boutique_active);
        setShopName(u.data.shop_name ?? "");
        setSlug(u.data.boutique_slug ?? normalizeSlug(currentUser?.name?.split(" ")[0] ?? ""));
        setPhone(u.data.shop_contact_phone ?? "");
        setVideoUrl(u.data.boutique_hero_video_url ?? "");
      }
      setPromos((pc.data as PromoCode[]) ?? []);
      setOrders((ord.data as Order[]) ?? []);
      setLeadsCount(leads.count ?? 0);
      const visRows = (vis.data as { day: string; count: number }[]) ?? [];
      const todayIso = new Date().toISOString().slice(0, 10);
      setVisits({
        total: visRows.reduce((s, r) => s + r.count, 0),
        today: visRows.find((r) => r.day === todayIso)?.count ?? 0,
      });
      setProducts((prods.data as ShopProductRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [uid, isAdmin, currentUser?.name]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveConfig() {
    if (!uid) return;
    const cleanSlug = normalizeSlug(slug);
    if (active && cleanSlug.length < 2) {
      pushToast({ tone: "error", title: "Slug trop court", message: "Choisis un lien d'au moins 2 caractères." });
      return;
    }
    setSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb
        .from("users")
        .update({
          shop_name: shopName.trim() || null,
          boutique_slug: cleanSlug || null,
          boutique_active: active,
          shop_contact_phone: phone.trim() || null,
          boutique_hero_video_url: videoUrl.trim() || null,
        })
        .eq("id", uid);
      if (error) {
        if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
          throw new Error("Ce lien de boutique est déjà pris, choisis-en un autre.");
        }
        throw new Error(error.message);
      }
      setSlug(cleanSlug);
      pushToast({ tone: "success", title: "Boutique enregistrée", message: active ? "Ta boutique est en ligne ✨" : "Modifications sauvegardées." });
    } catch (e) {
      pushToast({ tone: "error", title: "Échec", message: e instanceof Error ? e.message : "Réessaie." });
    } finally {
      setSaving(false);
    }
  }

  async function createPromo() {
    if (!uid) return;
    const code = normalizeSlug(newCode).toUpperCase();
    const pct = Number(newPct);
    if (code.length < 3) {
      pushToast({ tone: "error", title: "Code trop court", message: "Au moins 3 caractères (ex. WELCOME5)." });
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 90) {
      pushToast({ tone: "error", title: "Pourcentage invalide", message: "Entre 1 et 90 %." });
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { error } = await sb.from("promo_codes").insert({ coach_user_id: uid, code, kind: "percent", value: pct });
      if (error) {
        throw new Error(/duplicate|unique/i.test(error.message) ? "Tu as déjà un code avec ce nom." : error.message);
      }
      setNewCode("");
      setNewPct("10");
      pushToast({ tone: "success", title: "Code créé", message: `${code} · −${pct} %` });
      load();
    } catch (e) {
      pushToast({ tone: "error", title: "Échec", message: e instanceof Error ? e.message : "Réessaie." });
    }
  }

  async function togglePromo(p: PromoCode) {
    const sb = await getSupabaseClient();
    if (!sb) return;
    await sb.from("promo_codes").update({ active: !p.active }).eq("id", p.id);
    setPromos((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
  }

  async function uploadPhoto(product: ShopProductRow, file: File) {
    const sb = await getSupabaseClient();
    if (!sb) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${product.slug}/packshot.${ext}`;
    const { error: upErr } = await sb.storage.from("product-images").upload(path, file, { upsert: true });
    if (upErr) {
      pushToast({ tone: "error", title: "Upload échoué", message: upErr.message });
      return;
    }
    const { data: pub } = sb.storage.from("product-images").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    const { error: updErr } = await sb.from("shop_products").update({ images: [{ url, kind: "packshot" }] }).eq("id", product.id);
    if (updErr) {
      pushToast({ tone: "error", title: "Échec", message: updErr.message });
      return;
    }
    setProducts((prev) => prev.map((x) => (x.id === product.id ? { ...x, images: [{ url }] } : x)));
    pushToast({ tone: "success", title: "Photo installée", message: product.name });
  }

  const paidRevenue = useMemo(
    () => orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total_cents, 0) / 100,
    [orders],
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: 40, color: "var(--ls-text-muted)" }}>
        Chargement de ta boutique…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 4px 60px" }}>
      <button
        type="button"
        onClick={() => navigate("/outils")}
        style={{ background: "none", border: "none", color: "var(--ls-text-muted)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 14 }}
      >
        ← Mon business
      </button>

      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--ls-teal)" }}>
        E-commerce
      </div>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: "clamp(26px,5vw,32px)", letterSpacing: "-0.5px", margin: "8px 0 4px", color: "var(--ls-text)" }}>
        🌿 Ma boutique HL Skin
      </h1>
      <p style={{ color: "var(--ls-text-muted)", fontSize: 14, marginBottom: 22, fontFamily: "DM Sans, sans-serif", maxWidth: 560 }}>
        Ta boutique de cosmétiques coréens, à ton nom. Configure-la, partage ton lien, encaisse sur ton Stripe.
      </p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { k: "Visites (total)", v: visits.total },
          { k: "Visites aujourd'hui", v: visits.today },
          { k: "Commandes", v: orders.length },
          { k: "Inscrits", v: leadsCount },
          { k: "CA encaissé", v: formatEuro(paidRevenue) },
        ].map((s) => (
          <div key={s.k} style={{ ...card, marginBottom: 0, padding: 14 }}>
            <div style={{ fontFamily: "Anton, sans-serif", fontSize: 24, color: "var(--ls-text)" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* Config */}
      <div style={card}>
        <div style={cardTitle}>Ma vitrine</div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 14, color: "var(--ls-text)", fontWeight: 600 }}>Boutique en ligne (visible publiquement)</span>
        </label>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nom de ma boutique</label>
          <input style={input} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Beauté K Skin" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Lien de ma boutique</label>
          <input style={input} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="prenom" />
          {boutiqueUrl && <div style={{ fontSize: 12, color: "var(--ls-teal)", marginTop: 5 }}>{boutiqueUrl}</div>}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Vidéo hero (URL YouTube ou MP4) — optionnel</label>
          <input style={input} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/…" />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={label}>Téléphone de contact — optionnel</label>
          <input style={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btnPrimary} onClick={saveConfig} disabled={saving}>
            {saving ? "…" : "Enregistrer"}
          </button>
          {boutiqueUrl && (
            <button
              style={{ ...btnPrimary, background: "transparent", color: "var(--ls-text)", border: "0.5px solid var(--ls-border)" }}
              onClick={() => {
                navigator.clipboard?.writeText(boutiqueUrl);
                pushToast({ tone: "success", title: "Lien copié", message: boutiqueUrl });
              }}
            >
              Copier le lien
            </button>
          )}
          <button
            style={{ ...btnPrimary, background: "transparent", color: "var(--ls-text)", border: "0.5px solid var(--ls-border)" }}
            onClick={() => navigate("/encaissement")}
          >
            Connecter Stripe →
          </button>
        </div>
      </div>

      {/* Codes promo */}
      <div style={card}>
        <div style={cardTitle}>Mes codes promo</div>
        {promos.length === 0 && <div style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 12 }}>Aucun code pour l'instant.</div>}
        {promos.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "0.5px solid var(--ls-border)" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "var(--ls-text)", letterSpacing: 1 }}>{p.code}</span>{" "}
              <span style={{ color: "var(--ls-teal)", fontSize: 13 }}>−{p.value}%</span>
              <span style={{ fontSize: 11, color: "var(--ls-text-muted)", marginLeft: 8 }}>{p.used_count} util.</span>
            </div>
            <button
              onClick={() => togglePromo(p)}
              style={{ background: "none", border: "0.5px solid var(--ls-border)", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: p.active ? "var(--ls-teal)" : "var(--ls-text-muted)" }}
            >
              {p.active ? "Actif" : "Inactif"}
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <input style={{ ...input, flex: 2, minWidth: 140 }} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Nom du code (ex. ETE10)" />
          <input style={{ ...input, width: 90 }} value={newPct} onChange={(e) => setNewPct(e.target.value)} placeholder="%" type="number" />
          <button style={btnPrimary} onClick={createPromo}>Créer</button>
        </div>
      </div>

      {/* Commandes */}
      <div style={card}>
        <div style={cardTitle}>Commandes récentes</div>
        {orders.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>Aucune commande pour l'instant.</div>
        ) : (
          orders.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "0.5px solid var(--ls-border)", fontSize: 13 }}>
              <span style={{ color: "var(--ls-text)" }}>{o.customer_first_name || "Cliente"}</span>
              <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ color: o.status === "paid" ? "var(--ls-teal)" : "var(--ls-text-muted)", fontSize: 11, textTransform: "uppercase" }}>{o.status === "paid" ? "payé" : "en attente"}</span>
                <span style={{ fontWeight: 700, color: "var(--ls-text)" }}>{formatEuro(o.total_cents / 100)}</span>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Photos produits (admin) */}
      {isAdmin && (
        <div style={card}>
          <div style={cardTitle}>Photos produits (admin)</div>
          <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginBottom: 12 }}>
            Installe la photo de chaque produit. Elle s'affiche pour toutes les boutiques.
          </p>
          {products.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "0.5px solid var(--ls-border)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: "var(--ls-bg)", flex: "none", display: "grid", placeItems: "center" }}>
                {p.images?.[0]?.url ? <img src={p.images[0].url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🧴"}
              </div>
              <span style={{ flex: 1, fontSize: 13, color: "var(--ls-text)" }}>{p.name}</span>
              <label style={{ ...btnPrimary, background: "transparent", color: "var(--ls-text)", border: "0.5px solid var(--ls-border)", cursor: "pointer", padding: "7px 12px", fontSize: 12 }}>
                {p.images?.[0]?.url ? "Remplacer" : "Ajouter"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && uploadPhoto(p, e.target.files[0])}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
