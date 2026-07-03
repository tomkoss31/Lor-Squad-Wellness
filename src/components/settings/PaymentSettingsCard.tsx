// =============================================================================
// PaymentSettingsCard — encaissement direct du coach (Phase 2 Résultat Bilan,
// 2026-06-11).
//
// Chaque coach configure SON fournisseur de paiement (décision Thomas :
// « Square pour ma part, on verra pour les distris si Stripe ou autre »).
// Quand c'est actif, le bouton « Je démarre » de la page /resultat-bilan
// envoie le prospect directement à la caisse (lien Square généré serveur).
// Sans config : flow actuel (« ton coach t'envoie le lien »). Rien ne casse.
//
// Les credentials vivent dans coach_payment_settings — RLS : chaque coach ne
// lit/écrit QUE sa ligne. Les edges (create-payment-link / square-payment-
// webhook) lisent en service_role.
// =============================================================================

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import { FormField } from "../ui/FormField";

interface SettingsRow {
  provider: "square" | "stripe";
  active: boolean;
  stripe_secret_key: string;
  square_access_token: string;
  square_location_id: string;
  square_merchant_id: string;
  square_webhook_signature_key: string;
  square_env: "sandbox" | "production";
}

// Stripe par défaut : c'est la voie « la plus simple » pour un distri (créer son
// compte + coller une clé). Square reste dispo pour ceux qui ont déjà un compte.
const EMPTY: SettingsRow = {
  provider: "stripe",
  active: false,
  stripe_secret_key: "",
  square_access_token: "",
  square_location_id: "",
  square_merchant_id: "",
  square_webhook_signature_key: "",
  square_env: "production",
};

const WEBHOOK_PATH = "/functions/v1/square-payment-webhook";

export function PaymentSettingsCard() {
  const { currentUser } = useAppContext();
  const [row, setRow] = useState<SettingsRow>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb || !currentUser) return;
      // URL webhook à coller dans le dashboard Square du coach.
      const supaUrl = (sb as unknown as { supabaseUrl?: string }).supabaseUrl ?? "";
      if (alive && supaUrl) setWebhookUrl(`${supaUrl}${WEBHOOK_PATH}`);
      const { data } = await sb
        .from("coach_payment_settings")
        .select(
          "provider, active, stripe_secret_key, square_access_token, square_location_id, square_merchant_id, square_webhook_signature_key, square_env",
        )
        .eq("coach_user_id", currentUser.id)
        .maybeSingle();
      if (!alive) return;
      if (data) {
        setRow({
          provider: (data.provider as SettingsRow["provider"]) ?? "stripe",
          active: Boolean(data.active),
          stripe_secret_key: (data.stripe_secret_key as string) ?? "",
          square_access_token: (data.square_access_token as string) ?? "",
          square_location_id: (data.square_location_id as string) ?? "",
          square_merchant_id: (data.square_merchant_id as string) ?? "",
          square_webhook_signature_key: (data.square_webhook_signature_key as string) ?? "",
          square_env: (data.square_env as SettingsRow["square_env"]) ?? "production",
        });
      }
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [currentUser]);

  async function save() {
    if (!currentUser) return;
    setSaving(true);
    setFeedback(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible");
      const { error } = await sb.from("coach_payment_settings").upsert(
        {
          coach_user_id: currentUser.id,
          ...row,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "coach_user_id" },
      );
      if (error) throw new Error(error.message);
      setFeedback("✅ Encaissement enregistré.");
    } catch (e) {
      setFeedback(`⚠️ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof SettingsRow>(k: K, v: SettingsRow[K]) =>
    setRow((r) => ({ ...r, [k]: v }));

  const canActivate =
    row.provider === "stripe"
      ? row.stripe_secret_key.trim().startsWith("sk_")
      : row.square_access_token.trim().length > 0 && row.square_location_id.trim().length > 0;

  if (!currentUser) return null;

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--ls-border)",
        background: "var(--ls-surface)",
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)" }}>
            💳 Encaissement direct (page Résultat Bilan)
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 3, maxWidth: 520 }}>
            Quand c&apos;est actif, le bouton « Je démarre » de ta page Résultat envoie le prospect
            directement à ta caisse. L&apos;argent arrive <strong>sur TON compte</strong> (jamais le
            nôtre). Sans config, il voit « ton coach t&apos;envoie le lien » — rien ne casse.
          </div>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ls-text)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={row.active}
            disabled={!canActivate && !row.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          Actif
        </label>
      </div>

      {!loaded ? (
        <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 12 }}>Chargement…</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select
              value={row.provider}
              onChange={(e) => set("provider", e.target.value as SettingsRow["provider"])}
              style={inputStyle}
            >
              <option value="stripe">Stripe (recommandé)</option>
              <option value="square">Square</option>
            </select>
            {row.provider === "square" && (
              <select
                value={row.square_env}
                onChange={(e) => set("square_env", e.target.value as SettingsRow["square_env"])}
                style={inputStyle}
              >
                <option value="production">Production</option>
                <option value="sandbox">Sandbox (tests)</option>
              </select>
            )}
          </div>

          {row.provider === "square" ? (
            <>
              <Field label="Access token Square" hint="Dashboard Square Developer → ton application → Credentials.">
                <input
                  type="password"
                  value={row.square_access_token}
                  onChange={(e) => set("square_access_token", e.target.value)}
                  placeholder="EAAA…"
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>
              <Field label="Location ID" hint="Dashboard Square → Locations (l'identifiant de ton point de vente).">
                <input
                  value={row.square_location_id}
                  onChange={(e) => set("square_location_id", e.target.value)}
                  placeholder="L…"
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>
              <Field label="Merchant ID" hint="Identifiant marchand — requis pour relier les paiements reçus à ton compte.">
                <input
                  value={row.square_merchant_id}
                  onChange={(e) => set("square_merchant_id", e.target.value)}
                  placeholder="ML…"
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Clé de signature webhook"
                hint="Square Developer → Webhooks → Subscriptions : crée un abonnement à l'événement payment.updated avec l'URL ci-dessous, puis colle ici la Signature key."
              >
                <input
                  type="password"
                  value={row.square_webhook_signature_key}
                  onChange={(e) => set("square_webhook_signature_key", e.target.value)}
                  placeholder="Signature key"
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>
              {webhookUrl ? (
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
                  URL webhook à coller chez Square :
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(webhookUrl).then(() => setFeedback("✅ URL webhook copiée."))}
                    style={{
                      marginLeft: 6,
                      padding: "3px 9px",
                      borderRadius: 8,
                      border: "1px solid var(--ls-border)",
                      background: "var(--ls-surface2)",
                      color: "var(--ls-teal)",
                      fontSize: 11.5,
                      cursor: "pointer",
                    }}
                  >
                    📋 Copier l&apos;URL
                  </button>
                  <div style={{ marginTop: 4, wordBreak: "break-all", fontFamily: "monospace", fontSize: 11 }}>{webhookUrl}</div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "var(--ls-surface2)",
                  border: "1px solid var(--ls-border)",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ls-text)" }}>
                  3 étapes (≈ 5 min, une seule fois) :
                </div>
                <Step n={1}>
                  Crée ton compte Stripe (gratuit, c&apos;est <em>ton</em> compte, l&apos;argent va
                  chez toi) :{" "}
                  <a
                    href="https://dashboard.stripe.com/register"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--ls-teal)", fontWeight: 600 }}
                  >
                    dashboard.stripe.com/register ↗
                  </a>
                </Step>
                <Step n={2}>
                  Une fois connecté, va dans <strong>Développeurs → Clés API</strong> et copie ta
                  <strong> clé secrète</strong> (commence par <code>sk_live_</code>).{" "}
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--ls-teal)", fontWeight: 600 }}
                  >
                    Ouvrir mes clés ↗
                  </a>
                </Step>
                <Step n={3}>Colle-la ci-dessous, enregistre, active. C&apos;est tout. 🌿</Step>
              </div>

              <Field
                label="Clé secrète Stripe"
                hint="Stripe → Développeurs → Clés API → « Clé secrète ». Reste privée — on ne l'affiche jamais en clair ailleurs."
              >
                <input
                  type="password"
                  value={row.stripe_secret_key}
                  onChange={(e) => set("stripe_secret_key", e.target.value)}
                  placeholder="sk_live_…"
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>
              <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>
                Aucun webhook à configurer, aucune commission, aucun compte intermédiaire. Le
                paiement se fait directement sur ton compte Stripe à la fin du bilan.
              </div>
            </>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              style={{
                padding: "9px 16px",
                borderRadius: 10,
                border: "none",
                background: "var(--ls-gold)",
                color: "#1a1407",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {feedback ? <span style={{ fontSize: 12.5, color: "var(--ls-text-muted)" }}>{feedback}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 12.5, color: "var(--ls-text)", lineHeight: 1.5 }}>
      <span
        style={{
          flex: "0 0 auto",
          width: 20,
          height: 20,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ls-teal)",
          background: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
        }}
      >
        {n}
      </span>
      <span>{children}</span>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  // Délègue au composant partagé (dedup 2026-07-03). mono={false} = look DM Sans
  // d'origine préservé.
  return (
    <FormField label={label} hint={hint} mono={false}>
      {children}
    </FormField>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13.5,
  outline: "none",
};
