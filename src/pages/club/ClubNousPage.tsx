// Nous — page interne « Mélanie, Thomas, et un local rue Saint Pierre ». v7 fidèle.
import { Link } from "react-router-dom";
import { ClubShell, InnerHero, Slot, R, TEL } from "./ClubShell";
import { CLUB_TEL, CLUB_ADRESSE } from "../../data/clubInfos";

/**
 * Les visages du matin.
 *
 * `src` absent = l'emplacement attend encore sa photo (repère « 📷 »).
 * `cadrage` = `object-position` : les visages ne sont pas à la même hauteur
 * d'une photo à l'autre, c'est ce réglage qui les aligne dans la grille — pas
 * un recadrage de l'image, qu'on ne peut pas faire ici.
 * `force` = intensité du duotone, à monter quand un décor reste trop bavard.
 */
const EQUIPE: Array<{ nom: string; role: string; src?: string; alt?: string; cadrage?: string; force?: number }> = [
  // Les `cadrage` sont CALCULÉS, pas réglés à l'œil. Les deux portraits font
  // 720×1280 (ratio .5625) dans un cadre 4/5 (.8) : la source est plus étroite
  // que le cadre, donc `cover` remplit la largeur et rogne EN HAUTEUR — seul
  // le second nombre agit. Fenêtre visible = 70,3 % de la hauteur source.
  //   Mélanie : visage à ~18 % de la photo → même à 0 % il tombe à 26 % du
  //             cadre, ce qui est déjà la bonne place. D'où 0 %.
  //   Thomas  : visage à ~44 % → 58 % le pose à 38 % du cadre.
  {
    nom: "Mélanie", role: "Coach · co-fondatrice",
    src: "/brand/breakfast-club/photos/coach-melanie.jpg",
    alt: "Mélanie, coach et co-fondatrice du club.",
    cadrage: "50% 0%",
  },
  {
    nom: "Thomas", role: "Coach · co-fondateur",
    src: "/brand/breakfast-club/photos/coach-thomas.jpg",
    alt: "Thomas, coach et co-fondateur du club.",
    cadrage: "50% 58%",
  },
  {
    nom: "L'équipe", role: "Au club",
    src: "/brand/breakfast-club/photos/club-equipe-table.jpg",
    alt: "L'équipe du club attablée un matin, autour des boissons du rituel.",
    cadrage: "50% 25%",
  },
];
const PRATIQUE = [
  ["Adresse", CLUB_ADRESSE],
  ["Horaires", "Lundi au vendredi 7h–11h · Samedi 8h–11h"],
  ["Accès", "En centre-ville, stationnement à proximité"],
  ["Paiement", "Carte, espèces — sur place"],
  ["Téléphone", CLUB_TEL],
];

export function ClubNousPage() {
  return (
    <ClubShell
      title="Qui sommes-nous ? — Breakfast Club Verdun"
      description="Mel & Tom, derrière le Breakfast Club de Verdun : quatre ans à accompagner des gens, l'ouverture de La Base, et pourquoi ce club de nutrition existe."
    >
      <InnerHero pill="Qui sommes-nous ?" pillClass="s" title="Derrière le club," accent="il y a nous." intro="Mel & Tom. Deux personnes de Verdun, un lieu bien réel rue Saint Pierre, et quatre ans à accompagner des gens le matin." />

      {/* Répartition décidée par Thomas, et elle est juste : le SELFIE ici,
          parce que cette page parle d'EUX ; la photo de groupe sur l'accueil,
          parce que la section « Tu n'es jamais seul » parle du groupe. Chaque
          image va là où elle raconte quelque chose.
          La photo passe aussi à CÔTÉ du texte : la page était « une grande
          image, puis un pavé », et un portrait 9:16 en pleine largeur ferait
          deux mètres de haut sur un écran d'ordinateur. En colonne, son format
          vertical devient un atout. */}
      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv" style={{ paddingTop: "clamp(20px,3vw,36px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "clamp(30px,5vw,60px)", alignItems: "center" }}>
          <Slot
            ratio="4/5"
            label="Mélanie & Thomas"
            sub="portrait de l'équipe"
            frame="peach"
            src="/brand/breakfast-club/photos/equipe-selfie.jpg"
            position="50% 22%"
            alt="Mélanie et Thomas, souriants devant le mur végétal et l'enseigne lumineuse La Base."
          />
          {/* Copie de Thomas du 14/08, reprise mot pour mot. Le récit remplace
              l'ancien (« on a commencé simplement… ») : il raconte la même
              chose mais dans leur voix, avec les quatre ans et l'ouverture de
              La Base, que l'ancien texte passait sous silence. */}
          <div>
            <p style={{ fontSize: 19, lineHeight: 1.8, color: "var(--muted)" }}>Il y a 4 ans, nous avons commencé cette aventure avec un objectif simple : améliorer notre forme, notre énergie et nos habitudes.</p>
            <p style={{ fontSize: 19, lineHeight: 1.8, color: "var(--muted)", marginTop: 18 }}>Les résultats obtenus nous ont donné envie d'aider à notre tour d'autres personnes à se sentir mieux dans leur corps et dans leur quotidien.</p>
            <p style={{ fontSize: 19, lineHeight: 1.8, color: "var(--muted)", marginTop: 18 }}>Au fil des années, l'accompagnement a pris de plus en plus de place dans notre vie, jusqu'à l'ouverture de La Base à Verdun. Puis nous avons voulu aller encore plus loin…</p>
            <p style={{ fontFamily: "Anton", fontSize: "clamp(24px,3.2vw,34px)", lineHeight: 1.08, marginTop: 26 }}>C'est ainsi qu'est né <span className="cl-a-sage">The Breakfast Club.</span> ❤️</p>
          </div>
        </div>
      </div></div>

      {/* CE QU'EST LE CLUB, ET LA MISSION — la fin de la copie du 14/08.
          Placée ici et pas ailleurs : elle vient juste après « c'est ainsi
          qu'est né The Breakfast Club », donc elle répond à la question que
          cette phrase pose — « né pour quoi faire ? ».
          Les cinq lignes sont montées en liste plutôt qu'en paragraphe : dans
          sa copie elles sont déjà écrites une par ligne, c'est un rythme, pas
          une énumération à aplatir. */}
      <div className="cl-band alt"><div className="cl-wrap cl-sec cl-rv">
        <div style={{ maxWidth: 760 }}>
          <span className="cl-pill o">Le club</span>
          <h2 style={{ marginTop: 20, fontSize: "clamp(28px,3.8vw,48px)" }}>On ne vient pas simplement <span className="cl-a-orange">prendre son petit-déjeuner.</span></h2>
          <p style={{ fontSize: 19, lineHeight: 1.8, color: "var(--muted)", marginTop: 18 }}>Un lieu convivial, motivant et sans jugement.</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0" }}>
            {[
              "On vient avec un objectif.",
              "On est accompagné.",
              "On suit ses progrès.",
              "On crée de nouvelles habitudes.",
              "Et surtout, on n'avance plus seul.",
            ].map((ligne, i, tout) => (
              <li
                key={ligne}
                style={{
                  fontFamily: "Anton",
                  fontSize: "clamp(21px,2.8vw,30px)",
                  lineHeight: 1.25,
                  padding: "12px 0",
                  borderTop: "1px solid rgba(30,51,48,.12)",
                  // La dernière est la chute : elle prend la couleur.
                  color: i === tout.length - 1 ? "var(--orange-h)" : "var(--ink)",
                }}
              >
                {ligne}
              </li>
            ))}
          </ul>
        </div>

        <div className="cl-card" style={{ marginTop: "clamp(28px,4vw,44px)", padding: "clamp(26px,3.6vw,40px)", borderLeft: "5px solid var(--sage)", maxWidth: 760 }}>
          <div style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700, color: "var(--muted2)" }}>Notre mission</div>
          <p style={{ fontSize: 19, lineHeight: 1.75, marginTop: 10 }}>Vous aider à obtenir des résultats durables, tout en vous sentant bien et entouré(e). ❤️</p>
          <p style={{ fontFamily: "Anton", fontSize: 22, marginTop: 16 }}>Mel &amp; Tom</p>
        </div>
      </div></div>

      <div className="cl-band dark"><div className="cl-wrap cl-sec cl-rv">
        <span className="cl-pill y">L'équipe</span>
        <h2 style={{ marginTop: 24, fontSize: "clamp(30px,4.6vw,56px)", color: "#fff" }}>Les visages <span className="cl-a-yellow">du matin.</span></h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 18, marginTop: 30 }}>
          {EQUIPE.map((p) => (
            <figure key={p.nom} style={{ margin: 0 }}>
              {p.src ? (
                <div className="cl-duo" style={{ aspectRatio: "4/5", ...(p.force ? { ["--duo-force" as string]: String(p.force) } : {}) }}>
                  <img src={p.src} alt={p.alt ?? p.nom} loading="lazy" decoding="async" style={{ objectPosition: p.cadrage ?? "50% 30%" }} />
                </div>
              ) : (
                <div className="cl-slot" style={{ aspectRatio: "4/5", boxShadow: "none", background: "#26403B", color: "var(--on-dark-3)" }}><span>📷 {p.nom}</span></div>
              )}
              <figcaption style={{ marginTop: 12 }}><div style={{ fontFamily: "Anton", fontSize: 24, color: "#fff" }}>{p.nom}</div><div style={{ fontSize: 15, color: "var(--on-dark-3)" }}>{p.role}</div></figcaption>
            </figure>
          ))}

          {/* « Rejoins-nous » n'est PAS un visage — c'était un emplacement photo
              pour une personne qui n'existe pas encore. Un montage n'y changerait
              rien : la case demandait une photo à un poste vacant. Elle devient
              donc ce qu'elle est vraiment, une porte — et elle mène quelque part. */}
          <Link to="/club/rejoindre" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              aspectRatio: "4/5", borderRadius: 16, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center",
              padding: 20, border: "1.5px dashed rgba(241,226,126,.45)",
              background: "linear-gradient(160deg, rgba(241,226,126,.10), rgba(241,226,126,.02))",
            }}>
              <span aria-hidden="true" style={{
                width: 54, height: 54, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center",
                border: "1.5px solid rgba(241,226,126,.5)", color: "var(--yellow)", fontSize: 30, lineHeight: 1,
              }}>+</span>
              <span style={{ fontFamily: "Anton", fontSize: 21, color: "var(--yellow)", lineHeight: 1.15, textTransform: "uppercase" }}>
                Ta place<br />est libre
              </span>
              <span style={{ fontSize: 14, color: "var(--on-dark-2)", lineHeight: 1.5 }}>
                On cherche quelqu'un du matin.
              </span>
            </div>
            <figcaption style={{ marginTop: 12 }}>
              <div style={{ fontFamily: "Anton", fontSize: 24, color: "#fff" }}>Rejoins-nous</div>
              <div style={{ fontSize: 15, color: "var(--yellow)" }}>On recrute →</div>
            </figcaption>
          </Link>
        </div>
      </div></div>

      <div className="cl-band"><div className="cl-wrap cl-sec cl-rv">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "clamp(32px,5vw,56px)", alignItems: "start" }}>
          <div>
            <span className="cl-pill o">Le club en pratique</span>
            <h2 style={{ marginTop: 20, fontSize: "clamp(28px,3.8vw,48px)" }}>Où, quand, <span className="cl-a-orange">comment venir.</span></h2>
            <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0" }}>
              {PRATIQUE.map(([k, v]) => (
                <li key={k} style={{ padding: "14px 0", borderTop: "1px solid rgba(30,51,48,.12)" }}>
                  <div style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted2)", fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 17, marginTop: 3 }}>{v}</div>
                </li>
              ))}
            </ul>
            <a className="cl-cta" style={{ marginTop: 24 }} href={R}>Réserver ma venue</a>
            <a className="cl-ghost" style={{ marginTop: 12, marginLeft: 12 }} href={TEL}>Appeler</a>
          </div>
          <iframe
            title={`Plan du club — ${CLUB_ADRESSE}`}
            src="https://www.google.com/maps?q=11+rue+Saint+Pierre+Verdun&output=embed"
            style={{ width: "100%", height: 400, border: 0, borderRadius: 20 }}
            loading="lazy"
          />
        </div>
      </div></div>
    </ClubShell>
  );
}
