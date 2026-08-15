// =============================================================================
// BoutiqueSiretGuide — rappel « déclare ton activité » dans le cockpit boutique.
//
// ⚠️ RACCOURCI, PAS UNE COPIE (règle B9 : une feature = un seul endroit).
// Le tutoriel complet vit dans /declarer-mon-activite. Ce bloc ne fait que
// signaler l'urgence là où elle se voit le plus — on ne peut pas vendre en
// ligne sans activité déclarée — et renvoyer vers la page.
//
// Il passe au vert dès que le SIRET est renseigné : il félicite au lieu
// d'alerter, pour ne pas harceler celle qui a déjà fait le nécessaire.
// =============================================================================

import { Link } from "react-router-dom";

export function BoutiqueSiretGuide({ siret }: { siret: string }) {
  const done = siret.replace(/\D/g, "").length === 14;

  const accent = done ? "var(--ls-teal)" : "#F43F5E";
  const wash = done ? "rgba(45,212,191,.09)" : "rgba(244,63,94,.09)";

  return (
    <div
      style={{
        background: wash,
        border: `1px solid ${accent}`,
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        display: "flex",
        alignItems: "flex-start",
        gap: 13,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1.2 }} aria-hidden="true">
        {done ? "✅" : "🚨"}
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 15.5,
            color: "var(--ls-text)",
            marginBottom: 5,
          }}
        >
          {done ? "Ton activité est déclarée ✨" : "À faire en priorité : déclarer ton activité"}
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ls-text-muted)", lineHeight: 1.65, margin: 0 }}>
          {done ? (
            <>Ton SIRET est enregistré et apparaît sur tes mentions légales. Rien d'autre à faire.</>
          ) : (
            <>
              Vendre suppose une activité déclarée. Être VDI te dispense du registre du commerce,
              <b> pas</b> de la déclaration qui donne ton SIRET. C'est <b>gratuit</b> et ça prend un
              quart d'heure.
            </>
          )}
        </p>
        {!done && (
          <Link
            to="/declarer-mon-activite"
            style={{
              display: "inline-block",
              marginTop: 12,
              background: accent,
              color: "#fff",
              borderRadius: 10,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: "Syne, sans-serif",
              textDecoration: "none",
            }}
          >
            Voir comment faire →
          </Link>
        )}
      </div>
    </div>
  );
}
