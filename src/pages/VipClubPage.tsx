// =============================================================================
// VipClubPage — page publique Club VIP partageable (VIP-3 2026-06-10).
//
// Route : /vip/:coachSlug (publique, hors AppLayout — comme /coach/:slug et
// /bilan-online/:coachSlug). Le coach partage ce lien à son groupe / réseaux
// pour informer de la remise Client Privilégié et récupérer des contacts.
//
// Pattern réutilisé (zéro réinvention) :
//   - PublicShell dark + tokens publics (public-tokens.ts)
//   - Résolution coach par slug : RPC get_coach_credibility_by_slug
//   - Capture lead : edge submit-prospect-lead → prospect_leads, source='vip',
//     attribué au coach (referrer_user_id) → push notif (existant).
//
// Échelle plafonnée à 35 % (décision Thomas 2026-06-10), simulateur "tes
// proches font monter ta remise". Pas de migration (source='vip' = texte libre).
// =============================================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import {
  CoachCredibilityBadges,
  type CoachCredibility,
} from "../components/bilan-online/CoachCredibilityBadges";
import { PublicShell } from "../components/public/PublicShell";
import { PUBLIC_TOKENS as T, PUBLIC_FONTS as F, publicGradText } from "../styles/public-tokens";

const FRIEND_PV = 130;
const REF_RETAIL = 200;

interface Tier {
  pct: number;
  min: number;
  emoji: string;
  label: string;
}
const CLIENT_TIERS: Tier[] = [
  { pct: 15, min: 0, emoji: "🥉", label: "Tu démarres" },
  { pct: 25, min: 100, emoji: "🥈", label: "Tu es régulier·e" },
  { pct: 35, min: 250, emoji: "🥇", label: "Le max Client Privilégié" },
];
function tierForPv(pv: number): Tier {
  let cur = CLIENT_TIERS[0];
  for (const t of CLIENT_TIERS) if (pv >= t.min) cur = t;
  return cur;
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const OBJECTIVES = [
  { value: "perte_de_poids", label: "Perte de poids" },
  { value: "energie", label: "Énergie / forme" },
  { value: "sport", label: "Sport / muscle" },
  { value: "curieux", label: "Juste curieux·se" },
];

export function VipClubPage() {
  const { coachSlug } = useParams<{ coachSlug: string }>();
  const slug = normalizeSlug(coachSlug ?? "");

  const [coach, setCoach] = useState<CoachCredibility | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);

  const [friends, setFriends] = useState(2);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [objective, setObjective] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const coachName = coach?.first_name || coach?.name?.split(/\s+/)[0] || "ton coach";

  useEffect(() => {
    document.title = "La Base 360 — Club VIP";
  }, []);

  // Résolution coach par slug (RPC publique, échec silencieux).
  useEffect(() => {
    if (!slug) {
      setCoachLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) setCoachLoading(false);
          return;
        }
        const { data, error: rpcErr } = await sb.rpc("get_coach_credibility_by_slug", {
          p_slug: slug,
        });
        if (cancelled) return;
        if (!rpcErr && data) setCoach(data as CoachCredibility);
      } catch {
        /* silencieux — la page reste utilisable sans nom officiel */
      } finally {
        if (!cancelled) setCoachLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const sim = useMemo(() => {
    const pv = friends * FRIEND_PV;
    const tier = tierForPv(pv);
    const saving = Math.round((tier.pct / 100) * REF_RETAIL);
    return { pv, tier, saving };
  }, [friends]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (firstName.trim().length < 2) {
      setError("Indique ton prénom.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 6) {
      setError("Indique un numéro de téléphone valide.");
      return;
    }
    setStatus("sending");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error: fnErr } = await sb.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: firstName.trim(),
          phone: phone.trim(),
          source: "vip",
          coach_slug: slug,
          referrer_user_id: coach?.user_id ?? undefined,
          consent_recontact: consent,
          metadata: {
            program: "vip_club",
            objective: objective || null,
            source_page: `/vip/${slug}`,
          },
        },
      });
      if (fnErr) throw new Error(fnErr.message);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Envoi impossible, réessaie.");
    }
  }

  return (
    <PublicShell defaultTheme="dark" showThemeToggle showBgMesh>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 18px 60px", fontFamily: F.body }}>
        {/* Eyebrow brand */}
        <div style={eyebrow}>👑 La Base 360 · Club VIP</div>

        {/* Hero coach */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={avatarWrap}>
            {coach?.avatar_url ? (
              <img src={coach.avatar_url} alt={coachName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : (
              <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 26, color: T.ink }}>
                {(coachName[0] ?? "?").toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <h1 style={h1}>
          Le Club VIP de <span style={publicGradText}>{coachLoading ? "…" : coachName}</span>
        </h1>
        <p style={lead}>
          Paie ta nutrition Herbalife <strong>moins cher, à vie</strong> — de −15 % jusqu'à
          −35 %. Et plus tes proches en profitent via toi, plus ta remise grimpe.
        </p>

        {coach ? (
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 22px" }}>
            <CoachCredibilityBadges coachUserId={coach.user_id} preloaded={coach} variant="welcome" hideRank />
          </div>
        ) : (
          <div style={{ height: 18 }} />
        )}

        {/* Escalier */}
        <div style={card}>
          <div style={cardTitle}>Les paliers de remise</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {CLIENT_TIERS.map((t) => {
              const active = sim.tier.pct === t.pct;
              return (
                <div key={t.pct} style={tierRow(active)}>
                  <span style={{ fontSize: 20, width: 24, textAlign: "center" }} aria-hidden="true">{t.emoji}</span>
                  <span style={{ fontFamily: F.display, fontSize: 19, fontWeight: 800, color: active ? T.teal : T.goldSoft, minWidth: 54 }}>
                    -{t.pct}%
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.textOnDarkSoft }}>{t.label}</span>
                </div>
              );
            })}
            <div style={distriRow}>
              <span style={{ fontSize: 18, width: 24, textAlign: "center" }} aria-hidden="true">🚀</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.textOnDarkMuted, lineHeight: 1.45 }}>
                <strong style={{ color: T.goldSoft }}>−42 % à −50 %</strong> — possible en passant
                distributeur. {coachName} t'explique quand tu veux.
              </span>
            </div>
          </div>
        </div>

        {/* Simulateur compact */}
        <div style={card}>
          <div style={cardTitle}>🧮 Combien tu peux viser</div>
          <p style={{ fontSize: 12.5, color: T.textOnDarkMuted, lineHeight: 1.5, margin: "0 0 14px" }}>
            Chaque proche qui en profite via toi ≈ <strong style={{ color: T.cream }}>+{FRIEND_PV} PV</strong>.
            Fais glisser :
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 }}>
            <button type="button" onClick={() => setFriends((f) => Math.max(0, f - 1))} aria-label="Retirer" style={stepBtn}>−</button>
            <div style={{ textAlign: "center", minWidth: 120 }}>
              <div style={{ fontSize: 24 }} aria-hidden="true">{"🙂".repeat(Math.min(friends, 6)) || "—"}</div>
              <div style={{ fontSize: 12, color: T.textOnDarkMuted, marginTop: 2 }}>{friends} proche{friends > 1 ? "s" : ""}</div>
            </div>
            <button type="button" onClick={() => setFriends((f) => Math.min(10, f + 1))} aria-label="Ajouter" style={{ ...stepBtn, background: T.teal, color: T.ink, borderColor: T.teal }}>+</button>
          </div>
          <div style={simResult}>
            <div>
              <div style={{ fontSize: 11, color: T.textOnDarkMuted }}>Ta remise</div>
              <div style={{ fontFamily: F.display, fontSize: 28, fontWeight: 800, color: T.cream, lineHeight: 1 }}>-{sim.tier.pct}%</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: T.textOnDarkSoft, maxWidth: 180 }}>
              ≈ <strong style={{ color: T.coral }}>{sim.saving} €/mois</strong> d'économie sur une
              nutrition à ~{REF_RETAIL} €.
            </div>
          </div>
        </div>

        {/* Formulaire capture / succès */}
        {status === "sent" ? (
          <div style={{ ...card, textAlign: "center", borderColor: "rgba(45,212,191,0.4)" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }} aria-hidden="true">🌿</div>
            <div style={{ fontFamily: F.display, fontSize: 20, fontWeight: 800, color: T.cream, marginBottom: 6 }}>
              Merci {firstName.trim()} !
            </div>
            <p style={{ fontSize: 13.5, color: T.textOnDarkSoft, lineHeight: 1.6, margin: 0 }}>
              {coachName} a reçu ta demande et te recontacte très vite pour activer ta remise et
              répondre à tes questions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={card}>
            <div style={cardTitle}>Ça m'intéresse — recontacte-moi</div>
            <p style={{ fontSize: 12.5, color: T.textOnDarkMuted, lineHeight: 1.5, margin: "0 0 14px" }}>
              Laisse ton prénom + un contact, {coachName} t'explique tout (sans engagement).
            </p>
            <input style={input} placeholder="Ton prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input style={input} placeholder="Ton téléphone (WhatsApp)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <select style={input} value={objective} onChange={(e) => setObjective(e.target.value)}>
              <option value="">Ton objectif (optionnel)</option>
              {OBJECTIVES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11.5, color: T.textOnDarkMuted, lineHeight: 1.45, margin: "4px 0 14px", cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2 }} />
              <span>J'accepte que {coachName} me recontacte au sujet du Club VIP La Base 360.</span>
            </label>
            {error ? (
              <div style={{ fontSize: 12, color: T.coral, marginBottom: 10 }}>{error}</div>
            ) : null}
            <button type="submit" disabled={status === "sending"} style={cta}>
              {status === "sending" ? "Envoi…" : "Je veux profiter du Club VIP →"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: T.textOnDarkHint, marginTop: 18 }}>
          Propulsé par La Base 360 · Verdun
        </div>
      </div>
    </PublicShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const eyebrow: React.CSSProperties = {
  textAlign: "center",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.6,
  textTransform: "uppercase",
  color: T.goldSoft,
  fontFamily: F.body,
  marginBottom: 14,
};

const avatarWrap: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  margin: "0 auto",
  background: T.gradCta,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: `2px solid ${T.hairStrongOnDark}`,
};

const h1: React.CSSProperties = {
  textAlign: "center",
  fontFamily: F.display,
  fontSize: "clamp(26px, 7vw, 34px)",
  fontWeight: 800,
  color: T.cream,
  lineHeight: 1.12,
  margin: "12px 0 8px",
};

const lead: React.CSSProperties = {
  textAlign: "center",
  fontSize: 14.5,
  lineHeight: 1.6,
  color: T.textOnDarkSoft,
  maxWidth: 460,
  margin: "0 auto",
};

const card: React.CSSProperties = {
  background: T.ink2,
  border: `1px solid ${T.hairOnDark}`,
  borderRadius: 16,
  padding: 18,
  marginTop: 16,
};

const cardTitle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: 15,
  fontWeight: 700,
  color: T.cream,
  marginBottom: 12,
};

const tierRow = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "10px 12px",
  borderRadius: 11,
  background: active ? "color-mix(in srgb, #2DD4BF 16%, #131820)" : "rgba(251,247,240,0.03)",
  border: active ? "1px solid rgba(45,212,191,0.5)" : `1px solid ${T.hairOnDark}`,
});

const distriRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  padding: "10px 12px",
  borderRadius: 11,
  background: "rgba(201,168,76,0.08)",
  border: "1px dashed rgba(229,201,125,0.4)",
};

const stepBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: "rgba(251,247,240,0.08)",
  border: `1px solid ${T.hairStrongOnDark}`,
  color: T.cream,
  fontSize: 22,
  fontWeight: 700,
  cursor: "pointer",
  lineHeight: 1,
};

const simResult: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg, rgba(45,212,191,0.16), rgba(124,58,237,0.12))",
  border: "1px solid rgba(45,212,191,0.35)",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  marginBottom: 10,
  borderRadius: 11,
  border: `1px solid ${T.hairStrongOnDark}`,
  background: "rgba(251,247,240,0.04)",
  color: T.cream,
  fontSize: 14,
  fontFamily: F.body,
  outline: "none",
};

const cta: React.CSSProperties = {
  width: "100%",
  padding: "14px 20px",
  borderRadius: 12,
  border: "none",
  background: T.gradCta,
  color: T.cream,
  fontFamily: F.display,
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
};
