// =============================================================================
// EditListe100ContactModal — modale d'édition d'un contact Liste 100
// (2026-05-19 — demande Thomas : modifier un contact existant pour
// ajouter pays + plateforme + notes étendues sur les échanges)
// =============================================================================

import { useEffect, useState } from "react";
import type {
  Liste100Contact,
  Liste100FrankCategory,
  Liste100Temperature,
} from "../../types/cahier";
import {
  LISTE_100_FRANK_META,
  LISTE_100_TEMP_META,
} from "../../types/cahier";
import {
  listPlatforms,
  PLATFORM_META,
  type ContactPlatform,
} from "../../lib/profileDeepLink";
import { CountrySelect } from "../ui/CountrySelect";

interface Props {
  contact: Liste100Contact;
  onClose: () => void;
  onSave: (patch: Partial<Liste100Contact>) => Promise<void>;
}

export function EditListe100ContactModal({ contact, onClose, onSave }: Props) {
  const [fullName, setFullName] = useState(contact.full_name);
  const [frank, setFrank] = useState<Liste100FrankCategory | "">(
    contact.frank_category ?? "",
  );
  const [temperature, setTemperature] = useState<Liste100Temperature>(contact.temperature);
  const [phone, setPhone] = useState(contact.contact_phone ?? "");
  const [email, setEmail] = useState(contact.contact_email ?? "");
  const [platform, setPlatform] = useState<ContactPlatform | "">(
    (contact.platform as ContactPlatform | null) ?? "",
  );
  const [profileUrl, setProfileUrl] = useState(contact.profile_url ?? "");
  const [countryCode, setCountryCode] = useState(contact.country_code ?? "");
  const [note, setNote] = useState(contact.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Esc pour fermer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        full_name: fullName.trim(),
        frank_category: frank || null,
        temperature,
        contact_phone: phone.trim() || null,
        contact_email: email.trim() || null,
        platform: platform || null,
        profile_url: profileUrl.trim() || null,
        country_code: countryCode || null,
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stopPropagation only, dialog role on element */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-contact-title"
        style={{
          width: "100%",
          maxWidth: 560,
          marginTop: "max(40px, 8vh)",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          fontFamily: "DM Sans, sans-serif",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--ls-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--ls-text-muted)",
              }}
            >
              ✏️ Modifier · Liste 100
            </div>
            <div
              id="edit-contact-title"
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--ls-text)",
                marginTop: 2,
              }}
            >
              {contact.full_name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22,
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Nom complet">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Catégorie FRANK">
              <select
                value={frank}
                onChange={(e) => setFrank(e.target.value as Liste100FrankCategory | "")}
                style={inputStyle}
              >
                <option value="">—</option>
                {(Object.keys(LISTE_100_FRANK_META) as Liste100FrankCategory[]).map((f) => (
                  <option key={f} value={f}>
                    {LISTE_100_FRANK_META[f].emoji} {LISTE_100_FRANK_META[f].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Température">
              <select
                value={temperature}
                onChange={(e) => setTemperature(e.target.value as Liste100Temperature)}
                style={inputStyle}
              >
                {(Object.keys(LISTE_100_TEMP_META) as Liste100Temperature[]).map((t) => (
                  <option key={t} value={t}>
                    {LISTE_100_TEMP_META[t].emoji} {LISTE_100_TEMP_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Plateforme">
              <select
                value={platform}
                onChange={(e) => setPlatform((e.target.value || "") as ContactPlatform | "")}
                style={inputStyle}
              >
                <option value="">—</option>
                {listPlatforms().map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_META[p].emoji} {PLATFORM_META[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Username ou URL profil">
              <input
                type="text"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                placeholder={
                  platform
                    ? PLATFORM_META[platform as ContactPlatform].placeholder
                    : "ex: berges_account ou https://…"
                }
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Téléphone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Pays de prospection">
            <CountrySelect
              value={countryCode}
              onChange={setCountryCode}
              includeEmpty
              ariaLabel="Sélectionner un pays de prospection"
            />
          </Field>

          <Field label="Notes (historique d'échanges, infos perso, réponses reçues…)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              placeholder="ex: 19/05 — répondu sur Insta, intéressée par perte de poids. Relance prévue J+3."
              style={{
                ...inputStyle,
                minHeight: 120,
                resize: "vertical",
                fontFamily: "inherit",
                lineHeight: 1.5,
              }}
            />
          </Field>

          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(251,113,133,0.12)",
                color: "#FBBFC8",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 14,
            borderTop: "0.5px solid var(--ls-border)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            background: "var(--ls-surface2)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !fullName.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "var(--ls-purple)",
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: saving || !fullName.trim() ? 0.6 : 1,
            }}
          >
            {saving ? "Enregistrement…" : "✓ Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--ls-input-bg, var(--ls-surface2))",
  border: "1px solid var(--ls-border)",
  borderRadius: 10,
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--ls-text)",
  outline: "none",
  boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        fontWeight: 600,
        color: "var(--ls-text-muted)",
      }}
    >
      {label}
      {children}
    </label>
  );
}
