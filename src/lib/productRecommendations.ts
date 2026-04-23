// Chantier sync coach↔client produits (2026-04-25).
// Logique de recommandation produits partagée entre la fiche coach
// (ClientDetailPage onglet Produits) et l'app client (ClientProductsTab
// hero "Recommandé pour toi"). Input : dernier body scan + sexe + objectif.
// Output : liste de {ref, name, reason} — ref catalogue Herbalife, nom
// lisible, justification métier citant les chiffres du body scan.

import type { BodyScanMetrics } from "../types/domain";

export interface ProductRecommendation {
  ref: string;
  name: string;
  reason: string;
}

export function generateProductRecommendations(
  latestScan: BodyScanMetrics,
  sex: string,
  objective: string,
): ProductRecommendation[] {
  const recos: ProductRecommendation[] = [];
  const isFemale = sex === "female";
  const bodyFatThreshold = isFemale ? 30 : 22;
  const proteinMin = Math.round(latestScan.weight * 1.2);
  const proteinMax = Math.round(latestScan.weight * 1.8);
  const waterLiters = (latestScan.weight * 0.033).toFixed(1);

  recos.push({
    ref: "4466",
    name: "Formula 1",
    reason: `Shake repas complet — apport protéiné ciblé ${proteinMin}-${proteinMax}g/jour. Remplace un repas pour un contrôle calorique efficace.`,
  });

  recos.push({
    ref: "488K",
    name: "Créatine+",
    reason: isFemale
      ? "Tonus musculaire et énergie cellulaire — recommandé pour toutes les femmes actives"
      : `Objectif masse musculaire (${latestScan.muscleMass.toFixed(1)} kg actuel) — maintien et renforcement`,
  });

  if (isFemale) {
    recos.push({
      ref: "0020",
      name: "Xtra-Cal",
      reason: `Calcium + vitamine D — renforcement osseux (masse osseuse : ${latestScan.boneMass.toFixed(1)} kg)`,
    });
  }

  if (latestScan.hydration < 50) {
    recos.push({
      ref: "0006",
      name: "Aloe Vera Concentré",
      reason: `Hydratation à ${latestScan.hydration.toFixed(0)}% (objectif ≥ 50%). Boire ${waterLiters}L d'eau/jour + aloe vera.`,
    });
  }

  if (latestScan.visceralFat >= 9) {
    recos.push({
      ref: "236K",
      name: "Phyto Complete",
      reason: `Graisse viscérale à ${latestScan.visceralFat}/30 (seuil sain < 9). Extraits de plantes pour réduire la graisse interne.`,
    });
  }

  if (latestScan.bodyFat >= bodyFatThreshold) {
    recos.push({
      ref: "0267",
      name: "Beta Heart",
      reason: `Masse grasse à ${latestScan.bodyFat.toFixed(1)}% (cible < ${bodyFatThreshold}%). Bêta-glucanes pour cholestérol et graisse.`,
    });
  }

  if (latestScan.boneMass && latestScan.weight) {
    const ratio = (latestScan.boneMass / latestScan.weight) * 100;
    if (ratio < 4.0 && !isFemale) {
      recos.push({
        ref: "0020",
        name: "Xtra-Cal",
        reason: `Masse osseuse faible (${ratio.toFixed(1)}% du poids, objectif ≥ 4%). Calcium et vitamine D.`,
      });
    }
  }

  if (objective?.includes("poids") || objective?.includes("weight")) {
    recos.push({
      ref: "178K",
      name: "Thé Concentré",
      reason: `Booster thermogénique — complément à la perte de poids. Boire ${waterLiters}L d'eau/jour minimum.`,
    });
  }

  const seen = new Set<string>();
  return recos
    .filter((r) => {
      if (seen.has(r.ref)) return false;
      seen.add(r.ref);
      return true;
    })
    .slice(0, 6);
}
