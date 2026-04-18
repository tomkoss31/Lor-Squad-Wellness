import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { useAppContext } from "../context/AppContext";
import { PushNotificationSettings } from "../components/settings/PushNotificationSettings";
import { canSponsorDistributors, getRoleLabel } from "../lib/auth";
import { getPortfolioMetrics } from "../lib/portfolio";
import type { User } from "../types/domain";

type TabKey = "members" | "new" | "repair";
type RoleFilter = "all" | "admin" | "referent" | "distributor";

export function UsersPage() {
  const {
    users,
    clients,
    followUps,
    currentUser,
    storageMode,
    createUserAccess,
    repairUserAccess,
    updateUserAccess,
    updateUserStatus,
  } = useAppContext();

  // ─── States filtres + onglets ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("members");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");

  // ─── States formulaire création ───────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("distributor");
  const [sponsorId, setSponsorId] = useState("");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── States formulaire réparation ─────────────────────────────────
  const [repairUserId, setRepairUserId] = useState("");
  const [repairEmail, setRepairEmail] = useState("");
  const [repairName, setRepairName] = useState("");
  const [repairRole, setRepairRole] = useState<User["role"]>("referent");
  const [repairSponsorId, setRepairSponsorId] = useState("");
  const [repairActive, setRepairActive] = useState(true);
  const [repairError, setRepairError] = useState("");
  const [repairSuccess, setRepairSuccess] = useState("");

  const sponsorOptions = useMemo(
    () => users.filter((u) => u.active && canSponsorDistributors(u)),
    [users]
  );

  const userStats = useMemo(
    () => ({
      active: users.filter((u) => u.active).length,
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      referents: users.filter((u) => u.role === "referent").length,
      distributors: users.filter((u) => u.role === "distributor").length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    let list = users ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.id?.toLowerCase().includes(q) ||
          (u.sponsorName ?? "").toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }
    const roleOrder: Record<string, number> = { admin: 0, referent: 1, distributor: 2 };
    return [...list].sort((a, b) => {
      // 1. Actifs d'abord
      if (a.active !== b.active) return a.active ? -1 : 1;
      // 2. Puis par rôle
      return (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
    });
  }, [users, search, roleFilter]);

  useEffect(() => {
    if (role !== "distributor") setSponsorId("");
  }, [role]);

  useEffect(() => {
    if (repairRole !== "distributor") setRepairSponsorId("");
  }, [repairRole]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await createUserAccess({
      name,
      email,
      role,
      sponsorId: role === "distributor" ? sponsorId || undefined : undefined,
      active,
      mockPassword: password,
    });

    if (!result.ok) {
      setError(result.error ?? "Impossible de créer cet accès pour le moment.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess(`Accès créé pour ${name.trim()} (${email.trim().toLowerCase()}).`);
    setName("");
    setEmail("");
    setRole("distributor");
    setSponsorId("");
    setPassword("");
    setActive(true);
  }

  async function handleRepairSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await repairUserAccess({
      userId: repairUserId.trim() || undefined,
      email: repairEmail.trim(),
      name: repairName.trim() || undefined,
      role: repairRole,
      sponsorId: repairRole === "distributor" ? repairSponsorId || undefined : undefined,
      active: repairActive,
    });

    if (!result.ok) {
      setRepairError(result.error ?? "Impossible de réparer ce profil.");
      setRepairSuccess("");
      return;
    }

    setRepairError("");
    setRepairSuccess(`Profil réparé pour ${repairEmail.trim().toLowerCase()}.`);
    setRepairUserId("");
    setRepairEmail("");
    setRepairName("");
    setRepairRole("referent");
    setRepairSponsorId("");
    setRepairActive(true);
  }

  return (
    <div style={{ padding: "clamp(16px, 4vw, 28px)", maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* HEADER */}
      <div>
        <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 6, fontFamily: "DM Sans, sans-serif" }}>
          Équipe
        </div>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "clamp(20px, 4vw, 26px)", color: "var(--ls-text)", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
          Structure & accès
        </h1>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: 0 }}>
          Gère tes distributeurs, leurs accès et leurs rattachements.
        </p>
      </div>

      {/* 5 STATS COMPACTES */}
      <div className="users-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {[
          { label: "Actifs", value: userStats.active, borderColor: "#0D9488", textColor: "var(--ls-teal)" },
          { label: "Total", value: userStats.total, borderColor: "transparent", textColor: "var(--ls-text)" },
          { label: "Admins", value: userStats.admins, borderColor: "#378ADD", textColor: "#378ADD" },
          { label: "Référents", value: userStats.referents, borderColor: "#BA7517", textColor: "#BA7517" },
          { label: "Distrib.", value: userStats.distributors, borderColor: "#639922", textColor: "#639922" },
        ].map(({ label, value, borderColor, textColor }) => (
          <div
            key={label}
            style={{
              background: "var(--ls-surface)",
              border: "1px solid var(--ls-border)",
              borderTop: borderColor !== "transparent" ? `2px solid ${borderColor}` : "1px solid var(--ls-border)",
              borderRadius: 14,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 500, marginBottom: 4, fontFamily: "DM Sans, sans-serif" }}>
              {label}
            </div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: textColor, lineHeight: 1 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* CARD PRINCIPALE avec 3 ONGLETS */}
      <div style={{ background: "var(--ls-surface)", border: "1px solid var(--ls-border)", borderRadius: 14, overflow: "hidden" }}>
        {/* Barre d'onglets */}
        <div className="users-tabs-bar" style={{ display: "flex", borderBottom: "1px solid var(--ls-border)", overflowX: "auto" }}>
          {(
            [
              {
                key: "members",
                label: "Membres",
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                ),
              },
              {
                key: "new",
                label: "Nouveau compte",
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                ),
              },
              {
                key: "repair",
                label: "Réparer un compte",
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                ),
              },
            ] as const
          ).map(({ key, label, icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "12px 18px",
                  border: "none",
                  background: "transparent",
                  color: isActive ? "var(--ls-gold)" : "var(--ls-text-muted)",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  borderBottom: isActive ? "2px solid var(--ls-gold)" : "2px solid transparent",
                  marginBottom: -1,
                  fontFamily: "DM Sans, sans-serif",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        {/* ONGLET MEMBRES */}
        {activeTab === "members" && (
          <div style={{ padding: 16 }}>
            {/* Recherche + filtres */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-hint)" strokeWidth="1.5" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, email..."
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 32px",
                    border: "1px solid var(--ls-border)",
                    borderRadius: 9,
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13,
                    background: "var(--ls-input-bg)",
                    color: "var(--ls-text)",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(
                  [
                    { key: "all", label: "Tous" },
                    { key: "admin", label: "Admins" },
                    { key: "referent", label: "Référents" },
                    { key: "distributor", label: "Distributeurs" },
                  ] as const
                ).map(({ key, label }) => {
                  const isActive = roleFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setRoleFilter(key)}
                      style={{
                        padding: "8px 12px",
                        border: isActive ? "1.5px solid var(--ls-gold)" : "1px solid var(--ls-border)",
                        background: isActive ? "rgba(184,146,42,0.08)" : "transparent",
                        color: isActive ? "var(--ls-gold)" : "var(--ls-text-muted)",
                        borderRadius: 9,
                        fontSize: 11,
                        fontWeight: isActive ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Liste membres accordéon */}
            {filteredUsers.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ls-text-hint)", fontSize: 13 }}>
                Aucun membre trouvé.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredUsers.map((user) => {
                  const isExpanded = expandedUserId === user.id;
                  const metrics = getPortfolioMetrics(
                    user,
                    clients ?? [],
                    followUps ?? [],
                    users ?? [],
                    user.role === "referent" ? "network" : "personal"
                  );
                  const rc = getRoleColors(user.role);

                  return (
                    <div
                      key={user.id}
                      style={{
                        background: "var(--ls-surface)",
                        border: isExpanded ? "1.5px solid var(--ls-gold)" : "1px solid var(--ls-border)",
                        borderRadius: 11,
                        overflow: "hidden",
                        opacity: user.active ? 1 : 0.65,
                        transition: "all 0.15s",
                      }}
                    >
                      {/* Ligne principale cliquable */}
                      <div
                        onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.background = "var(--ls-surface2)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.background = "var(--ls-surface)";
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {/* Avatar coloré selon rôle */}
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: rc.avatarBg,
                            border: `2px solid ${rc.avatarBorder}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "Syne, sans-serif",
                            fontWeight: 800,
                            fontSize: 12,
                            color: rc.avatarText,
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(user.name)}
                        </div>

                        {/* Infos centrales */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: isExpanded ? "var(--ls-gold)" : "var(--ls-text)" }}>
                              {user.name}
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: rc.chipBg, color: rc.chipText }}>
                              {rc.label}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 9px",
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 600,
                                background: user.active ? "rgba(13,148,136,0.1)" : "var(--ls-surface2)",
                                color: user.active ? "var(--ls-teal)" : "var(--ls-text-muted)",
                              }}
                            >
                              {user.active ? "Actif" : "Inactif"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--ls-text-hint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {user.email} · {metrics.clients.length} clients · {metrics.relanceFollowUps.length} relances
                          </div>
                        </div>

                        {/* Périmètre + chevron */}
                        <div
                          className="users-perimeter-hint"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 10,
                            color: isExpanded ? "var(--ls-gold)" : "var(--ls-text-hint)",
                            fontWeight: isExpanded ? 600 : 400,
                            flexShrink: 0,
                          }}
                        >
                          <span>{getPerimeterLabel(user.role)}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {isExpanded ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                          </svg>
                        </div>
                      </div>

                      {/* Panneau déplié */}
                      {isExpanded && (
                        <div style={{ background: "var(--ls-surface2)", borderTop: "1px solid var(--ls-border)", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                          {/* Rattachement (sauf admin) */}
                          {user.role !== "admin" && (
                            <div>
                              <div style={{ fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", color: "var(--ls-text)", fontWeight: 500, marginBottom: 8, fontFamily: "DM Sans, sans-serif" }}>
                                Rattachement
                              </div>
                              <UserInlineAttachmentForm
                                user={user}
                                sponsors={sponsorOptions.filter((s) => s.id !== user.id)}
                                onSave={(payload) => updateUserAccess(user.id, payload)}
                              />
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 4, borderTop: "1px solid var(--ls-border)", marginTop: 4 }}>
                            <Link
                              to={`/distributors/${user.id}`}
                              style={{
                                padding: "8px 14px",
                                border: "none",
                                background: "var(--ls-gold)",
                                color: "#fff",
                                borderRadius: 9,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                fontFamily: "DM Sans, sans-serif",
                                boxShadow: "0 2px 6px rgba(184,146,42,0.2)",
                              }}
                            >
                              Voir portefeuille
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                              </svg>
                            </Link>

                            <UserInlinePasswordForm userId={user.id} userName={user.name} />

                            <button
                              onClick={() => void updateUserStatus(user.id, !user.active)}
                              disabled={currentUser?.id === user.id}
                              title={currentUser?.id === user.id ? "Vous ne pouvez pas désactiver votre propre compte" : ""}
                              style={{
                                padding: "7px 12px",
                                border: user.active ? "1px solid var(--ls-border)" : "1px solid rgba(13,148,136,0.2)",
                                background: "transparent",
                                color: user.active ? "var(--ls-text-hint)" : "var(--ls-teal)",
                                borderRadius: 8,
                                fontSize: 11,
                                cursor: currentUser?.id === user.id ? "not-allowed" : "pointer",
                                marginLeft: "auto",
                                fontFamily: "DM Sans, sans-serif",
                                opacity: currentUser?.id === user.id ? 0.5 : 1,
                              }}
                            >
                              {user.active ? "Désactiver" : "Réactiver"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ONGLET NOUVEAU COMPTE */}
        {activeTab === "new" && (
          <div style={{ padding: 20 }}>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ls-text-muted)]">Nom affiché</label>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Exemple : Camille Martin" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--ls-text-muted)]">Email professionnel</label>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="camille@lorsquadwellness.app" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">Rôle</label>
                  <select value={role} onChange={(event) => setRole(event.target.value as User["role"])}>
                    <option value="distributor">Distributeur</option>
                    <option value="referent">Référent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">Mot de passe initial</label>
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Choisir un mot de passe" />
                </div>
              </div>

              {role === "distributor" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">Rattachement référent / sponsor</label>
                  <select value={sponsorId} onChange={(event) => setSponsorId(event.target.value)}>
                    <option value="">Aucun rattachement pour l'instant</option>
                    {sponsorOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} - {getRoleLabel(u.role)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-[20px] bg-[var(--ls-surface2)] px-4 py-3 text-sm text-[var(--ls-text-muted)]">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4" />
                Compte actif dès sa création
              </label>

              {error ? <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
              {success ? <div className="rounded-[20px] border border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.1)] px-4 py-3 text-sm text-[#2DD4BF]">{success}</div> : null}

              <Button className="w-full">Créer cet accès</Button>
            </form>
          </div>
        )}

        {/* ONGLET RÉPARER UN COMPTE */}
        {activeTab === "repair" && (
          <div style={{ padding: 20 }}>
            <form className="space-y-4" onSubmit={handleRepairSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">Email Auth</label>
                  <input type="email" value={repairEmail} onChange={(event) => setRepairEmail(event.target.value)} placeholder="priscalexnutrition@gmail.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">ID Supabase (optionnel)</label>
                  <input value={repairUserId} onChange={(event) => setRepairUserId(event.target.value)} placeholder="2c6653c6-525a-48b7-8965-ee8439bf1798" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">Nom affiché (optionnel)</label>
                  <input value={repairName} onChange={(event) => setRepairName(event.target.value)} placeholder="Prisca et Alex" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">Rôle</label>
                  <select value={repairRole} onChange={(event) => setRepairRole(event.target.value as User["role"])}>
                    <option value="referent">Référent</option>
                    <option value="distributor">Distributeur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {repairRole === "distributor" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--ls-text-muted)]">Rattachement référent / sponsor</label>
                  <select value={repairSponsorId} onChange={(event) => setRepairSponsorId(event.target.value)}>
                    <option value="">Aucun rattachement pour l'instant</option>
                    {sponsorOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} - {getRoleLabel(u.role)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <label className="flex items-center gap-3 rounded-[20px] bg-[var(--ls-surface2)] px-4 py-3 text-sm text-[var(--ls-text-muted)]">
                <input type="checkbox" checked={repairActive} onChange={(event) => setRepairActive(event.target.checked)} className="h-4 w-4" />
                Profil applicatif actif
              </label>

              {repairError ? <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{repairError}</div> : null}
              {repairSuccess ? <div className="rounded-[20px] border border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.1)] px-4 py-3 text-sm text-[#2DD4BF]">{repairSuccess}</div> : null}

              <Button className="w-full">Réparer ce profil</Button>

              {storageMode === "supabase" ? (
                <div className="rounded-[20px] bg-[rgba(45,212,191,0.1)] px-4 py-4 text-sm leading-7 text-[var(--ls-text)]">
                  Si le compte existe dans Authentication mais pas ici, répare-le depuis ce bloc.
                </div>
              ) : null}
            </form>
          </div>
        )}
      </div>

      {/* NOTIFICATIONS COMPACTES */}
      <PushNotificationSettings userId={currentUser?.id} userName={currentUser?.name} />
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getRoleColors(role: string) {
  switch (role) {
    case "admin":
      return {
        label: "Admin",
        avatarBg: "#E6F1FB",
        avatarBorder: "#B5D4F4",
        avatarText: "#0C447C",
        chipBg: "#E6F1FB",
        chipText: "#0C447C",
      };
    case "referent":
      return {
        label: "Référent",
        avatarBg: "#FAEEDA",
        avatarBorder: "#FAC775",
        avatarText: "#633806",
        chipBg: "#FAEEDA",
        chipText: "#633806",
      };
    case "distributor":
    default:
      return {
        label: "Distributeur",
        avatarBg: "#EAF3DE",
        avatarBorder: "#C0DD97",
        avatarText: "#27500A",
        chipBg: "#EAF3DE",
        chipText: "#27500A",
      };
  }
}

function getPerimeterLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Toute la base";
    case "referent":
      return "Ses clients + équipe";
    case "distributor":
      return "Ses clients";
    default:
      return "";
  }
}

// ─── Composants inline ───────────────────────────────────────────────
function UserInlineAttachmentForm({
  user,
  sponsors,
  onSave,
}: {
  user: User;
  sponsors: User[];
  onSave: (payload: { role: User["role"]; sponsorId?: string }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [role, setRole] = useState<User["role"]>(user.role);
  const [sponsorId, setSponsorId] = useState(user.sponsorId ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const result = await onSave({
        role,
        sponsorId: role === "distributor" ? sponsorId || undefined : undefined,
      });
      if (result.ok) {
        setFeedback({ type: "ok", msg: "Enregistré" });
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setFeedback({ type: "err", msg: result.error ?? "Erreur" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="users-attach-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as User["role"])}
          style={{
            padding: "8px 10px",
            border: "1px solid var(--ls-border)",
            borderRadius: 8,
            fontSize: 12,
            background: "var(--ls-surface)",
            color: "var(--ls-text)",
            outline: "none",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <option value="distributor">Distributeur</option>
          <option value="referent">Référent</option>
        </select>
        <select
          value={sponsorId}
          onChange={(e) => setSponsorId(e.target.value)}
          disabled={role !== "distributor"}
          style={{
            padding: "8px 10px",
            border: "1px solid var(--ls-border)",
            borderRadius: 8,
            fontSize: 12,
            background: role !== "distributor" ? "var(--ls-surface2)" : "var(--ls-surface)",
            color: "var(--ls-text)",
            outline: "none",
            fontFamily: "DM Sans, sans-serif",
            opacity: role !== "distributor" ? 0.5 : 1,
          }}
        >
          <option value="">— Choisir un sponsor —</option>
          {sponsors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} - {getRoleLabel(s.role)}
            </option>
          ))}
        </select>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{
            padding: "8px 14px",
            border: "none",
            background: "var(--ls-gold)",
            color: "#fff",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            whiteSpace: "nowrap",
            fontFamily: "DM Sans, sans-serif",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "..." : "Enregistrer"}
        </button>
      </div>
      {feedback && (
        <div style={{ marginTop: 6, fontSize: 11, color: feedback.type === "ok" ? "var(--ls-teal)" : "var(--ls-coral)" }}>
          {feedback.msg}
        </div>
      )}
    </div>
  );
}

function UserInlinePasswordForm({ userId, userName }: { userId: string; userName: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: "8px 14px",
          border: "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          color: "var(--ls-text-muted)",
          borderRadius: 9,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Changer le mot de passe
      </button>

      {showModal && (
        <PasswordChangeModal userId={userId} userName={userName} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function PasswordChangeModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const { updateUserPassword } = useAppContext();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    if (!password || password.length < 6) return;
    setSaving(true);
    setError("");
    try {
      const result = await updateUserPassword(userId, password);
      if (result.ok) {
        setDone(true);
        setTimeout(onClose, 1500);
      } else {
        setError(result.error ?? "Impossible de modifier le mot de passe.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: "var(--ls-text)", marginBottom: 6 }}>
          Changer le mot de passe
        </div>
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 18 }}>
          Nouveau mot de passe pour <strong style={{ color: "var(--ls-text)" }}>{userName}</strong>
        </div>

        {done ? (
          <div
            style={{
              padding: 16,
              background: "rgba(13,148,136,0.08)",
              borderRadius: 10,
              textAlign: "center",
              color: "var(--ls-teal)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            ✓ Mot de passe mis à jour
          </div>
        ) : (
          <>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe (6 caractères min.)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && password.length >= 6 && !saving) void handleApply();
                if (e.key === "Escape") onClose();
              }}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid var(--ls-border)",
                borderRadius: 10,
                fontSize: 14,
                background: "var(--ls-input-bg)",
                color: "var(--ls-text)",
                outline: "none",
                marginBottom: 14,
                fontFamily: "DM Sans, sans-serif",
              }}
            />
            {error && (
              <div style={{ padding: "8px 12px", borderRadius: 9, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--ls-coral)", fontSize: 12, marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: 11,
                  border: "1px solid var(--ls-border)",
                  background: "transparent",
                  color: "var(--ls-text-muted)",
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => void handleApply()}
                disabled={saving || password.length < 6}
                style={{
                  flex: 1,
                  padding: 11,
                  border: "none",
                  background: "var(--ls-gold)",
                  color: "#fff",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving || password.length < 6 ? "not-allowed" : "pointer",
                  opacity: saving || password.length < 6 ? 0.5 : 1,
                  fontFamily: "Syne, sans-serif",
                }}
              >
                {saving ? "Application..." : "Appliquer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
