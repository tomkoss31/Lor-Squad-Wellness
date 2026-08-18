// =============================================================================
// MemberReglages — les réglages de la membre : notifications, thème, sortie.
//
// Lot 4 de l'alignement BBC ↔ PWA classique (audit du 18/08). Deux manques,
// dont un grave :
//
//   1. ELLE NE POUVAIT PAS ACTIVER SES NOTIFICATIONS. La barrière d'activation
//      n'existe que côté classique. Mesuré en base le 18/08 : sur les deux
//      membres BBC, un seul a un abonnement — et il vient de son passé de
//      client classique. Gwendoline, arrivée PAR le club, n'en a aucun et ne
//      pouvait pas en créer. Conséquence : les trois rappels de rituel de
//      `bbc-call-reminder` (midi J / −30 min / −15 min) lui répondaient
//      `no_subscription`. C'est ce lot qui les allume.
//
//   2. AUCUN ÉCRAN DE RÉGLAGES. Pas de thème clair, pas de « revoir le tuto »,
//      et surtout pas de DÉCONNEXION : l'avatar n'était pas cliquable.
//
// ⚠️ POURQUOI ON NE RÉUTILISE PAS `PushGate` NI `ProfilScreen` : ils ne parlent
// que les jetons de la PWA v2 (--bg, --surface, --text…), qui n'existent PAS
// sous `.bbc-mode`. Les réutiliser tels quels donnerait un écran INVISIBLE, pas
// un écran moche. En revanche `pushSubscribe.ts` est du TypeScript pur, sans
// style : on l'importe tel quel, une seule implémentation dans le projet.
//
// ⚠️ `.bbc-light` doit vivre sur le MÊME élément que `.bbc-mode` (le sélecteur
// est `.bbc-mode.bbc-light`). Cette feuille redéclare `bbc-mode` sur son
// panneau — donc elle doit aussi porter `bbc-light`, sinon elle resterait
// sombre pendant que le reste de l'app passe en clair.
// =============================================================================

import { useEffect, useState } from "react";
import { enablePush, pushPermission } from "../../client-pwa/pushSubscribe";

interface Props {
  token: string;
  clientName?: string;
  coachName?: string;
  clair: boolean;
  onTheme: (clair: boolean) => void;
  onRevoirEntree: () => void;
  onFermer: () => void;
}

type EtatPush = NotificationPermission | "unsupported";

const eyebrow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--ls-bbc-font-mono)",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: "0.14em",
  color: "var(--ls-bbc-muted)",
  textTransform: "uppercase",
};

const ligne: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  minHeight: 52,
  padding: "12px 14px",
  borderRadius: 13,
  background: "var(--ls-bbc-s2)",
  border: "1px solid var(--ls-bbc-line)",
  color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 14,
  textAlign: "left",
  cursor: "pointer",
};

export function MemberReglages({ token, clientName, coachName, clair, onTheme, onRevoirEntree, onFermer }: Props) {
  const [etat, setEtat] = useState<EtatPush>("default");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // L'état ne se lit qu'au montage côté navigateur : `Notification` n'existe
  // pas au rendu serveur, et la permission peut avoir changé dans les réglages
  // du téléphone depuis la dernière visite.
  useEffect(() => {
    setEtat(pushPermission());
  }, []);

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  async function activer() {
    if (enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      const ok = await enablePush(token);
      setEtat(pushPermission());
      if (!ok) {
        // On ne dit pas « erreur » : dans neuf cas sur dix la personne a
        // simplement refusé, et il faut lui dire OÙ ça se rattrape.
        setErreur(
          Notification.permission === "denied"
            ? "tu les avais refusées. il faut les réautoriser dans les réglages de ton téléphone, puis revenir ici."
            : "ça n'a pas pris. réessaie dans un instant.",
        );
      }
    } catch {
      setErreur("ça n'a pas pris. réessaie dans un instant.");
    } finally {
      setEnCours(false);
    }
  }

  const ditPush =
    etat === "granted" ? "activées"
    : etat === "denied" ? "refusées"
    : etat === "unsupported" ? "indisponibles sur ce téléphone"
    : "pas encore activées";

  return (
    <div
      onClick={onFermer}
      style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={clair ? "bbc-mode bbc-light" : "bbc-mode"}
        role="dialog"
        aria-modal="true"
        aria-label="Mes réglages"
        style={{
          width: "100%",
          maxWidth: 460,
          margin: "0 auto",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "26px 26px 0 0",
          padding: "20px 20px calc(24px + env(safe-area-inset-bottom))",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
          animation: "lbSheet .3s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--ls-bbc-line2)", margin: "0 auto 16px" }} />

        <div style={eyebrow}>mes réglages</div>
        <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 21, margin: "5px 0 2px" }}>
          {(clientName ?? "").split(/\s+/)[0] || "toi"}
        </div>
        {coachName ? (
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-muted)" }}>
            coach {coachName.split(/\s+/)[0]}
          </div>
        ) : null}

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <div style={{ ...eyebrow, marginTop: 20, marginBottom: 8 }}>notifications</div>
        <div style={{ ...ligne, cursor: "default", alignItems: "flex-start", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <span
              aria-hidden="true"
              style={{
                width: 8, height: 8, borderRadius: 999, flex: "none",
                background: etat === "granted" ? "var(--ls-bbc-lime)" : etat === "denied" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-amber)",
              }}
            />
            <span style={{ flex: 1, fontWeight: 600 }}>elles sont {ditPush}</span>
          </div>
          <span style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5 }}>
            {etat === "granted"
              ? "ton coach peut te prévenir avant les rituels du club."
              : "sans elles, les rappels du club et de ton coach ne t'arrivent pas."}
          </span>
        </div>

        {etat !== "granted" && etat !== "unsupported" ? (
          <button
            type="button"
            onClick={() => void activer()}
            disabled={enCours}
            style={{
              width: "100%", minHeight: 50, marginTop: 10, border: 0, borderRadius: 13,
              background: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-ink, #06241F)",
              fontFamily: "var(--ls-bbc-font-body)", fontSize: 15, fontWeight: 700,
              cursor: enCours ? "wait" : "pointer", opacity: enCours ? 0.6 : 1,
            }}
          >
            {enCours ? "activation…" : "activer les notifications"}
          </button>
        ) : null}
        {erreur ? (
          <div role="alert" style={{ marginTop: 9, fontSize: 12.5, color: "var(--ls-bbc-coral)", lineHeight: 1.5 }}>{erreur}</div>
        ) : null}

        {/* ── L'app ───────────────────────────────────────────────────────── */}
        <div style={{ ...eyebrow, marginTop: 20, marginBottom: 8 }}>l'app</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={() => onTheme(!clair)} style={ligne}>
            <span aria-hidden="true" style={{ fontSize: 17 }}>{clair ? "☀️" : "🌙"}</span>
            <span style={{ flex: 1 }}>apparence</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>
              {clair ? "clair" : "sombre"}
            </span>
          </button>

          <button type="button" onClick={onRevoirEntree} style={ligne}>
            <span aria-hidden="true" style={{ fontSize: 17 }}>🎬</span>
            <span style={{ flex: 1 }}>revoir la présentation</span>
          </button>
        </div>

        {/* ── Sortir ──────────────────────────────────────────────────────── */}
        <div style={{ ...eyebrow, marginTop: 20, marginBottom: 8 }}>sortir</div>
        <button
          type="button"
          onClick={() => {
            // Le lien d'accès EST le jeton dans l'URL : la seule façon
            // honnête de « déconnecter », c'est de quitter la page. On ne
            // prétend pas fermer une session qui n'existe pas.
            window.location.href = "/";
          }}
          style={{ ...ligne, borderColor: "color-mix(in srgb, var(--ls-bbc-coral) 42%, var(--ls-bbc-line))" }}
        >
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: "var(--ls-bbc-coral)", flex: "none" }} />
          <span style={{ flex: 1 }}>quitter mon espace</span>
        </button>
        <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 8, lineHeight: 1.5 }}>
          ton espace s'ouvre par le lien que ton coach t'a envoyé — garde-le,
          c'est lui ta clé.
        </div>

        <button
          type="button"
          onClick={onFermer}
          style={{ ...ligne, marginTop: 16, justifyContent: "center", background: "transparent", color: "var(--ls-bbc-muted)" }}
        >
          fermer
        </button>
      </div>
    </div>
  );
}
