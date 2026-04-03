import { NavLink } from "react-router-dom";
import type { User } from "../../types/domain";

const tabs = [
  { label: "Vue globale", path: "/pv", adminOnly: false },
  { label: "Fiches clients", path: "/pv/clients", adminOnly: false },
  { label: "Reprises / commandes", path: "/pv/orders", adminOnly: false },
  { label: "Vue equipe", path: "/pv/team", adminOnly: true }
];

export function PvModuleTabs({ currentUser }: { currentUser: User }) {
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || currentUser.role === "admin");

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === "/pv"}
          className={({ isActive }) =>
            `inline-flex min-h-[42px] items-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "bg-sky-400/[0.14] text-white shadow-[0_0_0_1px_rgba(125,211,252,0.12)]"
                : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.05] hover:text-white"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
