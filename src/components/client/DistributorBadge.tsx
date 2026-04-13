import { getPortfolioIdentity, type PortfolioAccent } from "../../lib/portfolio";
import type { User } from "../../types/domain";

interface DistributorBadgeProps {
  user: User;
  detail?: string;
  compact?: boolean;
}

const accentClasses: Record<
  PortfolioAccent,
  {
    shell: string;
    glyph: string;
    detail: string;
  }
> = {
  blue: {
    shell: "border-sky-300/20 bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]",
    glyph: "text-[#2DD4BF]",
    detail: "text-[#2DD4BF]/70"
  },
  green: {
    shell: "border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]",
    glyph: "text-[#2DD4BF]",
    detail: "text-[#2DD4BF]/70"
  },
  amber: {
    shell: "border-amber-300/25 bg-amber-400/12 text-amber-50",
    glyph: "text-amber-200",
    detail: "text-amber-100/70"
  },
  rose: {
    shell: "border-rose-300/20 bg-rose-400/12 text-rose-50",
    glyph: "text-rose-200",
    detail: "text-rose-100/70"
  }
};

export function DistributorBadge({
  user,
  detail,
  compact = false
}: DistributorBadgeProps) {
  const identity = getPortfolioIdentity(user);
  const classes = accentClasses[identity.accent];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-semibold shadow-luxe ${classes.shell}`}
      >
        <span>{identity.initials}</span>
        <span className={`absolute -bottom-1 -right-1 ${classes.glyph}`}>
          <Glyph kind={identity.glyph} />
        </span>
      </div>

      {!compact ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className={`truncate text-xs ${classes.detail}`}>{detail ?? identity.label}</p>
        </div>
      ) : null}
    </div>
  );
}

function Glyph({ kind }: { kind: "crest" | "spark" | "pulse" | "orbit" }) {
  if (kind === "spark") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v5" />
        <path d="M12 16v5" />
        <path d="M5.5 6.5l3.5 3.5" />
        <path d="M15 14l3.5 3.5" />
        <path d="M3 12h5" />
        <path d="M16 12h5" />
      </svg>
    );
  }

  if (kind === "pulse") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h4l2-4 3 8 2-4h7" />
      </svg>
    );
  }

  if (kind === "orbit") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2.25" />
        <path d="M4 12c2-4 6-6 8-6s6 2 8 6c-2 4-6 6-8 6s-6-2-8-6Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l6 3v5c0 4.3-2.6 7.8-6 10-3.4-2.2-6-5.7-6-10V6l6-3Z" />
      <path d="M9.5 12.5l1.5 1.5 3.5-4" />
    </svg>
  );
}
