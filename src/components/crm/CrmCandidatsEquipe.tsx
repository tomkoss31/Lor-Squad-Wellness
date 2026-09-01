// =============================================================================
// CrmCandidatsEquipe — quelqu'un veut REJOINDRE l'équipe.
//
// CE QUI AVAIT DISPARU (revue d'avant-prod du 31/08) : le tunnel public « en
// parler avec l'équipe » (/club/rejoindre/rdv) écrit dans `rdv_bookings` avec
// `booking_type = 'recrutement'`, et range les réponses du candidat dans
// `metadata` — ce qu'il cherche, sous quel délai, sa ville, son mot. Tout ça
// ne s'affichait QUE dans le pavé des rendez-vous. En sortant ce pavé, un
// candidat devenait une ligne de rendez-vous comme une autre : le coach le
// recevait sans savoir qu'il venait pour l'équipe, ni pourquoi.
//
// Ce n'est pas un rendez-vous parmi d'autres, et ça ne se produit pas tous les
// jours : ça mérite d'être dit à part, et de ne rien coûter le reste du temps
// (zéro candidat = zéro pixel, comme les demandes de rendez-vous).
// =============================================================================

const QUAND = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

// Les libellés du tunnel, repris à l'identique — un candidat qui a coché
// « reconversion » doit lire « Reconversion », pas la clé technique.
const CHERCHE: Record<string, string> = {
  reconversion: "Reconversion",
  complement: "Complément de revenu",
  curieux: "Curieux·se",
};
const DELAI: Record<string, string> = {
  asap: "Dès que possible",
  "few-months": "Dans quelques mois",
  info: "Se renseigne",
};

export interface CandidatEquipe {
  id: string;
  nom: string;
  slotStart: string;
  contact: string | null;
  cherche?: string | null;
  delai?: string | null;
  ville?: string | null;
  mot?: string | null;
}

export function CrmCandidatsEquipe({ candidats }: { candidats: CandidatEquipe[] }) {
  if (candidats.length === 0) return null;

  return (
    <section style={bloc} aria-label="Candidats équipe">
      <p style={titre}>
        🤝 {candidats.length} personne{candidats.length > 1 ? "s veulent" : " veut"} rejoindre l'équipe
      </p>
      {candidats.map((c) => {
        const reperes = [
          c.cherche ? (CHERCHE[c.cherche] ?? c.cherche) : null,
          c.delai ? (DELAI[c.delai] ?? c.delai) : null,
          c.ville || null,
        ].filter(Boolean) as string[];
        return (
          <div key={c.id} style={carte}>
            <span style={nom}>{c.nom}</span>
            <p style={meta}>
              {QUAND.format(new Date(c.slotStart))}
              {c.contact ? ` · ${c.contact}` : ""}
            </p>
            {reperes.length > 0 && (
              <p style={cherchePhrase}>
                <span aria-hidden="true">🎯</span> {reperes.join(" · ")}
              </p>
            )}
            {c.mot?.trim() ? <p style={motCandidat}>« {c.mot.trim()} »</p> : null}
          </div>
        );
      })}
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const bloc: React.CSSProperties = {
  margin: "10px 0 0",
  padding: "12px 13px",
  borderRadius: 14,
  background: "color-mix(in srgb, var(--ls-purple) 9%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-purple) 30%, transparent)",
};

const titre: React.CSSProperties = {
  margin: "0 0 9px 2px",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ls-purple)",
};

const carte: React.CSSProperties = {
  padding: "10px 11px",
  marginBottom: 6,
  borderRadius: 12,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
};

const nom: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 15.5,
  color: "var(--ls-text)",
};

const meta: React.CSSProperties = {
  margin: "3px 0 0",
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
};

const cherchePhrase: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13,
  color: "var(--ls-text)",
  fontFamily: "'DM Sans', sans-serif",
};

const motCandidat: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12.5,
  fontStyle: "italic",
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
  fontFamily: "'DM Sans', sans-serif",
};
