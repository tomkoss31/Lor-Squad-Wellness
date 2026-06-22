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
      <p className="eyebrow-label">{eyebrow}</p>
      <h1
        className="text-[1.6rem] font-bold leading-tight tracking-[-0.03em] text-white md:text-[2rem] xl:text-[2.4rem]"
        style={{ fontFamily: "Syne, sans-serif" }}
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
