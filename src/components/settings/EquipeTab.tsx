// Chantier Paramètres Admin (2026-04-23) — commit 4/7.
//
// Onglet Équipe : liste compacte des distributeurs + lien vers /users pour
// l'édition détaillée + bouton "Inviter un distributeur".
//
// Fix V2 invite modal dedupe (2026-04-24) : l'ancienne InviteModal locale
// utilisait le flow "admin" (email + nom + parrain) qui ne fait plus
// sens → remplacée par <InviteDistributorModal /> partagé (flow sponsor
// lite : prénom + téléphone + WhatsApp). Même composant que sur /users.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAppContext } from "../../context/AppContext";
import { InviteDistributorModal } from "../users/InviteDistributorModal";
import { PassiveSupervisorInviteModal } from "./PassiveSupervisorInviteModal";

export function EquipeTab() {
  const { currentUser, users, clients, pvTransactions } = useAppContext();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [passiveOpen, setPassiveOpen] = useState(false);

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
      {/* Chantier arborescence HL (2026-05-21) : reconstruire downline
          historique avec distri externes hors-app + saisie PV mensuels. */}
      {currentUser.role === "admin" && (
        <Card className="space-y-2">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p className="eyebrow-label" style={{ color: "var(--ls-teal)" }}>🌳 Arborescence Herbalife</p>
              <p style={{ fontSize: 14, color: "var(--ls-text-muted)", marginTop: 4 }}>
                Reconstruis ta downline historique (distri hors-app comme Virgile, Aurélie) et saisis leurs PV mensuels pour activer ton override.
              </p>
            </div>
            <Link
              to="/parametres/arborescence-herbalife"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: 999,
                background: "linear-gradient(135deg, var(--ls-teal), color-mix(in srgb, var(--ls-teal) 80%, var(--ls-purple)))",
                color: "var(--ls-bg)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              Gérer mon arborescence →
            </Link>
          </div>
        </Card>
      )}

      {/* Raccourci PV (consolidation 2026-06-14) : la mise à jour des PV
          (override Bizworks + saisie hors-app) est centralisée dans l'onglet
          « PV équipe » de Rentabilité. */}
      {currentUser.role === "admin" && (
        <Card className="space-y-2">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p className="eyebrow-label" style={{ color: "var(--ls-gold)" }}>📊 Mise à jour des PV</p>
              <p style={{ fontSize: 14, color: "var(--ls-text-muted)", marginTop: 4 }}>
                Override mensuel des distri de l'app + saisie des distri hors-app (avec remise) — tout au même endroit.
              </p>
            </div>
            <Link
              to="/rentabilite?tab=pv-equipe"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 16px",
                borderRadius: 999,
                background: "var(--ls-gold)",
                color: "var(--ls-bg)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "DM Sans, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              Gérer les PV →
            </Link>
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow-label">Ligne distributeurs</p>
            <p style={{ fontSize: 14, color: "var(--ls-text-muted)", marginTop: 4 }}>
              {teamMembers.length} membre{teamMembers.length > 1 ? "s" : ""} dans ta ligne.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            {currentUser.role === "admin" && (
              <Button
                variant="ghost"
                onClick={() => setPassiveOpen(true)}
                title="Compte distri light (rentab + messagerie seulement, pas de gestion clients)"
              >
                🔗 Distri passif
              </Button>
            )}
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

      <InviteDistributorModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
      <PassiveSupervisorInviteModal
        open={passiveOpen}
        onClose={() => setPassiveOpen(false)}
      />
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

  // 13B.1 — toute la carte est cliquable vers /distributors/:id
  return (
    <Link
      to={`/distributors/${user.id}`}
      style={{
        padding: 14,
        borderRadius: 12,
        border: "1px solid var(--ls-border)",
        background: "var(--ls-surface2)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: user.active ? 1 : 0.55,
        textDecoration: "none",
        cursor: "pointer",
        transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor =
          "color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))";
        e.currentTarget.style.boxShadow =
          "0 6px 18px -8px color-mix(in srgb, var(--ls-teal) 30%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "var(--ls-border)";
        e.currentTarget.style.boxShadow = "none";
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
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 8,
                background: "rgba(220,38,38,0.08)",
                color: "#DC2626",
              }}
            >
              Inactif
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
          {user.role === "admin"
            ? "Admin"
            : user.role === "referent"
              ? "Référent"
              : "Distributeur"}
          {user.sponsorName ? ` · Parrain : ${user.sponsorName}` : ""}
        </div>
        <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 2 }}>
          {clientCount} client{clientCount > 1 ? "s" : ""} ·{" "}
          {pvMonth.toLocaleString("fr-FR")} PV mois
        </div>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: "var(--ls-text-muted)", flexShrink: 0 }}
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

