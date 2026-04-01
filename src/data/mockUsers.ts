import type { User } from "../types/domain";

export const mockUsers: User[] = [
  {
    id: "u-admin-thomas",
    name: "Admin Lor'Squad",
    email: "admin@lorsquadwellness.app",
    role: "admin",
    active: true,
    title: "Administration",
    createdAt: "2026-01-08",
    lastAccessAt: "2026-03-31"
  },
  {
    id: "u-admin-melanie",
    name: "Coordination Lor'Squad",
    email: "coordination@lorsquadwellness.app",
    role: "admin",
    active: true,
    title: "Administration",
    createdAt: "2026-01-08",
    lastAccessAt: "2026-03-31"
  },
  {
    id: "u-dist-sarah",
    name: "Distributeur Demo",
    email: "distributeur@lorsquadwellness.app",
    role: "distributor",
    active: true,
    title: "Acces distributeur",
    createdAt: "2026-02-02",
    lastAccessAt: "2026-03-30"
  },
  {
    id: "u-dist-yanis",
    name: "Distributeur Equipe",
    email: "equipe@lorsquadwellness.app",
    role: "distributor",
    active: true,
    title: "Acces distributeur",
    createdAt: "2026-02-10",
    lastAccessAt: "2026-03-29"
  }
];
