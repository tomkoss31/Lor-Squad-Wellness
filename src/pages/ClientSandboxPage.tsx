// =============================================================================
// ClientSandboxPage — Mode pratique client (Tier B Livraison B — 2026-04-28)
// =============================================================================
//
// Bac a sable interactif client pour explorer les fonctionnalites de l app
// SANS toucher a sa vraie data. 4 quetes ludiques :
//
//   1. Ta premiere pesee     → input poids + animation graph
//   2. Ton assiette ideale   → click 6 aliments dans 3 zones (50/25/25)
//   3. Ton programme         → choix objectif + reveal 3 produits avec ⭐
//   4. Ton premier message   → taper un message + simulation envoi
//
// Acces : /client/:token/sandbox depuis le bouton "Mode pratique" sur le
// FinalStage du tutoriel.
//
// Pas de fetch reel : tout est mocke client-side, deterministe, instructif.
// Effet "wow" garanti - le client VIT son espace au lieu de le voir.
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type QuestId = 1 | 2 | 3 | 4;

interface QuestState {
  pesee: { weight: number | null };
  assiette: Record<string, ZoneId>;
  programme: { objective: ObjectiveId | null };
  message: { text: string; sent: boolean };
}

type ZoneId = "proteines" | "glucides" | "legumes";
type ObjectiveId = "weight-loss" | "fitness" | "wellness";

interface FoodItem {
  id: string;
  emoji: string;
  label: string;
  correctZone: ZoneId;
}

const FOOD_ITEMS: FoodItem[] = [
  { id: "poulet", emoji: "🍗", label: "Poulet", correctZone: "proteines" },
  { id: "saumon", emoji: "🐟", label: "Saumon", correctZone: "proteines" },
  { id: "riz", emoji: "🍚", label: "Riz complet", correctZone: "glucides" },
  { id: "patate-douce", emoji: "🍠", label: "Patate douce", correctZone: "glucides" },
  { id: "brocolis", emoji: "🥦", label: "Brocolis", correctZone: "legumes" },
  { id: "salade", emoji: "🥗", label: "Salade verte", correctZone: "legumes" },
];

const ZONES: Array<{ id: ZoneId; label: string; pct: number; color: string; emoji: string }> = [
  { id: "proteines", label: "Protéines", pct: 25, color: "#D4537E", emoji: "🍗" },
  { id: "glucides", label: "Glucides complets", pct: 25, color: "#8B4A1B", emoji: "🍚" },
  { id: "legumes", label: "Légumes", pct: 50, color: "#1D9E75", emoji: "🥗" },
];

interface ObjectiveDef {
  id: ObjectiveId;
  emoji: string;
  label: string;
  desc: string;
  products: Array<{ emoji: string; name: string; reason: string; recommended?: boolean }>;
}

const OBJECTIVES: ObjectiveDef[] = [
  {
    id: "weight-loss",
    emoji: "🔥",
    label: "Perdre du poids",
    desc: "Programme nutrition + hydratation + collations malines",
    products: [
      { emoji: "🥤", name: "Formula 1 Vanille", reason: "Repas équilibré 220 kcal" },
      { emoji: "💧", name: "Hydrate Pamplemousse", reason: "Hydratation plaisir", recommended: true },
      { emoji: "🍫", name: "Barre protéinée", reason: "Snack 16h anti-fringale" },
    ],
  },
  {
    id: "fitness",
    emoji: "💪",
    label: "Forme et tonicité",
    desc: "Énergie, équilibre, vitalité",
    products: [
      { emoji: "🥤", name: "Formula 1 Sport Chocolat", reason: "Base protéinée sport" },
      { emoji: "⚡", name: "Liftoff Mojito", reason: "Booster pré-entraînement", recommended: true },
      { emoji: "🌿", name: "Tea Mix", reason: "Énergie douce" },
    ],
  },
  {
    id: "wellness",
    emoji: "🌿",
    label: "Bien-être global",
    desc: "Vitalité, digestion, équilibre intérieur",
    products: [
      { emoji: "🌿", name: "Tea Mix Original", reason: "Brûle-graisse léger" },
      { emoji: "🍵", name: "Aloe Mangue", reason: "Confort digestif", recommended: true },
      { emoji: "🍫", name: "Barre Protéinée", reason: "Encas équilibré" },
    ],
  },
];

export function ClientSandboxPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [activeQuest, setActiveQuest] = useState<QuestId>(1);
  const [completed, setCompleted] = useState<Set<QuestId>>(new Set());
  const [questState, setQuestState] = useState<QuestState>({
    pesee: { weight: null },
    assiette: {},
    programme: { objective: null },
    message: { text: "", sent: false },
  });
  const [showFinal, setShowFinal] = useState(false);

  function markQuestDone(id: QuestId) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // Avance auto a la quete suivante.
    const nextId = (id + 1) as QuestId;
    if (nextId <= 4) {
      setTimeout(() => setActiveQuest(nextId), 600);
    } else {
      setTimeout(() => setShowFinal(true), 800);
    }
  }

  function returnToApp() {
    if (token) {
      navigate(`/client/${token}`);
    } else {
      navigate("/");
    }
  }

  const progress = (completed.size / 4) * 100;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #FAF6E8 0%, #FFFEF5 30%, #FFFFFF 100%)",
        fontFamily: "DM Sans, sans-serif",
        paddingBottom: 80,
      }}
    >
      {/* Sticky header avec progression */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "rgba(255,254,245,0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "0.5px solid rgba(184,146,42,0.20)",
          padding: "16px 18px",
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            onClick={returnToApp}
            style={{
              background: "transparent",
              border: "none",
              color: "#6B6B62",
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Retour
          </button>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#B8922A",
              fontWeight: 700,
            }}
          >
            🎮 Mode pratique
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5C4A0F" }}>
            {completed.size}/4
          </div>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: "rgba(184,146,42,0.15)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #EF9F27, #BA7517)",
              transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>

      {/* Hero */}
      {!showFinal && (
        <div style={{ padding: "24px 18px 8px", textAlign: "center" }}>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🎮</div>
          <h1
            style={{
              fontFamily: "Syne, serif",
              fontSize: 24,
              fontWeight: 600,
              color: "#111827",
              margin: 0,
              marginBottom: 6,
            }}
          >
            Découvre ton espace en 4 quêtes
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#6B6B62",
              maxWidth: 360,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Mini-jeu ludique pour comprendre comment l&apos;app fonctionne. Tout est
            simulé — aucune donnée n&apos;est enregistrée.
          </p>
        </div>
      )}

      {/* Quetes */}
      {!showFinal && (
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Quest1Pesee
            active={activeQuest === 1}
            done={completed.has(1)}
            value={questState.pesee.weight}
            onChange={(w) => setQuestState((s) => ({ ...s, pesee: { weight: w } }))}
            onComplete={() => markQuestDone(1)}
            onActivate={() => setActiveQuest(1)}
          />
          <Quest2Assiette
            active={activeQuest === 2}
            done={completed.has(2)}
            placement={questState.assiette}
            onPlace={(food, zone) =>
              setQuestState((s) => ({ ...s, assiette: { ...s.assiette, [food]: zone } }))
            }
            onComplete={() => markQuestDone(2)}
            onActivate={() => setActiveQuest(2)}
          />
          <Quest3Programme
            active={activeQuest === 3}
            done={completed.has(3)}
            objective={questState.programme.objective}
            onPick={(obj) =>
              setQuestState((s) => ({ ...s, programme: { objective: obj } }))
            }
            onComplete={() => markQuestDone(3)}
            onActivate={() => setActiveQuest(3)}
          />
          <Quest4Message
            active={activeQuest === 4}
            done={completed.has(4)}
            text={questState.message.text}
            sent={questState.message.sent}
            onTextChange={(t) =>
              setQuestState((s) => ({ ...s, message: { ...s.message, text: t } }))
            }
            onSend={() => {
              setQuestState((s) => ({ ...s, message: { ...s.message, sent: true } }));
              setTimeout(() => markQuestDone(4), 1200);
            }}
            onActivate={() => setActiveQuest(4)}
          />
        </div>
      )}

      {/* Final celebration */}
      {showFinal && <SandboxFinal onClose={returnToApp} />}
    </div>
  );
}

// ─── Quete 1 : Premiere pesee ────────────────────────────────────────────────

function Quest1Pesee({
  active,
  done,
  value,
  onChange,
  onComplete,
  onActivate,
}: {
  active: boolean;
  done: boolean;
  value: number | null;
  onChange: (w: number | null) => void;
  onComplete: () => void;
  onActivate: () => void;
}) {
  const [showAnim, setShowAnim] = useState(false);

  function handleConfirm() {
    if (value === null || value <= 0) return;
    setShowAnim(true);
    setTimeout(onComplete, 1400);
  }

  return (
    <QuestCard
      number={1}
      icon="⚖️"
      title="Ta première pesée"
      subtitle="Tape ton poids actuel — l'app calcule ton point de départ"
      active={active}
      done={done}
      onActivate={onActivate}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "16px 20px",
            background: "white",
            border: "0.5px solid rgba(184,146,42,0.30)",
            borderRadius: 14,
            boxShadow: "0 4px 14px rgba(184,146,42,0.10)",
          }}
        >
          <input
            type="number"
            min={30}
            max={200}
            step={0.1}
            placeholder="65.0"
            disabled={done}
            value={value ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(Number.isFinite(n) && n > 0 ? n : null);
            }}
            style={{
              width: 120,
              padding: "8px 10px",
              fontSize: 28,
              fontFamily: "Syne, serif",
              fontWeight: 700,
              color: "#111827",
              border: "none",
              outline: "none",
              textAlign: "center",
              background: "transparent",
            }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#6B6B62",
              fontFamily: "Syne, serif",
            }}
          >
            kg
          </span>
        </div>

        {showAnim && value ? (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(29,158,117,0.10)",
              border: "0.5px solid rgba(29,158,117,0.40)",
              borderRadius: 12,
              fontSize: 13,
              color: "#0F6E56",
              fontWeight: 600,
              animation: "ls-quest-success 360ms ease-out",
            }}
          >
            <style>{`
              @keyframes ls-quest-success {
                0% { opacity: 0; transform: translateY(8px); }
                100% { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            ✓ Pesée enregistrée — point de départ : {value} kg
          </div>
        ) : null}

        {!done && !showAnim && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={value === null || value <= 0}
            style={{
              padding: "12px 22px",
              borderRadius: 12,
              background:
                value === null || value <= 0
                  ? "rgba(184,146,42,0.20)"
                  : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color:
                value === null || value <= 0 ? "rgba(0,0,0,0.4)" : "#FFFFFF",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Syne, serif",
              cursor:
                value === null || value <= 0 ? "not-allowed" : "pointer",
              boxShadow:
                value === null || value <= 0
                  ? "none"
                  : "0 4px 14px rgba(186,117,23,0.40)",
            }}
          >
            Confirmer ma pesée
          </button>
        )}

        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: 0 }}>
          💡 En vrai, tu te pèseras le matin à jeun, 1 fois par semaine.
        </p>
      </div>
    </QuestCard>
  );
}

// ─── Quete 2 : Ton assiette ideale ───────────────────────────────────────────

function Quest2Assiette({
  active,
  done,
  placement,
  onPlace,
  onComplete,
  onActivate,
}: {
  active: boolean;
  done: boolean;
  placement: Record<string, ZoneId>;
  onPlace: (food: string, zone: ZoneId) => void;
  onComplete: () => void;
  onActivate: () => void;
}) {
  const allPlaced = FOOD_ITEMS.every((f) => placement[f.id] !== undefined);
  const correctCount = FOOD_ITEMS.filter(
    (f) => placement[f.id] === f.correctZone,
  ).length;

  useEffect(() => {
    if (allPlaced && !done && correctCount === FOOD_ITEMS.length) {
      const t = setTimeout(onComplete, 1000);
      return () => clearTimeout(t);
    }
  }, [allPlaced, correctCount, done, onComplete]);

  return (
    <QuestCard
      number={2}
      icon="🥗"
      title="Ton assiette idéale"
      subtitle="Place les 6 aliments dans la bonne zone (Protéines · Glucides · Légumes)"
      active={active}
      done={done}
      onActivate={onActivate}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Pool d aliments non-places */}
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#6B6B62",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Aliments à classer
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {FOOD_ITEMS.filter((f) => placement[f.id] === undefined).map(
              (food) => (
                <span
                  key={food.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    background: "white",
                    border: "0.5px solid rgba(184,146,42,0.30)",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{food.emoji}</span>
                  {food.label}
                </span>
              ),
            )}
            {FOOD_ITEMS.every((f) => placement[f.id] !== undefined) ? (
              <span style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>
                Tous les aliments sont placés.
              </span>
            ) : null}
          </div>
        </div>

        {/* 3 zones cliquables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          {ZONES.map((zone) => {
            const placedFoods = FOOD_ITEMS.filter(
              (f) => placement[f.id] === zone.id,
            );
            return (
              <div
                key={zone.id}
                style={{
                  padding: "12px 14px",
                  background: `color-mix(in srgb, ${zone.color} 8%, white)`,
                  border: `1px solid color-mix(in srgb, ${zone.color} 40%, transparent)`,
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: placedFoods.length > 0 ? 8 : 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{zone.emoji}</span>
                    <span
                      style={{
                        fontFamily: "Syne, serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: zone.color,
                      }}
                    >
                      {zone.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#6B6B62",
                      }}
                    >
                      ({zone.pct}%)
                    </span>
                  </div>
                </div>
                {placedFoods.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {placedFoods.map((food) => {
                      const isCorrect = food.correctZone === zone.id;
                      return (
                        <span
                          key={food.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "5px 9px",
                            background: isCorrect
                              ? "rgba(29,158,117,0.15)"
                              : "rgba(220,38,38,0.12)",
                            color: isCorrect ? "#0F6E56" : "#9F1239",
                            borderRadius: 7,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {isCorrect ? "✓" : "✗"} {food.emoji} {food.label}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* Boutons placer-ici pour les aliments non-places */}
                {!done && FOOD_ITEMS.filter((f) => placement[f.id] === undefined).length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: `0.5px dashed color-mix(in srgb, ${zone.color} 30%, transparent)`,
                    }}
                  >
                    {FOOD_ITEMS.filter((f) => placement[f.id] === undefined).map(
                      (food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => onPlace(food.id, zone.id)}
                          style={{
                            padding: "4px 9px",
                            background: "white",
                            border: `0.5px solid color-mix(in srgb, ${zone.color} 40%, transparent)`,
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: zone.color,
                            cursor: "pointer",
                            fontFamily: "DM Sans, sans-serif",
                          }}
                        >
                          + {food.emoji} {food.label}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {allPlaced && correctCount < FOOD_ITEMS.length && !done ? (
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(220,38,38,0.08)",
              border: "0.5px solid rgba(220,38,38,0.30)",
              borderRadius: 10,
              fontSize: 12,
              color: "#9F1239",
            }}
          >
            ⚠ {correctCount}/{FOOD_ITEMS.length} bien classés. Recommence pour
            voir l&apos;assiette idéale construite parfaitement.
          </div>
        ) : null}

        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: 0 }}>
          💡 Cette répartition 25/25/50 est ta cible perte de poids dans
          l&apos;onglet Conseils.
        </p>
      </div>
    </QuestCard>
  );
}

// ─── Quete 3 : Ton programme ─────────────────────────────────────────────────

function Quest3Programme({
  active,
  done,
  objective,
  onPick,
  onComplete,
  onActivate,
}: {
  active: boolean;
  done: boolean;
  objective: ObjectiveId | null;
  onPick: (obj: ObjectiveId) => void;
  onComplete: () => void;
  onActivate: () => void;
}) {
  const picked = OBJECTIVES.find((o) => o.id === objective);

  function handleValidate() {
    if (!objective) return;
    setTimeout(onComplete, 1200);
  }

  return (
    <QuestCard
      number={3}
      icon="🎯"
      title="Ton programme produits"
      subtitle="Choisis un objectif fictif — découvre les produits ⭐ recommandés"
      active={active}
      done={done}
      onActivate={onActivate}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
        >
          {OBJECTIVES.map((obj) => {
            const isSelected = objective === obj.id;
            return (
              <button
                key={obj.id}
                type="button"
                onClick={() => onPick(obj.id)}
                disabled={done}
                style={{
                  padding: "12px 8px",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(184,146,42,0.18), rgba(184,146,42,0.08))"
                    : "white",
                  border: isSelected
                    ? "1px solid #B8922A"
                    : "0.5px solid rgba(0,0,0,0.10)",
                  borderRadius: 12,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: done ? "default" : "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 160ms ease",
                }}
              >
                <span style={{ fontSize: 26 }}>{obj.emoji}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#111827",
                    fontFamily: "Syne, serif",
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {obj.label}
                </span>
              </button>
            );
          })}
        </div>

        {picked ? (
          <div
            style={{
              padding: "14px 14px",
              background: "white",
              border: "0.5px solid rgba(184,146,42,0.30)",
              borderRadius: 12,
              animation: "ls-quest-prog-reveal 320ms ease-out",
            }}
          >
            <style>{`
              @keyframes ls-quest-prog-reveal {
                0% { opacity: 0; transform: translateY(8px); }
                100% { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "#B8922A",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              ⭐ Programme suggéré
            </div>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 600,
                fontSize: 14,
                color: "#111827",
                marginBottom: 8,
              }}
            >
              {picked.label} · {picked.desc}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {picked.products.map((p) => (
                <div
                  key={p.name}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "8px 10px",
                    background: p.recommended ? "rgba(184,146,42,0.08)" : "rgba(0,0,0,0.025)",
                    border: p.recommended
                      ? "0.5px solid rgba(184,146,42,0.40)"
                      : "0.5px solid rgba(0,0,0,0.08)",
                    borderRadius: 9,
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                    {p.emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#111827",
                        fontFamily: "Syne, serif",
                      }}
                    >
                      {p.name}
                      {p.recommended ? (
                        <span style={{ marginLeft: 5, color: "#B8922A" }}>⭐</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B6B62" }}>{p.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {picked && !done ? (
          <button
            type="button"
            onClick={handleValidate}
            style={{
              padding: "12px 22px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color: "#FFFFFF",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "Syne, serif",
              cursor: "pointer",
              alignSelf: "center",
              boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
            }}
          >
            Valider mon programme
          </button>
        ) : null}

        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: 0 }}>
          💡 En vrai, ton coach choisit avec toi pendant le bilan.
        </p>
      </div>
    </QuestCard>
  );
}

// ─── Quete 4 : Ton premier message ──────────────────────────────────────────

function Quest4Message({
  active,
  done,
  text,
  sent,
  onTextChange,
  onSend,
  onActivate,
}: {
  active: boolean;
  done: boolean;
  text: string;
  sent: boolean;
  onTextChange: (t: string) => void;
  onSend: () => void;
  onActivate: () => void;
}) {
  return (
    <QuestCard
      number={4}
      icon="💬"
      title="Ton premier message"
      subtitle="Tape un message à ton coach — découvre comment ça fonctionne"
      active={active}
      done={done}
      onActivate={onActivate}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Bulle coach (preset) */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            maxWidth: "85%",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2DD4BF, #0D9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            T
          </div>
          <div
            style={{
              padding: "10px 14px",
              background: "white",
              border: "0.5px solid rgba(0,0,0,0.08)",
              borderRadius: 14,
              borderTopLeftRadius: 4,
              fontSize: 13,
              color: "#111827",
              lineHeight: 1.4,
            }}
          >
            Salut ! Je suis ton coach. N&apos;hésite pas à m&apos;écrire ici quand tu as une question 💪
          </div>
        </div>

        {sent && text ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexDirection: "row-reverse",
              maxWidth: "85%",
              alignSelf: "flex-end",
              animation: "ls-message-sent 320ms ease-out",
            }}
          >
            <style>{`
              @keyframes ls-message-sent {
                0% { opacity: 0; transform: translateX(20px); }
                100% { opacity: 1; transform: translateX(0); }
              }
            `}</style>
            <div
              style={{
                padding: "10px 14px",
                background: "linear-gradient(135deg, #EF9F27, #BA7517)",
                color: "white",
                borderRadius: 14,
                borderTopRightRadius: 4,
                fontSize: 13,
                lineHeight: 1.4,
                maxWidth: 280,
              }}
            >
              {text}
            </div>
          </div>
        ) : null}

        {!sent ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              padding: "8px 10px",
              background: "white",
              border: "0.5px solid rgba(0,0,0,0.10)",
              borderRadius: 14,
            }}
          >
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Tape un message ici…"
              rows={2}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                color: "#111827",
                background: "transparent",
                padding: 4,
                lineHeight: 1.4,
              }}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={text.trim().length === 0}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background:
                  text.trim().length === 0
                    ? "rgba(184,146,42,0.20)"
                    : "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: text.trim().length === 0 ? "rgba(0,0,0,0.4)" : "white",
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: text.trim().length === 0 ? "not-allowed" : "pointer",
                flexShrink: 0,
              }}
            >
              Envoyer →
            </button>
          </div>
        ) : null}

        {sent && !done ? (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(29,158,117,0.10)",
              border: "0.5px solid rgba(29,158,117,0.40)",
              borderRadius: 12,
              fontSize: 12,
              color: "#0F6E56",
              textAlign: "center",
            }}
          >
            ✓ Message envoyé · ton coach reçoit une notif push
          </div>
        ) : null}

        <p style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", margin: 0 }}>
          💡 En vrai, ton message arrive dans la messagerie de ton coach + push notif.
        </p>
      </div>
    </QuestCard>
  );
}

// ─── Final celebration ───────────────────────────────────────────────────────

function SandboxFinal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        padding: "48px 20px",
        textAlign: "center",
        animation: "ls-final-celebrate 480ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes ls-final-celebrate {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ls-final-trophy {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-8deg) scale(1.08); }
          75% { transform: rotate(6deg) scale(1.04); }
        }
      `}</style>
      <div
        style={{
          fontSize: 80,
          marginBottom: 12,
          display: "inline-block",
          animation: "ls-final-trophy 1400ms ease-out",
        }}
      >
        🏆
      </div>
      <h2
        style={{
          fontFamily: "Syne, serif",
          fontSize: 28,
          fontWeight: 600,
          color: "#111827",
          margin: 0,
          marginBottom: 8,
        }}
      >
        Bravo, tu as terminé les 4 quêtes !
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "#4B5563",
          maxWidth: 380,
          margin: "0 auto",
          lineHeight: 1.6,
          marginBottom: 20,
        }}
      >
        Tu sais maintenant comment fonctionne ton espace : pesée régulière,
        assiette idéale, programme produits, communication coach. À toi de
        jouer !
      </p>

      <div
        style={{
          display: "inline-flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "stretch",
          padding: "14px 18px",
          background:
            "linear-gradient(135deg, rgba(184,146,42,0.12), rgba(29,158,117,0.08))",
          border: "0.5px solid rgba(184,146,42,0.30)",
          borderRadius: 14,
          marginBottom: 24,
          maxWidth: 320,
        }}
      >
        {[
          "Tu as pris ta première pesée",
          "Tu as construit ton assiette idéale",
          "Tu as choisi un programme produits",
          "Tu as envoyé ton premier message",
        ].map((line) => (
          <div
            key={line}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#374151",
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#1D9E75",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            {line}
          </div>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "14px 28px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#FFFFFF",
            border: "none",
            fontFamily: "Syne, serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow: "0 6px 20px rgba(186,117,23,0.45)",
          }}
        >
          Aller dans ma vraie app →
        </button>
      </div>
    </div>
  );
}

// ─── QuestCard wrapper ───────────────────────────────────────────────────────

function QuestCard({
  number,
  icon,
  title,
  subtitle,
  active,
  done,
  onActivate,
  children,
}: {
  number: number;
  icon: string;
  title: string;
  subtitle: string;
  active: boolean;
  done: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: done
          ? "rgba(29,158,117,0.05)"
          : active
            ? "white"
            : "rgba(255,255,255,0.6)",
        border: done
          ? "0.5px solid rgba(29,158,117,0.30)"
          : active
            ? "1px solid rgba(184,146,42,0.45)"
            : "0.5px dashed rgba(184,146,42,0.20)",
        borderRadius: 16,
        padding: 16,
        boxShadow: active ? "0 8px 24px rgba(184,146,42,0.15)" : "none",
        opacity: !active && !done ? 0.65 : 1,
        cursor: !active && !done ? "pointer" : "default",
        transition: "all 200ms ease",
      }}
      onClick={!active && !done ? onActivate : undefined}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: active || done ? 14 : 0,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: done
              ? "#1D9E75"
              : active
                ? "linear-gradient(135deg, #EF9F27, #BA7517)"
                : "rgba(184,146,42,0.18)",
            color: done || active ? "white" : "#5C4A0F",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontFamily: "Syne, serif",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {done ? "✓" : icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 15,
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
            }}
          >
            <span style={{ color: "#B8922A", marginRight: 6 }}>#{number}</span>
            {title}
          </div>
          <div style={{ fontSize: 11, color: "#6B6B62", marginTop: 2, lineHeight: 1.4 }}>
            {subtitle}
          </div>
        </div>
        {done && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(29,158,117,0.15)",
              color: "#0F6E56",
              flexShrink: 0,
              letterSpacing: 0.5,
            }}
          >
            FAIT
          </span>
        )}
      </div>
      {(active || done) && children}
    </div>
  );
}
