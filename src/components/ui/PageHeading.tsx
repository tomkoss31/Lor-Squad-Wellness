import { JargonTip } from "./JargonTip"
import type { JargonKey } from "../../data/jargon"

interface PageHeadingProps {
  eyebrow: string
  title: string
  description?: string
  /** Si défini, ajoute une bulle ⓘ à côté du titre qui explique le mot. */
  infoTerm?: JargonKey
}

export function PageHeading({ eyebrow, title, description, infoTerm }: PageHeadingProps) {
  return (
    <div className="space-y-2">
      {/* Cockpit (2026-07-03) : eyebrow mono + titre Anton. text-white → token
          (corrige aussi l'illisibilité en mode clair). */}
      <p className="eyebrow-label" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.2em" }}>{eyebrow}</p>
      <h1
        className="text-[1.6rem] leading-tight tracking-[0.01em] uppercase md:text-[2rem] xl:text-[2.4rem]"
        style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, color: "var(--ls-text)" }}
      >
        {title}
        {infoTerm ? <JargonTip term={infoTerm} size={18} /> : null}
      </h1>
      {description && (
        <p className="max-w-2xl text-sm leading-7 text-[var(--ls-text-muted)] md:text-[15px]">
          {description}
        </p>
      )}
    </div>
  )
}
