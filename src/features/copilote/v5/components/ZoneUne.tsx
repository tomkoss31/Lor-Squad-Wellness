// =============================================================================
// ZoneUne — la seule chose qui compte, en haut de l'écran.
//
// Elle ne montre JAMAIS deux choses. Ce qu'elle montre est décidé par
// `ceQuiCompte()` (fonction pure, testée) — ici on ne fait que peindre.
//
// Six visages, un par état :
//   rdv        teal   · l'heure en grand, et ce qu'il faut relire avant
//   message    teal   · le message du client, cité tel qu'il l'a écrit
//   paiement   lime   · le montant. C'est la SEULE victoire de l'app, donc
//                       le seul endroit où le lime a le droit d'exister.
//   personne   coral  · son prénom, pourquoi elle est là, depuis quand
//   demarrage  teal   · l'étape, pour qui n'a encore personne
//   rien       lime   · « c'est à jour », et on s'arrête là
//
// ⚠️ Les couleurs passent par les tokens `--ls-*` (globals.css), pas par les
// `--pdj-*` injectés par PlanDuJour : ce composant doit tenir debout tout
// seul, y compris si un jour l'ancien Plan du jour disparaît.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import type { CeQuiCompte } from "../../ceQuiCompte";
import { anglesPour, merciPaiement, reponseAuMessage, type Angle } from "../../messagesPrets";
import { lienWhatsApp } from "../../../../lib/utils/lienWhatsApp";

export interface ZoneUneProps {
  quoi: CeQuiCompte;
  /** Prénom du coach — il signe ses messages, on ne dit jamais « ton coach ». */
  monPrenom: string;
  /** Ouvre la fiche / la messagerie / la commande selon l'état. */
  onOuvrir: (chemin: string) => void;
  /** L'action principale a été faite → on passe à la suivante. */
  onFait: () => void;
  /** « Plus tard » → on passe sans marquer fait. */
  onPasser: () => void;
}

export function ZoneUne({ quoi, monPrenom, onOuvrir, onFait, onPasser }: ZoneUneProps) {
  // Les angles vivent ICI, pas dans <Angles> : le bouton principal doit envoyer
  // EXACTEMENT le ton affiché. (Vu à l'écran le 12/08 : l'état était enfermé
  // dans l'enfant, et « Lui écrire » ne faisait que marquer traité — il
  // n'écrivait à personne.)
  const angles = useMemo<Angle[]>(() => {
    if (quoi.quoi === "personne") {
      return anglesPour({ prenom: premier(quoi.attente.qui), moi: monPrenom, motif: motifPourMessage(quoi.attente.motif) });
    }
    if (quoi.quoi === "paiement") return merciPaiement(premier(quoi.nom));
    if (quoi.quoi === "message") return reponseAuMessage(premier(quoi.nom));
    return [];
  }, [quoi, monPrenom]);

  const [choisi, setChoisi] = useState(0);
  // Changer de personne remet l'angle par défaut : sinon on garde « Franc »
  // sur quelqu'un à qui on ne doit aucune excuse.
  const identite = quoi.quoi === "personne" ? quoi.attente.cle : quoi.quoi === "paiement" ? quoi.commandeId : quoi.quoi === "message" ? quoi.messageId : quoi.quoi;
  useEffect(() => { setChoisi(0); }, [identite]);
  const texteChoisi = angles[Math.min(choisi, angles.length - 1)]?.texte ?? "";

  /** Ouvre WhatsApp avec le ton affiché, puis fait avancer la file. */
  const ecrireA = (telephone: string | null | undefined) => {
    window.open(lienWhatsApp(telephone ?? "", texteChoisi), "_blank", "noopener,noreferrer");
    onFait();
  };

  switch (quoi.quoi) {
    case "rdv":
      return (
        <Carte teinte="var(--ls-teal)" eyebrow={quandRdv(quoi.dansMinutes)} titre={heureDe(quoi.heure)}>
          <p style={ctx}>
            {quoi.type} avec <strong style={{ color: "var(--ls-text)" }}>{quoi.nom}</strong>.
          </p>
          <div style={{ ...depuis, color: "var(--ls-teal)" }}>
            {quoi.dansMinutes >= 0 ? "Prépare-toi." : "C'est en cours."}
          </div>
          <Actions
            principale={{ libelle: "Ouvrir sa fiche", ton: "teal", faire: () => onOuvrir(`/clients/${quoi.clientId}`) }}
            secondaire={{ libelle: "Plus tard", faire: onPasser }}
          />
        </Carte>
      );

    case "message":
      return (
        <Carte teinte="var(--ls-teal)" eyebrow={`Elle/il t'écrit · ${ilYa(quoi.ilYaMinutes)}`} titre={quoi.nom}>
          <Bulle titre="Son message">{quoi.extrait}</Bulle>
          <Angles angles={angles} choisi={choisi} surChoix={setChoisi} />
          <Actions
            principale={{ libelle: "Lui répondre", ton: "teal", faire: () => { onOuvrir("/messages"); onFait(); } }}
            secondaire={{ libelle: "Sa fiche", faire: () => onOuvrir(`/clients/${quoi.clientId}`) }}
          />
        </Carte>
      );

    case "paiement":
      return (
        <Carte teinte="var(--ls-lime)" eyebrow={`Paiement reçu · ${ilYa(quoi.ilYaMinutes)}`} titre={euros(quoi.montantEur)} titreLime>
          <p style={ctx}>
            <strong style={{ color: "var(--ls-text)" }}>{quoi.nom}</strong> vient de régler.
          </p>
          <div style={{ ...depuis, color: "var(--ls-lime)" }}>Sa commande l'attend au club.</div>
          <Angles angles={angles} choisi={choisi} surChoix={setChoisi} />
          <Actions
            principale={{ libelle: "La remercier", ton: "wa", faire: () => ecrireA(quoi.telephone) }}
            secondaire={{ libelle: "La commande", faire: () => onOuvrir("/encaissement") }}
          />
        </Carte>
      );

    case "personne": {
      const a = quoi.attente;
      const chaud = a.jours > (a.motif === "suivi-en-retard" ? 7 : 2);
      const teinte = a.motif === "suivi-en-retard" && !chaud ? "var(--ls-amber)" : chaud ? "var(--ls-coral)" : "var(--ls-teal)";
      return (
        <Carte teinte={teinte} eyebrow={a.motifCourt} titre={premier(a.qui)}>
          <p style={ctx}>{a.pourquoi}.</p>
          <div style={{ ...depuis, color: "var(--ls-amber)" }}>{depuisQuand(a.jours)}</div>
          <Angles angles={angles} choisi={choisi} surChoix={setChoisi} />
          <Actions
            principale={
              a.telephone
                ? { libelle: "Lui écrire", ton: "wa", faire: () => ecrireA(a.telephone) }
                : { libelle: "Ouvrir sa fiche", ton: "teal", faire: () => { onOuvrir(a.chemin); onFait(); } }
            }
            secondaire={{ libelle: "Plus tard", faire: onPasser }}
          />
          <Reste
            texte={quoi.reste > 0 ? `Ensuite` : `Dernière`}
            valeur={quoi.reste > 0 ? `${quoi.reste} autre${quoi.reste > 1 ? "s" : ""}` : "tu y es presque"}
          />
        </Carte>
      );
    }

    case "demarrage":
      return (
        <Carte teinte="var(--ls-teal)" eyebrow={`Ton démarrage · étape ${quoi.etape} sur ${quoi.total}`} titre={quoi.titre}>
          <p style={ctx}>
            Une seule personne, une seule fois. Quelqu'un que tu connais déjà — c'est toujours comme ça
            que ça commence.
          </p>
          <div style={{ ...depuis, color: "var(--ls-teal)" }}>Compte 30 minutes.</div>
          <Actions
            principale={{ libelle: "Commencer un bilan", ton: "teal", faire: () => onOuvrir("/nouveau-bilan") }}
            secondaire={{ libelle: "Mon parcours", faire: () => onOuvrir("/salle-ops") }}
          />
          <Reste texte="Après ça" valeur={`${quoi.total - quoi.etape} étapes`} />
        </Carte>
      );

    case "rien":
      return (
        <Carte teinte="var(--ls-lime)" eyebrow="Personne n'attend" titre="C'est à jour" titreLime>
          <p style={ctx}>
            Tout le monde a eu sa réponse. Rien ne traîne, personne n'est resté en plan.
          </p>
          <div style={{ ...depuis, color: "var(--ls-lime)" }}>Profites-en.</div>
          <Actions
            principale={{ libelle: "Préparer demain", ton: "teal", faire: () => onOuvrir("/agenda") }}
            secondaire={{ libelle: "Inviter", faire: () => onOuvrir("/boite-a-outils") }}
          />
          {quoi.resteEquipe > 0 ? (
            <Reste texte="Reste" valeur={`${quoi.resteEquipe} contacts, chez ton équipe`} />
          ) : null}
        </Carte>
      );
  }
}

// ─── Briques ────────────────────────────────────────────────────────────────

function Carte({
  teinte, eyebrow, titre, titreLime, children,
}: {
  teinte: string; eyebrow: string; titre: string; titreLime?: boolean; children: React.ReactNode;
}) {
  return (
    <section
      aria-label="Ce qui compte maintenant"
      style={{
        position: "relative", overflow: "hidden", borderRadius: 20, padding: "20px 19px 19px",
        background: "linear-gradient(150deg, var(--ls-surface), color-mix(in srgb, var(--ls-surface) 82%, var(--ls-bg)))",
        border: "1px solid var(--ls-border)",
      }}
    >
      {/* La lueur porte l'humeur de l'écran sans avoir à l'écrire. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", right: -70, top: -70, width: 210, height: 210, borderRadius: "50%",
          background: `radial-gradient(circle, color-mix(in srgb, ${teinte} 18%, transparent), transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <span style={{ ...eyebrowStyle, color: teinte }}>{eyebrow}</span>
        <h2 style={{ ...titreStyle, ...(titreLime ? { color: "var(--ls-lime)" } : null) }}>{titre}</h2>
        {children}
      </div>
    </section>
  );
}

function Bulle({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={bulle}>
      <strong style={bulleTitre}>{titre}</strong>
      {children}
    </div>
  );
}

/** Les trois angles. Le message se réécrit sur place — on ne quitte pas l'écran.
 *  ⚠️ CONTRÔLÉ par le parent : l'angle choisi doit être celui que le bouton
 *  principal envoie réellement. Une version antérieure gardait l'état ici et
 *  « Lui écrire » ne faisait que marquer traité — vu à l'écran le 12/08, le
 *  bouton principal n'écrivait à personne. */
function Angles({ angles, choisi, surChoix }: { angles: Angle[]; choisi: number; surChoix: (i: number) => void }) {
  const courant = angles[Math.min(choisi, angles.length - 1)];
  if (!courant) return null;
  return (
    <>
      <Bulle titre="Message prêt">{courant.texte}</Bulle>
      <div style={tons} role="group" aria-label="Changer le ton du message">
        {angles.map((a, k) => (
          <button
            key={a.cle}
            type="button"
            aria-pressed={k === choisi}
            onClick={() => surChoix(k)}
            style={{ ...ton, ...(k === choisi ? tonActif : null) }}
          >
            {a.cle}
          </button>
        ))}
      </div>
    </>
  );
}

function Actions({
  principale, secondaire,
}: {
  principale: { libelle: string; ton: "wa" | "teal"; faire: () => void };
  secondaire: { libelle: string; faire: () => void };
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
      <button type="button" onClick={principale.faire} style={{ ...prim, ...(principale.ton === "teal" ? primTeal : primWa) }}>
        {principale.libelle}
      </button>
      <button type="button" onClick={secondaire.faire} style={sec}>
        {secondaire.libelle}
      </button>
    </div>
  );
}

function Reste({ texte, valeur }: { texte: string; valeur: string }) {
  return (
    <div style={reste}>
      {texte}
      <i style={resteTrait} />
      {valeur}
    </div>
  );
}

// ─── Formatage ──────────────────────────────────────────────────────────────

const premier = (nom: string) => (nom ?? "").trim().split(/\s+/)[0] || nom || "";

const heureDe = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);

const euros = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function quandRdv(dansMinutes: number): string {
  if (dansMinutes < 0) return "En cours";
  if (dansMinutes === 0) return "Maintenant";
  if (dansMinutes < 60) return `Dans ${dansMinutes} minutes`;
  return "Dans moins d'une heure et demie";
}

function ilYa(minutes: number): string {
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const h = Math.round(minutes / 60);
  return `il y a ${h} h`;
}

function depuisQuand(jours: number): string {
  if (jours <= 0) return "Aujourd'hui.";
  if (jours === 1) return "Depuis hier.";
  return `Ça fait ${jours} jours.`;
}

/** Un dormant vient de la file avec le motif « suivi-en-retard » ou autre ;
 *  ici on choisit le REGISTRE du message, qui n'est pas toujours le motif. */
function motifPourMessage(m: string) {
  if (m === "lead") return "lead" as const;
  if (m === "bilan-en-ligne") return "bilan-en-ligne" as const;
  if (m === "paiement-en-attente") return "paiement-en-attente" as const;
  if (m === "dormant") return "dormant" as const;
  return "suivi-en-retard" as const;
}

// ─── Styles (tokens --ls-* uniquement) ──────────────────────────────────────

const eyebrowStyle: React.CSSProperties = {
  display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
  letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 11, fontWeight: 500,
};

const titreStyle: React.CSSProperties = {
  margin: "0 0 13px", fontFamily: "'Anton', sans-serif", fontWeight: 400,
  fontSize: "clamp(34px, 11vw, 44px)", lineHeight: .98, textTransform: "uppercase",
  color: "var(--ls-text)", letterSpacing: ".01em",
};

const ctx: React.CSSProperties = {
  margin: "0 0 5px", fontSize: 15.5, lineHeight: 1.55, color: "var(--ls-text-muted)",
};

const depuis: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5 };

const bulle: React.CSSProperties = {
  marginTop: 17, padding: "13px 14px", borderRadius: 13,
  background: "color-mix(in srgb, var(--ls-bg) 55%, transparent)",
  border: "1px solid var(--ls-border)", fontSize: 13.5, lineHeight: 1.55,
  color: "var(--ls-text-muted)",
};

const bulleTitre: React.CSSProperties = {
  display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
  letterSpacing: ".13em", textTransform: "uppercase", color: "var(--ls-teal)",
  marginBottom: 6, fontWeight: 600,
};

const tons: React.CSSProperties = { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" };

const ton: React.CSSProperties = {
  padding: "7px 11px", borderRadius: 10, fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10.5, letterSpacing: ".06em", cursor: "pointer",
  color: "var(--ls-text-muted)", background: "color-mix(in srgb, var(--ls-bg) 45%, transparent)",
  border: "1px solid var(--ls-border2)",
};

const tonActif: React.CSSProperties = {
  color: "var(--ls-bg)", background: "var(--ls-teal)", borderColor: "var(--ls-teal)", fontWeight: 600,
};


const prim: React.CSSProperties = {
  flex: 1, padding: 15, borderRadius: 14, border: "none", cursor: "pointer",
  fontFamily: "inherit", fontSize: 15.5, fontWeight: 700,
};

const primWa: React.CSSProperties = {
  background: "#25D366", color: "#06230F", boxShadow: "0 10px 26px rgba(37,211,102,.24)",
};

const primTeal: React.CSSProperties = {
  background: "var(--ls-teal)", color: "var(--ls-bg)",
  boxShadow: "0 10px 26px color-mix(in srgb, var(--ls-teal) 24%, transparent)",
};

const sec: React.CSSProperties = {
  flex: "none", padding: "15px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
  fontSize: 14, color: "var(--ls-text-muted)", background: "transparent",
  border: "1px solid var(--ls-border2)",
};

const reste: React.CSSProperties = {
  marginTop: 13, display: "flex", alignItems: "center", gap: 7,
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: ".1em",
  textTransform: "uppercase", color: "var(--ls-text-hint)",
};

const resteTrait: React.CSSProperties = {
  flex: 1, height: 2, borderRadius: 2, background: "var(--ls-border2)",
};
