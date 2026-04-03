import { getFirstAssessment, getLatestAssessment } from "../lib/calculations";
import type { Client } from "../types/domain";
import type {
  PvClientTrackingRecord,
  PvClientTransaction,
  PvProductCatalogItem,
  PvProductUsage,
  PvProgramOption,
  PvStatus,
  PvTransactionType
} from "../types/pv";

const DAY_MS = 24 * 60 * 60 * 1000;

export const pvProgramOptions: PvProgramOption[] = [
  {
    id: "starter",
    title: "Starter",
    summary: "Base simple a suivre avec peu de produits et une lecture claire."
  },
  {
    id: "premium",
    title: "Premium",
    summary: "Routine plus complete avec lecture volume et reapproche plus fine."
  },
  {
    id: "discovery",
    title: "Decouverte",
    summary: "Version douce pour demarrer et reprendre les bases."
  },
  {
    id: "custom",
    title: "Suivi personnalise",
    summary: "Cadre adapte au client avec conso plus variable."
  }
];

export const pvProductCatalog: PvProductCatalogItem[] = [
  {
    id: "formula-1",
    name: "Formula 1",
    category: "Repas",
    pv: 23.1,
    price: 44.9,
    estimatedDurationDays: 21,
    recommendedProgram: "Starter"
  },
  {
    id: "pdm",
    name: "PDM",
    category: "Proteines",
    pv: 18.4,
    price: 39.9,
    estimatedDurationDays: 24,
    recommendedProgram: "Premium"
  },
  {
    id: "aloe",
    name: "Aloe",
    category: "Hydratation",
    pv: 12.5,
    price: 31.9,
    estimatedDurationDays: 30,
    recommendedProgram: "Decouverte"
  },
  {
    id: "the",
    name: "The",
    category: "Boisson",
    pv: 16.2,
    price: 37.5,
    estimatedDurationDays: 26,
    recommendedProgram: "Starter"
  }
];

const programRecipes: Record<string, Array<{ productId: string; quantity: number }>> = {
  starter: [
    { productId: "formula-1", quantity: 1 },
    { productId: "the", quantity: 1 }
  ],
  premium: [
    { productId: "formula-1", quantity: 1 },
    { productId: "pdm", quantity: 1 },
    { productId: "aloe", quantity: 1 },
    { productId: "the", quantity: 1 }
  ],
  discovery: [
    { productId: "formula-1", quantity: 1 },
    { productId: "aloe", quantity: 1 }
  ],
  custom: [
    { productId: "formula-1", quantity: 1 },
    { productId: "pdm", quantity: 1 }
  ]
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function addDays(input: string, days: number) {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function diffDays(input: string, reference = new Date()) {
  const date = new Date(input);
  const delta = reference.getTime() - date.getTime();
  return Math.max(0, Math.floor(delta / DAY_MS));
}

function isSameMonth(input: string, reference = new Date()) {
  const date = new Date(input);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

function resolveProgramKey(programTitle: string) {
  const normalized = normalize(programTitle);
  if (normalized.includes("premium")) {
    return "premium";
  }
  if (normalized.includes("decouverte")) {
    return "discovery";
  }
  if (normalized.includes("starter")) {
    return "starter";
  }
  if (normalized.includes("personnal")) {
    return "custom";
  }
  return "starter";
}

function resolveProgramTitle(programTitle: string) {
  const key = resolveProgramKey(programTitle);
  const match = pvProgramOptions.find((item) => item.id === key);
  return match?.title ?? programTitle;
}

function getRecipe(programTitle: string) {
  return programRecipes[resolveProgramKey(programTitle)] ?? programRecipes.starter;
}

function getStatus(
  estimatedRemainingDays: number,
  nextFollowUp: string,
  lastOrderDate: string,
  daysSinceStart: number
): PvStatus {
  const daysUntilFollowUp = Math.ceil(
    (new Date(nextFollowUp).getTime() - Date.now()) / DAY_MS
  );
  const daysSinceLastOrder = diffDays(lastOrderDate);

  if (estimatedRemainingDays <= 5) {
    return "restock";
  }

  if (daysUntilFollowUp <= 0 || daysSinceLastOrder >= 28) {
    return "follow-up";
  }

  if (estimatedRemainingDays >= 18 && daysSinceStart >= 40) {
    return "inconsistent";
  }

  if (estimatedRemainingDays <= 10 || daysUntilFollowUp <= 4) {
    return "watch";
  }

  return "ok";
}

function buildTransactions(
  client: Client,
  startDate: string,
  recipe: Array<{ productId: string; quantity: number }>
) {
  const transactions: PvClientTransaction[] = [];
  const daysSinceStart = diffDays(startDate);

  recipe.forEach((entry, index) => {
    const product = pvProductCatalog.find((item) => item.id === entry.productId);
    if (!product) {
      return;
    }

    const initialDate = addDays(startDate, index);
    transactions.push({
      id: `${client.id}-${product.id}-commande-initiale`,
      date: initialDate,
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      responsibleId: client.distributorId,
      responsibleName: client.distributorName,
      productId: product.id,
      productName: product.name,
      quantity: entry.quantity,
      pv: Number((product.pv * entry.quantity).toFixed(1)),
      price: Number((product.price * entry.quantity).toFixed(2)),
      type: "commande",
      note: "Demarrage du programme"
    });

    if (daysSinceStart >= 12 && index % 2 === 0) {
      transactions.push({
        id: `${client.id}-${product.id}-reprise-1`,
        date: addDays(startDate, 12 + index * 2),
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        responsibleId: client.distributorId,
        responsibleName: client.distributorName,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        pv: Number(product.pv.toFixed(1)),
        price: Number(product.price.toFixed(2)),
        type: "reprise-sur-place",
        note: "Reprise sur place"
      });
    }

    if (daysSinceStart >= product.estimatedDurationDays + 3) {
      transactions.push({
        id: `${client.id}-${product.id}-commande-2`,
        date: addDays(startDate, product.estimatedDurationDays + 3 + index),
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        responsibleId: client.distributorId,
        responsibleName: client.distributorName,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        pv: Number(product.pv.toFixed(1)),
        price: Number(product.price.toFixed(2)),
        type: "commande",
        note: "Renouvellement probable"
      });
    }
  });

  return transactions.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function buildPvTrackingRecords(clients: Client[]): PvClientTrackingRecord[] {
  return clients.map((client) => {
    const firstAssessment = getFirstAssessment(client);
    const latestAssessment = getLatestAssessment(client);
    const startDate = client.startDate ?? firstAssessment.date;
    const daysSinceStart = diffDays(startDate);
    const program = resolveProgramTitle(client.currentProgram);
    const recipe = getRecipe(program);
    const activeProducts = recipe
      .map((entry, index) => {
        const product = pvProductCatalog.find((item) => item.id === entry.productId);
        if (!product) {
          return null;
        }

        const estimatedDurationDays = product.estimatedDurationDays + index * 2;
        const elapsedForProduct = Math.max(0, daysSinceStart - index * 2);
        const estimatedRemainingDays = Math.max(0, estimatedDurationDays - elapsedForProduct);

        return {
          id: `${client.id}-${product.id}`,
          productId: product.id,
          productName: product.name,
          quantityStart: entry.quantity,
          startDate: addDays(startDate, index),
          estimatedDurationDays,
          estimatedRemainingDays,
          nextProbableOrderDate: addDays(startDate, estimatedDurationDays + index),
          pvPerUnit: product.pv,
          pricePerUnit: product.price
        };
      })
      .filter((item): item is PvProductUsage => item !== null);

    const transactions = buildTransactions(client, startDate, recipe);
    const lastOrderDate = transactions[0]?.date ?? startDate;
    const estimatedRemainingDays =
      activeProducts.reduce((lowest, item) => Math.min(lowest, item.estimatedRemainingDays), 999) ||
      0;
    const monthlyPv = Number(
      transactions
        .filter((item) => isSameMonth(item.date))
        .reduce((total, item) => total + item.pv, 0)
        .toFixed(1)
    );
    const pvCumulative = Number(
      transactions.reduce((total, item) => total + item.pv, 0).toFixed(1)
    );

    return {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      responsibleId: client.distributorId,
      responsibleName: client.distributorName,
      program,
      status: getStatus(estimatedRemainingDays, client.nextFollowUp, lastOrderDate, daysSinceStart),
      startDate,
      lastFollowUpDate: latestAssessment.date,
      lastOrderDate,
      daysSinceStart,
      estimatedRemainingDays,
      nextProbableOrderDate:
        activeProducts
          .sort(
            (left, right) =>
              new Date(left.nextProbableOrderDate).getTime() -
              new Date(right.nextProbableOrderDate).getTime()
          )[0]?.nextProbableOrderDate ?? client.nextFollowUp,
      pvCumulative,
      monthlyPv,
      activeProducts,
      transactions
    };
  });
}

export function flattenPvTransactions(records: PvClientTrackingRecord[]) {
  return records
    .flatMap((record) => record.transactions)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

export function getPvStatusMeta(status: PvStatus) {
  if (status === "ok") {
    return { label: "RAS", tone: "green" as const };
  }
  if (status === "watch") {
    return { label: "A surveiller", tone: "amber" as const };
  }
  if (status === "restock") {
    return { label: "Reassort probable", tone: "blue" as const };
  }
  if (status === "inconsistent") {
    return { label: "Incoherence conso", tone: "red" as const };
  }
  return { label: "A relancer", tone: "amber" as const };
}

export function getPvTypeLabel(type: PvTransactionType) {
  return type === "commande" ? "Commande" : "Reprise sur place";
}
