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
    <div className="space-y-3.5">
      <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3.5 py-2 shadow-luxe">
        <img
          src={blasonLogo}
          alt="Lor'Squad"
          className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-300">
          {eyebrow}
        </span>
      </div>
      <div className="space-y-3">
        <h1 className="max-w-4xl text-[2.25rem] leading-[0.96] md:text-[3.85rem]">{title}</h1>
        <p className="max-w-3xl text-[15px] leading-7 text-slate-300/95 md:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}
