// =============================================================================
// DeclarationActiviteCard — rappel « déclare ton activité » sur le Co-pilote.
//
// ⚠️ POURQUOI ICI : l'obligation de déclaration concerne TOUS les distris, pas
// seulement ceux qui ont une boutique (3 sur 15). Or le hub « Mon développement »
// est en niveau `complet`, donc invisible pour 14 personnes sur 15. Le Co-pilote
// est le seul écran que tout le monde ouvre — c'est donc le seul point d'entrée
// qui atteint réellement l'équipe.
//
// Ce n'est PAS un popup (règle Thomas : jamais de popup auto au mount) : une
// carte dans le flux, qui disparaît d'elle-même dès que le SIRET est saisi.
// Contenu du tuto : /declarer-mon-activite (source unique).
// =============================================================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

export function DeclarationActiviteCard() {
  const { currentUser } = useAppContext();
  const [siretManquant, setSiretManquant] = useState(false);

  useEffect(() => {
    const uid = currentUser?.id;
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb
          .from("users")
          .select("legal_siret")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled || error) return;
        const siret = String((data as { legal_siret?: string | null } | null)?.legal_siret ?? "");
        setSiretManquant(siret.replace(/\D/g, "").length !== 14);
      } catch {
        // Silencieux : ce rappel ne doit jamais casser le Co-pilote.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  if (!siretManquant) return null;

  return (
    <section
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, #F43F5E 12%, var(--ls-surface)), var(--ls-surface))",
        border: "0.5px solid color-mix(in srgb, #F43F5E 35%, var(--ls-border))",
        borderRadius: 16,
        padding: "18px 20px",
        margin: "0 0 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, flexWrap: "wrap" }}>
        <div style={{ fontSize: 22, lineHeight: 1.2 }} aria-hidden="true">
          📋
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--ls-text)",
              marginBottom: 5,
            }}
          >
            Ton activité est-elle déclarée ?
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ls-text-muted)", lineHeight: 1.65, margin: 0 }}>
            Être distributrice suppose une activité déclarée. Beaucoup pensent qu'être VDI dispense
            de tout : la dispense porte sur le registre du commerce, <b>pas</b> sur la déclaration
            qui donne le SIRET. C'est gratuit et ça prend un quart d'heure.
          </p>
          <Link
            to="/declarer-mon-activite"
            style={{
              display: "inline-block",
              marginTop: 12,
              background: "#F43F5E",
              color: "#fff",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: "Syne, sans-serif",
              textDecoration: "none",
            }}
          >
            Comment faire →
          </Link>
        </div>
      </div>
    </section>
  );
}
