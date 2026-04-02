import type { User } from "../types/domain";

export const mockUsers: User[] = [
  {
    id: "u-admin-thomas",
    name: "Thomas",
    email: "admin@lorsquadwellness.app",
    mockPassword: "demo1234",
    role: "admin",
    active: true,
    title: "Pilotage client",
    createdAt: "2026-01-08",
    lastAccessAt: "2026-03-31"
  },
  {
    id: "u-admin-melanie",
    name: "Melanie",
    email: "coordination@lorsquadwellness.app",
    mockPassword: "demo1234",
    role: "admin",
    active: true,
    title: "Coordination client",
    createdAt: "2026-01-08",
    lastAccessAt: "2026-03-31"
  },
  {
    id: "u-dist-mendy",
    name: "Mendy",
    email: "distributeur@lorsquadwellness.app",
    mockPassword: "demo1234",
    role: "distributor",
    active: true,
    title: "Portefeuille relances",
    createdAt: "2026-02-02",
    lastAccessAt: "2026-03-30"
  },
  {
    id: "u-dist-camille",
    name: "Camille",
    email: "equipe@lorsquadwellness.app",
    mockPassword: "demo1234",
    role: "distributor",
    active: true,
    title: "Portefeuille suivi",
    createdAt: "2026-02-10",
    lastAccessAt: "2026-03-29"
  }
];
