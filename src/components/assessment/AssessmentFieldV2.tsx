// =============================================================================
// AssessmentFieldV2 — input premium pour le bilan (2026-11-04)
//
// Refonte profonde du Field historique. Avant : un label sec + input plat.
// Apres :
//
//   - Label en DM Sans 13px, color text avec accent gold optionnel sur le
//     premier mot via prop accentLabel (ex: "Email *" -> "Email" gold)
//   - Optional emoji en prefix (ex: "📞" pour Telephone, "✉️" pour Email)
//   - Input wrap dans un container qui gagne un border subtle gold sur focus
//     (en plus du focus halo native de .ls-input)
//   - Helper text optionnel sous le champ (DM Sans 11.5px text-muted)
//   - Badge prefilled (✦ Pré-rempli depuis prospect) repositionne en chip
//     gold subtil a droite du label, plus que un marqueur inline
//   - Theme-aware via var(--ls-*)
//
// Compatible drop-in avec le Field actuel : meme props (label, value,
// onChange, type, prefilled). Nouveaux : icon, helper, accentLabel.
// =============================================================================

import { useId, useState, type CSSProperties, type InputHTMLAttributes } from "react";

export interface AssessmentFieldV2Props {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  disabled?: boolean;
  prefilled?: boolean;
  /** Emoji affiché en prefix du label (ex: "📞", "✉️"). */
  icon?: string;
  /** Texte helper sous le champ. */
  helper?: string;
  /** Placeholder. */
  placeholder?: string;
  /** Required indicator (ajoute * gold apres le label). */
  required?: boolean;
  /** Si true, le label est plus prominent (font-weight 600). */
  prominent?: boolean;
  /** Clavier iOS. Déduit du `type` si absent (cf. KEYBOARD_BY_TYPE). */
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  /** Remplissage automatique iOS ("given-name", "tel", "email", "address-level2"…). */
  autoComplete?: string;
  /** Libellé de la touche entrée du clavier iOS ("next", "done"…). */
  enterKeyHint?: InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
  /** Nom du champ — utile au remplissage automatique et aux gestionnaires de mots de passe. */
  name?: string;
}

// Clavier iOS par défaut selon le type. Sans ça, un `type="number"` ouvre un
// clavier avec de la ponctuation au lieu du pavé numérique.
const KEYBOARD_BY_TYPE: Record<string, InputHTMLAttributes<HTMLInputElement>["inputMode"]> = {
  number: "decimal",
  tel: "tel",
  email: "email",
  url: "url",
};

export function AssessmentFieldV2({
  label,
  value,
  onChange,
  type = "text",
  step,
  disabled = false,
  prefilled = false,
  icon,
  helper,
  placeholder,
  required = false,
  prominent = false,
  inputMode,
  autoComplete,
  enterKeyHint,
  name,
}: AssessmentFieldV2Props) {
  const [focused, setFocused] = useState(false);
  // Audit mobile 2026-08-10 : le <label> n'avait pas de htmlFor et l'<input>
  // pas d'id. Résultat sur iPhone — VoiceOver annonçait « champ de texte » sans
  // nom (18 fois sur la seule étape 1 du bilan), et taper le libellé ne mettait
  // pas le focus : une cible de toute la largeur de l'écran, perdue.
  const inputId = useId();
  const helperId = `${inputId}-aide`;

  // Style input : combine .ls-input default + variantes (prefilled / focus boost)
  const inputStyle: CSSProperties = prefilled
    ? {
        background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-input-bg))",
        borderColor: "color-mix(in srgb, var(--ls-teal) 50%, var(--ls-border))",
        color: "var(--ls-text)",
        fontWeight: 500,
      }
    : {};

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {/* Label row : icon + texte + chip prefilled */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 18,
        }}
      >
        {icon ? (
          <span
            aria-hidden="true"
            style={{
              fontSize: 13,
              lineHeight: 1,
              opacity: focused || prefilled ? 1 : 0.7,
              transition: "opacity 200ms ease",
            }}
          >
            {icon}
          </span>
        ) : null}
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            fontWeight: prominent ? 600 : 500,
            color: "var(--ls-text)",
            letterSpacing: "-0.005em",
            flex: 1,
          }}
        >
          {label}
          {required ? (
            <span style={{ color: "var(--ls-teal)", marginLeft: 4 }} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {prefilled ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ls-teal)",
              padding: "2px 8px",
              borderRadius: 999,
              background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
              border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
            }}
          >
            ✦ Pré-rempli
          </span>
        ) : null}
      </div>

      {/* Input — utilise .ls-input default (focus halo gere par globals.css).
          Pas de `required` sur l'input : l'astérisque du libellé est purement
          décorative, seuls prénom/nom/objectif sont réellement exigés par
          goToNextStep. Le poser ici mettrait le champ en `:invalid` pour une
          contrainte que l'app n'applique pas. À trancher au lot « copie ». */}
      <input
        id={inputId}
        name={name}
        type={type}
        step={step}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode ?? KEYBOARD_BY_TYPE[type]}
        autoComplete={autoComplete}
        enterKeyHint={enterKeyHint}
        aria-describedby={helper ? helperId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle}
      />

      {/* Helper text */}
      {helper ? (
        <p
          id={helperId}
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11.5,
            color: "var(--ls-text-hint)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}
