// =============================================================================
// VipProgramDoc — contenu pédagogique partagé du Programme VIP (coach side)
// =============================================================================
//
// Utilisé par :
//   - VipProgramTab (onglet /parametres > Programme VIP)
//   - VipProgramHelpModal (modale ouverte depuis fiche client > bouton "?")
//
// Réservé au coach (vocabulaire distri, script pitch, FAQ business).
// Pour la version client app, voir ClientVipExplainModal.
// =============================================================================

import { Card } from "../../components/ui/Card";
import { VIP_LEVELS } from "./useClientVip";

export function VipProgramDoc() {
  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <p className="eyebrow-label">Programme Client Privilégié</p>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--ls-text)",
              margin: "4px 0 0",
            }}
          >
            ⭐ Comment ça marche
          </h2>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--ls-text-muted)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Le programme <strong>Client Privilégié</strong> Herbalife te permet
          d&apos;offrir à tes clients des remises automatiques et croissantes
          selon le volume cumulé. C&apos;est ton outil n°1 pour fidéliser et
          activer la recommandation. Plus le client recommande, plus sa remise
          grimpe — sa consommation devient quasi gratuite.
        </p>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Les 4 paliers de remise</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {VIP_LEVELS.map((lv) => (
            <div
              key={lv.level}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                background:
                  lv.level === "none" ? "var(--ls-surface2)" : "var(--ls-surface)",
                border: `0.5px solid ${lv.level === "none" ? "var(--ls-border)" : tierBorder(lv.tone)}`,
                borderLeft: `3px solid ${lv.color}`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: tierBg(lv.tone),
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                {lv.badge}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--ls-text)",
                  }}
                >
                  {lv.label}
                  {lv.discount > 0 ? (
                    <span style={{ marginLeft: 8, color: lv.color }}>
                      -{lv.discount} %
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ls-text-muted)",
                    marginTop: 2,
                  }}
                >
                  {lv.hint}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ls-text-hint)",
                  fontFamily: "DM Sans, sans-serif",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {lv.threshold === 0
                  ? "—"
                  : lv.level === "ambassador"
                    ? "1 000 pts en 3 mois"
                    : lv.level === "bronze"
                      ? "1ère commande"
                      : `${lv.threshold} pts cumulés`}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Mécanique des points</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Rule
            number="1"
            text="1 PV = 1 point. Les points viennent des commandes du client + de toutes les commandes de ses filleuls (directs et indirects, profondeur illimitée)."
          />
          <Rule
            number="2"
            text="Les points sont LIFETIME. Le client garde son palier à vie, même si ses filleuls arrêtent de commander."
          />
          <Rule
            number="3"
            text="Si un filleul de niveau 2 (Marie, qui a parrainé Karim) arrête, Karim continue à monter dans l'arbre — Marie ET le client racine reçoivent toujours ses PV."
          />
          <Rule
            number="4"
            text="Le palier Ambassadeur (-42%) est le SEUL qui demande de maintenir le rythme : 1 000 pts en 3 mois glissants. Si le client retombe sous ce seuil, il redescend à Gold (-35%) mais garde Gold à vie."
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Exemple concret</p>
        <div
          style={{
            padding: "14px 16px",
            background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface2))",
            borderLeft: "3px solid var(--ls-gold)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--ls-text)",
            lineHeight: 1.7,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Sarah</strong> est cliente, elle commande 125 PV/mois → 1ère
            commande débloque <strong>Bronze (-15 %)</strong>.
          </p>
          <p style={{ margin: "10px 0 0" }}>
            Elle parraine <strong>sa maman</strong> (125 PV/mois),{" "}
            <strong>une collègue</strong> (125 PV/mois) et{" "}
            <strong>une running buddy</strong> (125 PV/mois). Au bout de 1 mois :
            125 × 4 = <strong>500 pts cumulés</strong> →{" "}
            <strong>Gold (-35 %)</strong> 🥇
          </p>
          <p style={{ margin: "10px 0 0" }}>
            Sa running buddy parraine 3 amis qui commandent aussi 125 PV/mois.
            Cette branche apporte <strong>375 pts/mois</strong> qui remontent à
            Sarah. Sur 3 mois : 1 875 pts en cumul glissant →{" "}
            <strong>Ambassadeur (-42 %)</strong> 💎
          </p>
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">Script pitch (à adapter)</p>
        <div
          style={{
            padding: "14px 16px",
            background: "var(--ls-surface2)",
            borderRadius: 10,
            fontSize: 13,
            color: "var(--ls-text)",
            lineHeight: 1.7,
            fontStyle: "italic",
          }}
        >
          <p style={{ margin: 0 }}>
            « Comme tu commandes régulièrement, je te propose un truc : devenir
            Client Privilégié. Tu paies un petit pack à 36 € une fois, et après
            tu as systématiquement -15 % sur toutes tes commandes (envoi offert
            dès 40 PV). Et si tu fais découvrir Herbalife à 2-3 personnes de ton
            entourage, tu passes Silver (-25 %) puis Gold (-35 %). C&apos;est
            gratuit pour eux d&apos;essayer, ils s&apos;inscrivent avec mon ID
            sponsor, et toi tu cumules les points. La plupart de mes clients
            finissent par payer leurs produits 35-42 % moins cher grâce à 4-5
            amis. Je t&apos;envoie le lien et l&apos;ID, ça prend 5 min ? »
          </p>
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--ls-text-muted)",
            margin: "8px 0 0",
          }}
        >
          💡 Tu peux aussi envoyer le template prêt-à-l&apos;emploi depuis le
          bouton « Envoyer un message » sur n&apos;importe quelle fiche client.
        </p>
      </Card>

      <Card className="space-y-3">
        <p className="eyebrow-label">FAQ</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <FaqItem
            q="Le client peut-il perdre des points si un filleul arrête ?"
            a="Non. Les points sont lifetime, sans décroissance. Si Marie (filleule de Sarah) arrête, Sarah garde tous les points historiques. Si Karim (filleul de Marie) continue à commander, ses PV remontent toujours jusqu'à Sarah."
          />
          <FaqItem
            q="Le programme est-il gratuit ?"
            a="Le client paie un pack avantage de 36,38 € une fois pour activer son compte (cadeaux inclus : tablier + casque + blender). Ensuite la remise est automatique sur toutes ses commandes."
          />
          <FaqItem
            q="Comment le client s'inscrit ?"
            a="Sur www.myherbalife.com avec ton ID sponsor (format 21Y0103610) + les 3 premières lettres de ton nom. Une fois inscrit, le client reçoit son propre ID 21XY010361 que tu saisis dans Lor'Squad sur sa fiche."
          />
          <FaqItem
            q="C'est compatible avec le statut distributeur ?"
            a="Non. Client Privilégié = consommateur avec remise + recommandations. Distributeur = activité business avec commissions. Le palier Ambassadeur (-42 %) reste un client privilégié, pas un distri."
          />
          <FaqItem
            q="Lor'Squad calcule-t-il automatiquement le niveau ?"
            a="Oui, dès que tu saisis vip_herbalife_id + parrain dans la fiche client, Lor'Squad calcule en live le palier via la RPC get_client_vip_status — recursive sur tout l'arbre de descendants."
          />
        </div>
      </Card>
    </div>
  );
}

function Rule({ number, text }: { number: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "var(--ls-gold)",
          color: "white",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Syne, serif",
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--ls-text)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details
      style={{
        padding: "10px 12px",
        background: "var(--ls-surface2)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 10,
      }}
    >
      <summary
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          cursor: "pointer",
        }}
      >
        {q}
      </summary>
      <p
        style={{
          fontSize: 12,
          color: "var(--ls-text-muted)",
          lineHeight: 1.6,
          margin: "8px 0 0",
        }}
      >
        {a}
      </p>
    </details>
  );
}

function tierBg(tone: string): string {
  switch (tone) {
    case "bronze":
      return "linear-gradient(135deg, rgba(184,115,51,0.10), rgba(184,115,51,0.20))";
    case "silver":
      return "linear-gradient(135deg, rgba(156,163,175,0.12), rgba(156,163,175,0.22))";
    case "gold":
      return "linear-gradient(135deg, rgba(184,146,42,0.14), rgba(255,232,115,0.26))";
    case "diamond":
      return "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.22))";
    default:
      return "rgba(0,0,0,0.04)";
  }
}

function tierBorder(tone: string): string {
  switch (tone) {
    case "bronze":
      return "rgba(184,115,51,0.45)";
    case "silver":
      return "rgba(156,163,175,0.45)";
    case "gold":
      return "rgba(184,146,42,0.55)";
    case "diamond":
      return "rgba(124,58,237,0.50)";
    default:
      return "var(--ls-border)";
  }
}
