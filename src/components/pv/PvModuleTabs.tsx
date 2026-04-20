import { NavLink } from "react-router-dom";
import type { User } from "../../types/domain";

const tabs = [
  { label: "Vue globale", path: "/pv", adminOnly: false },
  { label: "Vue équipe", path: "/pv/team", adminOnly: true }
];

export function PvModuleTabs({ currentUser }: { currentUser: User }) {
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || currentUser.role === "admin");

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
