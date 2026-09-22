// =============================================================================
// WelcomePage — /welcome, la porte d'entrée publique (ce qu'on voit déconnecté).
//
// Refaite le 22/09/2026 (maquette Fbk2bRMgzC4bMLYAm91nLM, Thomas : « bon travail,
// bravo ») pour parler le même langage que la page du lien d'accès (/bienvenue) :
// La Base en TROIS MAISONS, chacune avec son geste — le coaching (/decouvrir), le
// club (/club), le bar (commande en ligne) —, puis UN seul bouton « Me connecter » :
// cliente, membre du club ou coach, c'est la même porte (/login sert tout le monde).
// Plus de « Tu es ? » en trois cartes, plus de pop-up « As-tu un lien ? » : la
// réponse est écrite sous le bouton.
// Téléphone : une colonne. Ordinateur : les maisons à gauche, le geste à droite.
// =============================================================================

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MaisonsEntree } from "../components/bienvenue/TroisMaisons";
import "../components/bienvenue/bienvenue.css";

export function WelcomePage() {
  const navigate = useNavigate();

  // Filet de sécurité : un lien d'accès arrivé ici (?token=) repart vers /bienvenue.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) navigate(`/bienvenue?token=${encodeURIComponent(token)}`, { replace: true });
  }, [navigate]);

  return (
    <div className="bv" data-v="coaching">
      <div className="bv-entree">
        <section className="bv-entree-g aussi-mobile" aria-label="La Base">
          <div className="bv-lueur" aria-hidden="true" />
          <div className="bv-marque">LA BASE</div>
          <div className="bv-eye">Verdun · depuis 2022</div>
          <h1 className="bv-h1">
            Trois maisons,
            <br />
            une équipe
          </h1>
          <p className="bv-p">
            Le coaching, le club du petit-déjeuner et le bar à shakes : <b>tout commence ici</b>.
          </p>
          <MaisonsEntree gestes />
        </section>

        <div className="bv-entree-d">
          <main className="bv-col suite">
            <button type="button" className="bv-cta" onClick={() => navigate("/login")}>
              Me connecter <span aria-hidden="true">→</span>
            </button>
            <p className="bv-petit">Cliente, membre du club ou coach : c'est la même porte.</p>
            <div className="bv-aide">
              <b>Pas encore de compte ?</b> Il se crée avec le lien que ton coach t'envoie par WhatsApp ou SMS. Tu ne
              l'as pas ? Demande-le-lui : ça prend 10 secondes.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
