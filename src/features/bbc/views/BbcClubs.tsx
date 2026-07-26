// =============================================================================
// BbcClubs — le réseau de clubs (chantier BBC). Données RÉELLES (table clubs).
// L'admin crée son club → passe en BBC (RPC set_club_model). C'est la
// duplication rendue concrète : chaque club = une carte, + « créer un club ».
// =============================================================================

import { useState } from "react";
import type { Club } from "../../../types/domain";

interface BbcClubsProps {
  clubs?: Club[];
  isAdmin?: boolean;
  onCreateClub?: (name: string, city: string) => Promise<boolean>;
  onRenameClub?: (clubId: string, name: string, city: string) => Promise<boolean>;
}

export function BbcClubs({ clubs = [], isAdmin, onCreateClub, onRenameClub }: BbcClubsProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    if (busy || !name.trim() || !onCreateClub) return;
    setBusy(true);
    setErr("");
    const ok = await onCreateClub(name, city);
    if (ok) {
      setName("");
      setCity("");
    } else {
      setErr("Création impossible — réessaie.");
    }
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
      {clubs.map((c) => (
        <ClubCard key={c.id} club={c} onRename={onRenameClub} />
      ))}

      {/* Créer / dupliquer un club (admin) */}
      {isAdmin && onCreateClub ? (
        <div style={{ border: "1.5px dashed var(--ls-bbc-line2)", borderRadius: 20, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-lime)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{clubs.length ? "Dupliquer un club" : "Créer mon club BBC"}</div>
              <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>Le modèle BBC, prêt à ouvrir.</div>
            </div>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="nom du club (ex. Verdun)"
            style={{ height: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none" }} />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="ville (optionnel)"
            style={{ height: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none" }} />
          {err ? <div style={{ fontSize: 11.5, color: "var(--ls-bbc-coral)" }}>{err}</div> : null}
          <button type="button" onClick={() => void create()} disabled={busy || !name.trim()}
            style={{ height: 48, border: 0, borderRadius: 12, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 14, fontWeight: 700, cursor: busy || !name.trim() ? "not-allowed" : "pointer", opacity: busy || !name.trim() ? 0.55 : 1 }}>
            {busy ? "création…" : "Créer & activer BBC"}
          </button>
        </div>
      ) : null}

      {clubs.length === 0 && !isAdmin ? (
        <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: 24, fontSize: 13, color: "var(--ls-bbc-muted)" }}>
          Aucun club pour l'instant.
        </div>
      ) : null}
    </div>
  );
}

/**
 * La carte d'un club, renommable sur place. Un nom de club se décide vite et se
 * regrette parfois : il ne doit pas être figé à la création.
 */
function ClubCard({
  club,
  onRename,
}: {
  club: Club;
  onRename?: (clubId: string, name: string, city: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(club.name ?? "");
  const [city, setCity] = useState(club.city ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (busy || !name.trim() || !onRename) return;
    setBusy(true);
    setErr("");
    const ok = await onRename(club.id, name, city);
    setBusy(false);
    if (ok) setEditing(false);
    else setErr("Enregistrement impossible — réessaie.");
  }

  function cancel() {
    setName(club.name ?? "");
    setCity(club.city ?? "");
    setErr("");
    setEditing(false);
  }

  return (
    <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-lime)", borderRadius: 20, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--ls-bbc-lime)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ls-bbc-font-display)", fontSize: 19, color: "var(--ls-bbc-lime-ink)" }}>B</div>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ls-bbc-teal)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-teal)", boxShadow: "0 0 7px var(--ls-bbc-teal)" }} />actif
        </span>
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nom du club"
            placeholder="nom du club"
            style={{ height: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none" }}
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Ville du club"
            placeholder="ville"
            style={{ height: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none" }}
          />
          {err ? <div style={{ fontSize: 11.5, color: "var(--ls-bbc-coral)" }}>{err}</div> : null}
          <div style={{ display: "flex", gap: 9 }}>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !name.trim()}
              style={{ flex: 1, height: 44, border: 0, borderRadius: 12, background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, fontWeight: 700, cursor: busy || !name.trim() ? "not-allowed" : "pointer", opacity: busy || !name.trim() ? 0.55 : 1 }}
            >
              {busy ? "enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={cancel}
              style={{ height: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, cursor: "pointer" }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 24, letterSpacing: "0.01em" }}>{club.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 2 }}>{club.city || "—"}</div>
          </div>
          {onRename ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Renommer le club"
              style={{ flex: "none", padding: "7px 12px", borderRadius: 10, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12, cursor: "pointer" }}
            >
              Renommer
            </button>
          ) : null}
        </div>
      )}

      <div style={{ paddingTop: 14, borderTop: "1px solid var(--ls-bbc-line)", fontSize: 11.5, color: "var(--ls-bbc-hint)" }}>
        Stats (cobayes · membres · PV) branchées aux prochains lots.
      </div>
    </div>
  );
}
