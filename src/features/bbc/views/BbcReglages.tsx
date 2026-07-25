// =============================================================================
// BbcReglages — les réglages du club (chantier BBC).
// Tout ce qui varie d'un club à l'autre se règle ICI, jamais dans le code :
// horaires des rituels (le 20h vs 20h30 n'est pas tranché), barème des cœurs,
// cartes (prix + durée), créneau d'ouverture. Sauvegarde dans clubs.settings.
// =============================================================================

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Club, ClubSettings } from "../../../types/domain";
import { useClubSettings, DEFAULT_CLUB_SETTINGS } from "../useClubSettings";

const DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const CALL_LABELS: Record<string, string> = {
  appel_ambassadeur: "Appel Ambassadeur",
  atelier_coeurs: "Atelier Cœurs",
  coach_academy: "Coach Academy",
};

interface BbcReglagesProps {
  club: Club | null;
}

export function BbcReglages({ club }: BbcReglagesProps) {
  const { settings, loading, saving, save } = useClubSettings(club?.id, club?.settings ?? null);
  const [draft, setDraft] = useState<ClubSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  function setCall(key: string, patch: Partial<{ days: string[]; time: string }>) {
    const calls = { ...(draft.calls ?? {}) };
    const cur = calls[key] ?? { days: [], time: "20:00" };
    calls[key] = { ...cur, ...patch };
    setDraft({ ...draft, calls });
  }
  function toggleDay(key: string, day: string) {
    const cur = draft.calls?.[key]?.days ?? [];
    setCall(key, { days: cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day] });
  }
  function setCard(type: "10" | "30", patch: Partial<{ price: number | null; days: number }>) {
    const cards = { ...(draft.cards ?? {}) };
    const cur = cards[type] ?? { price: null, days: type === "10" ? 30 : 90 };
    cards[type] = { ...cur, ...patch };
    setDraft({ ...draft, cards });
  }

  async function onSave() {
    const ok = await save(draft);
    if (ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    }
  }

  if (!club) {
    return (
      <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 24, fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.6 }}>
        Crée d'abord ton club (onglet <b style={{ color: "var(--ls-bbc-text)" }}>Mes clubs</b>) — les réglages s'appliquent à un club.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.6, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "13px 16px" }}>
        Ces valeurs pilotent l'app : elles ne sont <b style={{ color: "var(--ls-bbc-text)" }}>jamais écrites en dur</b>. Change-les ici, le Cockpit et l'app membre suivent.
      </div>

      {/* Ouverture */}
      <Section eye="créneau d'ouverture">
        <input
          value={draft.open_hours ?? ""}
          onChange={(e) => setDraft({ ...draft, open_hours: e.target.value })}
          placeholder="ex. 7h-11h"
          style={inputStyle}
        />
      </Section>

      {/* Rituels */}
      <Section eye="les rituels du club" hint="jours + heure de chaque appel — à trancher avec ton équipe">
        {Object.keys(CALL_LABELS).map((key) => {
          const cfg = draft.calls?.[key] ?? { days: [], time: "20:00" };
          return (
            <div key={key} style={{ padding: "14px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 140, fontSize: 13.5, fontWeight: 700 }}>{CALL_LABELS[key]}</span>
                <input
                  type="time"
                  value={cfg.time}
                  onChange={(e) => setCall(key, { time: e.target.value })}
                  style={{ ...inputStyle, width: 120, height: 40, margin: 0 }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS.map((d) => {
                  const on = cfg.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(key, d)}
                      style={{
                        minHeight: 36, padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                        fontSize: 11.5, fontWeight: 700, fontFamily: "var(--ls-bbc-font-body)",
                        background: on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s2)",
                        color: on ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
                        border: `1px solid ${on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line)"}`,
                      }}
                    >
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Section>

      {/* Barème cœurs */}
      <Section eye="le barème des cœurs" hint="ce que débloque chaque palier — affiché au coach et au membre">
        {["2", "3", "5"].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
            <span style={{ width: 40, flex: "none", fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 16, color: "var(--ls-bbc-lime-text)" }}>{n}♥</span>
            <input
              value={draft.hearts_bareme?.[n] ?? ""}
              onChange={(e) => setDraft({ ...draft, hearts_bareme: { ...(draft.hearts_bareme ?? {}), [n]: e.target.value } })}
              placeholder={DEFAULT_CLUB_SETTINGS.hearts_bareme?.[n]}
              style={{ ...inputStyle, margin: 0 }}
            />
          </div>
        ))}
      </Section>

      {/* Cartes */}
      <Section eye="les cartes de membre" hint="prix et durée de validité par type">
        {(["10", "30"] as const).map((t) => {
          const c = draft.cards?.[t] ?? { price: null, days: t === "10" ? 30 : 90 };
          return (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--ls-bbc-line)", flexWrap: "wrap" }}>
              <span style={{ width: 90, flex: "none", fontSize: 13, fontWeight: 700 }}>{t} visites</span>
              <label style={labelStyle}>prix €</label>
              <input
                inputMode="decimal"
                value={c.price ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  const n = v ? Number(v.replace(",", ".")) : null;
                  setCard(t, { price: Number.isFinite(n as number) ? (n as number) : null });
                }}
                placeholder="—"
                style={{ ...inputStyle, width: 90, margin: 0 }}
              />
              <label style={labelStyle}>valable</label>
              <input
                inputMode="numeric"
                value={c.days}
                onChange={(e) => setCard(t, { days: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                style={{ ...inputStyle, width: 80, margin: 0 }}
              />
              <span style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>jours</span>
            </div>
          );
        })}
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving || loading}
          style={{ minHeight: 50, padding: "0 24px", border: 0, borderRadius: 13, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "enregistrement…" : "Enregistrer les réglages"}
        </button>
        {saved ? <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ls-bbc-teal)" }}>✓ enregistré</span> : null}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 80,
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--ls-bbc-line2)",
  background: "var(--ls-bbc-s2)",
  color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 16,
  padding: "0 14px",
  outline: "none",
};

const labelStyle: CSSProperties = { fontSize: 11.5, color: "var(--ls-bbc-muted)" };

function Section({ eye, hint, children }: { eye: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: hint ? 3 : 12 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)", flex: "none" }} />
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>{eye}</span>
      </div>
      {hint ? <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginBottom: 10 }}>{hint}</div> : null}
      {children}
    </div>
  );
}
