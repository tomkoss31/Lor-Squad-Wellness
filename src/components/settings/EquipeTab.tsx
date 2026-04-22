// Chantier Paramètres Admin (2026-04-23) — commit 4/7.
//
// Onglet Équipe : liste compacte des distributeurs + lien vers /users pour
// l'édition détaillée + bouton "Inviter un distributeur" (crée un token
// d'invitation 7j dans distributor_invitation_tokens).
//
// Stratégie V1 : on ne recrée pas la full UI de /users (1000 lignes,
// pattern accordion déjà OK). On donne l'essentiel (roster + invite)
// et on délègue les actions complexes (update, repair, password reset)
// à /users via un bouton "Gérer les accès détaillés".

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getSupabaseClient } from "../../services/supabaseClient";

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildInviteUrl(token: string): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://lor-squad-wellness.vercel.app";
  return `${origin}/bienvenue-distri?token=${token}`;
}

export function EquipeTab() {
  const { currentUser, users, clients, pvTransactions } = useAppContext();
  const { push: pushToast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  const teamMembers = useMemo(() => {
    if (!currentUser) return [];
    // Admin → tout le monde sauf soi. Référent → ceux dont on est sponsor.
    if (currentUser.role === "admin") {
      return users.filter((u) => u.id !== currentUser.id);
    }
    return users.filter((u) => u.sponsorId === currentUser.id);
  }, [users, currentUser]);

  const stats = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return teamMembers.map((u) => {
      const clientCount = clients.filter((c) => c.distributorId === u.id).length;
      const pvMonth = pvTransactions
        .filter((t) => t.responsibleId === u.id)
        .filter((t) => {
          const d = new Date(t.date);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((acc, t) => acc + (t.pv || 0), 0);
      return { user: u, clientCount, pvMonth };
    });
  }, [teamMembers, clients, pvTransactions]);

  if (!currentUser) return null;

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow-label">Ligne distributeurs</p>
            <p style={{ fontSize: 14, color: "var(--ls-text-muted)", marginTop: 4 }}>
              {teamMembers.length} membre{teamMembers.length > 1 ? "s" : ""} dans ta ligne.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/users"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 14px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-text-muted)",
                fontSize: 13,
                textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Gérer les accès détaillés
            </Link>
            <Button onClick={() => setInviteOpen(true)}>+ Inviter un distributeur</Button>
          </div>
        </div>

        {stats.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--ls-text-muted)",
              fontSize: 13,
            }}
          >
            Aucun distributeur dans ta ligne pour l'instant.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            {stats.map(({ user, clientCount, pvMonth }) => (
              <MemberCard key={user.id} user={user} clientCount={clientCount} pvMonth={pvMonth} />
            ))}
          </div>
        )}
      </Card>

      {inviteOpen ? (
        <InviteModal onClose={() => setInviteOpen(false)} onInvited={(msg) => {
          pushToast({ tone: "success", title: "Invitation créée", message: msg });
          setInviteOpen(false);
        }} />
      ) : null}
    </div>
  );
}

function MemberCard({
  user,
  clientCount,
  pvMonth,
}: {
  user: { id: string; name: string; role: string; sponsorName?: string; active: boolean };
  clientCount: number;
  pvMonth: number;
}) {
  const initials = user.name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--ls-border)",
        background: "var(--ls-surface2)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: user.active ? 1 : 0.55,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #C9A84C, #2DD4BF)",
          color: "#0B0D11",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)" }}>
            {user.name}
          </span>
          {!user.active ? (
            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#DC2626" }}>
              Inactif
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
          {user.role === "admin" ? "Admin" : user.role === "referent" ? "Référent" : "Distributeur"}
          {user.sponsorName ? ` · Parrain : ${user.sponsorName}` : ""}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
          {clientCount} client{clientCount > 1 ? "s" : ""} · {pvMonth.toLocaleString("fr-FR")} PV mois
        </div>
      </div>
      <Link
        to={`/distributors/${user.id}`}
        style={{
          fontSize: 11,
          padding: "5px 10px",
          borderRadius: 8,
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          color: "var(--ls-text-muted)",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        Fiche
      </Link>
    </div>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (m: string) => void }) {
  const { currentUser, users } = useAppContext();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sponsorId, setSponsorId] = useState<string>(currentUser?.id ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const sponsorOptions = useMemo(() => {
    if (!currentUser) return [];
    const opts: Array<{ id: string; label: string }> = [
      { id: currentUser.id, label: `${currentUser.name} (toi)` },
    ];
    for (const u of users) {
      if (u.id === currentUser.id) continue;
      if (u.role === "admin" || u.role === "referent" || u.role === "distributor") {
        opts.push({ id: u.id, label: `${u.name} (${u.role})` });
      }
    }
    return opts;
  }, [currentUser, users]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Email invalide.");
      return;
    }
    if (!sponsorId) {
      setError("Choisis un parrain.");
      return;
    }
    setSending(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb || !currentUser) throw new Error("Service indisponible.");

      const token = randomToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertErr } = await sb.from("distributor_invitation_tokens").insert({
        email: trimmedEmail,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        sponsor_id: sponsorId,
        token,
        invited_by: currentUser.id,
        expires_at: expiresAt,
      });
      if (insertErr) throw new Error(insertErr.message);

      const url = buildInviteUrl(token);
      setGeneratedUrl(url);
      onInvited(`Lien valable 7 jours généré pour ${trimmedEmail}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'invitation.");
    } finally {
      setSending(false);
    }
  }, [currentUser, email, firstName, lastName, sponsorId, onInvited]);

  async function copyUrl() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
    } catch {
      // no-op — user peut sélectionner à la main
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
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
        aria-label="Inviter un distributeur"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          borderRadius: 18,
          maxWidth: 500,
          width: "100%",
          padding: 24,
          border: "1px solid var(--ls-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: 0,
            marginBottom: 6,
          }}
        >
          Inviter un distributeur
        </p>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 16 }}>
          Un lien magique valable 7 jours sera généré. Tu pourras l'envoyer
          directement au futur distributeur (WhatsApp, email…).
        </p>

        {generatedUrl ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: "var(--ls-surface2)",
                border: "1px solid rgba(45,212,191,0.25)",
                wordBreak: "break-all",
                fontSize: 12,
                color: "var(--ls-text)",
                fontFamily: "DM Mono, monospace",
              }}
            >
              {generatedUrl}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={() => void copyUrl()}>Copier le lien</Button>
              <Button variant="secondary" onClick={onClose}>Fermer</Button>
            </div>
            <p style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
              Note : l'envoi email automatique est prévu en V2 — pour l'instant,
              colle ce lien dans WhatsApp/email/SMS.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <InviteField label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sending}
                placeholder="nouveau.distri@email.com"
                style={inputStyle}
              />
            </InviteField>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <InviteField label="Prénom">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={sending}
                  style={inputStyle}
                />
              </InviteField>
              <InviteField label="Nom">
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={sending}
                  style={inputStyle}
                />
              </InviteField>
            </div>
            <InviteField label="Parrain">
              <select
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                disabled={sending}
                style={inputStyle}
              >
                {sponsorOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </InviteField>

            {error ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(251,113,133,0.12)",
                  color: "#FBBFC8",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            ) : null}

            <div style={{ marginTop: 4, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={onClose} disabled={sending}>
                Annuler
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={sending || !email}>
                {sending ? "Génération…" : "Générer le lien"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InviteField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: "var(--ls-text-muted)",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 14,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};
