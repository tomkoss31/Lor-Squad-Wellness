// =============================================================================
// InstallerEspace — « mets ton espace sur ton écran d'accueil », DANS son espace
// (22/09/2026, étape 3 de la maquette 7pdf4sTkQoHob1axp76vfP).
//
// Pourquoi ici et plus sur /bienvenue : le téléphone installe l'app d'après le
// manifeste de la PAGE. Sur /bienvenue, c'était celui de l'app coach
// (`start_url: /login`) → l'icône posée s'ouvrait sur la connexion (le cas de
// Gwen, par un autre chemin). Sur /client/<jeton>, index.html pose le SIEN dès
// le chargement (api/client-manifest) : l'icône ouvre directement son espace.
// /bienvenue y envoie donc la personne, par un VRAI chargement de page, avec
// `?installer=1`.
// =============================================================================

import { useState, type ReactNode } from "react";
import { appareilDepuisUA, ICONE_ACCUEIL, type Appareil, type Variante } from "./bienvenue";
import { Progres } from "./TroisMaisons";
import "./bienvenue.css";

const PARTAGER = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);
const AJOUTER = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);
const INSTALLER = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
  </svg>
);

const ETAPES: Record<Appareil, Array<{ texte: [string, string]; detail: string; icone: ReactNode }>> = {
  iphone: [
    { texte: ["Touche ", "Partager"], detail: "en bas de Safari", icone: PARTAGER },
    { texte: ["Choisis ", "« Sur l'écran d'accueil »"], detail: "descends un peu dans la liste", icone: AJOUTER },
    { texte: ["Touche ", "« Ajouter »"], detail: "en haut à droite", icone: "Ajouter" },
  ],
  android: [
    { texte: ["Touche les ", "⋮"], detail: "en haut à droite de Chrome", icone: <span className="bv-kebab">⋮</span> },
    { texte: ["Choisis ", "« Installer l'application »"], detail: "ou « Ajouter à l'écran d'accueil »", icone: INSTALLER },
    { texte: ["Confirme ", "« Installer »"], detail: "l'icône apparaît sur ton écran", icone: "Installer" },
  ],
};

export function InstallerEspace({
  variante,
  prenom,
  onFini,
}: {
  variante: Variante;
  prenom: string;
  onFini: () => void;
}) {
  const [appareil, setAppareil] = useState<Appareil>(() =>
    appareilDepuisUA(typeof navigator === "undefined" ? "" : navigator.userAgent),
  );
  const icone = ICONE_ACCUEIL[variante];
  const espace = variante === "club" ? "ton espace membre" : "ton espace";
  return (
    <div className="bv" data-v={variante}>
      <div className="bv-lueur" aria-hidden="true" />
      <main className="bv-col">
        <Progres etape={3} />
        <h1 className="bv-h1">
          C'est prêt,
          <br />
          {prenom} !
        </h1>
        <p className="bv-p">
          Dernière étape : mets {espace} sur ton écran d'accueil. Il s'ouvrira <b>directement chez toi</b>, comme
          une appli.
        </p>

        <div className="bv-accueil-tel" aria-label={`Sur ton écran d'accueil : ${icone.nom}`}>
          <span className="bv-app" aria-hidden="true"><i />Photos</span>
          <span className="bv-app sienne" aria-hidden="true">
            <i><img src={icone.src} alt="" width={56} height={56} /></i>
            <b>{icone.nom}</b>
          </span>
          <span className="bv-app" aria-hidden="true"><i />Messages</span>
        </div>

        <div className="bv-seg" role="group" aria-label="Ton téléphone">
          <button type="button" aria-pressed={appareil === "iphone"} onClick={() => setAppareil("iphone")}>iPhone</button>
          <button type="button" aria-pressed={appareil === "android"} onClick={() => setAppareil("android")}>Android</button>
        </div>

        <ol className="bv-etapes">
          {ETAPES[appareil].map((e, i) => (
            <li key={i}>
              <span className="bv-n" aria-hidden="true">{i + 1}</span>
              <span className="bv-t">
                {e.texte[0]}
                <b>{e.texte[1]}</b>
                <small>{e.detail}</small>
              </span>
              <span className={`bv-ic${appareil === "android" ? " android" : ""}`} aria-hidden="true">{e.icone}</span>
            </li>
          ))}
        </ol>

        <div className="bv-astuce">
          <b>Tu ne vois pas {appareil === "iphone" ? "« Partager »" : "les ⋮"} ?</b> Le lien s'est ouvert dans
          Telegram, WhatsApp ou Messenger. Touche « Ouvrir dans {appareil === "iphone" ? "Safari" : "Chrome"} », puis
          recommence.
        </div>

        <button type="button" className="bv-cta" onClick={onFini}>C'est fait !</button>
        <button type="button" className="bv-second" onClick={onFini}>Plus tard</button>
      </main>
    </div>
  );
}
