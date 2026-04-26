// Chantier Academy section 1 (2026-04-27) : /settings devient un simple
// redirect vers /parametres (qui est desormais accessible a tous les
// users authentifies). Conserve pour compat des anciens liens / cache
// PWA. La page profil unique vit dans ParametresPage > onglet Profil.

import { Navigate } from "react-router-dom";

export function SettingsPage() {
  return <Navigate to="/parametres" replace />;
}
