// =============================================================================
// FormationGlossaryPage — glossaire des termes Herbalife / MLM (2026-11-04)
//
// Page de reference pour deshermetiser le vocabulaire metier. Accessible
// depuis /formation/glossaire et liee dans le footer Formation.
//
// 4 categories :
//   - Volumes & rangs (VP, RO, PV, PDM, Member, QP, Sup, World Team, GET, ...)
//   - Activite (DMO, IPA, 5-3-1, EBE, Quick Start, ...)
//   - Produits & gestion (Formula 1, F2, Pdt Mois, Royalty, ...)
//   - Lor'Squad-specifique (lignée, sponsor, recrue, bilan, body scan)
//
// Recherche live + tooltip-friendly (les termes sont structurees pour
// pouvoir etre reutilises ailleurs en V2 via tooltips inline).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";

interface GlossaryTerm {
  term: string;
  /** Acronyme ou abbreviation a developper (ex: "VP" → "Volume Points"). */
  expansion?: string;
  category: "volumes" | "activite" | "produits" | "lor-squad";
  short: string;
  /** Definition longue, peut contenir markdown simple (sera juste rendue en text). */
  long?: string;
}

const TERMS: GlossaryTerm[] = [
  // ═══ VOLUMES & RANGS ═══════════════════════════════════════════════════
  {
    term: "VP",
    expansion: "Volume Points",
    category: "volumes",
    short: "Unité de mesure officielle Herbalife. Chaque produit a une valeur en VP.",
    long: "Le VP (Volume Point) est l'unité de référence des commissions Herbalife. En France, 1 VP ≈ 1,50 € retail. Un panier client moyen tourne autour de 75 VP. Tu utilises les VP pour calculer ton volume personnel, ton volume aval (lignée), et ta progression vers les rangs.",
  },
  {
    term: "RO",
    expansion: "Royalty Override",
    category: "volumes",
    short: "Commission que tu touches sur le volume de ta lignée descendante (jusqu'à 3 niveaux).",
    long: "Quand tu deviens Supervisor, tu commences à toucher 5% du volume de ta première ligne de Sups, 4% de la deuxième, 2% de la troisième. C'est le RO (Royalty Override) — le revenu passif qui se construit avec ta lignée.",
  },
  {
    term: "PV",
    expansion: "Personal Volume",
    category: "volumes",
    short: "Volume personnel mensuel (clients que tu sers directement).",
    long: "Le PV (Personal Volume) c'est tout ce que tu vends ce mois-ci à tes clients directs. Pour devenir/maintenir Sup, il faut 4000 VP par mois (en France).",
  },
  {
    term: "PDM",
    expansion: "Plan de Marketing",
    category: "volumes",
    short: "Le système de rémunération Herbalife : volumes, rangs, commissions.",
    long: "Le PDM (Plan De Marketing) = le contrat qui régit comment tu es payé : retail (50% margin), royalties (5/4/2%), production bonuses, etc. Cf STS/STE pour les chiffres officiels.",
  },
  {
    term: "Member",
    category: "volumes",
    short: "Premier rang : nouveau client privilégié (25% de réduction).",
  },
  {
    term: "QP",
    expansion: "Qualified Producer",
    category: "volumes",
    short: "2ᵉ rang : 1000 VP en 1 ou 2 mois consécutifs. Donne 35% de réduction.",
  },
  {
    term: "Supervisor",
    expansion: "Sup",
    category: "volumes",
    short: "Le rang clé : 4000 VP en 1 mois. Donne 50% de réduction + accès aux RO.",
    long: "Devenir Supervisor c'est passer pro. Tu touches 50% de marge sur les retail + tu commences à toucher les Royalty Overrides sur ta lignée. C'est le seuil minimum pour générer un revenu sérieux.",
  },
  {
    term: "World Team",
    category: "volumes",
    short: "Sup avec au moins 1 Sup en lignée + 2500 VP perso/mois.",
  },
  {
    term: "GET",
    expansion: "Global Expansion Team",
    category: "volumes",
    short: "Rang elite : 1000 RO/mois (= ~1500€ commissions de lignée).",
  },
  {
    term: "Millionaire",
    category: "volumes",
    short: "Rang elite supérieur : 4000 RO/mois (= ~6000€ commissions).",
  },
  {
    term: "President's Team",
    category: "volumes",
    short: "Top 1% mondial : 10 000 RO/mois (= ~15 000€ commissions).",
  },

  // ═══ ACTIVITÉ ══════════════════════════════════════════════════════════
  {
    term: "DMO",
    expansion: "Daily Method of Operation",
    category: "activite",
    short: "Ta routine quotidienne pour produire du business systématiquement.",
    long: "Le DMO c'est l'ensemble de tes actions quotidiennes non-négociables : invitations, follow-ups, contenu, vocaux équipe. Sans DMO, tu travailles dur. Avec un DMO, tu travailles juste.",
  },
  {
    term: "IPA",
    expansion: "Income Producing Activities",
    category: "activite",
    short: "Les actions qui génèrent directement du revenu (vs admin / décor).",
    long: "Une IPA = une action qui amène un client ou un coach. Hors IPA = pas du business, c'est du décor. Les 5 IPA Lor'Squad : 5 invitations qualitatives + 2 follow-ups + 1 nouveau contact + 1 vocal équipe + 1 contenu posté.",
  },
  {
    term: "5-3-1",
    category: "activite",
    short: "La formule mensuelle Lor'Squad : 5 nouveaux clients + 3 récurrents + 1 nouveau coach.",
    long: "5-3-1 répété 12 mois = ~60 nouveaux clients/an + 12 coachs/an. C'est mathématiquement la voie vers GET Team. Plus accessible que le 8-4-1 historique, plus durable dans la durée.",
  },
  {
    term: "EBE",
    expansion: "Étude Bien-Être",
    category: "activite",
    short: "Le format de bilan Herbalife (~60 min) : objectif + body scan + plan. L'app pilote la trame, toi tu portes l'humain.",
    long: "⚠️ EBE désigne UNIQUEMENT le bilan client 1-1. Pour les événements groupe, on parle d'Apéro Healthy (25-50 personnes), HOM (8-15 chez quelqu'un) ou Fin de Challenge (clôture défi).",
  },
  {
    term: "Apéro Healthy",
    category: "activite",
    short: "Soirée business mensuelle 25-50 personnes : prospects + équipe + opportunité.",
    long: "Anciennement appelé EBE (terme abandonné car ambigu avec le bilan client). 1ʳᵉ semaine du mois, 2h, témoignages 80% du temps utile, CTA chiffré obligatoire en clôture.",
  },
  {
    term: "HOM",
    expansion: "House Opportunity Meeting",
    category: "activite",
    short: "Mini-soirée business 8-15 personnes chez quelqu'un. Intime, prospects tièdes.",
    long: "Format hebdomadaire (souvent mardi). Plus chaleureux que l'apéro healthy, conversion personnelle 1-1 forte.",
  },
  {
    term: "Fin de Challenge",
    category: "activite",
    short: "Clôture rituel d'un défi groupe (21j, 30j…). Célébration des transformations.",
    long: "Excellent moment pour proposer la suite (programme client, opportunité business). Les transformations sont fraîches dans les têtes, l'émotion est haute.",
  },
  {
    term: "Quick Start",
    category: "activite",
    short: "Le programme 90 jours pour les nouveaux distri (objectif Sup en 90j).",
  },
  {
    term: "Prime time IPA",
    category: "activite",
    short: "Créneau quotidien dédié aux invitations (souvent 7h30-8h30 ou 19h-20h).",
  },

  // ═══ PRODUITS & GESTION ═══════════════════════════════════════════════
  {
    term: "Formula 1",
    expansion: "F1",
    category: "produits",
    short: "Le shake repas équilibré — produit phare Herbalife.",
  },
  {
    term: "F2",
    expansion: "Multi-Vitamin",
    category: "produits",
    short: "Le complément multi-vitaminé du programme de base.",
  },
  {
    term: "F3",
    expansion: "Personalized Protein Powder (PPP)",
    category: "produits",
    short: "La protéine pure pour ajuster les apports.",
  },
  {
    term: "Royalty / Commission",
    category: "produits",
    short: "Les revenus passifs sur la lignée (cf RO).",
  },

  // ═══ LOR'SQUAD ═══════════════════════════════════════════════════════
  {
    term: "Lignée",
    category: "lor-squad",
    short: "Tes recrues directes + leurs recrues + ainsi de suite (3 niveaux pour les RO).",
  },
  {
    term: "Sponsor",
    category: "lor-squad",
    short: "Le distri qui t'a recruté. Ton point de contact privilégié pour la formation.",
  },
  {
    term: "Recrue",
    category: "lor-squad",
    short: "Un nouveau distri que tu as parrainé. Ta lignée descendante directe.",
  },
  {
    term: "Bilan",
    category: "lor-squad",
    short: "Le RDV de découverte avec un nouveau client (90 min) — l'EBE en mode Lor'Squad.",
  },
  {
    term: "Body scan",
    category: "lor-squad",
    short: "La pesée + analyse corporelle (poids, masse grasse, hydratation, etc.) avec la balance Tanita.",
  },
];

const CATEGORY_META = {
  volumes: { label: "Volumes & rangs", emoji: "📊", color: "var(--ls-gold)" },
  activite: { label: "Activité & méthode", emoji: "⚡", color: "var(--ls-teal)" },
  produits: { label: "Produits & commissions", emoji: "💼", color: "var(--ls-purple)" },
  "lor-squad": { label: "Vocabulaire Lor'Squad", emoji: "✦", color: "var(--ls-coral)" },
} as const;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function FormationGlossaryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (q.length < 2) return TERMS;
    return TERMS.filter((t) => {
      const haystack = normalize(
        `${t.term} ${t.expansion ?? ""} ${t.short} ${t.long ?? ""}`,
      );
      return haystack.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    for (const t of filtered) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-6" style={{ paddingBottom: 60 }}>
      <button
        type="button"
        onClick={() => navigate("/formation")}
        style={{
          background: "transparent",
          border: "0.5px solid var(--ls-border)",
          color: "var(--ls-text-muted)",
          padding: "8px 14px",
          borderRadius: 10,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ← Retour à Formation
      </button>

      <PageHeading
        eyebrow="Formation · vocabulaire"
        title="Glossaire Herbalife & Lor'Squad"
        description="Tous les termes métier décodés en français simple. Si tu butes sur un sigle (VP, RO, DMO…), c'est ici."
      />

      {/* Search */}
      <div style={{ position: "relative" }}>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 16,
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cherche un terme : VP, royalty, supervisor, lignée…"
          style={{
            width: "100%",
            padding: "12px 14px 12px 42px",
            borderRadius: 12,
            background: "var(--ls-input-bg, var(--ls-surface))",
            border: "1.5px solid var(--ls-border)",
            color: "var(--ls-text)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "var(--ls-text-muted)",
            fontStyle: "italic",
            background: "var(--ls-surface)",
            border: "0.5px dashed var(--ls-border)",
            borderRadius: 14,
            fontSize: 14,
          }}
        >
          Aucun terme ne correspond à <strong>« {query} »</strong>.
        </div>
      ) : (
        Object.entries(grouped).map(([catKey, terms]) => {
          const meta = CATEGORY_META[catKey as keyof typeof CATEGORY_META];
          return (
            <section key={catKey}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: `0.5px solid color-mix(in srgb, ${meta.color} 22%, var(--ls-border))`,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 18 }}>
                  {meta.emoji}
                </span>
                <h3
                  style={{
                    fontFamily: "Syne, serif",
                    fontWeight: 700,
                    fontSize: 16,
                    margin: 0,
                    letterSpacing: "-0.012em",
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ls-text-muted)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  ({terms.length})
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                }}
              >
                {terms.map((t) => (
                  <article
                    key={t.term}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 12,
                      background: "var(--ls-surface)",
                      border: `0.5px solid color-mix(in srgb, ${meta.color} 14%, var(--ls-border))`,
                      borderLeft: `3px solid ${meta.color}`,
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Syne, serif",
                          fontWeight: 800,
                          fontSize: 16,
                          color: meta.color,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {t.term}
                      </span>
                      {t.expansion ? (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--ls-text-hint)",
                            fontStyle: "italic",
                          }}
                        >
                          ({t.expansion})
                        </span>
                      ) : null}
                    </div>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "var(--ls-text)",
                        margin: 0,
                        lineHeight: 1.55,
                        fontWeight: 500,
                      }}
                    >
                      {t.short}
                    </p>
                    {t.long ? (
                      <details style={{ marginTop: 8 }}>
                        <summary
                          style={{
                            cursor: "pointer",
                            fontSize: 11,
                            color: "var(--ls-text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          En savoir plus
                        </summary>
                        <p
                          style={{
                            fontSize: 12,
                            color: "var(--ls-text-muted)",
                            margin: "8px 0 0",
                            lineHeight: 1.6,
                          }}
                        >
                          {t.long}
                        </p>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
