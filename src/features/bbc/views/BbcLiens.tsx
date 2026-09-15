// =============================================================================
// BbcLiens — les liens rapides du club (module 5 du modèle BBC).
// 1 tap = le message pré-rédigé + le lien, copiés ou envoyés sur WhatsApp.
// Les liens publics dérivent du slug coach ; les liens du club (Zoom, avis
// Google) viennent des réglages — jamais en dur.
//
// ── 15/09/2026 — UN BOUTON DÉDIÉ ET UN APERÇU (maquette validée, variante B) ──
// Thomas : « changer la logique des liens avec un bouton dédié et la
// possibilité d'ouvrir le visuel des liens en preview ». Les liens quittent
// l'onglet « Scripts & liens » : un bouton « 🔗 Mes liens » au bout des onglets
// de Ressources ouvre `BbcLiensTiroir`, par-dessus n'importe quel onglet.
//   · Les cartes s'allègent : le texte du message ne s'étale plus dessus, il se
//     lit dans l'Aperçu (« message dans l'aperçu », validé).
//   · L'Aperçu montre la page où la personne arrive (la vraie, en iframe) et le
//     message tel qu'elle le reçoit sur WhatsApp, avec la carte du lien.
//   · QR ajouté, comme dans « Mes liens » de l'app classique.
//
// ⚠️ UN APERÇU NE DOIT RIEN ÉCRIRE NI COMPTER. La page publique chargée en
// iframe compterait une visite au coach lui-même et, si on y tapait un prénom
// et un téléphone, créerait un vrai lead « Curieux ». D'où trois gardes :
//   1. `audience.ts` ne mesure rien dans une iframe (`estApercu`) ;
//   2. `AppContext` ne restaure pas la session coach dans une iframe (sinon
//      chaque aperçu relançait tout le chargement des données, sur la base Nano) ;
//   3. l'iframe ne reçoit aucun clic ni saisie (`pointer-events: none`) : une
//      couche transparente relaie seulement le défilement.
// =============================================================================

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import type { ClubSettings } from "../../../types/domain";

function slugify(name?: string) {
  return (name ?? "")
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/** La carte qu'affiche WhatsApp quand on colle le lien. Mesuré le 15/09 :
 *  seul `/coach` a une carte à lui ; les autres liens tombent sur la carte
 *  générique La Base 360 (aucune réécriture pour les robots dans vercel.json). */
type Carte = "coach" | "base360" | "base360-sur-un-lien-club" | "externe";

export interface QuickLink {
  key: string;
  icon: string;
  title: string;
  hint: string;
  url: string;
  message: (url: string) => string;
  carte: Carte;
  missing?: boolean;
}

export function construireLiens(coachName?: string, settings?: ClubSettings | null, clubName?: string): QuickLink[] {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.labase360.fr";
  const slug = slugify(coachName);
  const club = clubName || "le club";
  const links = settings?.links ?? {};

  return [
    // ⚠️ 10/09 — LE BILAN DU CLUB PASSE DEVANT, ET IL EST MARQUÉ.
    // Thomas : « les deux, le nouveau en premier indiqué BBC ».
    // Il est en prod depuis le 09/09 et n'était atteignable QUE si on tapait
    // l'URL à la main : « Mes liens » n'offrait que l'ancien bilan La Base 360,
    // si bien qu'envoyer un bilan depuis cet écran envoyait au mauvais endroit.
    // Les deux cohabitent volontairement — le club pour les gens du matin,
    // l'ancien pour tout le reste — d'où l'étiquette, sans quoi rien ne les
    // distingue dans la liste.
    {
      key: "point-de-depart",
      icon: "🌅",
      title: "Mon point de départ · BBC",
      hint: "le bilan du club · parle du matin",
      url: `${origin}/point-de-depart/${slug}`,
      carte: "base360-sur-un-lien-club",
      message: (u) =>
        `Coucou 😊 Je t'offre le bilan du ${club} : 3 min, 12 questions, et tu sais tout de suite par quoi commencer demain matin. C'est par ici : ${u}`,
    },
    // La version zone large : même bilan, mais qui ne parle jamais de Verdun et
    // mène au démarrage à distance. C'est la campagne Meta étendue (Longwy,
    // Thionville, Metz…). Elle existe depuis le 10/09 côté app classique
    // (`MesLiensPage`) — sans cette entrée, le mode BBC en était privé.
    {
      key: "point-de-depart-distance",
      icon: "📡",
      title: "Mon point de départ · à distance",
      hint: "zone large · ne parle pas du club",
      url: `${origin}/point-de-depart/${slug}?mode=distance`,
      carte: "base360-sur-un-lien-club",
      message: (u) =>
        `Coucou 😊 Je t'offre un point de départ en 3 min — coaché à distance, où que tu sois. Tu sauras tout de suite par quoi commencer : ${u}`,
    },
    {
      key: "bilan",
      icon: "📋",
      title: "Bilan bien-être offert · La Base 360",
      hint: "l'historique · body scan, hors club",
      url: `${origin}/bilan-online/${slug}`,
      carte: "base360",
      message: (u) =>
        `Coucou 😊 Je t'offre un bilan bien-être + scan corporel (valeur 50 €) pour m'entraîner. Tu remplis en 2 min ici : ${u}`,
    },
    {
      key: "rdv",
      icon: "📅",
      title: "Réserver un créneau",
      hint: "quand la personne est chaude",
      url: `${origin}/rdv/${slug}`,
      carte: "base360",
      message: (u) => `Super ! Choisis directement ton créneau ici, ça me bloque le rendez-vous : ${u}`,
    },
    {
      key: "coach",
      icon: "🪪",
      title: "Ma page coach",
      hint: "à mettre en bio réseaux",
      url: `${origin}/coach/${slug}`,
      carte: "coach",
      message: (u) => `Voilà ma page si tu veux voir ce que je fais 🌿 ${u}`,
    },
    {
      key: "zoom_appel",
      icon: "🎙️",
      title: "Zoom · Appel Ambassadeur",
      hint: "à envoyer aux inscrits le jour J",
      url: links.zoom_appel ?? "",
      missing: !links.zoom_appel,
      carte: "externe",
      message: (u) =>
        `C'est ce soir ! Voici le lien pour rejoindre l'Appel Ambassadeur : ${u}\nPas besoin de micro, tu peux juste écouter 🙂`,
    },
    {
      key: "zoom_atelier",
      icon: "❤️",
      title: "Zoom · Atelier Cœurs",
      hint: "à envoyer aux inscrits le jour J",
      url: links.zoom_atelier ?? "",
      missing: !links.zoom_atelier,
      carte: "externe",
      message: (u) => `On se retrouve ce soir à l'Atelier Cœurs 🧡 Le lien : ${u}`,
    },
    {
      key: "google",
      icon: "⭐",
      title: "Avis Google",
      hint: "au bilan des 10, quand il est content",
      url: links.google_review ?? "",
      missing: !links.google_review,
      carte: "externe",
      message: (u) =>
        `Si ${club} t'apporte des résultats, ça m'aiderait énormément que tu laisses un avis ⭐ Ça prend 30 secondes : ${u}`,
    },
  ];
}

interface BbcLiensProps {
  coachName?: string;
  settings?: ClubSettings | null;
  clubName?: string;
}

// Les dispositions passent par des CLASSES : un style en ligne bat la media
// query et la rend inerte (piège documenté dans bbc-tokens.css). Les couleurs
// en dur ne servent qu'à imiter WhatsApp et le cadre du téléphone.
const CSS = `
.bl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.bl-panneau .bl-grid{grid-template-columns:1fr}
.bl-carte{background:var(--ls-bbc-s1);border:1px solid var(--ls-bbc-line);border-left:3px solid var(--ls-bbc-teal);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.bl-carte.off{border-left-color:var(--ls-bbc-hint);opacity:.8}
.bl-tete{display:flex;gap:10px;align-items:flex-start}
.bl-ic{font-size:18px;line-height:1.2}
.bl-titre{font-size:13.5px;font-weight:700}
.bl-hint{font-size:11.5px;color:var(--ls-bbc-muted);margin-top:2px}
.bl-url{font-family:var(--ls-bbc-font-mono);font-size:11px;color:var(--ls-bbc-hint);word-break:break-all}
.bl-acts{display:flex;gap:7px;flex-wrap:wrap}
.bl-b{min-height:40px;border:1px solid var(--ls-bbc-line2);background:transparent;color:var(--ls-bbc-muted);font-family:var(--ls-bbc-font-body);font-size:12px;font-weight:600;padding:9px 12px;border-radius:10px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.bl-b.plein{border-color:transparent;background:var(--ls-bbc-lime);color:var(--ls-bbc-lime-ink);font-weight:700}
.bl-b.voir{border-color:var(--ls-bbc-teal);color:var(--ls-bbc-teal);font-weight:700;background:color-mix(in srgb,var(--ls-bbc-teal) 10%,transparent)}
.bl-manque{font-size:11.5px;color:var(--ls-bbc-hint);background:var(--ls-bbc-s2);border:1px dashed var(--ls-bbc-line2);border-radius:10px;padding:10px 12px;line-height:1.45}
.bl-manque b{color:var(--ls-bbc-text)}
.bl-lead{font-size:12.5px;color:var(--ls-bbc-muted);margin:0 0 14px}
.bl-fond{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:80;display:flex;justify-content:flex-end}
.bl-panneau{width:min(560px,100%);height:100%;overflow-y:auto;overscroll-behavior:contain;background:var(--ls-bbc-bg);border-left:1px solid var(--ls-bbc-line2);padding:18px 18px 28px;color:var(--ls-bbc-text);font-family:var(--ls-bbc-font-body)}
.bl-entete{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.bl-h{font-family:var(--ls-bbc-font-display);font-size:28px;line-height:1.05;flex:1;min-width:0}
.bl-x{min-width:44px;min-height:44px;border-radius:12px;border:1px solid var(--ls-bbc-line2);background:var(--ls-bbc-s1);color:var(--ls-bbc-text);cursor:pointer;font-size:15px}
.bl-ov{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.62);display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto;overscroll-behavior:contain}
.bl-feuille{width:min(880px,100%);background:var(--ls-bbc-bg);border:1px solid var(--ls-bbc-line2);border-radius:18px;padding:16px 18px 20px;color:var(--ls-bbc-text);font-family:var(--ls-bbc-font-body)}
.bl-feuille.qr{width:min(360px,100%)}
.bl-sur{margin:10px 0 14px;font-size:12px;color:var(--ls-bbc-muted);background:var(--ls-bbc-s1);border:1px solid var(--ls-bbc-line);border-radius:10px;padding:8px 12px}
.bl-pv{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:start}
.bl-lbl{font-family:var(--ls-bbc-font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ls-bbc-hint);margin-bottom:8px}
.bl-tel{position:relative;width:300px;height:600px;border-radius:34px;border:8px solid #0A0F0E;background:#FFFFFF;overflow:hidden}
.bl-tel iframe{position:absolute;top:0;left:0;width:375px;height:771px;border:0;transform:scale(.7573);transform-origin:0 0;pointer-events:none}
.bl-capte{position:absolute;inset:0;touch-action:none}
.bl-charge{position:absolute;inset:0;display:grid;place-items:center;font-size:12px;color:#55605A}
.bl-ext{width:300px;border-radius:16px;border:1px dashed var(--ls-bbc-line2);background:var(--ls-bbc-s1);padding:18px;font-size:12.5px;line-height:1.5;color:var(--ls-bbc-muted)}
.bl-wa{background:#0B141A;border-radius:14px;padding:14px;border:1px solid var(--ls-bbc-line)}
.bl-bulle{margin-left:auto;max-width:360px;background:#005C4B;border-radius:10px 2px 10px 10px;padding:5px;color:#E9EDEF}
.bl-og{background:rgba(0,0,0,.22);border-radius:7px;overflow:hidden}
.bl-og img{display:block;width:100%;max-width:100%;aspect-ratio:1200/630;object-fit:cover;background:#111B21}
.bl-og-t{padding:7px 9px 8px;font-size:12.5px;line-height:1.35;font-weight:600}
.bl-og-d{display:block;color:rgba(233,237,239,.65);font-size:11.5px;font-weight:400}
.bl-msg{padding:7px 6px 3px;font-size:13px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.bl-note{margin-top:10px;font-size:12px;line-height:1.45;color:var(--ls-bbc-amber);border-left:2px solid var(--ls-bbc-amber);padding-left:10px}
.bl-pacts{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}
.bl-qr{background:#FFFFFF;border-radius:14px;padding:14px;width:max-content;margin:14px auto}
@media (max-width:900px){
  .bl-panneau{width:100%;border-left:0;padding:16px 16px 28px}
  .bl-ov{padding:0}
  .bl-feuille{border-radius:0;min-height:100%;border:0;padding:14px 16px 24px}
  .bl-pv{grid-template-columns:1fr}
  .bl-tel{margin:0 auto;width:262px;height:520px}
  .bl-tel iframe{height:768px;transform:scale(.656)}
  .bl-ext{width:auto}
  .bl-b{min-height:44px}
}
@media (prefers-reduced-motion:no-preference){
  .bl-panneau,.bl-feuille{animation:bl-in .18s ease}
  @keyframes bl-in{from{opacity:0}to{opacity:1}}
}
`;

/** L'Aperçu et le QR sortent du tiroir : rendus à la racine du document.
 *  Mesuré le 15/09 — ouverts DANS le tiroir, ils héritaient de sa position :
 *  un ancêtre transformé (l'animation d'entrée) piège un `position: fixed`,
 *  et l'aperçu tenait dans les 560 px du tiroir au lieu de l'écran. Les
 *  jetons `--ls-bbc-*` vivent sur `.bbc-mode` : le calque la reprend, clair
 *  compris. (L'animation n'utilise plus de transform pour la même raison.) */
function Calque({ depuis, children }: { depuis: RefObject<HTMLElement>; children: ReactNode }) {
  if (typeof document === "undefined") return null;
  const clair = Boolean(depuis.current?.closest(".bbc-light"));
  return createPortal(<div className={clair ? "bbc-mode bbc-light" : "bbc-mode"}>{children}</div>, document.body);
}

/** Ferme sur Échap — un panneau par-dessus l'écran se quitte au clavier. */
function useEchap(fermer: () => void) {
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [fermer]);
}

export function BbcLiens({ coachName, settings, clubName }: BbcLiensProps) {
  const [copied, setCopied] = useState<string>("");
  const [apercu, setApercu] = useState<QuickLink | null>(null);
  const [qr, setQr] = useState<QuickLink | null>(null);
  const LINKS = construireLiens(coachName, settings, clubName);
  const racine = useRef<HTMLDivElement>(null);

  function copy(key: string, text: string) {
    try {
      void navigator.clipboard?.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? "" : c)), 1600);
  }

  return (
    <div ref={racine}>
      <style>{CSS}</style>
      <p className="bl-lead">1 tap = le message + le lien, prêts à envoyer. « Aperçu » pour voir ce que la personne verra.</p>

      <div className="bl-grid">
        {LINKS.map((l) =>
          l.missing ? (
            <div key={l.key} className="bl-carte off">
              <div className="bl-tete">
                <span className="bl-ic" aria-hidden="true">{l.icon}</span>
                <div>
                  <div className="bl-titre">{l.title}</div>
                  <div className="bl-hint">{l.hint}</div>
                </div>
              </div>
              <div className="bl-manque">
                Lien pas encore renseigné — ajoute-le dans <b>Réglages → les liens du club</b>.
              </div>
            </div>
          ) : (
            <div key={l.key} className="bl-carte">
              <div className="bl-tete">
                <span className="bl-ic" aria-hidden="true">{l.icon}</span>
                <div>
                  <div className="bl-titre">{l.title}</div>
                  <div className="bl-hint">{l.hint}</div>
                </div>
              </div>
              <div className="bl-url">{l.url}</div>
              <div className="bl-acts">
                <button type="button" className="bl-b voir" onClick={() => setApercu(l)}>
                  👁 Aperçu
                </button>
                <button type="button" className="bl-b plein" onClick={() => copy(`${l.key}-msg`, l.message(l.url))}>
                  {copied === `${l.key}-msg` ? "copié ✓" : "Copier le message"}
                </button>
                <button type="button" className="bl-b" onClick={() => copy(`${l.key}-url`, l.url)}>
                  {copied === `${l.key}-url` ? "copié ✓" : "Lien seul"}
                </button>
                <a className="bl-b" href={`https://wa.me/?text=${encodeURIComponent(l.message(l.url))}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
                <button type="button" className="bl-b" onClick={() => setQr(l)}>
                  QR
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {apercu ? (
        <Calque depuis={racine}>
          <Apercu
            lien={apercu}
            prenom={(coachName ?? "").split(/\s+/)[0]}
            slug={slugify(coachName)}
            copied={copied}
            onCopier={copy}
            onFermer={() => setApercu(null)}
          />
        </Calque>
      ) : null}
      {qr ? (
        <Calque depuis={racine}>
          <FenetreQr lien={qr} onFermer={() => setQr(null)} />
        </Calque>
      ) : null}
    </div>
  );
}

/** Le tiroir « Mes liens », ouvert par le bouton au bout des onglets. */
export function BbcLiensTiroir({ onFermer, ...props }: BbcLiensProps & { onFermer: () => void }) {
  useEchap(onFermer);
  return (
    <div className="bl-fond" onClick={onFermer}>
      <div className="bl-panneau" role="dialog" aria-modal="true" aria-label="Mes liens" onClick={(e) => e.stopPropagation()}>
        <div className="bl-entete">
          <div className="bl-h">Mes liens</div>
          <button type="button" className="bl-x" aria-label="Fermer" onClick={onFermer} autoFocus>
            ✕
          </button>
        </div>
        <BbcLiens {...props} />
      </div>
    </div>
  );
}

function Apercu({
  lien,
  prenom,
  slug,
  copied,
  onCopier,
  onFermer,
}: {
  lien: QuickLink;
  prenom: string;
  slug: string;
  copied: string;
  onCopier: (key: string, text: string) => void;
  onFermer: () => void;
}) {
  useEchap(onFermer);
  const cadre = useRef<HTMLIFrameElement>(null);
  const capte = useRef<HTMLDivElement>(null);
  const [chargee, setChargee] = useState(false);
  const message = lien.message(lien.url);
  const externe = lien.carte === "externe";

  // L'iframe ne reçoit aucun geste (pointer-events: none) : pas de clic, pas
  // de saisie, donc pas de faux lead. Cette couche relaie seulement le
  // défilement — molette sur ordinateur, doigt sur téléphone.
  useEffect(() => {
    const zone = capte.current;
    if (!zone) return;
    const defiler = (dy: number) => cadre.current?.contentWindow?.scrollBy(0, dy);
    let dernierY = 0;
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      defiler(e.deltaY);
    };
    const debut = (e: TouchEvent) => {
      dernierY = e.touches[0]?.clientY ?? 0;
    };
    const glisse = (e: TouchEvent) => {
      e.preventDefault();
      const y = e.touches[0]?.clientY ?? dernierY;
      defiler((dernierY - y) * 1.5);
      dernierY = y;
    };
    zone.addEventListener("wheel", molette, { passive: false });
    zone.addEventListener("touchstart", debut, { passive: true });
    zone.addEventListener("touchmove", glisse, { passive: false });
    return () => {
      zone.removeEventListener("wheel", molette);
      zone.removeEventListener("touchstart", debut);
      zone.removeEventListener("touchmove", glisse);
    };
  }, [externe]);

  let hote = "";
  try {
    hote = new URL(lien.url).host.replace(/^www\./, "");
  } catch {
    hote = lien.url;
  }
  let vraiePage = lien.url;
  try {
    const u = new URL(lien.url);
    if (!externe) u.searchParams.set("apercu", "1");
    vraiePage = u.toString();
  } catch {
    /* lien mal formé : on l'ouvre tel quel */
  }

  const og =
    lien.carte === "coach"
      ? { img: `/api/og/coach?slug=${encodeURIComponent(slug)}`, titre: `${prenom || "Ton prénom"} · Coach bien-être La Base 360` }
      : lien.carte === "externe"
        ? null
        : { img: "/brand/labase360/og-image-1200x630.png", titre: "La Base 360 — The wellness nutrition club" };

  return (
    <div className="bl-ov" onClick={onFermer}>
      <div className="bl-feuille" role="dialog" aria-modal="true" aria-label={`Aperçu · ${lien.title}`} onClick={(e) => e.stopPropagation()}>
        <div className="bl-entete">
          <div className="bl-h">Aperçu · {lien.title}</div>
          <button type="button" className="bl-x" aria-label="Fermer l'aperçu" onClick={onFermer} autoFocus>
            ✕
          </button>
        </div>
        <div className="bl-sur">Aperçu seulement : rien n'est envoyé, rien n'est compté dans tes statistiques.</div>

        <div className="bl-pv">
          <div>
            <div className="bl-lbl">La page où elle arrive</div>
            {externe ? (
              <div className="bl-ext">
                Page externe ({hote}) : son aperçu ne peut pas s'afficher ici.
                <br />
                Ouvre-la pour vérifier le lien.
              </div>
            ) : (
              <div className="bl-tel">
                {chargee ? null : <div className="bl-charge">Chargement de la page…</div>}
                <iframe ref={cadre} src={lien.url} title={`Page ${lien.title}`} tabIndex={-1} onLoad={() => setChargee(true)} />
                <div ref={capte} className="bl-capte" aria-hidden="true" />
              </div>
            )}
          </div>

          <div>
            <div className="bl-lbl">Ce qu'elle reçoit sur WhatsApp</div>
            <div className="bl-wa">
              <div className="bl-bulle">
                {og ? (
                  <div className="bl-og">
                    <img src={og.img} alt="" />
                    <div className="bl-og-t">
                      {og.titre}
                      <span className="bl-og-d">{hote}</span>
                    </div>
                  </div>
                ) : null}
                <div className="bl-msg">{message}</div>
              </div>
            </div>
            {lien.carte === "base360-sur-un-lien-club" ? (
              <div className="bl-note">
                WhatsApp affiche aujourd'hui la carte La Base 360 (pas celle du Breakfast Club) sur ce lien.
              </div>
            ) : null}
            <div className="bl-pacts">
              <button type="button" className="bl-b plein" onClick={() => onCopier(`${lien.key}-msg`, message)}>
                {copied === `${lien.key}-msg` ? "copié ✓" : "Copier le message"}
              </button>
              <a className="bl-b" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              <button type="button" className="bl-b" onClick={() => onCopier(`${lien.key}-url`, lien.url)}>
                {copied === `${lien.key}-url` ? "copié ✓" : "Lien seul"}
              </button>
              <a className="bl-b" href={vraiePage} target="_blank" rel="noopener noreferrer">
                Ouvrir la vraie page ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FenetreQr({ lien, onFermer }: { lien: QuickLink; onFermer: () => void }) {
  useEchap(onFermer);
  return (
    <div className="bl-ov" onClick={onFermer}>
      <div className="bl-feuille qr" role="dialog" aria-modal="true" aria-label={`QR · ${lien.title}`} onClick={(e) => e.stopPropagation()}>
        <div className="bl-entete">
          <div className="bl-h">QR · {lien.title}</div>
          <button type="button" className="bl-x" aria-label="Fermer" onClick={onFermer} autoFocus>
            ✕
          </button>
        </div>
        <div className="bl-qr">
          <QRCodeSVG value={lien.url} size={200} level="M" />
        </div>
        <p className="bl-lead" style={{ textAlign: "center", margin: 0 }}>
          À scanner en présentiel, au club.
        </p>
      </div>
    </div>
  );
}
