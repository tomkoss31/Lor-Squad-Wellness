import { useState, type FormEvent } from "react";
import { useAppContext } from "../../context/AppContext";
import { PROSPECT_SOURCES, type Prospect, type ProspectSource, type User } from "../../types/domain";
import { canSponsorDistributors } from "../../lib/auth";
import { confirmNoAgendaConflict } from "../../lib/agendaGuard";
import { RDV_DURATION_CHOICES } from "../../features/agenda/calendarEvents";
import { Button } from "../ui/Button";

interface ProspectFormModalProps {
  initial?: Prospect;                 // si fourni → mode édition
  /** Pré-remplissage en mode création (ignoré si `initial` fourni).
      Utilisé par exemple par la connexion Cahier Liste 100 → Agenda
      (2026-05-04) pour pré-remplir le nom + tel + source du contact. */
  prefill?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    source?: ProspectSource;
    sourceDetail?: string;
    note?: string;
    /** Date/heure du RDV pré-remplie (ISO). Agenda V2 2026-07-27 : clic sur un
        créneau vide de la grille semaine → le formulaire s'ouvre à cette heure. */
    rdvDate?: string;
    /** ⚠️ 01/09 — DANS L'AGENDA DE QUI ON VIENT DE CLIQUER.
     *
     *  Le pré-remplissage ne transportait QUE la date. Un admin qui regardait
     *  l'agenda d'un autre coach, cliquait un créneau vide et créait le
     *  rendez-vous… CHEZ LUI, en silence : le formulaire retombait sur
     *  `currentUser.id`. Le rendez-vous n'apparaissait alors plus dans la vue
     *  qu'on regardait, ce qui donne l'impression que rien ne s'est passé. */
    distributorId?: string;
  };
  onClose: () => void;
  onSaved?: (prospect: Prospect) => void;
}

function toDateTimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function defaultRdvDate(): string {
  // Par défaut : demain 14h00 en Paris
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  return toDateTimeLocal(d.toISOString());
}

// Puce de choix de durée (Agenda V2, LOT 6.4).
function durationChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: active ? 700 : 500,
    fontFamily: "DM Sans, sans-serif",
    cursor: "pointer",
    background: active ? "var(--ls-teal)" : "var(--ls-surface2)",
    color: active ? "#fff" : "var(--ls-text-muted)",
    border: active ? "1px solid var(--ls-teal)" : "1px solid var(--ls-border)",
  };
}

function filterAssignableUsers(currentUser: User | null, users: User[]): User[] {
  if (!currentUser) return [];
  if (currentUser.role === "admin") {
    return users.filter((u) => u.active);
  }
  // Référent : lui + ses filleuls
  if (currentUser.role === "referent") {
    return users.filter((u) => u.active && (u.id === currentUser.id || u.sponsorId === currentUser.id));
  }
  // Distributeur : lui-même seulement
  return users.filter((u) => u.active && u.id === currentUser.id);
}

export function ProspectFormModal({ initial, prefill, onClose, onSaved }: ProspectFormModalProps) {
  const { currentUser, users, createProspect, updateProspect } = useAppContext();

  const [firstName, setFirstName] = useState(initial?.firstName ?? prefill?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? prefill?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? prefill?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? prefill?.email ?? "");
  const [rdvDate, setRdvDate] = useState(
    initial?.rdvDate
      ? toDateTimeLocal(initial.rdvDate)
      : prefill?.rdvDate
        ? toDateTimeLocal(prefill.rdvDate)
        : defaultRdvDate()
  );
  const [source, setSource] = useState<ProspectSource>(initial?.source ?? prefill?.source ?? "Instagram");
  // Durée du RDV (Agenda V2, LOT 6.4). null = « comme d'habitude » → la durée
  // par défaut du coach s'applique. On ne force personne à choisir.
  const [durationMin, setDurationMin] = useState<number | null>(initial?.durationMin ?? null);
  const [sourceDetail, setSourceDetail] = useState(initial?.sourceDetail ?? prefill?.sourceDetail ?? "");
  const [note, setNote] = useState(initial?.note ?? prefill?.note ?? "");
  // L'ordre compte : une fiche existante d'abord, puis l'agenda dans lequel on
  // vient de cliquer, et seulement ensuite « moi ».
  const [distributorId, setDistributorId] = useState(
    initial?.distributorId ?? prefill?.distributorId ?? currentUser?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignable = filterAssignableUsers(currentUser, users);
  void canSponsorDistributors; // linter

  // Email valide → le rappel auto J-1 pourra partir (cf. edge client-rdv-reminder).
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }
    if (!rdvDate) {
      setError("La date du RDV est obligatoire.");
      return;
    }
    if (!distributorId) {
      setError("Sélectionne un distributeur.");
      return;
    }

    setSaving(true);
    try {
      const isoRdv = new Date(rdvDate).toISOString();
      // Garde-fou disponibilité (chantier 2026-06-04) : prévient si le créneau
      // est déjà pris (RDV client OU prospect) pour ce distri. Avertir + autoriser.
      const slotOk = await confirmNoAgendaConflict(distributorId, isoRdv, null, initial?.id ?? null);
      if (!slotOk) {
        setSaving(false);
        return;
      }
      if (initial) {
        const updated = await updateProspect(initial.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase() || undefined,
          rdvDate: isoRdv,
          durationMin: durationMin ?? undefined,
          source,
          sourceDetail: sourceDetail.trim() || undefined,
          note: note.trim() || undefined,
          distributorId,
        });
        onSaved?.(updated);
      } else {
        const created = await createProspect({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim().toLowerCase() || undefined,
          rdvDate: isoRdv,
          durationMin: durationMin ?? undefined,
          source,
          sourceDetail: sourceDetail.trim() || undefined,
          note: note.trim() || undefined,
          distributorId,
        });
        onSaved?.(created);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={0}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
        style={{
          background: "var(--ls-surface)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 22,
          border: "1px solid var(--ls-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--ls-text)",
              margin: 0,
            }}
          >
            {initial ? "Modifier le RDV" : "Nouveau RDV prospection"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ls-text-muted)",
              fontSize: 22,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Prénom + Nom */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LabelInput label="Prénom *" value={firstName} onChange={setFirstName} autoFocus />
            <LabelInput label="Nom *" value={lastName} onChange={setLastName} />
          </div>

          {/* Téléphone */}
          <LabelInput label="Téléphone" value={phone} onChange={setPhone} inputMode="tel" />

          {/* Email — mis en avant : c'est lui qui déclenche le rappel auto la veille */}
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${email.trim() ? "var(--ls-border)" : "color-mix(in srgb, var(--ls-teal) 42%, var(--ls-border))"}`,
              background: email.trim() ? "transparent" : "color-mix(in srgb, var(--ls-teal) 7%, transparent)",
              padding: 12,
              transition: "background .2s, border-color .2s",
            }}
          >
            <label className={labelClass} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>📧 Email</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ls-teal)" }}>· active le rappel automatique</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom@email.com"
              inputMode="email"
              className={inputClass}
            />
            <div
              style={{
                marginTop: 7,
                fontSize: 12,
                lineHeight: 1.45,
                color: emailValid ? "var(--ls-teal)" : "var(--ls-text-muted)",
              }}
            >
              {emailValid
                ? "✓ Il recevra un rappel automatique la veille du RDV, à 18h."
                : email.trim()
                ? "Vérifie l'adresse : le rappel de la veille part à cet email."
                : "Renseigne son email pour qu'il reçoive un rappel automatique la veille du RDV."}
            </div>
          </div>

          {/* RDV */}
          <LabelInput
            label="Date + heure du RDV *"
            value={rdvDate}
            onChange={setRdvDate}
            type="datetime-local"
          />

          {/* Durée (Agenda V2, LOT 6.4) — choix rapide, jamais obligatoire.
              « Comme d'habitude » applique le réglage du coach. */}
          <div>
            <label className={labelClass}>Durée</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setDurationMin(null)}
                aria-pressed={durationMin === null}
                style={durationChipStyle(durationMin === null)}
              >
                Comme d'habitude
              </button>
              {RDV_DURATION_CHOICES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMin(m)}
                  aria-pressed={durationMin === m}
                  style={durationChipStyle(durationMin === m)}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className={labelClass}>Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as ProspectSource)}
              className={inputClass}
            >
              {PROSPECT_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Source detail */}
          <LabelInput
            label="Précision (facultatif)"
            value={sourceDetail}
            onChange={setSourceDetail}
            placeholder="ex : Campagne Printemps 2026"
          />

          {/* Distri */}
          {assignable.length > 1 && (
            <div>
              <label className={labelClass}>Distributeur assigné</label>
              <select
                value={distributorId}
                onChange={(e) => setDistributorId(e.target.value)}
                className={inputClass}
              >
                {assignable.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role === "admin" ? "Admin" : u.role === "referent" ? "Référent" : "Distri"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Note */}
          <div>
            <label className={labelClass}>Note (qu'est-ce que la personne cherche ?)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Objectif, contexte, attentes particulières…"
              className={inputClass}
              style={{ resize: "vertical" }}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: "var(--ls-coral-bg)",
                border: "1px solid var(--ls-coral)",
                color: "var(--ls-coral)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer le RDV"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// UX Polish global (2026-04-20) : migré vers classes utilitaires partagées.
// `labelClass` = .ls-field-label (13px, weight 500, text pas muted)
// `inputClass` = .ls-input (halo teal focus, hover tint, tokens cohérents)
const labelClass = "ls-field-label";
const inputClass = "ls-input";

function LabelInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "tel" | "email" | "text";
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoFocus={autoFocus}
        className={inputClass}
      />
    </div>
  );
}
