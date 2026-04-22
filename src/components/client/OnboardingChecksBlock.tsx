// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// 3 checks horizontaux sur la fiche client : Telegram, Photo avant,
// Mensurations. Clic "Modifier" ouvre une modale avec 3 toggles.
// Persisté via AppContext.setClientOnboardingChecks (jsonb en DB).

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";

type Checks = {
  telegram: boolean;
  photo_before: boolean;
  measurements: boolean;
};

function normalize(input: Partial<Checks> | undefined | null): Checks {
  return {
    telegram: input?.telegram ?? false,
    photo_before: input?.photo_before ?? false,
    measurements: input?.measurements ?? false,
  };
}

function CheckCircle({ done, label, sub }: { done: boolean; label: string; sub: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 150,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: done ? "#1D9E75" : "transparent",
          border: done ? "1px solid #1D9E75" : "1.5px dashed var(--ls-border)",
          color: "#FFFFFF",
        }}
      >
        {done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)" }}>{label}</div>
        <div
          style={{
            fontSize: 11,
            color: done ? "#1D9E75" : "var(--ls-text-muted)",
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        border: "1px solid var(--ls-border)",
        borderRadius: 10,
        cursor: "pointer",
        background: "var(--ls-surface)",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 13, color: "var(--ls-text)" }}>{label}</span>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          background: checked ? "#1D9E75" : "var(--ls-surface2)",
          position: "relative",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#FFFFFF",
            transition: "left 0.15s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        />
      </span>
      {/* Input caché pour accessibilité clavier / formulaire */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
    </label>
  );
}

interface Props {
  clientId: string;
  checks: Partial<Checks> | undefined | null;
}

export function OnboardingChecksBlock({ clientId, checks }: Props) {
  const current = normalize(checks);
  const { setClientOnboardingChecks } = useAppContext();
  const { push: pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Checks>(current);
  const [saving, setSaving] = useState(false);

  // Re-sync draft quand on ouvre la modale (si le parent rerender)
  useEffect(() => {
    if (open) setDraft(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save() {
    setSaving(true);
    try {
      await setClientOnboardingChecks(clientId, draft);
      pushToast({ tone: "success", title: "Checks onboarding mis à jour." });
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      pushToast({ tone: "error", title: "Erreur", message: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 14,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <CheckCircle
          done={current.telegram}
          label="Telegram"
          sub={current.telegram ? "Installé" : "À faire"}
        />
        <CheckCircle
          done={current.photo_before}
          label="Photo avant"
          sub={current.photo_before ? "Reçue" : "À faire"}
        />
        <CheckCircle
          done={current.measurements}
          label="Mensurations"
          sub={current.measurements ? "Faites" : "À faire"}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            marginLeft: "auto",
            padding: "7px 14px",
            borderRadius: 10,
            border: "1px solid var(--ls-border)",
            background: "transparent",
            color: "var(--ls-gold)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
          }}
        >
          Modifier
        </button>
      </div>

      {open ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Fermer"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Checks onboarding"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              background: "var(--ls-surface)",
              borderRadius: 18,
              maxWidth: 420,
              width: "100%",
              padding: 22,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              border: "1px solid var(--ls-border)",
            }}
          >
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ls-text)",
                margin: 0,
                marginBottom: 14,
              }}
            >
              Checks onboarding
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Toggle
                checked={draft.telegram}
                onChange={(v) => setDraft((d) => ({ ...d, telegram: v }))}
                label="Telegram installé"
              />
              <Toggle
                checked={draft.photo_before}
                onChange={(v) => setDraft((d) => ({ ...d, photo_before: v }))}
                label="Photo avant reçue"
              />
              <Toggle
                checked={draft.measurements}
                onChange={(v) => setDraft((d) => ({ ...d, measurements: v }))}
                label="Mensurations faites"
              />
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                style={{
                  padding: "9px 16px",
                  borderRadius: 10,
                  background: "#BA7517",
                  border: "none",
                  color: "#FFFFFF",
                  cursor: saving ? "wait" : "pointer",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                }}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
