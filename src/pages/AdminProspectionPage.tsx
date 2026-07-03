// Chantier #3 étape 3.3 — Page admin CRUD Prospection (2026-05-17).
// Route: /admin/prospection. Admin only.
//
// 2 onglets :
//   - Scripts : liste + édition body/body_fr/tip/label/kind/active + delete + add
//   - Briefs : édition GoPro / posture / erreurs / hashtag advice / venues / platforms
//             par profil (weight / sport / business)

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { getSupabaseClient } from "../services/supabaseClient";
import {
  useProspectionData,
  type ProspectionPlatform,
  type ProspectionProfile,
  type ProspectionScript,
  type ProspectionScriptKind,
} from "../hooks/useProspectionData";

type Tab = "scripts" | "briefs";

const PLATFORMS: ProspectionPlatform[] = ["insta", "fb", "whatsapp", "telegram", "linkedin", "sms"];
const KINDS: ProspectionScriptKind[] = ["first_contact", "j3_followup", "referral", "direct", "pitch"];

export function AdminProspectionPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const data = useProspectionData();
  const [tab, setTab] = useState<Tab>("scripts");
  const [refreshTick, setRefreshTick] = useState(0);

  // Si pas admin → kick out
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      navigate("/co-pilote", { replace: true });
    }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "admin") return null;

  return (
    <div style={{ padding: "20px", maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{
        fontFamily: "Anton, sans-serif", textTransform: "uppercase",
        fontSize: 26, fontWeight: 400,
        margin: 0, marginBottom: 6,
        color: "var(--ls-text)",
      }}>
        🛠 Admin Prospection
      </h1>
      <p style={{
        fontSize: 13, color: "var(--ls-text-muted)",
        margin: 0, marginBottom: 18,
      }}>
        Édite les scripts et les briefs méthodo du module /prospection.
        Les modifications sont visibles immédiatement par tous les distri.
      </p>

      <div style={{
        display: "flex", gap: 6, marginBottom: 20,
        borderBottom: "1px solid var(--ls-border)",
      }}>
        <TabButton active={tab === "scripts"} onClick={() => setTab("scripts")}>
          📝 Scripts ({data.scripts.length})
        </TabButton>
        <TabButton active={tab === "briefs"} onClick={() => setTab("briefs")}>
          🧭 Briefs méthodo ({data.profiles.length})
        </TabButton>
      </div>

      {data.loading && <p>Chargement…</p>}
      {data.error && (
        <p style={{ color: "var(--ls-coral)" }}>⚠️ {data.error}</p>
      )}

      {tab === "scripts" && !data.loading && (
        <ScriptsTab
          key={`scripts-${refreshTick}`}
          markets={data.markets}
          profiles={data.profiles}
          scripts={data.scripts}
          onChanged={() => setRefreshTick((t) => t + 1)}
        />
      )}
      {tab === "briefs" && !data.loading && (
        <BriefsTab
          key={`briefs-${refreshTick}`}
          profiles={data.profiles}
          onChanged={() => setRefreshTick((t) => t + 1)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? "var(--ls-gold)" : "transparent",
        color: active ? "var(--ls-charcoal)" : "var(--ls-text-muted)",
        border: "none",
        borderBottom: active ? "3px solid var(--ls-gold)" : "3px solid transparent",
        padding: "10px 18px",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "'Syne', serif",
        cursor: "pointer",
        borderRadius: "8px 8px 0 0",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ============================================================================
// SCRIPTS TAB
// ============================================================================

function ScriptsTab({
  markets, profiles, scripts, onChanged,
}: {
  markets: { code: string; flag: string; label: string }[];
  profiles: { slug: string; label: string }[];
  scripts: ProspectionScript[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<ProspectionScript | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterMarket, setFilterMarket] = useState<string>("all");
  const [filterProfile, setFilterProfile] = useState<string>("all");

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      if (filterMarket !== "all" && s.market_code !== filterMarket) return false;
      if (filterProfile !== "all" && s.profile_slug !== filterProfile) return false;
      return true;
    });
  }, [scripts, filterMarket, filterProfile]);

  return (
    <div>
      <div style={{
        display: "flex", gap: 10, marginBottom: 14, alignItems: "center",
        flexWrap: "wrap",
      }}>
        <select
          value={filterMarket}
          onChange={(e) => setFilterMarket(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tous marchés</option>
          {markets.map((m) => (
            <option key={m.code} value={m.code}>{m.flag} {m.label}</option>
          ))}
        </select>
        <select
          value={filterProfile}
          onChange={(e) => setFilterProfile(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Tous profils</option>
          {profiles.map((p) => (
            <option key={p.slug} value={p.slug}>{p.label}</option>
          ))}
        </select>
        <span style={{ flex: 1, fontSize: 12, color: "var(--ls-text-muted)" }}>
          {filtered.length} script(s)
        </span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={primaryBtnStyle}
        >
          + Nouveau script
        </button>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "var(--ls-text-muted)", textAlign: "center", padding: 24 }}>
          Aucun script pour ces filtres.
        </p>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((s) => (
          <ScriptRow
            key={s.id}
            script={s}
            marketLabel={markets.find((m) => m.code === s.market_code)?.label ?? s.market_code}
            profileLabel={profiles.find((p) => p.slug === s.profile_slug)?.label ?? s.profile_slug}
            onEdit={() => setEditing(s)}
            onChanged={onChanged}
          />
        ))}
      </div>

      {editing && (
        <ScriptFormModal
          script={editing}
          markets={markets}
          profiles={profiles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onChanged(); }}
        />
      )}
      {creating && (
        <ScriptFormModal
          script={null}
          markets={markets}
          profiles={profiles}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); onChanged(); }}
        />
      )}
    </div>
  );
}

function ScriptRow({
  script, marketLabel, profileLabel, onEdit, onChanged,
}: {
  script: ProspectionScript;
  marketLabel: string;
  profileLabel: string;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const { push: pushToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm(`Supprimer ce script ?\n${script.label ?? script.platform}\n${marketLabel} · ${profileLabel}`)) return;
    setBusy(true);
    const sb = await getSupabaseClient();
    if (!sb) { setBusy(false); return; }
    const { error } = await sb
      .from("prospection_scripts")
      .delete()
      .eq("id", script.id);
    setBusy(false);
    if (error) pushToast({ tone: "warning", title: "Échec", message: error.message });
    else { pushToast({ tone: "success", title: "Script supprimé" }); onChanged(); }
  }

  return (
    <div style={{
      background: "var(--ls-surface)",
      border: "1px solid var(--ls-border)",
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex", gap: 12, alignItems: "center",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: "var(--ls-text)",
          marginBottom: 4,
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ fontFamily: "'Syne', serif" }}>{script.label || script.platform}</span>
          <KindPill kind={script.kind} />
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
            {marketLabel} · {profileLabel}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: "var(--ls-text-muted)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          maxWidth: "100%",
        }}>
          {script.body.slice(0, 100)}…
        </div>
      </div>
      <button type="button" onClick={onEdit} style={iconBtnStyle} title="Éditer">✏️</button>
      <button type="button" onClick={del} disabled={busy} style={iconBtnStyle} title="Supprimer">🗑</button>
    </div>
  );
}

function KindPill({ kind }: { kind: ProspectionScriptKind }) {
  const colors: Record<ProspectionScriptKind, { bg: string; color: string; label: string }> = {
    first_contact: { bg: "var(--ls-surface2)", color: "var(--ls-text-muted)", label: "1er contact" },
    j3_followup:   { bg: "#FEF3C7", color: "#92400E", label: "Relance J+3" },
    referral:      { bg: "rgba(45,212,191,0.15)", color: "#0F766E", label: "Après reco" },
    pitch:         { bg: "rgba(139,92,246,0.15)", color: "#6D28D9", label: "Pitch" },
    direct:        { bg: "rgba(45,212,191,0.10)", color: "#0F766E", label: "Direct" },
  };
  const c = colors[kind];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: "2px 7px", borderRadius: 999,
      background: c.bg, color: c.color,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
    }}>
      {c.label}
    </span>
  );
}

function ScriptFormModal({
  script, markets, profiles, onClose, onSaved,
}: {
  script: ProspectionScript | null;
  markets: { code: string; flag: string; label: string }[];
  profiles: { slug: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push: pushToast } = useToast();
  const [marketCode, setMarketCode] = useState(script?.market_code ?? markets[0]?.code ?? "fr");
  const [profileSlug, setProfileSlug] = useState(script?.profile_slug ?? profiles[0]?.slug ?? "weight");
  const [platform, setPlatform] = useState<ProspectionPlatform>(script?.platform ?? "insta");
  const [kind, setKind] = useState<ProspectionScriptKind>(script?.kind ?? "first_contact");
  const [label, setLabel] = useState(script?.label ?? "");
  const [languageLabel, setLanguageLabel] = useState(script?.language_label ?? "");
  const [body, setBody] = useState(script?.body ?? "");
  const [bodyFr, setBodyFr] = useState(script?.body_fr ?? "");
  const [tip, setTip] = useState(script?.tip ?? "");
  const [position, setPosition] = useState<number>(script?.position ?? 1);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (body.trim().length < 10) {
      pushToast({ tone: "warning", title: "Body trop court (≥ 10 chars)" });
      return;
    }
    setBusy(true);
    const sb = await getSupabaseClient();
    if (!sb) { setBusy(false); return; }
    const payload = {
      market_code: marketCode,
      profile_slug: profileSlug,
      platform,
      kind,
      label: label.trim() || null,
      language_label: languageLabel.trim() || null,
      body: body.trim(),
      body_fr: bodyFr.trim() || null,
      tip: tip.trim() || null,
      position,
      active: true,
    };
    const { error } = script
      ? await sb.from("prospection_scripts").update(payload).eq("id", script.id)
      : await sb.from("prospection_scripts").insert(payload);
    setBusy(false);
    if (error) {
      pushToast({ tone: "warning", title: "Échec", message: error.message });
      return;
    }
    pushToast({ tone: "success", title: script ? "Script mis à jour" : "Script créé" });
    onSaved();
  }

  return (
    <ModalShell onClose={onClose} title={script ? "Éditer le script" : "Nouveau script"}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <LabelField label="Marché">
            <select value={marketCode} onChange={(e) => setMarketCode(e.target.value)} style={inputStyle}>
              {markets.map((m) => <option key={m.code} value={m.code}>{m.flag} {m.label}</option>)}
            </select>
          </LabelField>
          <LabelField label="Profil">
            <select value={profileSlug} onChange={(e) => setProfileSlug(e.target.value)} style={inputStyle}>
              {profiles.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
            </select>
          </LabelField>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10 }}>
          <LabelField label="Plateforme">
            <select value={platform} onChange={(e) => setPlatform(e.target.value as ProspectionPlatform)} style={inputStyle}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </LabelField>
          <LabelField label="Type">
            <select value={kind} onChange={(e) => setKind(e.target.value as ProspectionScriptKind)} style={inputStyle}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </LabelField>
          <LabelField label="Pos.">
            <input type="number" min={1} value={position} onChange={(e) => setPosition(Number(e.target.value))} style={inputStyle} />
          </LabelField>
        </div>
        <LabelField label='Label (ex: "Instagram DM · Premier contact")'>
          <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
        </LabelField>
        <LabelField label='Langue (ex: "🇫🇷 Français")'>
          <input value={languageLabel} onChange={(e) => setLanguageLabel(e.target.value)} style={inputStyle} />
        </LabelField>
        <LabelField label="Body (le message dans la langue cible)">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
        </LabelField>
        <LabelField label="Body_fr (traduction française, optionnel pour scripts FR)">
          <textarea value={bodyFr} onChange={(e) => setBodyFr(e.target.value)} rows={5} style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }} />
        </LabelField>
        <LabelField label="Tip métier (court, italique sous le body)">
          <input value={tip} onChange={(e) => setTip(e.target.value)} style={inputStyle} />
        </LabelField>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={secondaryBtnStyle}>Annuler</button>
        <button type="button" onClick={save} disabled={busy} style={primaryBtnStyle}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </ModalShell>
  );
}

// ============================================================================
// BRIEFS TAB
// ============================================================================

function BriefsTab({
  profiles, onChanged,
}: {
  profiles: ProspectionProfile[];
  onChanged: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {profiles.map((p) => (
        <BriefEditor key={p.slug} profile={p} onChanged={onChanged} />
      ))}
    </div>
  );
}

function BriefEditor({
  profile, onChanged,
}: { profile: ProspectionProfile; onChanged: () => void }) {
  const { push: pushToast } = useToast();
  const [goproSteps, setGoproSteps] = useState<string[]>(profile.gopro_steps.length === 3 ? profile.gopro_steps : ["", "", ""]);
  const [posture, setPosture] = useState(profile.posture ?? "");
  const [mistakes, setMistakes] = useState<string[]>(profile.mistakes.length === 3 ? profile.mistakes : ["", "", ""]);
  const [hashtagAdvice, setHashtagAdvice] = useState(profile.hashtag_advice ?? "");
  const [localVenuesHint, setLocalVenuesHint] = useState(profile.local_venues_hint ?? "");
  const [recommendedPlatforms, setRecommendedPlatforms] = useState<string[]>(profile.recommended_platforms);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const sb = await getSupabaseClient();
    if (!sb) { setBusy(false); return; }
    const { error } = await sb
      .from("prospection_profiles")
      .update({
        gopro_steps: goproSteps,
        posture: posture.trim() || null,
        mistakes: mistakes,
        hashtag_advice: hashtagAdvice.trim() || null,
        local_venues_hint: localVenuesHint.trim() || null,
        recommended_platforms: recommendedPlatforms,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", profile.slug);
    setBusy(false);
    if (error) pushToast({ tone: "warning", title: "Échec", message: error.message });
    else { pushToast({ tone: "success", title: `Brief ${profile.label} mis à jour` }); onChanged(); }
  }

  function togglePlatform(p: ProspectionPlatform) {
    setRecommendedPlatforms((curr) =>
      curr.includes(p) ? curr.filter((x) => x !== p) : [...curr, p],
    );
  }

  return (
    <details style={{
      background: "var(--ls-surface)",
      border: "1px solid var(--ls-border)",
      borderRadius: 12,
      padding: "14px 16px",
    }} open>
      <summary style={{
        cursor: "pointer", fontFamily: "'Syne', serif",
        fontSize: 18, fontWeight: 700,
        color: "var(--ls-text)",
        marginBottom: 12,
      }}>
        {profile.emoji} {profile.label}
      </summary>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <LabelField label="GoPro — 3 points (1 ligne par point)">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              value={goproSteps[i] ?? ""}
              onChange={(e) => {
                const next = [...goproSteps];
                next[i] = e.target.value;
                setGoproSteps(next);
              }}
              placeholder={`Point ${i + 1}`}
              style={{ ...inputStyle, marginBottom: 6 }}
            />
          ))}
        </LabelField>

        <LabelField label="Posture (un paragraphe)">
          <textarea
            value={posture}
            onChange={(e) => setPosture(e.target.value)}
            rows={4}
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
          />
        </LabelField>

        <LabelField label="3 erreurs à éviter">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              value={mistakes[i] ?? ""}
              onChange={(e) => {
                const next = [...mistakes];
                next[i] = e.target.value;
                setMistakes(next);
              }}
              placeholder={`Erreur ${i + 1}`}
              style={{ ...inputStyle, marginBottom: 6 }}
            />
          ))}
        </LabelField>

        <LabelField label="Astuce hashtags (affichée étape 4)">
          <textarea
            value={hashtagAdvice}
            onChange={(e) => setHashtagAdvice(e.target.value)}
            rows={2}
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
          />
        </LabelField>

        <LabelField label="Lieux IRL où croiser ce profil (affiché étape 4)">
          <textarea
            value={localVenuesHint}
            onChange={(e) => setLocalVenuesHint(e.target.value)}
            rows={3}
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
          />
        </LabelField>

        <LabelField label="Plateformes recommandées">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                style={{
                  background: recommendedPlatforms.includes(p) ? "var(--ls-gold)" : "var(--ls-surface2)",
                  color: recommendedPlatforms.includes(p) ? "var(--ls-charcoal)" : "var(--ls-text-muted)",
                  border: "1px solid var(--ls-border)",
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </LabelField>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={save} disabled={busy} style={primaryBtnStyle}>
            {busy ? "Enregistrement…" : `💾 Enregistrer ${profile.label}`}
          </button>
        </div>
      </div>
    </details>
  );
}

// ============================================================================
// Shared UI helpers
// ============================================================================

function LabelField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: "var(--ls-text-muted)",
        textTransform: "uppercase", letterSpacing: 1.2,
        marginBottom: 6,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </div>
      {children}
    </label>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(11,13,17,0.55)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "5vh 12px 24px",
      overflowY: "auto",
    }}>
      <div style={{
        background: "var(--ls-surface)",
        borderRadius: 16,
        width: "100%", maxWidth: 700,
        boxShadow: "0 24px 60px rgba(11,13,17,0.4)",
        padding: 22,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Syne', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={iconBtnStyle}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "8px 10px",
  width: "auto",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--ls-gold), #E5C97D)",
  color: "var(--ls-charcoal)",
  border: "none",
  padding: "10px 16px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "'Syne', serif",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(201,168,76,0.30)",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "var(--ls-surface2)",
  color: "var(--ls-text-muted)",
  border: "1px solid var(--ls-border)",
  padding: "10px 16px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "'Syne', serif",
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  border: "1px solid var(--ls-border)",
  width: 34, height: 34,
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
