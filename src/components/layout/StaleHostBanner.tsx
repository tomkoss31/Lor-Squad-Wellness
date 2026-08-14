// =============================================================================
// StaleHostBanner — bandeau d'alerte si l'utilisateur utilise une URL
// Vercel d'aperçu obsolète (lor-squad-*.vercel.app) au lieu du domaine
// canonique. Sert principalement à Mandy qui pourrait avoir épinglé l'URL
// de dev historique sur sa PWA Safari.
//
// Bug constaté 2026-05-20 : Mandy ne reçoit pas certaines maj parce que
// son PWA cache pointe vers un déploiement figé.
// =============================================================================

import { useEffect, useState } from "react";

const CANONICAL_HOSTS = ["labase360.app", "labase360.fr", "labase360.com"];
const STALE_PATTERN = /^lor[-_]squad/i;
// L'alias de branche de dev/thomas-test commence AUSSI par « lor-squad » : sans
// cette exception, l'aperçu dev affichait un bandeau invitant à le quitter pour
// « avoir toutes les mises à jour » — alors que c'est le seul endroit où elles
// sont. Suivre le conseil menait sur labase360.fr, où le site du club n'est pas
// déployé : on y voyait donc, littéralement, aucun changement.
// Un alias de branche sert toujours le dernier build de sa branche : il ne peut
// pas être figé, contrairement aux URL de déploiement (lor-squad-<hash>-…) que
// ce bandeau vise vraiment.
const LIVE_PREVIEW_PATTERN = /-git-dev-thomas-test-/i;

export function StaleHostBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (CANONICAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return;
    // localhost / domaine de dev → on ignore
    if (host === "localhost" || host === "127.0.0.1") return;
    if (LIVE_PREVIEW_PATTERN.test(host)) return;
    if (STALE_PATTERN.test(host)) {
      setStale(true);
    }
  }, []);

  if (!stale) return null;

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "linear-gradient(90deg, #FB923C, #EF4444)",
        color: "#fff",
        padding: "10px 16px",
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
      }}
    >
      ⚠️ Tu utilises une ancienne URL ({window.location.hostname}). Bascule sur le domaine officiel pour avoir toutes les mises à jour.
    </div>
  );
}
