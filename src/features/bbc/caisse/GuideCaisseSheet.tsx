// =============================================================================
// « La caisse, mode d'emploi » — une minute pour comprendre le comptoir (26/09/2026).
//
// Thomas, après les 5 lots du comptoir : « aide pour les coachs de l'équipe à
// comprendre ». Même modèle que le mode d'emploi de l'agenda (GuideAgendaSheet +
// mail-agenda-club) :
//   · il vit LÀ OÙ L'ON S'EN SERT, derrière un « ? » (Ma caisse) — jamais un
//     popup qui s'ouvre tout seul ;
//   · le propriétaire du club (ou un admin) peut l'envoyer par mail à une coach,
//     autant de fois qu'il veut (edge `mail-caisse-club`, deux gestes) ;
//   · LE TON : on propose un outil, on n'impose rien, pas de date butoir. Rien
//     ne date le texte : il sert aussi aux coachs qui arriveront.
// Il dit les règles de Thomas (qui encaisse quoi) et les gestes de l'écran.
// =============================================================================

import { useState, type CSSProperties, type ReactNode } from "react";
import { useAppContext } from "../../../context/AppContext";
import { envoyerModeEmploi } from "../agenda/envoyerModeEmploi";
import { Feuille } from "../ui";
import { useCoachsDuClub } from "../useCoachsDuClub";

export function GuideCaisseSheet({ userId, onClose }: { userId?: string | null; onClose: () => void }) {
  // Les coachs du club ne sont lus qu'à l'ouverture du guide : Ma caisse n'en a pas besoin.
  const { coachs } = useCoachsDuClub(userId);
  const { currentUser } = useAppContext();
  const peutEnvoyer = currentUser?.role === "admin" || coachs.some((c) => c.id === userId && c.proprietaire);

  // Deux gestes (choisir, puis envoyer) : un mail ne part jamais sur un appui malheureux.
  const [choisie, setChoisie] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const prenomChoisie = coachs.find((c) => c.id === choisie)?.prenom ?? "";

  async function envoyer() {
    if (!choisie || envoi) return;
    setEnvoi(true);
    setRetour(null);
    const res = await envoyerModeEmploi(choisie, "mail-caisse-club");
    setEnvoi(false);
    setRetour(res.ok ? { ok: true, texte: `Envoyé à ${choisie === userId ? "toi" : prenomChoisie} ✓` } : { ok: false, texte: res.message });
    if (res.ok) setChoisie(null);
  }

  return (
    <Feuille titre="La caisse, mode d'emploi" sous="une minute · pour bien démarrer" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>
        <Point emoji="🧾" titre="« Elle prend quelque chose ? »">
          Après le <b>+1</b> au pointage, la caisse s'ouvre toute seule : ses habituels d'abord, les upgrades d'un toucher, tout le
          tableau plus bas. <b>Payé sur mon terminal</b> note la vente, <b>Rien aujourd'hui</b> ferme. Elle passe juste acheter ? Sur
          sa fiche, « Lui vendre quelque chose ».
        </Point>

        <Point emoji="💳" titre="Qui encaisse quoi">
          La carte de visites, c'est le club. Les upgrades et l'à emporter viennent de <b>tes</b> pots, achetés avec ta remise, et se
          paient sur <b>ton</b> terminal : tu gardes ta marge, rien à reverser. L'app n'encaisse rien, elle note. Un seul prix pour tout
          le club : celui du tableau.
        </Point>

        <Point emoji="🏠" titre="Avant un jour fermé">
          La veille, la caisse te dit « Club fermé dimanche, elle revient lundi » et ce qu'elle a chez elle. <b>Ajouter</b> met de quoi
          tenir ; le pack 6 jours est proposé quand il vaut le coup. Contacter te prévient quand son F1 arrive au bout, et son journal
          lui propose ses sachets du club.
        </Point>

        <Point emoji="↩️" titre="Une erreur ?">
          Sur sa fiche, <b>Ses achats au comptoir</b> puis <b>Annuler</b> (deux touchers), et tu revends. Le jour même seulement :
          après minuit, une vente ne bouge plus.
        </Point>

        <Point emoji="📈" titre="Ma caisse">
          Ici : ce que tu as vendu et gagné aujourd'hui et ce mois-ci, tes PV, et ce qu'il te manque pour le rang suivant. Tu ne vois
          que tes ventes.
        </Point>

        <div style={encart}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: "var(--ls-bbc-text)" }}>Ce que ça t'apporte</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
            <li>tu vois ce que tu <b>gagnes vraiment</b>, vente par vente ;</li>
            <li>ce que tu vends ici, tu le rachètes sur ta plateforme : <b>ce sont tes PV</b> ;</li>
            <li>tes membres ne tombent plus à court le week-end.</li>
          </ul>
          <div style={{ marginTop: 10, color: "var(--ls-bbc-text)" }}>
            C'est un outil de plus, pas une obligation. Essaie-le sur tes prochaines ventes, et dis-nous ce qui manque.
          </div>
        </div>

        {peutEnvoyer && coachs.length ? (
          <div style={blocEnvoi}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>✉️ L'envoyer par mail</div>
            <div style={{ fontSize: 13, color: "var(--ls-bbc-muted)", lineHeight: 1.5, marginTop: 3 }}>
              Le même mode d'emploi, avec des visuels. Pour une coach qui arrive, ou qui préfère le lire tranquillement. À renvoyer
              autant de fois que tu veux.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {coachs.map((c) => {
                const on = c.id === choisie;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setChoisie(on ? null : c.id);
                      setRetour(null);
                    }}
                    style={{
                      ...puce,
                      borderColor: on ? "var(--ls-bbc-orange)" : "var(--ls-bbc-line)",
                      background: on ? "var(--ls-bbc-s3)" : "var(--ls-bbc-s1)",
                      color: on ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)",
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: c.couleur ?? "var(--ls-bbc-orange)", flex: "none" }} />
                    {c.id === userId ? "Moi (pour voir)" : c.prenom}
                  </button>
                );
              })}
            </div>
            {choisie ? (
              <button type="button" onClick={() => void envoyer()} disabled={envoi} style={{ ...boutonEnvoi, opacity: envoi ? 0.6 : 1 }}>
                {envoi ? "Envoi…" : `Envoyer à ${choisie === userId ? "moi" : prenomChoisie}`}
              </button>
            ) : null}
            {retour ? (
              <div role="status" style={{ marginTop: 10, fontSize: 13.5, fontWeight: 700, color: retour.ok ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-coral)" }}>
                {retour.texte}
              </div>
            ) : null}
          </div>
        ) : null}

        <button type="button" onClick={onClose} style={boutonPlein}>
          C'est compris
        </button>
      </div>
    </Feuille>
  );
}

function Point({ emoji, titre, children }: { emoji: string; titre: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span aria-hidden="true" style={pastille}>
        {emoji}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{titre}</div>
        <div style={{ fontSize: 13.5, color: "var(--ls-bbc-muted)", lineHeight: 1.55, marginTop: 3 }}>{children}</div>
      </div>
    </div>
  );
}

const pastille: CSSProperties = {
  flex: "none", width: 40, height: 40, borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
};
const encart: CSSProperties = {
  padding: "14px 16px", borderRadius: 16, border: "1px solid var(--ls-bbc-orange)",
  background: "color-mix(in srgb, var(--ls-bbc-orange) 8%, var(--ls-bbc-s2))", fontSize: 13.5, color: "var(--ls-bbc-muted)", lineHeight: 1.55,
};
const blocEnvoi: CSSProperties = { padding: "14px 16px", borderRadius: 16, border: "1px solid var(--ls-bbc-line)", background: "var(--ls-bbc-s2)" };
const puce: CSSProperties = {
  display: "flex", alignItems: "center", gap: 7, minHeight: 44, padding: "0 13px", borderRadius: 11, border: "1px solid",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const boutonEnvoi: CSSProperties = {
  width: "100%", minHeight: 48, marginTop: 10, borderRadius: 13, border: "1px solid var(--ls-bbc-orange)", background: "transparent",
  color: "var(--ls-bbc-orange-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 14.5, fontWeight: 800, cursor: "pointer",
};
const boutonPlein: CSSProperties = {
  width: "100%", minHeight: 52, border: 0, borderRadius: 14, background: "var(--ls-bbc-grad)", color: "#fff", boxShadow: "var(--ls-bbc-grad-ombre)",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 15.5, fontWeight: 800, cursor: "pointer",
};
