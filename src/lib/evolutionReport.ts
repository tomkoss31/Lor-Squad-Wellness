import type { Client, AssessmentRecord, BodyScanMetrics } from '../types/domain'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface EvolutionInsight {
  type: 'positive' | 'warning' | 'neutral' | 'goal'
  icon: string
  title: string
  message: string
}

export interface ReportMetricRow {
  date: string
  weight: number
  bodyFat: number
  muscleMass: number
  hydration: number
  boneMass: number
  visceralFat: number
  metabolicAge: number
  bmr: number
}

// ─── INSIGHTS AUTO-GÉNÉRÉS ───────────────────────────────────────────────────

export function generateInsights(
  client: Client,
  first: AssessmentRecord,
  latest: AssessmentRecord
): EvolutionInsight[] {
  const insights: EvolutionInsight[] = []
  const sex = client.sex ?? 'male'
  const firstScan = first.bodyScan
  const latestScan = latest.bodyScan

  const weightDelta = latestScan.weight - firstScan.weight
  const bodyFatDelta = latestScan.bodyFat - firstScan.bodyFat
  const muscleDelta = latestScan.muscleMass - firstScan.muscleMass
  const hydrationDelta = latestScan.hydration - firstScan.hydration
  const visceralDelta = latestScan.visceralFat - firstScan.visceralFat
  const ageDelta = latestScan.metabolicAge - firstScan.metabolicAge

  const waterLiters = (latestScan.weight * 0.033).toFixed(1)
  const proteinMin = Math.round(latestScan.weight * 1.2)
  const proteinMax = Math.round(latestScan.weight * 1.8)

  const assessmentsCount = client.assessments?.length ?? 1
  const daysSinceStart = Math.floor(
    (new Date(latest.date).getTime() - new Date(first.date).getTime()) / 86400000
  )

  insights.push({
    type: 'goal',
    icon: '🎯',
    title: 'Progression globale',
    message: `${assessmentsCount} bilan${assessmentsCount > 1 ? 's' : ''} réalisé${assessmentsCount > 1 ? 's' : ''} sur ${daysSinceStart} jours de suivi. Chaque bilan est une étape de plus vers ton objectif.`,
  })

  // POIDS
  if (weightDelta < -5) {
    insights.push({
      type: 'positive', icon: '⚖️', title: 'Perte de poids significative',
      message: `Tu as perdu ${Math.abs(weightDelta).toFixed(1)} kg depuis le début — c'est un résultat concret et motivant. Continue sur cette lancée !`,
    })
  } else if (weightDelta < -1) {
    insights.push({
      type: 'positive', icon: '⚖️', title: 'Poids en baisse',
      message: `${Math.abs(weightDelta).toFixed(1)} kg de perdu depuis le premier bilan. Le chemin est tracé, garde le cap.`,
    })
  } else if (weightDelta > 1) {
    insights.push({
      type: 'neutral', icon: '⚖️', title: 'Poids stable ou en hausse',
      message: `Le poids a légèrement augmenté de ${weightDelta.toFixed(1)} kg. Ce n'est pas forcément négatif si la masse musculaire a progressé — regarde l'ensemble des indicateurs.`,
    })
  }

  // MASSE GRASSE
  const bodyFatThreshold = sex === 'female' ? 30 : 22
  if (bodyFatDelta < -3) {
    insights.push({
      type: 'positive', icon: '🔥', title: 'Excellente réduction de masse grasse',
      message: `Ta masse grasse a diminué de ${Math.abs(bodyFatDelta).toFixed(1)} points — c'est exactement ce qu'on cherche. Ton corps se recompose positivement.`,
    })
  } else if (bodyFatDelta < -1) {
    insights.push({
      type: 'positive', icon: '🔥', title: 'Masse grasse en baisse',
      message: `${Math.abs(bodyFatDelta).toFixed(1)} points de masse grasse en moins. Continue, les effets sur le corps vont s'accentuer.`,
    })
  } else if (latestScan.bodyFat > bodyFatThreshold) {
    insights.push({
      type: 'warning', icon: '⚠️', title: 'Masse grasse à surveiller',
      message: `Ta masse grasse est encore au-dessus des valeurs idéales (${latestScan.bodyFat.toFixed(1)}%). Le programme nutritionnel et les compléments vont accélérer la normalisation.`,
    })
  }

  // MASSE MUSCULAIRE
  if (muscleDelta > 1) {
    insights.push({
      type: 'positive', icon: '💪', title: 'Masse musculaire en hausse',
      message: `+${muscleDelta.toFixed(1)} kg de masse musculaire — ton corps se renforce. C'est un excellent signe de recomposition corporelle.`,
    })
  } else if (muscleDelta < -1) {
    insights.push({
      type: 'warning', icon: '💪', title: 'Masse musculaire à renforcer',
      message: `La masse musculaire a légèrement diminué. Assurer un apport protéiné suffisant et maintenir l'activité physique est essentiel.`,
    })
  }

  // HYDRATATION
  if (latestScan.hydration < 45) {
    insights.push({
      type: 'warning', icon: '💧', title: 'Hydratation insuffisante',
      message: `Ton taux d'hydratation est de ${latestScan.hydration.toFixed(1)}%, en dessous du seuil idéal. Une bonne hydratation accélère l'élimination des graisses et améliore l'énergie.`,
    })
  } else if (hydrationDelta > 2) {
    insights.push({
      type: 'positive', icon: '💧', title: 'Hydratation en progression',
      message: `Ton hydratation a progressé de ${hydrationDelta.toFixed(1)} points — excellent pour ta récupération et tes performances.`,
    })
  }

  // GRAISSE VISCÉRALE
  if (latestScan.visceralFat >= 13) {
    insights.push({
      type: 'warning', icon: '🫀', title: 'Graisse viscérale élevée',
      message: `Ton score de graisse viscérale est de ${latestScan.visceralFat} — au-dessus du seuil recommandé. Le Phyto Complete et une alimentation ciblée aident à la réduire.`,
    })
  } else if (visceralDelta < -2) {
    insights.push({
      type: 'positive', icon: '🫀', title: 'Graisse viscérale en baisse',
      message: `La graisse viscérale a diminué de ${Math.abs(visceralDelta)} points — excellent pour ta santé cardiovasculaire et métabolique.`,
    })
  }

  // ÂGE MÉTABOLIQUE
  const realAge = client.age ?? 35
  if (latestScan.metabolicAge > realAge + 10) {
    insights.push({
      type: 'warning', icon: '🧬', title: 'Âge métabolique à améliorer',
      message: `Ton âge métabolique est de ${latestScan.metabolicAge} ans pour ${realAge} ans réels. Le programme vise à rapprocher ces deux valeurs.`,
    })
  } else if (ageDelta < -3) {
    insights.push({
      type: 'positive', icon: '🧬', title: 'Âge métabolique en baisse',
      message: `Ton âge métabolique a rajeuni de ${Math.abs(ageDelta)} ans — c'est l'un des meilleurs indicateurs de progression !`,
    })
  }

  // OBJECTIF POIDS
  const targetWeight = latest.questionnaire?.targetWeight ?? firstScan.weight - 10
  if (targetWeight && firstScan.weight && latestScan.weight) {
    const remaining = latestScan.weight - targetWeight
    const achieved = firstScan.weight - latestScan.weight
    const total = firstScan.weight - targetWeight
    const pct = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0
    if (pct > 0) {
      insights.push({
        type: 'goal', icon: '🏁', title: `Objectif atteint à ${pct}%`,
        message: remaining > 0
          ? `Il reste ${remaining.toFixed(1)} kg pour atteindre ${targetWeight} kg. Tu as déjà parcouru ${pct}% du chemin.`
          : `Félicitations ! Tu as atteint ton objectif de poids. L'étape suivante est de consolider ces résultats.`,
      })
    }
  }

  // REPÈRES PRATIQUES (toujours affiché)
  insights.push({
    type: 'neutral', icon: '🥤', title: 'Tes repères du jour',
    message: `Objectif hydratation : ${waterLiters}L d'eau par jour. Protéines : ${proteinMin}-${proteinMax}g/jour pour maintenir ta masse musculaire (${latestScan.muscleMass.toFixed(1)} kg).`,
  })

  return insights.slice(0, 7)
}

// ─── RECOMMANDATIONS PRODUITS ────────────────────────────────────────────────

export interface ProductRecommendation {
  ref: string
  name: string
  reason: string
}

export function generateProductRecommendations(
  latestScan: BodyScanMetrics,
  sex: string,
  objective: string
): ProductRecommendation[] {
  const recos: ProductRecommendation[] = []
  const isFemale = sex === 'female'
  const bodyFatThreshold = isFemale ? 30 : 22
  const proteinMin = Math.round(latestScan.weight * 1.2)
  const proteinMax = Math.round(latestScan.weight * 1.8)
  const waterLiters = (latestScan.weight * 0.033).toFixed(1)

  recos.push({ ref: '4466', name: 'Formula 1',
    reason: `Shake repas complet — apport protéiné ciblé ${proteinMin}-${proteinMax}g/jour. Remplace un repas pour un contrôle calorique efficace.` })

  recos.push({ ref: '488K', name: 'Créatine+',
    reason: isFemale
      ? 'Tonus musculaire et énergie cellulaire — recommandé pour toutes les femmes actives'
      : `Objectif masse musculaire (${latestScan.muscleMass.toFixed(1)} kg actuel) — maintien et renforcement` })

  if (isFemale) {
    recos.push({ ref: '0020', name: 'Xtra-Cal',
      reason: `Calcium + vitamine D — renforcement osseux (masse osseuse : ${latestScan.boneMass.toFixed(1)} kg)` })
  }

  if (latestScan.hydration < 50) {
    recos.push({ ref: '0006', name: 'Aloe Vera Concentré',
      reason: `Hydratation à ${latestScan.hydration.toFixed(0)}% (objectif ≥ 50%). Boire ${waterLiters}L d'eau/jour + aloe vera.` })
  }

  if (latestScan.visceralFat >= 9) {
    recos.push({ ref: '236K', name: 'Phyto Complete',
      reason: `Graisse viscérale à ${latestScan.visceralFat}/30 (seuil sain < 9). Extraits de plantes pour réduire la graisse interne.` })
  }

  if (latestScan.bodyFat >= bodyFatThreshold) {
    recos.push({ ref: '0267', name: 'Beta Heart',
      reason: `Masse grasse à ${latestScan.bodyFat.toFixed(1)}% (cible < ${bodyFatThreshold}%). Bêta-glucanes pour cholestérol et graisse.` })
  }

  if (latestScan.boneMass && latestScan.weight) {
    const ratio = (latestScan.boneMass / latestScan.weight) * 100
    if (ratio < 4.0 && !isFemale) {
      recos.push({ ref: '0020', name: 'Xtra-Cal',
        reason: `Masse osseuse faible (${ratio.toFixed(1)}% du poids, objectif ≥ 4%). Calcium et vitamine D.` })
    }
  }

  if (objective?.includes('poids') || objective?.includes('weight')) {
    recos.push({ ref: '178K', name: 'Thé Concentré',
      reason: `Booster thermogénique — complément à la perte de poids. Boire ${waterLiters}L d'eau/jour minimum.` })
  }

  const seen = new Set<string>()
  return recos.filter(r => {
    if (seen.has(r.ref)) return false
    seen.add(r.ref)
    return true
  }).slice(0, 6)
}

// ─── BUILD REPORT DATA ──────────────────────────────────────────────────────

export function buildReportData(client: Client, coachName: string) {
  const assessments = [...(client.assessments ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  if (assessments.length === 0) return null

  const first = assessments[0]
  const latest = assessments[assessments.length - 1]

  const metricsHistory: ReportMetricRow[] = assessments
    .filter(a => a.bodyScan)
    .map(a => ({
      date: a.date,
      weight: a.bodyScan.weight,
      bodyFat: a.bodyScan.bodyFat,
      muscleMass: a.bodyScan.muscleMass,
      hydration: a.bodyScan.hydration,
      boneMass: a.bodyScan.boneMass,
      visceralFat: a.bodyScan.visceralFat,
      metabolicAge: a.bodyScan.metabolicAge,
      bmr: a.bodyScan.bmr,
    }))

  const insights = generateInsights(client, first, latest)
  const recommendations = generateProductRecommendations(latest.bodyScan, client.sex ?? 'male', latest.objective ?? '')

  return {
    client_id: client.id,
    distributor_id: client.distributorId,
    coach_name: coachName,
    client_first_name: client.firstName,
    client_last_name: client.lastName,
    client_gender: client.sex,
    generated_at: new Date().toISOString(),
    assessments_count: assessments.length,
    first_assessment_date: first.date,
    latest_assessment_date: latest.date,
    objective: latest.objective,
    program_title: latest.programTitle,
    next_follow_up: latest.nextFollowUp,
    metrics_history: metricsHistory,
    recommendations,
    insights,
  }
}
