import { useLocation } from "react-router-dom";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Vue d'ensemble des clients, bilans et renouvellements à venir."
  },
  "/clients": {
    title: "Clients",
    subtitle: "Retrouve chaque dossier, crée un nouveau client et reprends les suivis."
  },
  "/recommandations": {
    title: "Recommandations",
    subtitle: "Centralise les alertes et propositions générées depuis les bilans."
  },
  "/suivi-pv": {
    title: "Suivi PV",
    subtitle: "Pilote les programmes actifs, les PV du mois et les renouvellements."
  }
};

function resolveHeading(pathname: string) {
  if (pathname.includes("/bilan/new")) {
    return {
      title: "Nouveau bilan",
      subtitle: "Bilan bien-être multi-étapes avec sauvegarde brouillon."
    };
  }

  if (pathname.includes("/scan/new")) {
    return {
      title: "Body Scan",
      subtitle: "Saisie des mesures et lecture immédiate des indicateurs."
    };
  }

  if (pathname.includes("/suivi/new")) {
    return {
      title: "Nouveau suivi",
      subtitle: "Enregistre le check-in hebdomadaire et l'état de la semaine."
    };
  }

  if (pathname.startsWith("/clients/")) {
    return {
      title: "Fiche client",
      subtitle: "Historique complet, suivi, body scan et produits."
    };
  }

  return titles[pathname] ?? {
    title: "Lor'Squad Wellness",
    subtitle: "Espace de pilotage wellness."
  };
}

export default function TopBar() {
  const location = useLocation();
  const heading = resolveHeading(location.pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(11,13,17,0.88)] px-6 py-4 backdrop-blur">
      <div className="flex min-h-[60px] items-center justify-between gap-4">
        <div>
          <p className="eyebrow-label">Lor&apos;Squad Wellness</p>
          <h1 className="mt-2 text-[1.8rem] font-bold">{heading.title}</h1>
          <p className="mt-1 text-sm text-[var(--lor-muted)]">{heading.subtitle}</p>
        </div>
      </div>
    </header>
  );
}
