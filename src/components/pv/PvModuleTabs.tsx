import { NavLink } from "react-router-dom";
import type { User } from "../../types/domain";
import { useAppLevel } from "../../hooks/useAppLevel";
import type { FeatureKey } from "../../config/appVisibility";

const tabs: Array<{ label: string; path: string; adminOnly: boolean; feature?: FeatureKey }> = [
  { label: "Vue globale", path: "/pv", adminOnly: false },
  // Ménage du 12/08/2026 : la vue équipe lit la même saisie manuelle que la
  // Rentabilité — dernière écriture il y a 49 jours. L'onglet quitte la barre ;
  // la route /pv/team reste ouverte pour qui a le lien.
  { label: "Vue équipe", path: "/pv/team", adminOnly: true, feature: "business.pv-equipe" },
];

export function PvModuleTabs({ currentUser }: { currentUser: User }) {
  const { can } = useAppLevel();
  const visibleTabs = tabs.filter(
    (tab) => (!tab.adminOnly || currentUser.role === "admin") && (!tab.feature || can(tab.feature)),
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === "/pv"}
          className={({ isActive }) =>
            `inline-flex min-h-[42px] items-center rounded-full px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${
              isActive
                ? "bg-[rgba(201,168,76,0.12)] text-white shadow-[0_0_0_1px_rgba(201,168,76,0.2)]"
                : "bg-[var(--ls-surface2)] text-[var(--ls-text-muted)] hover:bg-[var(--ls-surface2)] hover:text-white"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
