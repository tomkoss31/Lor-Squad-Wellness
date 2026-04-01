import type { User } from "../types/domain";

export const mockUsers: User[] = [
  {
    id: "u-admin-thomas",
    name: "Thomas",
    email: "thomas@lorsquadwellness.app",
    role: "admin",
    active: true,
    title: "Admin principal",
    createdAt: "2026-01-08",
    lastAccessAt: "2026-03-31"
  },
  {
    id: "u-admin-melanie",
    name: "Melanie",
    email: "melanie@lorsquadwellness.app",
    role: "admin",
    active: true,
    title: "Co-admin",
    createdAt: "2026-01-08",
    lastAccessAt: "2026-03-31"
  },
  {
    id: "u-dist-sarah",
    name: "Sarah",
    email: "sarah@lorsquadwellness.app",
    role: "distributor",
    active: true,
    title: "Distributrice",
    createdAt: "2026-02-02",
    lastAccessAt: "2026-03-30"
  },
  {
    id: "u-dist-yanis",
    name: "Yanis",
    email: "yanis@lorsquadwellness.app",
    role: "distributor",
    active: true,
    title: "Distributeur",
    createdAt: "2026-02-10",
    lastAccessAt: "2026-03-29"
  }
];
