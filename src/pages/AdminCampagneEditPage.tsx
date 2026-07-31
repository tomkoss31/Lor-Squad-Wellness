// =============================================================================
// AdminCampagneEditPage — création / édition d'une campagne (étape 3).
// Route : /admin/campagnes/:id (admin only).
//
// Écrans 2 (choix du type) + 3 (import destinataires) de la maquette validée.
// L'éditeur de contenu (écran 4) et l'envoi (écran 5) sont des jalons des
// étapes suivantes — signalés « à venir » pour garder la page cohérente et
// testable dès maintenant.
//
// L'import est FONCTIONNEL : coller/CSV → parseRecipients (dédup + validation)
// → exclusion des désabonnés (email_suppressions, décision Thomas : liste
// globale) → écriture dans campaign_recipients + maj des compteurs.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { useToast } from "../context/ToastContext";
import { parseRecipients, type ParseResult } from "../lib/campaignRecipients";

type CampaignType = "rich" | "plain";
type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "archived";

interface Campaign {
  id: string;
  title: string;
  type: CampaignType;
  subject: string;
  audience_label: string;
  status: CampaignStatus;
  recipient_count: number;
}

function normEmail(s: string): string {
  return s.trim().toLowerCase();
}

export function AdminCampagneEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  // état import
  const [pasted, setPasted] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [suppressed, setSuppressed] = useState(0);
  const [finalCount, setFinalCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!id) return;
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from("campaigns")
        .select("id, title, type, subject, audience_label, status, recipient_count")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        push({ tone: "error", title: "Campagne introuvable", message: error?.message ?? "" });
        navigate("/admin/campagnes");
        return;
      }
      setCampaign(data as Campaign);
      setLoading(false);
    })();
  }, [id, navigate, push]);

  // Recalcule l'aperçu à chaque frappe (dédup + validation en pur), puis
  // interroge la liste de suppression pour exclure les désabonnés.
  useEffect(() => {
    const res = parseRecipients(pasted);
    setParsed(res);
    if (res.recipients.length === 0) {
      setSuppressed(0);
      setFinalCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      // Liste de suppression GLOBALE : on récupère les emails supprimés qui
      // apparaissent dans la liste collée, et on les exclut.
      const emails = res.recipients.map((r) => r.email);
      const { data } = await sb
        .from("email_suppressions")
        .select("email")
        .in("email", emails);
      if (cancelled) return;
      const supSet = new Set((data ?? []).map((r) => normEmail((r as { email: string }).email)));
      const supHit = res.recipients.filter((r) => supSet.has(normEmail(r.email))).length;
      setSuppressed(supHit);
      setFinalCount(res.recipients.length - supHit);
    })();
    return () => {
      cancelled = true;
    };
  }, [pasted]);

  async function chooseType(type: CampaignType) {
    if (!campaign) return;
    const sb = await getSupabaseClient();
    if (!sb) return;
    const { error } = await sb.from("campaigns").update({ type }).eq("id", campaign.id);
    if (error) {
      push({ tone: "error", title: "Erreur", message: error.message });
      return;
    }
    setCampaign({ ...campaign, type });
  }

  async function saveRecipients() {
    if (!campaign || !parsed || parsed.recipients.length === 0) return;
    setSaving(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setSaving(false);
      return;
    }
    // Re-exclure les désabonnés au moment de l'écriture (la liste a pu bouger).
    const emails = parsed.recipients.map((r) => r.email);
    const { data: sup } = await sb.from("email_suppressions").select("email").in("email", emails);
    const supSet = new Set((sup ?? []).map((r) => normEmail((r as { email: string }).email)));

    const toInsert = parsed.recipients
      .filter((r) => !supSet.has(normEmail(r.email)))
      .map((r) => ({
        campaign_id: campaign.id,
        email: r.email,
        first_name: r.firstName,
        source: "csv" as const,
      }));

    if (toInsert.length === 0) {
      push({ tone: "warning", title: "Rien à importer", message: "Tous les emails sont invalides ou désabonnés." });
      setSaving(false);
      return;
    }

    // upsert idempotent : ré-importer la même liste ne crée pas de doublon.
    const { error: insErr } = await sb
      .from("campaign_recipients")
      .upsert(toInsert, { onConflict: "campaign_id,email", ignoreDuplicates: true });
    if (insErr) {
      push({ tone: "error", title: "Import échoué", message: insErr.message });
      setSaving(false);
      return;
    }

    // Compte réel en base (source de vérité) + maj campagne.
    const { count } = await sb
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);
    const total = count ?? toInsert.length;
    const label = parsed.hasFirstName ? "Import CSV (avec prénoms)" : "Import CSV";
    await sb.from("campaigns").update({ recipient_count: total, audience_label: label }).eq("id", campaign.id);

    setCampaign({ ...campaign, recipient_count: total, audience_label: label });
    setPasted("");
    setParsed(null);
    push({ tone: "success", title: "Destinataires importés", message: `${total} contact${total > 1 ? "s" : ""} prêt${total > 1 ? "s" : ""}.` });
    setSaving(false);
  }

  const recap = useMemo(() => {
    if (!parsed) return null;
    return [
      { label: "Lignes importées", value: parsed.totalLines, tone: "" },
      { label: "Doublons retirés", value: -parsed.duplicates, tone: parsed.duplicates ? "warn" : "" },
      { label: "Emails invalides", value: -parsed.invalid, tone: parsed.invalid ? "warn" : "" },
      { label: "Déjà désabonnés (exclus)", value: -suppressed, tone: suppressed ? "warn" : "" },
      { label: "Destinataires finaux", value: finalCount, tone: "ok" },
    ];
  }, [parsed, suppressed, finalCount]);

  if (loading) return <div style={{ padding: 20, color: "var(--ls-text-muted)" }}>Chargement…</div>;
  if (!campaign) return null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "8px 4px 60px" }}>
      <style>{`
        .ce-back { background:none; border:0; color:var(--ls-text-muted); font:600 13px 'DM Sans'; cursor:pointer; padding:4px 0; margin-bottom:8px; }
        .ce-h1 { font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:28px; letter-spacing:.4px; margin:0 0 3px; color:var(--ls-text); }
        .ce-sub { color:var(--ls-text-muted); font-size:13px; margin:0 0 20px; }
        .ce-h2 { font-family:'Anton',sans-serif; font-weight:400; text-transform:uppercase; font-size:18px; letter-spacing:.3px; margin:0 0 12px; color:var(--ls-text); }
        .ce-typecard { display:flex; gap:13px; align-items:flex-start; background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:14px; padding:17px; margin-bottom:12px; cursor:pointer; text-align:left; width:100%; color:var(--ls-text); font-family:'DM Sans',sans-serif; }
        .ce-typecard:hover { border-color:var(--ls-border2); }
        .ce-typecard[data-on="1"] { border-color:var(--ls-teal); background:var(--ls-teal-bg); }
        .ce-ic { width:44px; height:44px; flex:0 0 auto; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px; }
        .ce-ic.a { background:var(--ls-purple-bg); } .ce-ic.b { background:var(--ls-teal-bg); }
        .ce-typecard h3 { margin:0 0 3px; font-size:16px; } .ce-typecard p { margin:0; color:var(--ls-text-muted); font-size:12.5px; line-height:1.5; }
        .ce-label { display:block; font:600 12px 'DM Sans'; color:var(--ls-text-muted); text-transform:uppercase; letter-spacing:.05em; margin-bottom:7px; }
        .ce-paste { width:100%; min-height:130px; background:var(--ls-input-bg); border:1px solid var(--ls-border2); border-radius:8px; color:var(--ls-text); padding:12px; font-family:'JetBrains Mono',monospace; font-size:12.5px; resize:vertical; }
        .ce-recap { background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:14px; padding:6px 15px; margin:16px 0; }
        .ce-line { display:flex; justify-content:space-between; padding:9px 0; font-size:13.5px; border-bottom:1px solid var(--ls-border); }
        .ce-line:last-child { border:0; } .ce-line b { font-family:'JetBrains Mono',monospace; }
        .ce-line b.ok { color:var(--ls-teal); } .ce-line b.warn { color:var(--ls-gold); }
        .ce-btn { display:flex; align-items:center; justify-content:center; gap:7px; width:100%; padding:14px; border-radius:14px; border:0; font:700 14.5px 'DM Sans'; cursor:pointer; background:var(--ls-teal); color:var(--ls-teal-contrast); }
        .ce-btn:disabled { opacity:.5; cursor:default; }
        .ce-map { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
        .ce-mchip { font:600 12px 'JetBrains Mono'; padding:6px 10px; border-radius:7px; background:var(--ls-surface2); border:1px solid var(--ls-border2); color:var(--ls-text); }
        .ce-mchip .a { color:var(--ls-teal); }
        .ce-stub { background:var(--ls-surface); border:1px dashed var(--ls-border2); border-radius:14px; padding:20px; text-align:center; color:var(--ls-text-muted); font-size:13.5px; margin-top:16px; line-height:1.5; }
        .ce-count { display:inline-flex; align-items:center; gap:6px; background:var(--ls-teal-bg); color:var(--ls-teal); font:700 13px 'DM Sans'; padding:8px 13px; border-radius:999px; margin-bottom:16px; }
      `}</style>

      <button type="button" className="ce-back" onClick={() => navigate("/admin/campagnes")}>
        ← Toutes les campagnes
      </button>
      <h1 className="ce-h1">{campaign.title || "Nouvelle campagne"}</h1>
      <p className="ce-sub">
        {campaign.recipient_count > 0
          ? `${campaign.recipient_count} destinataire${campaign.recipient_count > 1 ? "s" : ""} · ${campaign.audience_label}`
          : "Brouillon"}
      </p>

      {/* ── Écran 2 : choix du type ── */}
      <h2 className="ce-h2">Type de campagne</h2>
      <button
        type="button"
        className="ce-typecard a"
        data-on={campaign.type === "rich" ? "1" : "0"}
        onClick={() => chooseType("rich")}
      >
        <span className="ce-ic a">✨</span>
        <span>
          <h3>Riche brandée</h3>
          <p>Un beau mail structuré : couleurs, sections, visuels, bouton d'action. Pour une annonce ou une offre.</p>
        </span>
      </button>
      <button
        type="button"
        className="ce-typecard b"
        data-on={campaign.type === "plain" ? "1" : "0"}
        onClick={() => chooseType("plain")}
      >
        <span className="ce-ic b">✍️</span>
        <span>
          <h3>Texte personnel</h3>
          <p>Une lettre simple, ton direct, zéro fioriture. Pour relancer chaleureusement des leads froids.</p>
        </span>
      </button>

      {/* ── Écran 3 : import destinataires ── */}
      <h2 className="ce-h2" style={{ marginTop: 28 }}>Destinataires</h2>
      {campaign.recipient_count > 0 && (
        <div className="ce-count">✓ {campaign.recipient_count} déjà importé{campaign.recipient_count > 1 ? "s" : ""}</div>
      )}
      <label className="ce-label">Colle ta liste (une adresse par ligne, ou CSV email + prénom)</label>
      <textarea
        className="ce-paste"
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder={"email,prénom\nmarie.l@gmail.com,Marie\nkarim.b@outlook.fr,Karim"}
      />

      {parsed && parsed.hasFirstName && (
        <div className="ce-map">
          <span className="ce-mchip"><span className="a">email</span> → adresse</span>
          <span className="ce-mchip"><span className="a">prénom</span> → « Bonjour {"{prénom}"} »</span>
        </div>
      )}

      {recap && parsed && parsed.totalLines > 0 && (
        <div className="ce-recap">
          {recap.map((l) => (
            <div key={l.label} className="ce-line">
              <span>{l.label}</span>
              <b className={l.tone}>{l.value > 0 ? l.value : l.value}</b>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="ce-btn"
        disabled={saving || finalCount === 0}
        onClick={saveRecipients}
      >
        {saving ? "Import…" : finalCount > 0 ? `Enregistrer ${finalCount} destinataire${finalCount > 1 ? "s" : ""}` : "Colle une liste pour continuer"}
      </button>

      <p className="ce-sub" style={{ textAlign: "center", marginTop: 10, fontSize: 12 }}>
        Les désabonnés sont exclus automatiquement de toutes tes campagnes, pour toujours.
      </p>

      {/* ── Écrans 4-5 : jalons prochaines étapes ── */}
      <div className="ce-stub">
        ✏️ <b style={{ color: "var(--ls-text)" }}>Éditeur de contenu</b> et 📤 <b style={{ color: "var(--ls-text)" }}>envoi programmé</b>
        <br />arrivent aux étapes suivantes du chantier.
      </div>
    </div>
  );
}
