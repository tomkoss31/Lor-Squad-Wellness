import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";

const navigation = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Clients", to: "/clients" },
  { label: "Nouveau bilan", to: "/clients" },
  { label: "Body Scan", to: "/dashboard" },
  { label: "Recommandations", to: "/recommandations" },
  { label: "Suivi PV", to: "/suivi-pv" }
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const coachName = profile?.full_name?.trim() || "Coach Lor'Squad";

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-[rgba(255,255,255,0.06)] bg-[var(--lor-surface)] xl:flex xl:flex-col">
      <div className="flex h-full flex-col px-4 py-6">
        <div className="px-2">
          <p className="font-['Syne'] text-2xl font-extrabold text-[var(--lor-text)]">Lor&apos;Squad</p>
          <p className="mt-1 text-sm text-[var(--lor-muted)]">Wellness</p>
        </div>

        <nav className="mt-8 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex min-h-[44px] items-center border-l-2 px-4 text-sm transition",
                  isActive
                    ? "border-[var(--lor-gold)] bg-[rgba(201,168,76,0.1)] text-[var(--lor-text)]"
                    : "border-transparent text-[var(--lor-muted)] hover:text-[var(--lor-text)]"
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-[12px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-4">
          <div className="flex items-center gap-3">
            <Avatar name={coachName} size={42} />
            <div>
              <p className="text-sm font-medium text-[var(--lor-text)]">{coachName}</p>
              <p className="text-xs text-[var(--lor-muted)]">Coach</p>
            </div>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => void handleSignOut()}>
            Déconnexion
          </Button>
        </div>
      </div>
    </aside>
  );
}
