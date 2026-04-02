import type { Client, FollowUp, User } from "../types/domain";

export type PortfolioAccent = "blue" | "green" | "amber" | "rose";
export type PortfolioGlyph = "crest" | "spark" | "pulse" | "orbit";

export interface PortfolioIdentity {
  initials: string;
  accent: PortfolioAccent;
  glyph: PortfolioGlyph;
  target: number;
  label: string;
}

export interface PortfolioMetrics {
  clients: Client[];
  followUps: FollowUp[];
  scheduledFollowUps: FollowUp[];
  relanceFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
}

export interface ClientMonthGroup {
  key: string;
  label: string;
  clients: Client[];
}

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric"
});

const presetByKeyword: Array<{
  keyword: string;
  accent: PortfolioAccent;
  glyph: PortfolioGlyph;
  target: number;
  label: string;
}> = [
  {
    keyword: "thomas",
    accent: "blue",
    glyph: "crest",
    target: 80,
    label: "Portefeuille premium"
  },
  {
    keyword: "melanie",
    accent: "amber",
    glyph: "spark",
    target: 50,
    label: "Suivi croissance"
  },
  {
    keyword: "mendy",
    accent: "green",
    glyph: "pulse",
    target: 20,
    label: "Relances ciblees"
  }
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return "LS";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getClientReferenceDate(client: Client) {
  if (client.startDate) {
    return client.startDate;
  }

  const firstAssessment = [...client.assessments]
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    [0];

  return firstAssessment?.date ?? client.nextFollowUp;
}

function compareByDateAsc(left: string, right: string) {
  return new Date(left).getTime() - new Date(right).getTime();
}

export function getPortfolioIdentity(user: User): PortfolioIdentity {
  const normalizedName = normalize(user.name);
  const preset = presetByKeyword.find(({ keyword }) => normalizedName.includes(keyword));

  if (preset) {
    return {
      initials: toInitials(user.name),
      accent: preset.accent,
      glyph: preset.glyph,
      target: preset.target,
      label: preset.label
    };
  }

  return {
    initials: toInitials(user.name),
    accent: user.role === "admin" ? "rose" : "blue",
    glyph: user.role === "admin" ? "orbit" : "crest",
    target: user.role === "admin" ? 60 : 40,
    label: user.role === "admin" ? "Pilotage equipe" : "Portefeuille suivi"
  };
}

export function getActivePortfolioUsers(users: User[], clients: Client[]) {
  const clientOwnerIds = new Set(clients.map((client) => client.distributorId));

  return users
    .filter((user) => user.active)
    .filter((user) => user.role === "admin" || user.role === "distributor")
    .filter((user) => clientOwnerIds.has(user.id) || user.role === "admin")
    .sort((left, right) => {
      const targetDelta = getPortfolioIdentity(right).target - getPortfolioIdentity(left).target;
      if (targetDelta !== 0) {
        return targetDelta;
      }

      return left.name.localeCompare(right.name, "fr");
    });
}

export function getPortfolioMetrics(
  userId: string,
  clients: Client[],
  followUps: FollowUp[]
): PortfolioMetrics {
  const scopedClients = clients
    .filter((client) => client.distributorId === userId)
    .sort((left, right) => compareByDateAsc(left.nextFollowUp, right.nextFollowUp));
  const clientIds = new Set(scopedClients.map((client) => client.id));
  const scopedFollowUps = followUps
    .filter((followUp) => clientIds.has(followUp.clientId))
    .sort((left, right) => compareByDateAsc(left.dueDate, right.dueDate));
  const relanceFollowUps = scopedFollowUps.filter((followUp) => isRelanceFollowUp(followUp));
  const overdueFollowUps = scopedFollowUps.filter((followUp) => isOverdueFollowUp(followUp));

  return {
    clients: scopedClients,
    followUps: scopedFollowUps,
    scheduledFollowUps: scopedFollowUps.filter((followUp) => !isRelanceFollowUp(followUp)),
    relanceFollowUps,
    overdueFollowUps
  };
}

export function isOverdueFollowUp(followUp: FollowUp) {
  return new Date(followUp.dueDate).getTime() < Date.now();
}

export function isRelanceFollowUp(followUp: FollowUp) {
  return followUp.status === "pending" || isOverdueFollowUp(followUp);
}

export function getGroupedClientsByMonth(clients: Client[]): ClientMonthGroup[] {
  const groups = new Map<string, ClientMonthGroup>();

  clients.forEach((client) => {
    const referenceDate = new Date(getClientReferenceDate(client));
    const key = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
    const label = monthFormatter.format(referenceDate);

    if (!groups.has(key)) {
      groups.set(key, { key, label, clients: [] });
    }

    groups.get(key)?.clients.push(client);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      clients: [...group.clients].sort((left, right) =>
        compareByDateAsc(left.nextFollowUp, right.nextFollowUp)
      )
    }))
    .sort((left, right) => right.key.localeCompare(left.key));
}
