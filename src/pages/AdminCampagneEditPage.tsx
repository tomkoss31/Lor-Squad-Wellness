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
import {
  type CampaignRichContent,
  defaultRichContent,
  normalizeRichContent,
} from "../lib/campaignContent";
import { CampaignEditor } from "../components/campagnes/CampaignEditor";

type CampaignType = "rich" | "plain" | "html";
type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "archived";

interface Campaign {
  id: string;
  title: string;
  type: CampaignType;
  subject: string;
  body_json: unknown;
  body_text: string;
  body_html: string;
  audience_label: string;
  status: CampaignStatus;
  recipient_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
}

interface RecipStat {
  id: string;
  email: string;
  first_name: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  unsubscribed_at: string | null;
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

  // état contenu (éditeur)
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [rich, setRich] = useState<CampaignRichContent>(defaultRichContent());
  const [plainText, setPlainText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [savingContent, setSavingContent] = useState(false);

  // état envoi
  const [dryRun, setDryRun] = useState<{ count: number; subject: string } | null>(null);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState("");

  // stats (campagne envoyée)
  const [recipStats, setRecipStats] = useState<RecipStat[]>([]);

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
        .select("id, title, type, subject, body_json, body_text, body_html, audience_label, status, recipient_count, delivered_count, opened_count, clicked_count, bounced_count, unsubscribed_count")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        push({ tone: "error", title: "Campagne introuvable", message: error?.message ?? "" });
        navigate("/admin/campagnes");
        return;
      }
      const c = data as Campaign;
      setCampaign(c);
      setTitle(c.title === "Sans titre" ? "" : c.title);
      setSubject(c.subject ?? "");
      setRich(normalizeRichContent(c.body_json));
      setPlainText(c.body_text ?? "");
      setBodyHtml(c.body_html ?? "");
      setLoading(false);

      // Stats : si la campagne est partie, on charge le détail par destinataire.
      if (c.status === "sent") {
        const { data: recs } = await sb
          .from("campaign_recipients")
          .select("id, email, first_name, opened_at, clicked_at, bounced_at, unsubscribed_at")
          .eq("campaign_id", c.id)
          .order("clicked_at", { ascending: false, nullsFirst: false })
          .limit(500);
        setRecipStats((recs ?? []) as RecipStat[]);
      }
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

  async function saveContent() {
    if (!campaign) return;
    setSavingContent(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setSavingContent(false);
      return;
    }
    const { error } = await sb
      .from("campaigns")
      .update({
        title: title.trim() || "Sans titre",
        subject: subject.trim(),
        body_json: rich,
        body_text: plainText,
        body_html: bodyHtml,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);
    setSavingContent(false);
    if (error) {
      push({ tone: "error", title: "Enregistrement échoué", message: error.message });
      return;
    }
    setCampaign({ ...campaign, title: title.trim() || "Sans titre", subject });
    push({ tone: "success", title: "Contenu enregistré", message: "" });
  }

  // supabase-js met le corps de l'erreur dans error.context (Response) sur un
  // non-2xx — sans ça, on n'a que « Edge Function returned a non-2xx… ».
  async function edgeErrorMessage(error: unknown, data: unknown): Promise<string> {
    const fromData = (data as { message?: string })?.message;
    if (fromData) return fromData;
    try {
      const ctx = (error as { context?: { json?: () => Promise<unknown> } })?.context;
      const body = ctx?.json ? ((await ctx.json()) as { message?: string; error?: string }) : null;
      if (body?.message) return body.message;
      if (body?.error) return body.error;
    } catch {
      /* corps non JSON */
    }
    return (error as { message?: string })?.message ?? "";
  }

  async function testDryRun() {
    if (!campaign) return;
    const sb = await getSupabaseClient();
    if (!sb) return;
    const { data, error } = await sb.functions.invoke("campaign-send", {
      body: { campaign_id: campaign.id, mode: "dry-run" },
    });
    if (error || !data?.ok) {
      const msg = await edgeErrorMessage(error, data);
      push({ tone: "error", title: "Test impossible", message: msg || "Vérifie le contenu et les destinataires." });
      return;
    }
    setDryRun({ count: (data as { would_send: number }).would_send, subject: (data as { subject: string }).subject });
  }

  async function doSend() {
    if (!campaign) return;
    if (when === "schedule" && !scheduleAt) {
      push({ tone: "warning", title: "Choisis une date", message: "" });
      return;
    }
    setSending(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setSending(false);
      return;
    }
    const scheduledAt = when === "schedule" ? new Date(scheduleAt).toISOString() : undefined;
    let totalSent = 0;
    let totalFailed = 0;
    // Boucle résumable : l'edge traite un lot puis renvoie `remaining`.
    for (let guard = 0; guard < 50; guard++) {
      const { data, error } = await sb.functions.invoke("campaign-send", {
        body: { campaign_id: campaign.id, mode: "send", scheduledAt },
      });
      if (error || !data?.ok) {
        push({ tone: "error", title: "Envoi interrompu", message: await edgeErrorMessage(error, data) });
        setSending(false);
        return;
      }
      const d = data as { sent: number; failed: number; remaining: number };
      totalSent += d.sent;
      totalFailed += d.failed;
      setSendProgress(`${totalSent} envoyé${totalSent > 1 ? "s" : ""}…${d.remaining > 0 ? ` (${d.remaining} restant)` : ""}`);
      if (d.remaining <= 0) break;
    }
    setSending(false);
    setSendProgress("");
    push({
      tone: "success",
      title: scheduledAt ? "Campagne programmée" : "Campagne envoyée",
      message: `${totalSent} destinataire${totalSent > 1 ? "s" : ""}${totalFailed ? ` · ${totalFailed} en échec` : ""}.`,
    });
    setCampaign({ ...campaign, status: "sent" });
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
        .ce-line b.ok { color:var(--ls-teal); } .ce-line b.warn { color:var(--ls-coral); }
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
      <button
        type="button"
        className="ce-typecard b"
        data-on={campaign.type === "html" ? "1" : "0"}
        onClick={() => chooseType("html")}
      >
        <span className="ce-ic b">🎨</span>
        <span>
          <h3>Gabarit HTML</h3>
          <p>Ton propre design, collé tel quel (ex. identité Breakfast Club). Le lien de désinscription reste ajouté automatiquement.</p>
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

      {/* ── Écran 4 : éditeur de contenu + aperçu ── */}
      <h2 className="ce-h2" style={{ marginTop: 28 }}>Contenu</h2>
      <label className="ce-label">Nom de la campagne (visible par toi seul)</label>
      <input
        className="ce-paste"
        style={{ minHeight: 0, fontFamily: "'DM Sans',sans-serif", fontSize: 14, marginBottom: 16 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Lancement BBC — offre découverte"
      />
      <CampaignEditor
        type={campaign.type}
        subject={subject}
        onSubject={setSubject}
        rich={rich}
        onRich={setRich}
        plainText={plainText}
        html={bodyHtml}
        onHtml={setBodyHtml}
        onPlain={setPlainText}
        onSave={saveContent}
        saving={savingContent}
      />

      {/* ── Écran 5 : envoi ── */}
      <h2 className="ce-h2" style={{ marginTop: 28 }}>{campaign.status === "sent" ? "Résultats" : "Envoi"}</h2>
      {campaign.status === "sent" ? (
        (() => {
          const deliv = campaign.delivered_count || 0;
          const pctOf = (n: number) => (deliv ? `${Math.round((n / deliv) * 100)} %` : "—");
          const label = (r: RecipStat): { t: string; c: string } =>
            r.unsubscribed_at ? { t: "Désabonné", c: "u" }
            : r.bounced_at ? { t: "Bounce", c: "b" }
            : r.clicked_at ? { t: "Cliqué", c: "c" }
            : r.opened_at ? { t: "Ouvert", c: "o" }
            : { t: "Pas ouvert", c: "d" };
          return (
            <>
              <style>{`
                .cs-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
                .cs-kpi { background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:14px; padding:14px; }
                .cs-kpi .n { font-family:'JetBrains Mono',monospace; font-size:24px; font-weight:700; color:var(--ls-text); }
                .cs-kpi .l { font-size:11.5px; color:var(--ls-text-muted); margin-top:2px; }
                .cs-kpi.t .n { color:var(--ls-teal); } .cs-kpi.g .n { color:var(--ls-teal); } .cs-kpi.c .n { color:var(--ls-coral); }
                .cs-list { background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:14px; overflow:hidden; }
                .cs-row { display:flex; align-items:center; gap:10px; padding:11px 14px; border-bottom:1px solid var(--ls-border); font-size:13px; }
                .cs-row:last-child { border:0; } .cs-row .em { margin-left:auto; font-size:11px; padding:3px 8px; border-radius:999px; white-space:nowrap; }
                .cs-row .em.c { background:var(--ls-teal-bg); color:var(--ls-teal); } .cs-row .em.o { background:var(--ls-teal-bg); color:var(--ls-teal); }
                .cs-row .em.u,.cs-row .em.b { background:var(--ls-coral-bg); color:var(--ls-coral); } .cs-row .em.d { background:rgba(122,128,153,.14); color:var(--ls-text-muted); }
                .cs-row .nm { font-weight:600; } .cs-row .ml { color:var(--ls-text-hint); font-family:'JetBrains Mono',monospace; font-size:11.5px; overflow:hidden; text-overflow:ellipsis; }
              `}</style>
              <div className="cs-grid">
                <div className="cs-kpi"><div className="n">{deliv}</div><div className="l">Délivrés{campaign.bounced_count ? ` · ${campaign.bounced_count} bounces` : ""}</div></div>
                <div className="cs-kpi t"><div className="n">{campaign.opened_count || 0}</div><div className="l">Ouverts {pctOf(campaign.opened_count || 0)}</div></div>
                <div className="cs-kpi g"><div className="n">{campaign.clicked_count || 0}</div><div className="l">Cliqués {pctOf(campaign.clicked_count || 0)}</div></div>
                <div className="cs-kpi c"><div className="n">{campaign.unsubscribed_count || 0}</div><div className="l">Désabonnés</div></div>
              </div>
              <h2 className="ce-h2" style={{ fontSize: 16 }}>Qui a réagi</h2>
              {recipStats.length === 0 ? (
                <p className="ce-sub">Les réactions apparaîtront ici au fil des ouvertures.</p>
              ) : (
                <div className="cs-list">
                  {recipStats.slice(0, 100).map((r) => {
                    const l = label(r);
                    return (
                      <div key={r.id} className="cs-row">
                        <span className="nm">{r.first_name || r.email.split("@")[0]}</span>
                        <span className="ml">{r.email}</span>
                        <span className={`em ${l.c}`}>{l.t}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="ce-sub" style={{ marginTop: 12, fontSize: 12 }}>
                Les stats s'actualisent à chaque ouverture (webhook Resend). Recharge la page pour les derniers chiffres.
              </p>
            </>
          );
        })()
      ) : (
        <>
          <button type="button" className="ce-btn" style={{ background: "var(--ls-surface2)", color: "var(--ls-text)", border: "1px solid var(--ls-border2)" }} onClick={testDryRun}>
            🧪 Tester (sans rien envoyer)
          </button>
          {dryRun && (
            <div className="ce-recap" style={{ marginTop: 12 }}>
              <div className="ce-line"><span>Prêt à partir</span><b className="ok">{dryRun.count}</b></div>
              <div className="ce-line"><span>Objet</span><b style={{ fontFamily: "'DM Sans',sans-serif" }}>{dryRun.subject}</b></div>
            </div>
          )}

          <label className="ce-label" style={{ marginTop: 16 }}>Quand ?</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" className="ce-tab-btn" data-on={when === "now" ? "1" : "0"} onClick={() => setWhen("now")}>Maintenant</button>
            <button type="button" className="ce-tab-btn" data-on={when === "schedule" ? "1" : "0"} onClick={() => setWhen("schedule")}>Programmer</button>
          </div>
          {when === "schedule" && (
            <input type="datetime-local" className="ce-paste" style={{ minHeight: 0, fontFamily: "'JetBrains Mono',monospace", marginBottom: 12 }} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          )}

          <button type="button" className="ce-btn" disabled={sending || !dryRun || dryRun.count === 0} onClick={doSend}>
            {sending ? sendProgress || "Envoi…" : when === "schedule" ? `Programmer l'envoi` : `Envoyer maintenant`}
          </button>
          <p className="ce-sub" style={{ textAlign: "center", marginTop: 8, fontSize: 12 }}>
            {dryRun ? "Chaque mail porte un lien de désabonnement. Les désabonnés sont re-exclus à l'envoi." : "Lance d'abord un test pour débloquer l'envoi."}
          </p>
        </>
      )}
      <style>{`
        .ce-tab-btn { flex:1; text-align:center; font:700 12.5px 'DM Sans'; padding:11px; border-radius:8px; border:1px solid var(--ls-border); background:var(--ls-surface); color:var(--ls-text-muted); cursor:pointer; }
        .ce-tab-btn[data-on="1"] { background:var(--ls-surface2); color:var(--ls-text); border-color:var(--ls-border2); }
      `}</style>
    </div>
  );
}
