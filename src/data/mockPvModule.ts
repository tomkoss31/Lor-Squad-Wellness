import { getFirstAssessment, getLatestAssessment } from "../lib/calculations";
import type { Client } from "../types/domain";
import type {
  PvClientProductRecord,
  PvClientTrackingRecord,
  PvClientTransaction,
  PvProductCatalogItem,
  PvProductStatus,
  PvProductUsage,
  PvProgramOption,
  PvStatus,
  PvTransactionType
} from "../types/pv";

const DAY_MS = 24 * 60 * 60 * 1000;

export const pvProgramOptions: PvProgramOption[] = [
  {
    id: "starter",
    title: "Programme Starter",
    alias: ["Programme Decouverte", "Programme Starter", "Decouverte", "Starter"],
    summary: "Base simple pour suivre le demarrage et le renouvellement des produits principaux.",
    pricePublic: 159,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1"],
    mainReferenceDurationDays: 21,
    active: true
  },
  {
    id: "premium",
    title: "Programme Premium",
    summary: "Routine plus complete avec proteines en plus pour tenir dans le temps.",
    pricePublic: 234,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "booster-1",
    title: "Programme Booster 1",
    summary: "Version plus structuree avec fibres et lecture volume plus precise.",
    pricePublic: 277,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm", "multifibres"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "booster-2",
    title: "Programme Booster 2",
    summary: "Cadre plus complet avec produit metabolique en plus.",
    pricePublic: 324,
    includedProductIds: ["aloe-vera", "the-51g", "formula-1", "pdm", "phyto-brule-graisse"],
    mainReferenceDurationDays: 42,
    active: true
  },
  {
    id: "custom",
    title: "Suivi personnalise",
    alias: ["Suivi personnalise", "Suivi personnalisé"],
    summary: "Programme libre pour les cas terrain qui ne rentrent pas pile dans une formule.",
    pricePublic: 0,
    includedProductIds: ["formula-1"],
    mainReferenceDurationDays: 21,
    active: true
  }
];

export const pvProductCatalog: PvProductCatalogItem[] = [
  {
    id: "formula-1",
    name: "Formula 1",
    category: "shake / repas",
    pricePublic: 63.5,
    pv: 23.95,
    quantiteLabel: "21 doses",
    dureeReferenceJours: 21,
    noteMetier: "En pratique, 1 pot = 21 jours de reference dans le suivi.",
    recommendedProgram: "Programme Starter",
    active: true
  },
  {
    id: "pdm",
    name: "Melange pour boisson proteinee",
    category: "proteine",
    pricePublic: 75,
    pv: 33,
    quantiteLabel: "42 doses",
    dureeReferenceJours: 42,
    noteMetier: "Reference simple de 1 dose / jour sur 42 jours.",
    recommendedProgram: "Programme Premium",
    active: true
  },
  {
    id: "phyto-brule-graisse",
    name: "Phytocomplete brule-graisse",
    category: "gelules",
    pricePublic: 90,
    pv: 38,
    quantiteLabel: "60 gelules",
    dureeReferenceJours: 30,
    noteMetier: "Reference simple de 30 jours.",
    recommendedProgram: "Programme Booster 2",
    active: true
  },
  {
    id: "aloe-vera",
    name: "Boisson Aloe Vera",
    category: "hydratation",
    pricePublic: 54.5,
    pv: 24.95,
    quantiteLabel: "473 ml",
    dureeReferenceJours: 21,
    noteMetier:
      "Dans le suivi, au-dela de 21 jours on considere l'hydratation comme mal tenue.",
    recommendedProgram: "Programme Starter",
    active: true
  },
  {
    id: "the-51g",
    name: "Boisson instantanee a base de the 51 g",
    category: "hydratation / routine",
    pricePublic: 41,
    pv: 19.95,
    quantiteLabel: "51 g",
    dureeReferenceJours: 21,
    noteMetier:
      "Meme logique terrain que l'aloe : au-dela de 21 jours, la routine n'a pas ete tenue.",
    recommendedProgram: "Programme Starter",
    active: true
  },
  {
    id: "multifibres",
    name: "Boisson multifibres",
    category: "fibres",
    pricePublic: 43.5,
    pv: 22.95,
    quantiteLabel: "30 doses",
    dureeReferenceJours: 30,
    noteMetier: "Reference simple de 30 jours.",
    recommendedProgram: "Programme Booster 1",
    active: true
  }
];

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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getPvProgramById(programId: string | null | undefined) {
  if (!programId) {
    return null;
  }

  return pvProgramOptions.find((program) => program.id === programId) ?? null;
}

export function resolvePvProgram(programTitleOrId: string | null | undefined) {
  const byId = getPvProgramById(programTitleOrId);
  if (byId) {
    return byId;
  }

  const normalized = normalize(programTitleOrId ?? "");
  return (
    pvProgramOptions.find((program) => {
      const aliases = [program.title, ...(program.alias ?? [])];
      return aliases.some((alias) => normalize(alias) === normalized);
    }) ??
    pvProgramOptions.find((program) =>
      normalized.includes(normalize(program.title.replace("Programme ", "")))
    ) ??
    pvProgramOptions[0]
  );
}

function getProduct(productId: string) {
  return pvProductCatalog.find((product) => product.id === productId) ?? null;
}

export function buildSeedPvClientProductsForClient(client: Client): PvClientProductRecord[] {
  if (!client.started || !client.pvProgramId || !client.currentProgram.trim()) {
    return [];
  }

  const firstAssessment = getFirstAssessment(client);
  const startDate = client.startDate ?? firstAssessment.date;
  const program = resolvePvProgram(client.pvProgramId ?? client.currentProgram);

  return program.includedProductIds.flatMap((productId) => {
    const product = getProduct(productId);
    if (!product) {
      return [];
    }

    return [
      {
        id: `pv-seed-${client.id}-${product.id}`,
        clientId: client.id,
        responsibleId: client.distributorId,
        responsibleName: client.distributorName,
        programId: program.id,
        productId: product.id,
        productName: product.name,
        quantityStart: 1,
        startDate,
        durationReferenceDays: product.dureeReferenceJours,
        pvPerUnit: product.pv,
        pricePublicPerUnit: product.pricePublic,
        quantiteLabel: product.quantiteLabel,
        noteMetier: product.noteMetier,
        active: true
      }
    ];
  });
}

function buildBaseTransactions(clients: Client[]) {
  return clients.flatMap((client) => {
    if (!client.started || !client.pvProgramId || !client.currentProgram.trim()) {
      return [];
    }

    const firstAssessment = getFirstAssessment(client);
    const startDate = client.startDate ?? firstAssessment.date;
    const program = resolvePvProgram(client.pvProgramId ?? client.currentProgram);

    return program.includedProductIds.flatMap((productId, index) => {
      const product = getProduct(productId);
      if (!product) {
        return [];
      }

      return [
        {
          id: `pv-base-${client.id}-${product.id}`,
          date: addDays(startDate, index),
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          responsibleId: client.distributorId,
          responsibleName: client.distributorName,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          pv: product.pv,
          price: product.pricePublic,
          type: "commande" as PvTransactionType,
          note: `Demarrage ${program.title}`
        }
      ];
    });
  });
}

function mergeClientProducts(
  clients: Client[],
  persistedProducts: PvClientProductRecord[]
) {
  const merged = new Map<string, PvClientProductRecord>();

  clients.forEach((client) => {
    buildSeedPvClientProductsForClient(client).forEach((product) => {
      merged.set(`${product.clientId}:${product.productId}`, product);
    });
  });

  persistedProducts.forEach((product) => {
    merged.set(`${product.clientId}:${product.productId}`, product);
  });

  return [...merged.values()].filter((product) => product.active);
}

function getProductStatus(daysSinceStart: number, daysRemaining: number): PvProductStatus {
  if (daysRemaining <= 7) {
    return "restock";
  }

  if (daysRemaining < -7) {
    return "inconsistent";
  }

  if (daysSinceStart > 0 && daysRemaining <= 0) {
    return "watch";
  }

  return "ok";
}

function getClientStatus(
  productStatuses: PvProductStatus[],
  nextFollowUp: string
): PvStatus {
  const daysUntilFollowUp = Math.ceil(
    (new Date(nextFollowUp).getTime() - Date.now()) / DAY_MS
  );

  if (daysUntilFollowUp <= 0) {
    return "follow-up";
  }

  if (productStatuses.includes("inconsistent")) {
    return "inconsistent";
  }

  if (productStatuses.includes("restock")) {
    return "restock";
  }

  if (productStatuses.includes("watch") || daysUntilFollowUp <= 7) {
    return "watch";
  }

  return "ok";
}

function getActiveProducts(
  client: Client,
  clientProducts: PvClientProductRecord[]
): PvProductUsage[] {
  return clientProducts
    .filter((product) => product.clientId === client.id && product.active)
    .map((product) => {
      const daysSinceStart = diffDays(product.startDate);
      const estimatedRemainingDays = product.durationReferenceDays - daysSinceStart;
      const status = getProductStatus(daysSinceStart, estimatedRemainingDays);

      return {
        id: `${client.id}-${product.productId}`,
        recordId: product.id,
        programId: product.programId,
        productId: product.productId,
        productName: product.productName,
        quantityStart: product.quantityStart,
        startDate: product.startDate,
        durationReferenceDays: product.durationReferenceDays,
        estimatedRemainingDays,
        nextProbableOrderDate: addDays(product.startDate, product.durationReferenceDays),
        pvPerUnit: product.pvPerUnit,
        pricePublicPerUnit: product.pricePublicPerUnit,
        quantiteLabel: product.quantiteLabel,
        noteMetier: product.noteMetier,
        status
      };
    })
    .sort((left, right) => left.estimatedRemainingDays - right.estimatedRemainingDays);
}

export function buildPvTrackingRecords(
  clients: Client[],
  extraTransactions: PvClientTransaction[] = [],
  persistedProducts: PvClientProductRecord[] = []
): PvClientTrackingRecord[] {
  const eligibleClients = clients.filter(
    (client) => client.started && Boolean(client.pvProgramId) && Boolean(client.currentProgram.trim())
  );
  const allTransactions = [...extraTransactions, ...buildBaseTransactions(eligibleClients)];
  const allClientProducts = mergeClientProducts(eligibleClients, persistedProducts);

  return eligibleClients.map((client) => {
    const latestAssessment = getLatestAssessment(client);
    const startDate = client.startDate ?? getFirstAssessment(client).date;
    const program = resolvePvProgram(client.pvProgramId ?? client.currentProgram);
    const clientTransactions = allTransactions
      .filter((transaction) => transaction.clientId === client.id)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
    const activeProducts = getActiveProducts(client, allClientProducts);
    const daysSinceStart = diffDays(startDate);
    const estimatedRemainingDays =
      activeProducts[0]?.estimatedRemainingDays ??
      program.mainReferenceDurationDays - daysSinceStart;
    const lastOrderDate = clientTransactions[0]?.date ?? startDate;
    const nextProbableOrderDate =
      activeProducts[0]?.nextProbableOrderDate ??
      addDays(startDate, program.mainReferenceDurationDays);
    const pvCumulative = Number(
      clientTransactions.reduce((total, transaction) => total + transaction.pv, 0).toFixed(2)
    );
    const monthlyPv = Number(
      clientTransactions
        .filter((transaction) => isSameMonth(transaction.date))
        .reduce((total, transaction) => total + transaction.pv, 0)
        .toFixed(2)
    );

    return {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`,
      responsibleId: client.distributorId,
      responsibleName: client.distributorName,
      programId: program.id,
      program: program.title,
      status: getClientStatus(
        activeProducts.map((product) => product.status),
        client.nextFollowUp
      ),
      startDate,
      lastFollowUpDate: latestAssessment.date,
      lastOrderDate,
      daysSinceStart,
      estimatedRemainingDays,
      nextProbableOrderDate,
      pvCumulative,
      monthlyPv,
      activeProducts,
      transactions: clientTransactions
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

export function getPvProductStatusMeta(status: PvProductStatus) {
  if (status === "ok") {
    return { label: "OK", tone: "green" as const };
  }
  if (status === "restock") {
    return { label: "Reassort", tone: "blue" as const };
  }
  if (status === "watch") {
    return { label: "A surveiller", tone: "amber" as const };
  }
  return { label: "Incoherence", tone: "red" as const };
}

export function getPvTypeLabel(type: PvTransactionType) {
  return type === "commande" ? "Commande" : "Reprise sur place";
}
