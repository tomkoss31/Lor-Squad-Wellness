// =============================================================================
// OnboardingReturnPill — le « retour à mon parcours » pendant l'onboarding.
//
// Le cockpit (SalleOpsQuotidien) est un overlay PLEIN ÉCRAN. Dès qu'une action
// navigue ailleurs (« Commander » → /panier, « Relancer » → /crm…), le débutant
// quittait son cockpit SANS aucun moyen évident de revenir (le seul retour
// était le logo du header, caché derrière l'overlay sur mobile). Retour Thomas
// 2026-08-04 : « je pars sur commander… on ne peut pas revenir dessus ».
//
// Cette pastille flottante le ramène au cockpit en un tap, depuis N'IMPORTE
// quelle page. Cachée dès qu'on est activé, sur le cockpit lui-même, ou si on a
// cliqué « Plus tard » aujourd'hui (on respecte le snooze).
// =============================================================================

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

export function OnboardingReturnPill() {
  const { currentUser } = useAppContext();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // undefined = on ne sait pas encore (chargement) → on n'affiche rien.
  // null = non activé (en onboarding). string = activé.
  const [activatedAt, setActivatedAt] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb
          .from("users")
          .select("activated_at")
          .eq("id", currentUser.id)
          .single();
        if (!cancelled) setActivatedAt((data?.activated_at as string | null) ?? null);
      } catch {
        // En cas d'échec on NE montre PAS la pastille (défaut sûr : ne pas
        // coller un « retour » permanent à un coach déjà activé).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const snoozedToday =
    typeof window !== "undefined" &&
    window.localStorage.getItem("ls-ops-escape") === new Date().toDateString();

  const show =
    !!currentUser &&
    activatedAt === null && // non activé uniquement (undefined = chargement)
    pathname !== "/co-pilote" &&
    !snoozedToday;

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/co-pilote")}
      style={pill}
      aria-label="Retour à mon parcours d'onboarding"
    >
      <span aria-hidden="true">←</span> Retour à mon parcours
    </button>
  );
}

const pill: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  // Au-dessus de la barre de nav du bas (mobile) + safe-area iOS.
  bottom: "calc(84px + env(safe-area-inset-bottom))",
  zIndex: 110,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 999,
  border: "1px solid var(--ls-teal, #2dd4bf)",
  background: "var(--ls-surface, #15191a)",
  color: "var(--ls-text, #eef2ef)",
  fontWeight: 700,
  fontSize: 14,
  boxShadow: "0 8px 24px rgba(0,0,0,.4)",
  cursor: "pointer",
  maxWidth: "calc(100vw - 32px)",
};
