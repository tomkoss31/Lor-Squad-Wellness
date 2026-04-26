// Chantier Refonte Navigation (2026-04-22) — placeholder.
// Mis a jour Chantier Academy refonte (2026-04-27) : la page distri rend
// desormais ProfilTab (meme composant que /parametres admin) pour exposer
// les champs herbalife_id, sponsor, coach referent — utilises par la
// section "welcome" de l Academy.

import { PageHeading } from "../components/ui/PageHeading";
import { ProfilTab } from "../components/settings/ProfilTab";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Réglages"
        title="Paramètres"
        description="Profil, préférences et confidentialité."
      />
      <ProfilTab />
    </div>
  );
}
