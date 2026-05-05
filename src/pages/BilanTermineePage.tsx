// Chantier Page remerciement post-bilan (2026-04-27).
// Page plein écran accessible sur /clients/:clientId/bilan-termine.
//
// Lit le token + firstName depuis les query params (passés par
// NewAssessmentPage juste après le save). Pas de re-fetch DB pour rester
// instantané — les données sont déjà en RAM côté coach au moment du save.
//
// Fallback : si les query params manquent (ex: coach arrive via permalink
// sans paramètres), on retombe sur l'AppContext pour récupérer le client
// et on utilise l'origin courante pour l'URL.

import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ThankYouStep } from "../components/assessment/ThankYouStep";
import { useAppContext } from "../context/AppContext";

export function BilanTermineePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, getClientById } = useAppContext();

  const tokenFromQuery = searchParams.get("token");
  const firstNameFromQuery = searchParams.get("firstName");
  // Chantier unification acces client (2026-05-05) :
  //   - accessKind === "magic" -> token client_invitation_tokens, URL
  //     /bienvenue?token=... -> auto-login PWA direct (le client n'a
  //     PAS a saisir email + password).
  //   - accessKind === "recap" (default fallback) -> ancien comportement,
  //     token client_recaps, URL /client/<token> (recap HTML public).
  const accessKind = searchParams.get("accessKind") ?? "recap";

  // Fallback : si firstName pas en query, lire depuis AppContext
  const client = clientId ? getClientById(clientId) : undefined;
  const clientFirstName =
    firstNameFromQuery?.trim() || client?.firstName?.trim() || "";

  const appUrl = useMemo(() => {
    if (tokenFromQuery && typeof window !== "undefined") {
      if (accessKind === "magic") {
        return `${window.location.origin}/bienvenue?token=${tokenFromQuery}`;
      }
      return `${window.location.origin}/client/${tokenFromQuery}`;
    }
    return typeof window !== "undefined" ? window.location.origin : "";
  }, [tokenFromQuery, accessKind]);

  const coachName = currentUser?.name?.split(/\s+/)[0] ?? "Ton coach";

  if (!clientId || !clientFirstName) {
    // Fallback gracieux : pas de bilan identifiable → retour liste clients
    navigate("/clients", { replace: true });
    return null;
  }

  return (
    <ThankYouStep
      clientFirstName={clientFirstName}
      appUrl={appUrl}
      coachName={coachName}
      onBack={() => navigate(`/clients/${clientId}`)}
    />
  );
}
