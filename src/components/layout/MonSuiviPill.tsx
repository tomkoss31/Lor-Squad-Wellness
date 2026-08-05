// Chantier « Promouvoir en distributeur » (2026-08-05) — bascule double casquette.
// Un coach qui a AUSSI une fiche client perso (ex. un membre promu distributeur)
// garde l'accès à son propre suivi de poids. Ce pill n'apparaît que si le RPC
// get_my_client_app_token renvoie un token (= le coach a bien une fiche liée à
// son uid auth via client_app_accounts). Ouvre son espace /client dans un nouvel
// onglet → le coach ne perd pas sa place, retour en 1 tap.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { useAppContext } from "../../context/AppContext";

export function MonSuiviPill({ variant = "sidebar" }: { variant?: "sidebar" | "drawer" }) {
  const { currentUser } = useAppContext();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) {
      setToken(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb || cancelled) return;
      // RPC SECURITY DEFINER : lit client_app_accounts.token WHERE auth_user_id = auth.uid()
      const { data } = await sb.rpc("get_my_client_app_token");
      if (cancelled) return;
      setToken(typeof data === "string" && data.length > 0 ? data : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  if (!token) return null;

  const href = `/client/${token}`;
  const full = variant === "drawer";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Ouvrir mon suivi perso (mon espace client)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        width: full ? "100%" : undefined,
        justifyContent: full ? "center" : undefined,
        padding: "7px 11px",
        borderRadius: 999,
        background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--ls-teal) 32%, transparent)",
        color: "var(--ls-teal)",
        cursor: "pointer",
        fontSize: 11.5,
        fontWeight: 700,
        fontFamily: "'Sora', sans-serif",
        letterSpacing: "0.01em",
        textDecoration: "none",
        whiteSpace: "nowrap"
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>
        👤
      </span>
      Mon suivi
    </a>
  );
}
