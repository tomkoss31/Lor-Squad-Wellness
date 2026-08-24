// =============================================================================
// ClubPaymentReturn — l'écran qu'on voit en revenant de chez Square.
// Maquette validée par Thomas le 2026-08-10.
//
// CE QUI MANQUAIT : le paiement renvoyait bien sur /club, mais aucune page ne
// lisait le paramètre de retour. Quelqu'un qui venait de payer 80 € retombait
// sur l'accueil sans le moindre signe que ça avait marché.
//
// LE STATUT N'EST PAS CRU SUR PAROLE. On ne se contente pas de « il y a un
// paramètre dans l'URL, donc c'est payé » : l'edge relit la commande côté
// serveur. Et comme le webhook Square peut n'avoir pas encore basculé la ligne
// à `paid` quelques secondes après le retour, l'écran sait dire « on confirme
// dans un instant » au lieu d'affirmer une chose ou son contraire.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { TEL } from "./ClubShell";
import { CLUB_TEL, HORAIRES_PHRASE } from "../../data/clubInfos";

interface OrderStatus {
  status: "pending" | "paid" | "canceled" | "failed";
  first_name: string;
  email: string;
  card_type: number;
  amount_eur: number;
  validity_days: number;
  expires_label: string;
}

export function ClubPaymentReturn({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;

    async function lire(essai: number) {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("indisponible");
        const { data } = await sb.functions.invoke("create-club-card-payment", {
          body: { mode: "status", order_id: orderId },
        });
        const res = data as (OrderStatus & { error?: string }) | null;
        if (!alive) return;
        if (!res || res.error) {
          setFailed(true);
          return;
        }
        setOrder(res);
        // Course connue : la personne revient parfois avant que le webhook
        // n'ait basculé la commande. Deux relectures espacées suffisent —
        // au-delà, le mail de confirmation prend le relais.
        if (res.status === "pending" && essai < 2) {
          timer = window.setTimeout(() => lire(essai + 1), 3500);
        }
      } catch {
        if (alive) setFailed(true);
      }
    }
    void lire(0);
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId]);

  // Commande introuvable (lien trafiqué, vieux favori) : on n'affiche rien
  // plutôt qu'un message d'erreur anxiogène sur une page vitrine.
  if (failed) return null;

  const enAttente = !order || order.status === "pending";
  const prenom = order?.first_name || "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cl-ret-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed", inset: 0, zIndex: 210, background: "rgba(23,32,28,.66)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "18px 18px 40px", overflowY: "auto",
      }}
    >
      <div style={{ width: "100%", maxWidth: 430, margin: "auto", borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 70px rgba(23,32,28,.3)" }}>

        <div style={{ background: "var(--dark, #1E3330)", color: "var(--on-dark, #F4EFE4)", padding: "24px 20px 26px" }}>
          <div aria-hidden="true" style={{
            width: 46, height: 46, borderRadius: "50%", marginBottom: 14,
            background: "var(--grad, linear-gradient(135deg,#FF7A2F,#FF1E3C))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="cl-pill y">{enAttente ? "Paiement enregistré" : "Paiement reçu"}</span>
          <h2 id="cl-ret-title" style={{ margin: "12px 0 10px", fontSize: 27, color: "#fff", lineHeight: 1.12 }}>
            {enAttente ? <>Merci{prenom ? `, ${prenom}` : ""}.<br />On confirme dans un instant.</> : <>C'est bon{prenom ? `, ${prenom}` : ""}.<br />Ta carte t'attend.</>}
          </h2>
          {order ? (
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--on-dark-2, #C3CCC7)" }}>
              Carte <b style={{ color: "#fff" }}>{order.card_type} visites</b> · {order.amount_eur} € ·
              {" "}valable jusqu'au <b style={{ color: "#fff" }}>{order.expires_label}</b>
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--on-dark-2, #C3CCC7)" }}>On relit ta commande…</p>
          )}
        </div>

        <div style={{ background: "var(--cream, #FCF8F1)", padding: "22px 20px 24px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, letterSpacing: ".15em", textTransform: "uppercase", fontWeight: 800, color: "var(--muted2, #8A938D)" }}>
            La suite
          </p>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
            {[
              <>Ta <b>preuve d'achat</b> part {order?.email ? <>sur <b>{order.email}</b></> : "sur ton email"}. Garde-la, c'est elle qui fait foi au comptoir.</>,
              <><b>Mélanie ou Thomas te rappelle</b> dans la journée pour caler ton premier matin.</>,
              <>Tu passes <b>quand tu veux {HORAIRES_PHRASE}</b>. Dis ton nom en arrivant — on retrouve ta carte.</>,
            ].map((txt, i) => (
              <li key={i} style={{ display: "flex", gap: 11, fontSize: 14, lineHeight: 1.55, color: "var(--muted, #55605A)" }}>
                <span aria-hidden="true" style={{
                  width: 22, height: 22, borderRadius: "50%", flex: "none", marginTop: 1,
                  background: "var(--cream-alt, #F0E7D7)", color: "var(--sage-d, #5F7154)",
                  fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{i + 1}</span>
                <span>{txt}</span>
              </li>
            ))}
          </ol>

          <div style={{ background: "var(--cream-alt, #F0E7D7)", border: "1px solid var(--hair, #E7E1D6)", borderRadius: 13, padding: "13px 15px", marginTop: 18 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Pas reçu le mail ?</p>
            <p style={{ margin: "5px 0 0", fontSize: 13.5, lineHeight: 1.55, color: "var(--muted, #55605A)" }}>
              Regarde tes spams, puis appelle-nous au <a href={TEL}>{CLUB_TEL}</a>. Ton paiement est enregistré quoi qu'il arrive.
            </p>
          </div>

          <button type="button" onClick={onClose} className="cl-cta"
            style={{ width: "100%", marginTop: 18, minHeight: 50, border: "none", font: "inherit", cursor: "pointer" }}>
            Revenir au club
          </button>
        </div>
      </div>
    </div>
  );
}
