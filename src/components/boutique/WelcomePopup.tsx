// Popup de bienvenue boutique HL SKIN (Étape 5).
// Capture prénom + email → edge shop-welcome-lead → affiche le code −5 %
// (WELCOME5, valable jusqu'à minuit) + l'envoie par email. Le lead est capturé
// même sans email délivré. Desktop = modale ; mobile = déclenché à la demande
// (pas d'interstitiel on-load sur mobile — règle Google).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

type Props = {
  slug: string;
  shopName: string;
  onClose: () => void;
};

export function WelcomePopup({ slug, shopName, onClose }: Props) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function submit() {
    if (!emailOk || loading) return;
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("no client");
      const { data, error: err } = await sb.functions.invoke("shop-welcome-lead", {
        body: {
          slug,
          email: email.trim(),
          first_name: firstName.trim(),
          shop_url: `${window.location.origin}/boutique/${slug}`,
        },
      });
      if (err) throw err;
      const res = data as { ok?: boolean; code?: string };
      if (res?.ok && res.code) {
        setDone({ code: res.code });
        try {
          localStorage.setItem(`bk-welc-${slug}`, "1");
        } catch {
          /* ignore */
        }
      } else {
        setError("Une erreur est survenue, réessaie.");
      }
    } catch {
      setError("Impossible d'enregistrer, réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="bk-qvm"
      role="dialog"
      aria-modal="true"
      aria-label="Offre de bienvenue"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bk-welc">
        <button className="bk-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        {done ? (
          <>
            <div className="bk-welc-top">
              <div className="bk-welc-off">Merci ✦</div>
              <div className="bk-welc-sub">Ton code de bienvenue t'attend</div>
            </div>
            <div className="bk-welc-bd">
              <div className="bk-welc-code">{done.code}</div>
              <p className="bk-welc-deadline">⏳ Valable jusqu'à minuit ce soir</p>
              <p className="bk-welc-fine">Il t'attend aussi dans ta boîte mail. À tout de suite ✨</p>
              <button className="bk-co" onClick={onClose}>
                Je fais mes achats
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bk-welc-top">
              <div className="bk-welc-off">−5 %</div>
              <div className="bk-welc-sub">sur ta première commande</div>
            </div>
            <div className="bk-welc-bd">
              <h3>Bienvenue chez {shopName}</h3>
              <p className="bk-welc-p">
                Laisse-nous ton prénom et ton email : ton code arrive tout de suite, valable{" "}
                <b style={{ color: "var(--blush)" }}>jusqu'à minuit</b>.
              </p>
              <input
                className="bk-field"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
              <input
                className="bk-field"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete="email"
              />
              {error && <div className="bk-welc-err">{error}</div>}
              <button className="bk-co" onClick={submit} disabled={!emailOk || loading}>
                {loading ? "…" : "Recevoir mon −5 %"}
              </button>
              <p className="bk-welc-fine">Un seul usage · code envoyé par email</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
