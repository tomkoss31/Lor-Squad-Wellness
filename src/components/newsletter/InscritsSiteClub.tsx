// =============================================================================
// InscritsSiteClub — qui s'est abonné depuis le pied de page du site club.
//
// Ces gens ne sont NI clients NI distributeurs : c'est une liste à part, qui
// n'apparaissait nulle part dans l'app. Sans cet écran, Thomas ne saurait même
// pas combien ils sont.
//
// La table est verrouillée (RLS, aucun droit pour le navigateur) : la lecture
// passe par `get_newsletter_subscribers()`, qui exige d'être admin. Une liste
// d'adresses e-mail n'a rien à faire à portée d'un SELECT côté client.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Inscrit {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
}

function jour(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function InscritsSiteClub() {
  const [gens, setGens] = useState<Inscrit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tout, setTout] = useState(false);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        const { data, error } = await sb.rpc("get_newsletter_subscribers");
        if (!vivant) return;
        if (error) throw new Error(error.message);
        setGens((data ?? []) as Inscrit[]);
      } catch (e) {
        if (vivant) setErreur(e instanceof Error ? e.message : "Lecture impossible.");
      } finally {
        if (vivant) setChargement(false);
      }
    })();
    return () => { vivant = false; };
  }, []);

  const { actifs, partis } = useMemo(
    () => ({
      actifs: gens.filter((g) => !g.unsubscribed_at).length,
      partis: gens.filter((g) => g.unsubscribed_at).length,
    }),
    [gens],
  );

  // Les 8 plus récents suffisent au coup d'œil ; le reste sur demande.
  const visibles = tout ? gens : gens.slice(0, 8);

  return (
    <section style={bloc}>
      <h2 style={titre}>Inscrits du site club</h2>
      <p style={sous}>
        Ceux qui ont laissé leur adresse en bas de{" "}
        <strong style={{ color: "var(--ls-text)" }}>labase-nutrition.com</strong>. Ni clients,
        ni distributeurs — ils ne reçoivent que ce que tu envoies à l'audience « Site club ».
      </p>

      {erreur ? (
        <p style={{ ...vide, color: "var(--ls-coral)" }}>Lecture impossible : {erreur}</p>
      ) : chargement ? (
        <p style={vide}>Lecture…</p>
      ) : gens.length === 0 ? (
        <p style={vide}>
          Personne pour l'instant. Le formulaire est en ligne en pied de page du site club —
          le premier inscrit apparaîtra ici.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 9, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={carte}>
              <div style={etiquette}>Inscrits</div>
              <div style={valeur}>{actifs}</div>
              <div style={detail}>reçoivent la newsletter</div>
            </div>
            <div style={carte}>
              <div style={etiquette}>Désabonnés</div>
              <div style={valeur}>{partis}</div>
              <div style={detail}>ne reçoivent plus rien</div>
            </div>
          </div>

          <div style={liste}>
            {visibles.map((g, i) => (
              <div
                key={g.id}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "10px 13px",
                  borderBottom: i === visibles.length - 1 ? "none" : "1px solid var(--ls-border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={adresse}>{g.email}</div>
                  <div style={date}>inscrit le {jour(g.created_at)}</div>
                </div>
                <span style={pastille(!!g.unsubscribed_at)}>
                  {g.unsubscribed_at ? "désabonné" : "inscrit"}
                </span>
              </div>
            ))}
          </div>

          {gens.length > 8 ? (
            <button type="button" onClick={() => setTout((v) => !v)} style={plus}>
              {tout ? "Réduire" : `Voir les ${gens.length} inscrits`}
            </button>
          ) : null}

          <p style={note}>
            Rien d'autre n'est stocké : ni nom, ni téléphone. L'adresse, la date et le
            consentement — c'est ce qui prouve l'accord en cas de contrôle.
          </p>
        </>
      )}
    </section>
  );
}

// ─── Styles (tokens --ls-* uniquement) ──────────────────────────────────────

const bloc: React.CSSProperties = {
  background: "var(--ls-surface)", border: "1px solid var(--ls-border)",
  borderRadius: 16, padding: "16px 15px", marginBottom: 20,
};

const titre: React.CSSProperties = {
  margin: "0 0 4px", fontFamily: "'Anton', sans-serif", fontWeight: 400,
  fontSize: 18, textTransform: "uppercase", letterSpacing: ".02em", color: "var(--ls-text)",
};

const sous: React.CSSProperties = {
  margin: "0 0 14px", fontSize: 12.5, lineHeight: 1.55, color: "var(--ls-text-muted)",
};

const carte: React.CSSProperties = {
  flex: "1 1 130px", background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)", borderRadius: 13, padding: "11px 13px",
};

const etiquette: React.CSSProperties = {
  fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
  color: "var(--ls-text-muted)", marginBottom: 5,
};

const valeur: React.CSSProperties = {
  fontFamily: "'Anton', sans-serif", fontWeight: 400, fontSize: 25,
  lineHeight: 1, color: "var(--ls-text)",
};

const detail: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
  color: "var(--ls-text-muted)", marginTop: 4,
};

const liste: React.CSSProperties = {
  background: "var(--ls-surface2)", border: "1px solid var(--ls-border)",
  borderRadius: 13, overflow: "hidden",
};

const adresse: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: "var(--ls-text)",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const date: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
  color: "var(--ls-text-muted)", marginTop: 2,
};

function pastille(parti: boolean): React.CSSProperties {
  const teinte = parti ? "var(--ls-coral)" : "var(--ls-teal)";
  return {
    flex: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
    fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
    color: teinte, border: `1px solid color-mix(in srgb, ${teinte} 38%, transparent)`,
  };
}

const plus: React.CSSProperties = {
  marginTop: 10, minHeight: 40, padding: "8px 13px", borderRadius: 10,
  border: "1px solid var(--ls-border)", background: "transparent",
  color: "var(--ls-text-muted)", fontSize: 12, fontWeight: 600,
  fontFamily: "DM Sans, sans-serif", cursor: "pointer",
};

const note: React.CSSProperties = {
  marginTop: 11, marginBottom: 0, fontSize: 11.5, lineHeight: 1.55,
  color: "var(--ls-text-muted)",
};

const vide: React.CSSProperties = {
  margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ls-text-muted)",
};
