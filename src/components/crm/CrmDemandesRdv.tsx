// =============================================================================
// CrmDemandesRdv — les demandes de rendez-vous JAMAIS acceptées, et rien d'autre.
//
// POURQUOI CE COMPOSANT EXISTE (erreur du 31/08, corrigée le jour même) :
// en sortant le pavé des rendez-vous du CRM, j'avais gardé les deux widgets
// d'origine « au cas où il y aurait une demande à accepter ». Résultat mesuré
// sur dev : une seule demande en attente les rallumait EN ENTIER — les huit
// rendez-vous revenaient, et la page passait à près de 7 000 px. On avait
// remplacé un pavé permanent par un pavé conditionnel.
//
// Ce composant ne montre QUE ce qui attend une acceptation. Zéro demande =
// zéro pixel. Accepter est la seule action qui n'existe nulle part ailleurs
// dans l'app — c'est elle qui envoie le mail « c'est confirmé ».
// =============================================================================

import { useState } from "react";

const QUAND = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export interface DemandeRdv {
  id: string;
  nom: string;
  slotStart: string;
  contact?: string | null;
}

interface Props {
  demandes: DemandeRdv[];
  /** Accepte la demande. C'est ce chemin qui envoie le mail de confirmation. */
  onAccepter: (d: DemandeRdv) => Promise<void> | void;
  onRefuser: (d: DemandeRdv) => Promise<void> | void;
}

export function CrmDemandesRdv({ demandes, onAccepter, onRefuser }: Props) {
  const [enCours, setEnCours] = useState<string | null>(null);
  if (demandes.length === 0) return null;

  const agir = async (d: DemandeRdv, quoi: "ok" | "non") => {
    if (enCours) return;
    setEnCours(d.id);
    try {
      await (quoi === "ok" ? onAccepter(d) : onRefuser(d));
    } finally {
      setEnCours(null);
    }
  };

  return (
    <section style={bloc} aria-label="Demandes de rendez-vous">
      <p style={titre}>
        {demandes.length} demande{demandes.length > 1 ? "s" : ""} de rendez-vous
        {demandes.length > 1 ? " attendent" : " attend"} ta réponse
      </p>
      {demandes.map((d) => {
        const occupe = enCours === d.id;
        return (
          <div key={d.id} style={{ ...carte, opacity: occupe ? 0.55 : 1 }}>
            <div>
              <span style={nom}>{d.nom}</span>
              <p style={meta}>
                {QUAND.format(new Date(d.slotStart))}
                {d.contact ? ` · ${d.contact}` : ""}
              </p>
            </div>
            <div style={actions}>
              <button type="button" disabled={occupe} onClick={() => void agir(d, "ok")} style={{ ...btn, ...btnOk }}>
                ✓ Accepter
              </button>
              <button type="button" disabled={occupe} onClick={() => void agir(d, "non")} style={btn}>
                Refuser
              </button>
            </div>
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
  background: "color-mix(in srgb, var(--ls-amber) 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-amber) 32%, transparent)",
};

const titre: React.CSSProperties = {
  margin: "0 0 10px 2px",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ls-amber)",
};

const carte: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 11px",
  marginBottom: 6,
  borderRadius: 12,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  transition: "opacity .15s ease",
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

const actions: React.CSSProperties = { display: "flex", gap: 6, flex: "none" };

const btn: React.CSSProperties = {
  minHeight: 44,
  padding: "0 13px",
  borderRadius: 999,
  border: "1px solid var(--ls-border2)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnOk: React.CSSProperties = {
  background: "var(--ls-teal)",
  color: "#08211D",
  borderColor: "transparent",
  fontWeight: 700,
};
