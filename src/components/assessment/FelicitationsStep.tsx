import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import {
  PROGRAM_CHOICES,
  ROUTINE_PRODUCT_DESCRIPTIONS,
  type ProgramChoiceId,
} from "../../data/programs";

interface Props {
  clientFirstName: string;
  coachFirstName: string;
  programChoice: ProgramChoiceId;
  onSave: () => void;
  saving?: boolean;
}

/**
 * Chantier Félicitations (2026-04-20) — remplace l'ancienne "Conclusion du
 * rendez-vous" administrative par une page de félicitations bienveillante.
 * Marque émotionnellement le démarrage du challenge côté client.
 */
export function FelicitationsStep({
  clientFirstName,
  coachFirstName,
  programChoice,
  onSave,
  saving = false,
}: Props) {
  const program = PROGRAM_CHOICES.find((p) => p.id === programChoice) ?? PROGRAM_CHOICES[1];
  const programDisplayName = `Programme ${program.title}`;

  const routineHighlights = program.routineProductIds
    .map((id) => ROUTINE_PRODUCT_DESCRIPTIONS[id]?.name)
    .filter((name): name is string => typeof name === "string");

  const firstName = clientFirstName.trim() || "toi";
  const coachName = coachFirstName.trim() || "Ton coach";

  return (
    <Card
      className="space-y-7"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(24px, 5vw, 40px)",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
        border: "1px solid color-mix(in srgb, var(--ls-gold) 22%, transparent)",
      }}
    >
      {/* Emoji + titre */}
      <div style={{ textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            fontSize: 64,
            lineHeight: 1,
            marginBottom: 14,
            filter: "drop-shadow(0 4px 14px rgba(201,168,76,0.35))",
          }}
        >
          🎉
        </div>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(22px, 4vw, 30px)",
            color: "var(--ls-text)",
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          Félicitations {firstName} !
        </h2>
        <p
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 500,
            fontSize: 16,
            color: "var(--ls-gold)",
            margin: "8px 0 0",
          }}
        >
          Ton challenge démarre aujourd'hui
        </p>
      </div>

      {/* Message bienveillant */}
      <p
        style={{
          textAlign: "center",
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--ls-text-muted)",
          maxWidth: 520,
          margin: "0 auto",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Tu viens de faire un super choix pour ta santé et ton énergie. Je suis fier·ère de
        t'accompagner dans cette aventure.
      </p>

      <div style={{ height: 1, background: "var(--ls-border)", margin: "0 auto", width: "80%" }} />

      {/* Programme + routine matin */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, fontFamily: "'DM Sans', sans-serif" }}>
        <div>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Ton programme
          </p>
          <p
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--ls-text)",
              margin: "6px 0 0",
            }}
          >
            {programDisplayName}
          </p>
        </div>

        <div>
          <p
            style={{
              fontSize: 10,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Ta routine matin
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {routineHighlights.map((name) => (
              <span
                key={name}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
                  color: "var(--ls-teal)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "var(--ls-border)", margin: "0 auto", width: "80%" }} />

      {/* Tips */}
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ls-text)",
            margin: "0 0 10px",
          }}
        >
          💪 3 tips pour bien démarrer
        </p>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "Prépare ton shake dès le réveil",
            "Hydrate-toi tout au long de la journée",
            "Note tes ressentis chaque jour",
          ].map((tip, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                gap: 10,
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--ls-text)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--ls-gold)",
                  color: "var(--ls-gold-contrast, #0B0D11)",
                  fontWeight: 700,
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                {idx + 1}
              </span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </div>

      <div style={{ height: 1, background: "var(--ls-border)", margin: "0 auto", width: "80%" }} />

      {/* Signature + CTA */}
      <div style={{ textAlign: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "0 0 4px", lineHeight: 1.6 }}>
          Je te recontacte demain pour ton premier check-in 😊
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--ls-gold)",
            fontWeight: 600,
            fontFamily: "'Syne', sans-serif",
            margin: 0,
          }}
        >
          — {coachName}
        </p>
      </div>

      <Button
        className="w-full"
        onClick={() => void onSave()}
        disabled={saving}
      >
        {saving ? "Enregistrement…" : "Enregistrer et terminer le bilan"}
      </Button>
    </Card>
  );
}
