// =============================================================================
// NotificationOptInPopup — popup d'activation des notifications à l'ouverture.
//
// Règle (demande Thomas) : toute personne connectée qui n'a PAS activé les
// notifications voit un popup à l'ouverture (mobile ET PC). Clic → demande la
// permission + s'abonne (web push). « Plus tard » = masqué pour la session.
//
// Réutilise usePushNotifications (permission + subscribe). Tokens --ls-*.
// =============================================================================

import { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";

const DISMISS_KEY = "ls-notif-optin-dismissed-session";

export function NotificationOptInPopup() {
  const { currentUser } = useAppContext();
  const { permission, subscribed, loading, subscribe } = usePushNotifications(
    currentUser?.id,
    currentUser?.name,
  );
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  // Conditions de masquage : pas connecté, en cours de check, déjà abonné,
  // non supporté, refusé navigateur (on ne peut plus re-demander), ou reporté.
  if (!currentUser || loading || subscribed || dismissed) return null;
  if (permission === "unsupported" || permission === "denied") return null;

  async function enable() {
    setBusy(true);
    await subscribe();
    setBusy(false);
    // subscribe() passe subscribed=true → le popup disparaît tout seul.
  }
  function later() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage indispo — best-effort */
    }
    setDismissed(true);
  }

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Activer les notifications">
      <div style={card}>
        <div style={iconWrap} aria-hidden="true">🔔</div>
        <h2 style={titleStyle}>Active tes notifications</h2>
        <p style={bodyStyle}>
          Pour ne rien rater : tes RDV, tes relances clients et tes nouveautés.
          En 1 clic, sur ce téléphone comme sur cet ordinateur.
        </p>
        <button type="button" onClick={() => void enable()} disabled={busy} style={primaryBtn}>
          {busy ? "Activation…" : "Activer les notifications"}
        </button>
        <button type="button" onClick={later} style={ghostBtn}>
          Plus tard
        </button>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: "26px 22px 20px",
  textAlign: "center",
  boxShadow: "var(--ls-shadow-md)",
};

const iconWrap: React.CSSProperties = {
  fontSize: 34,
  lineHeight: 1,
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 21,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const bodyStyle: React.CSSProperties = {
  margin: "10px 0 20px",
  fontSize: 14.5,
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  background: "var(--ls-gold)",
  color: "var(--ls-gold-contrast)",
  border: "none",
  borderRadius: 12,
  padding: "14px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 48,
};

const ghostBtn: React.CSSProperties = {
  width: "100%",
  marginTop: 8,
  background: "transparent",
  color: "var(--ls-text-muted)",
  border: "none",
  borderRadius: 12,
  padding: "10px",
  fontSize: 13.5,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};
