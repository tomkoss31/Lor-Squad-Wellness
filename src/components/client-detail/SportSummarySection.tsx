// Chantier Prise de masse (2026-04-24) — résumé sport sur la fiche client.
// 3 sub-cards : Besoins (4 icônes), Plan journée (toggle sport/repos + lignes),
// Programme (prix + boosters + total + WhatsApp).
import { useMemo, useState } from "react";
import type { Client, SportProfile, SportSubObjective } from "../../types/domain";
import {
  computeProteinTargetSport,
  computeWaterTargetSport,
} from "../../lib/calculations";
import {
  BOOSTERS,
  getProgramById,
  type ProgramChoiceId,
} from "../../data/programs";
import { recommendBoosters } from "../../lib/assessmentRecommendations";
import { getEffectiveAge } from "../../lib/age";

interface Props {
  client: Client;
}

const CARD_STYLE: React.CSSProperties = {
  padding: "16px 20px",
  borderRadius: 14,
  background: "#fff",
  border: "1px solid var(--ls-border)",
  fontFamily: "'DM Sans', sans-serif",
};

const SUB_TITLE_STYLE: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ls-gold)",
  marginBottom: 10,
};

export function SportSummarySection({ client }: Props) {
  // Audit 2026-04-30 : early return DEPLACE apres les hooks (rules-of-hooks).
  // Avant : le if/return etait avant useMemo/useState → React crash en cas
  // de basculement client.objective entre 2 renders.
  const latest = useMemo(() => {
    if (!client.assessments?.length) return null;
    return [...client.assessments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  }, [client.assessments]);

  const sportProfile: SportProfile | null = latest?.sportProfile ?? null;
  const sub: SportSubObjective = sportProfile?.subObjective ?? "mass-gain";
  const freq = sportProfile?.frequency ?? "regular";
  const weight = latest?.bodyScan?.weight ?? 0;
  const protein = weight > 0 ? computeProteinTargetSport(weight, sub) : null;
  const waterML = weight > 0 ? computeWaterTargetSport(weight, freq) : 0;

  const [trainingDay, setTrainingDay] = useState<"sport" | "repos">("sport");

  // Garde-fou apres hooks (etait avant les hooks → bug rules-of-hooks).
  if (client.objective !== "sport") return null;

  const programId = (latest?.programId as ProgramChoiceId | undefined) ?? "sport-premium";
  const program = getProgramById(programId);

  const recs = recommendBoosters(sportProfile, getEffectiveAge(client) ?? client.age);
  const recommendedBoosters = BOOSTERS.filter((b) =>
    recs.find((r) => r.productId === b.id && r.recommended)
  );
  const total = program.price + recommendedBoosters.reduce((s, b) => s + b.price, 0);

  const phone = (client.phone ?? "").replace(/\D/g, "");
  const message =
    `Salut ${client.firstName} ! Voici ton plan sport :\n\n` +
    `• Programme : ${program.title} (${program.price}€)\n` +
    recommendedBoosters.map((b) => `• ${b.title} (+${b.price.toFixed(2)}€)`).join("\n") +
    `\n\nTotal : ${total.toFixed(2)}€\nBonne séance !`;
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : undefined;

  const planLines =
    trainingDay === "sport"
      ? [
          "07:00 – Petit-déjeuner protéiné (20-30 g)",
          "10:00 – Collation (barre + fruit)",
          "12:30 – Déjeuner : poulet + riz + légumes",
          "16:30 – Pré-workout : Liftoff + banane",
          "17:00 – Séance d'entraînement",
          "18:30 – Post-workout : Rebuild Strength",
          "20:00 – Dîner complet + légumes",
        ]
      : [
          "08:00 – Petit-déjeuner classique (yaourt + fruits + granola)",
          "10:30 – Collation légère",
          "12:30 – Déjeuner équilibré",
          "15:30 – Goûter (barre + thé)",
          "16:00 – Balade active 30 min",
          "19:30 – Dîner léger protéiné",
          "22:00 – Tisane + coucher tôt (récupération)",
        ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
      {/* 1. Tes besoins */}
      <div style={CARD_STYLE}>
        <div style={SUB_TITLE_STYLE}>Tes besoins</div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <NeedStat icon="💧" label="Eau" value={`${(waterML / 1000).toFixed(1)} L`} />
          <NeedStat icon="🥩" label="Protéines" value={protein ? `${protein.target} g` : "—"} />
          <NeedStat icon="🏋️" label="Fréquence" value={freq} />
          <NeedStat icon="🎯" label="Objectif" value={sub} />
        </div>
      </div>

      {/* 2. Ton plan journée */}
      <div style={CARD_STYLE}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={SUB_TITLE_STYLE}>Ton plan journée</div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["sport", "repos"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setTrainingDay(d)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--ls-border)",
                  background: trainingDay === d ? "var(--ls-gold)" : "var(--ls-surface2)",
                  color: trainingDay === d ? "#fff" : "var(--ls-text)",
                  fontSize: 12,
                  cursor: "pointer",
                  minHeight: 32,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Jour {d}
              </button>
            ))}
          </div>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {planLines.map((l) => (
            <li
              key={l}
              style={{ fontSize: 13, color: "var(--ls-text)", padding: "6px 0", borderBottom: "1px solid var(--ls-border)" }}
            >
              {l}
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Ton programme */}
      <div style={CARD_STYLE}>
        <div style={SUB_TITLE_STYLE}>Ton programme</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ls-text)", marginBottom: 6 }}>
          {program.title} · <span style={{ color: "var(--ls-gold)" }}>{program.price}€</span>
        </div>
        {recommendedBoosters.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
            {recommendedBoosters.map((b) => (
              <li key={b.id} style={{ fontSize: 13, color: "var(--ls-text-muted)" }}>
                + {b.title} <span style={{ color: "var(--ls-gold)" }}>(+{b.price.toFixed(2)}€)</span>
              </li>
            ))}
          </ul>
        )}
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--ls-gold) 10%, transparent)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ls-text)",
          }}
        >
          Total : {total.toFixed(2)}€
        </div>
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block",
              marginTop: 12,
              width: "100%",
              minHeight: 44,
              background: "#25D366",
              color: "#fff",
              textAlign: "center",
              lineHeight: "44px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Partager via WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

function NeedStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        background: "var(--ls-surface2)",
        border: "1px solid var(--ls-border)",
      }}
    >
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ls-text)", marginTop: 2 }}>{value}</div>
    </div>
  );
}
