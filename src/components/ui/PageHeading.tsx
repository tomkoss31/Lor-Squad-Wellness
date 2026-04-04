import { blasonLogo } from "../../data/visualContent";

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHeading({
  eyebrow,
  title,
  description
}: PageHeadingProps) {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="inline-flex items-center gap-3 rounded-full bg-white/[0.03] px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <img
          src={blasonLogo}
          alt="Lor'Squad"
          className="h-7 w-7 rounded-full object-cover opacity-95 ring-1 ring-white/10"
        />
        <span className="eyebrow-label">{eyebrow}</span>
      </div>
      <div className="space-y-3">
        <h1 className="max-w-[12ch] text-balance">{title}</h1>
        <p className="max-w-[46rem] text-[15px] leading-7 text-slate-300/86 md:text-[16px] md:leading-7">
          {description}
        </p>
      </div>
    </div>
  );
}
