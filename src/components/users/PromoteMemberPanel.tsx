// Chantier « Promouvoir en distributeur » (2026-08-05)
// Flux admin : email → détection (a un compte ? déjà coach ? a une fiche ?) →
//   cas A (compte existant) : on réutilise le compte (garde email+mdp), on crée
//     la casquette distributeur, on choisit le sponsor + qui suit la fiche.
//   cas B (token-only, pas de mot de passe) : on bascule sur l'invitation distri.
// Backend : /api/admin-promote-member (admin only). Ne crée jamais de 2e compte,
// ne supprime jamais la fiche / le suivi de poids.

import { useMemo, useState, type CSSProperties } from "react";
import { useAppContext } from "../../context/AppContext";
import {
  lookupPromotableMember,
  promoteMemberToDistributor,
  type PromoteLookupResult
} from "../../services/supabaseService";
import { InviteDistributorModal } from "./InviteDistributorModal";

type Step = "email" | "configure" | "invite" | "done";

// ── À qui va sa fiche nutrition (2026-09-02) ─────────────────────────────────
//
// Ce menu ne décide pas d'une ligne en base : il décide COMBIEN D'APPLIS cette
// personne aura, pour toujours.
//
// La policy `clients select own or admin` dit « mes fiches, ou admin ». Une
// coach dont la fiche appartient à quelqu'un d'autre ne peut donc pas la lire :
// elle ne se voit pas dans ses propres Membres, et doit garder son espace
// client à côté pour suivre son poids. Deux applis, deux connexions.
//
// « Elle-même » referme ça : ses pesées atterrissent là où elle regarde déjà.
// C'est le montage de Thomas — sa fiche « Thomas Houbert », 19 bilans, lui
// appartient, et il n'a aucun espace membre séparé.
type FicheOwner = "keep" | "sponsor" | "self";

const label: CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "var(--ls-text-muted)",
  fontWeight: 600,
  marginBottom: 6,
  letterSpacing: "0.02em",
  textTransform: "uppercase"
};
const field: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 14,
  fontFamily: "DM Sans, sans-serif"
};
const card: CSSProperties = {
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: 16,
  marginBottom: 14
};

function firstWord(name: string | undefined | null) {
  return String(name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function PromoteMemberPanel() {
  const { users, currentUser } = useAppContext();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState<PromoteLookupResult | null>(null);

  const [sponsorId, setSponsorId] = useState(currentUser?.id ?? "");
  const [ficheOwner, setFicheOwner] = useState<FicheOwner>("keep");
  const [name, setName] = useState("");
  const [herbalifeId, setHerbalifeId] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [doneName, setDoneName] = useState("");
  const [doneReassigned, setDoneReassigned] = useState(false);

  const sponsorOptions = useMemo(
    () => (users ?? []).filter((u) => u.active),
    [users]
  );

  const currentOwnerName = useMemo(() => {
    const id = lookup?.fiche?.currentOwnerId;
    if (!id) return null;
    return (users ?? []).find((u) => u.id === id)?.name ?? null;
  }, [lookup, users]);

  const sponsorName = useMemo(
    () => (users ?? []).find((u) => u.id === sponsorId)?.name ?? "",
    [users, sponsorId]
  );

  /** Le prénom de la personne promue — pour que la note parle d'elle, pas de « ce membre ». */
  const prenomPromu = useMemo(
    () => firstWord(name) || firstWord(lookup?.fiche?.name) || firstWord(lookup?.suggestedName) || "Elle",
    [name, lookup]
  );

  function resetAll() {
    setStep("email");
    setEmail("");
    setError("");
    setLookup(null);
    setSponsorId(currentUser?.id ?? "");
    setFicheOwner("keep");
    setName("");
    setHerbalifeId("");
    setDoneName("");
    setDoneReassigned(false);
  }

  async function handleLookup() {
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Renseigne un email valide.");
      return;
    }
    setBusy(true);
    try {
      const res = await lookupPromotableMember(trimmed);
      if (!res.ok) {
        setError(res.error ?? "Vérification impossible.");
        return;
      }
      setLookup(res);
      if (res.isCoach) {
        setError(`Ce compte est déjà coach (rôle ${res.coachRole ?? "?"}). Rien à promouvoir.`);
        return;
      }
      if (!res.hasAuth) {
        setStep("invite");
        return;
      }
      // Cas A : compte existant, pas encore coach
      setName(res.suggestedName ?? "");
      // Si la fiche est déjà chez le sponsor courant, "keep" suffit ; sinon on
      // laisse l'admin choisir de la rattacher.
      setFicheOwner("keep");
      setStep("configure");
    } finally {
      setBusy(false);
    }
  }

  async function handlePromote() {
    setError("");
    if (!sponsorId) {
      setError("Choisis un sponsor (upline).");
      return;
    }
    if (name.trim().length < 2) {
      setError("Renseigne un nom affiché (min. 2 caractères).");
      return;
    }
    setBusy(true);
    try {
      const res = await promoteMemberToDistributor({
        email: email.trim().toLowerCase(),
        sponsorId,
        name: name.trim(),
        ficheOwner,
        herbalifeId: herbalifeId.trim() || undefined
      });
      if (res.ok) {
        setDoneName(res.name ?? name.trim());
        setDoneReassigned(!!res.ficheReassigned);
        setStep("done");
        return;
      }
      if (res.code === "slug_collision") {
        // Message déjà rédigé pour l'humain (« ajoute une initiale, ex Marie L. »)
        setError(res.error ?? "Ce prénom est déjà pris. Ajoute une initiale (ex « Marie L. »).");
        return;
      }
      if (res.code === "no_account") {
        setStep("invite");
        return;
      }
      setError(res.error ?? "Promotion impossible.");
    } finally {
      setBusy(false);
    }
  }

  const errorBox = error ? (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: "rgba(244,63,94,0.1)",
        border: "1px solid rgba(244,63,94,0.28)",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 12.5,
        color: "#fecdd3",
        marginBottom: 14,
        lineHeight: 1.5
      }}
    >
      {error}
    </div>
  ) : null;

  return (
    <div style={{ padding: 16, maxWidth: 520 }}>
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: "0 0 4px"
          }}
        >
          Promouvoir un membre en distributeur
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: 0, lineHeight: 1.5 }}>
          Un membre (client PWA / BBC) monte coach. Il garde son compte (email + mot de
          passe). Sa fiche client + son suivi de poids sont conservés.
        </p>
      </div>

      {/* ÉTAPE EMAIL */}
      {step === "email" && (
        <div style={card}>
          <label style={label} htmlFor="promote-email">
            Email du membre
          </label>
          <input
            id="promote-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleLookup();
            }}
            placeholder="peter.martin@gmail.com"
            style={field}
          />
          {errorBox ? <div style={{ marginTop: 12 }}>{errorBox}</div> : null}
          <button
            type="button"
            onClick={() => void handleLookup()}
            disabled={busy}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "11px 14px",
              borderRadius: 10,
              border: "none",
              background: "var(--ls-teal)",
              color: "#04201c",
              fontWeight: 700,
              fontSize: 13.5,
              fontFamily: "DM Sans, sans-serif",
              cursor: busy ? "wait" : "pointer"
            }}
          >
            {busy ? "Vérification…" : "Vérifier le compte"}
          </button>
          <p style={{ fontSize: 11.5, color: "var(--ls-text-hint)", margin: "10px 0 0", lineHeight: 1.5 }}>
            On détecte s'il a déjà un mot de passe et on choisit le bon chemin.
          </p>
        </div>
      )}

      {/* ÉTAPE CONFIGURE (cas A) */}
      {step === "configure" && (
        <>
          <div
            style={{
              ...card,
              background: "rgba(163,230,53,0.08)",
              border: "1px solid rgba(163,230,53,0.3)"
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#bef264", marginBottom: 4 }}>
              ✓ Compte existant détecté
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: "var(--ls-text)" }}>{email}</strong> garde son email + mot de
              passe. On ajoute la casquette distributeur — aucun 2ᵉ compte.
            </p>
          </div>

          <div style={card}>
            <label style={label} htmlFor="promote-sponsor">
              Sponsor (upline Herbalife)
            </label>
            <select
              id="promote-sponsor"
              value={sponsorId}
              onChange={(e) => setSponsorId(e.target.value)}
              style={field}
            >
              <option value="">— choisir —</option>
              {sponsorOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.id === currentUser?.id ? "(toi)" : `· ${u.role}`}
                </option>
              ))}
            </select>

            {lookup?.fiche ? (
              <>
                <label style={{ ...label, marginTop: 14 }} htmlFor="promote-fiche">
                  Sa fiche nutrition reste suivie par
                </label>
                <select
                  id="promote-fiche"
                  value={ficheOwner}
                  onChange={(e) => setFicheOwner(e.target.value as FicheOwner)}
                  style={field}
                >
                  <option value="keep">
                    {currentOwnerName ? `${currentOwnerName} (coach actuel)` : "Son coach actuel"}
                  </option>
                  <option value="sponsor">
                    {sponsorName ? `${sponsorName} — le sponsor` : "Le sponsor"}
                  </option>
                  <option value="self">
                    {prenomPromu} — elle-même · une seule appli
                  </option>
                </select>

                {/* La note change avec le choix : une explication figée serait
                    lue une fois puis ignorée. Ici elle répond toujours à la
                    seule question qui compte — « et concrètement, ça donne
                    quoi pour elle ? ». */}
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: ficheOwner === "self" ? "color-mix(in srgb, var(--ls-teal) 10%, transparent)" : "var(--ls-surface2)",
                    border: `1px solid ${ficheOwner === "self" ? "color-mix(in srgb, var(--ls-teal) 40%, transparent)" : "var(--ls-border)"}`,
                  }}
                >
                  <p style={{ fontSize: 12, color: "var(--ls-text)", margin: 0, lineHeight: 1.55, fontWeight: 600 }}>
                    {ficheOwner === "self"
                      ? `${prenomPromu} devient sa propre cliente.`
                      : ficheOwner === "sponsor"
                        ? `${sponsorName || "Le sponsor"} garde le suivi nutrition.`
                        : `${currentOwnerName || "Son coach actuel"} garde le suivi nutrition.`}
                  </p>
                  <p style={{ fontSize: 11.5, color: "var(--ls-text-muted)", margin: "5px 0 0", lineHeight: 1.55 }}>
                    {ficheOwner === "self" ? (
                      <>
                        Ses pesées et ses chiffres apparaissent <b>dans son app de coach</b>, onglet
                        Membres — comme les tiens. Elle n'a plus besoin de son espace client :
                        <b> une seule appli, une seule connexion</b>.
                      </>
                    ) : (
                      <>
                        Une coach ne peut lire que <b>ses propres</b> fiches. {prenomPromu} ne se
                        verra donc pas dans son app de coach, et devra garder son espace client à
                        côté pour suivre son poids — <b>deux applis</b>.
                      </>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 11.5, color: "var(--ls-text-hint)", margin: "10px 0 0", lineHeight: 1.5 }}>
                Aucune fiche client détectée pour ce compte — rien à rattacher.
              </p>
            )}

            <label style={{ ...label, marginTop: 14 }} htmlFor="promote-name">
              Nom affiché (vitrine coach)
            </label>
            <input
              id="promote-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Peter M."
              style={field}
            />

            <label style={{ ...label, marginTop: 14 }} htmlFor="promote-hlid">
              ID Herbalife <span style={{ textTransform: "none", fontWeight: 400 }}>(optionnel)</span>
            </label>
            <input
              id="promote-hlid"
              value={herbalifeId}
              onChange={(e) => setHerbalifeId(e.target.value)}
              placeholder="ex. 12A3456789"
              style={field}
            />
            <p style={{ fontSize: 11.5, color: "var(--ls-text-hint)", margin: "8px 0 0", lineHeight: 1.5 }}>
              Optionnel — s'il ne l'a pas sous la main, il le complétera lui-même dans
              Paramètres → Profil.
            </p>

            {errorBox ? <div style={{ marginTop: 12 }}>{errorBox}</div> : null}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={resetAll}
                style={{
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif"
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handlePromote()}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, var(--ls-lime), #65a30d)",
                  color: "#0d1a02",
                  fontWeight: 700,
                  fontSize: 13.5,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: busy ? "wait" : "pointer"
                }}
              >
                {busy ? "Promotion…" : "Promouvoir — garde ses identifiants"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ÉTAPE INVITE (cas B : token-only) */}
      {step === "invite" && (
        <div style={card}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ls-teal)", marginBottom: 4 }}>
            Pas encore de mot de passe
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
            Ce membre utilise seulement son lien PWA (token). Envoie-lui une invitation
            distributeur : il crée son accès (email + mot de passe) et arrive coach. Sa fiche
            reste conservée.
          </p>
          {errorBox}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={resetAll}
              style={{
                padding: "11px 14px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid var(--ls-border)",
                color: "var(--ls-text-muted)",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "DM Sans, sans-serif"
              }}
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              style={{
                flex: 1,
                padding: "11px 14px",
                borderRadius: 10,
                border: "none",
                background: "var(--ls-teal)",
                color: "#04201c",
                fontWeight: 700,
                fontSize: 13.5,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer"
              }}
            >
              Ouvrir l'invitation distributeur
            </button>
          </div>
          <InviteDistributorModal
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            initialFirstName={firstWord(lookup?.suggestedName)}
          />
        </div>
      )}

      {/* ÉTAPE DONE */}
      {step === "done" && (
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 30 }} aria-hidden="true">
              🎉
            </div>
            <h3
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ls-text)",
                margin: "6px 0 2px"
              }}
            >
              {doneName} est distributeur
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: 0, lineHeight: 1.5 }}>
              Il garde le même email et le même mot de passe.
            </p>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", fontSize: 12.5 }}>
            <li style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--ls-border)" }}>
              <span style={{ color: "var(--ls-text-muted)" }}>Fiche + suivi de poids</span>
              <span style={{ color: "#bef264", fontWeight: 600 }}>✓ conservés</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--ls-border)" }}>
              <span style={{ color: "var(--ls-text-muted)" }}>Suivi nutrition de la fiche</span>
              {/* Annoncer « rattachée au sponsor » après un rattachement à
                  elle-même serait un mensonge sur l'écran de confirmation —
                  celui qu'on relit trois semaines plus tard pour comprendre ce
                  qui a été fait. */}
              <span style={{ color: "var(--ls-text)", fontWeight: 600 }}>
                {doneReassigned
                  ? ficheOwner === "self"
                    ? `${doneName || prenomPromu} · elle-même`
                    : `${sponsorName} (rattachée)`
                  : currentOwnerName ?? "coach actuel"}
              </span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ color: "var(--ls-text-muted)" }}>À sa prochaine connexion</span>
              <span style={{ color: "var(--ls-text)", fontWeight: 600 }}>→ App coach</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={resetAll}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 10,
              background: "transparent",
              border: "1px solid var(--ls-border)",
              color: "var(--ls-text)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "DM Sans, sans-serif"
            }}
          >
            Promouvoir un autre membre
          </button>
        </div>
      )}
    </div>
  );
}
