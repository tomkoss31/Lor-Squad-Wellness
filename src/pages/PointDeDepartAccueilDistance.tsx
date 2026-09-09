// =============================================================================
// PointDeDepartAccueilDistance — l'écran 0 du tunnel « Mon point de départ »
// EN VERSION À DISTANCE (campagne zone large, 09/09).
//
// Pourquoi un jumeau plutôt qu'un `variante` sur l'accueil de Thomas :
// l'accueil `PointDeDepartAccueil` est SA maquette, à ne pas retoucher. Ici le
// public est différent — Longwy, Thionville, Metz — et la promesse est
// l'INVERSE du lieu : pas « viens au club le matin », mais « coaché à distance,
// où que tu sois ». Deux publics, deux pages, un seul tunnel derrière.
//
// Ce qui change par rapport à l'accueil BBC :
//   · on garde l'accroche (elle ne parle pas de Verdun, elle marche partout) ;
//   · on retire l'adresse, « le matin », le shakebar, le body scan ;
//   · on met visio + Telegram + app + produits livrés chez soi ;
//   · on montre les résultats AVEC le texte (demande de Thomas 09/09).
//
// ⚠️ Mêmes gardes que l'accueil BBC, mesurées au navigateur le 09/09 :
//   · les marges des `<p>` sont INLINE — `.pdd p{margin:0}` (0,1,1) écrase les
//     utilitaires, la cédille de « ÇA NE BOUGE PAS » mordait sur le sous-titre ;
//   · le fond du bouton est INLINE — `.pdd button{background:none}` (0,1,1) bat
//     n'importe quelle classe et rendait le bouton invisible (commit 1223e5c7).
//
// ⚠️ Les avant/après ne vivent QUE sur cette page, jamais dans la créa Meta
// (règles pub santé/apparence — compte suspendu sinon).
// =============================================================================

import type { CSSProperties } from "react";

interface Props {
  /** Lance le quiz — l'écran 1 du tunnel. */
  onStart: () => void;
}

/* Couleurs : toutes issues du scope `.pdd`, jamais en dur. */
const C = {
  cream: "var(--cream)",
  paper: "var(--paper)",
  ink: "var(--ink)",
  green: "var(--green-d)",
  muted: "var(--muted)",
  muted2: "var(--muted2)",
  line: "var(--line)",
  line2: "var(--line-2)",
  orange: "var(--orange)",
  link: "var(--link)",
  sage: "var(--sage-d)",
  peach: "var(--peach)",
  sun: "var(--sun)",
  onDark: "var(--on-dark)",
  onDark2: "var(--on-dark-2)",
};

const RESULTATS = "/brand/breakfast-club/resultats";

/** Une transformation : photo + résultat chiffré + une phrase. Sur la PAGE,
 *  jamais dans la pub. Les chiffres sont des exemples que Thomas remplace. */
function ResultCard({ src, kg, mot, prenom }: { src: string; kg: string; mot: string; prenom: string }) {
  return (
    <figure style={{
      margin: 0, border: `1px solid ${C.line}`, borderRadius: 16,
      overflow: "hidden", background: C.paper,
    }}>
      <img src={src} alt={`Transformation de ${prenom}, à distance`} style={{ width: "100%", display: "block" }} />
      <figcaption style={{ padding: "10px 13px" }}>
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, color: C.link }}>{kg}</span>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: C.muted, lineHeight: 1.45 }}>« {mot} »</p>
        <p style={{
          margin: "6px 0 0", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase",
          color: C.muted2, fontWeight: 700,
        }}>{prenom}</p>
      </figcaption>
    </figure>
  );
}

function Recu({ emoji, titre, sous }: { emoji: string; titre: string; sous: string }) {
  return (
    <div style={{
      display: "flex", gap: 11, alignItems: "flex-start",
      background: C.paper, border: `1px solid ${C.line}`, borderRadius: 13, padding: "11px 13px",
    }}>
      <span aria-hidden="true" style={{ fontSize: 19, flex: "0 0 auto", lineHeight: 1.2 }}>{emoji}</span>
      <div>
        <b style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{titre}</b>
        <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>{sous}</span>
      </div>
    </div>
  );
}

const glab: CSSProperties = {
  fontSize: 10.5, letterSpacing: ".15em", textTransform: "uppercase",
  color: C.muted2, fontWeight: 700, margin: "18px 0 8px",
};

export function PointDeDepartAccueilDistance({ onStart }: Props) {
  return (
    <section className="pdd-screen">
      <div style={{ textAlign: "center", marginTop: 6 }}>
        <span style={{
          display: "inline-block", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase",
          fontWeight: 700, background: C.sun, color: "#6B5A18", padding: "6px 13px", borderRadius: 99,
        }}>
          Coaching à distance · où que tu sois
        </span>
      </div>

      <h1 className="pdd-title" style={{ textAlign: "center", marginTop: 14 }}>
        Tu manges plutôt bien.<br />
        Et pourtant,{" "}
        <em style={{
          fontFamily: '"Playfair Display", Georgia, serif', fontStyle: "italic", fontWeight: 700,
          color: C.link, textTransform: "none",
        }}>
          ça ne bouge pas.
        </em>
      </h1>
      <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
        En 3 minutes, tu sais <b style={{ color: C.ink, fontWeight: 600 }}>ce qui bloque vraiment chez toi</b> —
        et par quoi commencer. Où que tu habites.
      </p>

      {/* Le miroir : elle doit se reconnaître avant qu'on lui propose quoi que ce soit. */}
      <div style={{
        marginTop: 16, background: C.paper, border: `1px solid ${C.line}`,
        borderRadius: 16, padding: "14px 15px",
      }}>
        <p style={{
          margin: 0, fontSize: 10.5, letterSpacing: ".15em", textTransform: "uppercase",
          color: C.muted2, fontWeight: 700,
        }}>
          Ça te parle&nbsp;?
        </p>
        <ul style={{ listStyle: "none", margin: "9px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            "Tu tiens deux semaines, puis tout repart comme avant.",
            "Tu as faim à 11h, et le soir tu grignotes devant la télé.",
            "Tu as déjà tout essayé. Ça marche… puis non.",
          ].map((t) => (
            <li key={t} style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.4, paddingLeft: 16, position: "relative" }}>
              <span aria-hidden="true" style={{ position: "absolute", left: 0, color: C.peach }}>—</span>{t}
            </li>
          ))}
        </ul>
      </div>

      <p style={glab}>Ce qu'on met en place avec toi</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Recu emoji="📹" titre="Ton coach en visio" sous="Un vrai rendez-vous, pas un PDF. On règle ton cas." />
        <Recu emoji="💬" titre="Le groupe challenger Telegram" sous="La communauté qui te tient quand la motivation lâche." />
        <Recu emoji="📱" titre="Ton app de suivi" sous="Programme, repas, activité — tout au même endroit." />
        <Recu emoji="📦" titre="Tes produits livrés chez toi" sous="Reçus sous quelques jours, où que tu sois." />
      </div>

      <p style={glab}>Ils l'ont fait</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ResultCard
          src={`${RESULTATS}/fanny.jpg`} kg="−14 kg"
          mot="J'ai enfin arrêté de reprendre. Le groupe m'a portée les jours sans envie."
          prenom="Fanny" />
        <ResultCard
          src={`${RESULTATS}/julie.jpg`} kg="−11 kg · −12 cm de taille"
          mot="Sceptique au début. Un mois après, j'avais retrouvé de l'énergie."
          prenom="Julie" />
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 10.5, color: C.muted2, textAlign: "center", fontStyle: "italic" }}>
        ◦ Résultats individuels — ils varient d'une personne à l'autre.
      </p>

      {/* Le frein n°1 d'un profil curieux : la peur du démarchage. On l'enlève. */}
      <div style={{
        marginTop: 16, background: C.green, color: C.onDark,
        borderRadius: 16, padding: "15px 16px",
      }}>
        <p style={{ margin: 0, fontSize: 13, color: C.onDark2, lineHeight: 1.5 }}>
          <b style={{ color: C.onDark }}>Pas de démarchage.</b> Tu fais ton point de départ,
          tu vois tes résultats, et tu décides. On ne t'appelle pas dix fois.
        </p>
      </div>

      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          onClick={onStart}
          className="pdd-cta"
          // ⚠️ Fond inline OBLIGATOIRE : `.pdd button{background:none}` (0,1,1)
          // bat la classe et rendrait le bouton invisible (cf. commit 1223e5c7).
          style={{ background: "linear-gradient(135deg,#FF7A2F,#FF1E3C)", color: "#fff" }}
        >
          Je fais mon point de départ →
        </button>
        <p style={{
          margin: "12px 0 0", textAlign: "center", fontSize: 11, color: C.muted2, lineHeight: 1.5,
        }}>
          Gratuit · 3 minutes · coaching La Base 360 partout en France
        </p>
      </div>
    </section>
  );
}
