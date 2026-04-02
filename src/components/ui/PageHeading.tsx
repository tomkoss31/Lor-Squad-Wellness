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
    <div className="space-y-6">
      <div className="inline-flex items-center gap-3 rounded-full bg-white/[0.025] px-3 py-1.5">
        <img
          src={blasonLogo}
          alt="Lor'Squad"
          className="h-7 w-7 rounded-full object-cover opacity-95"
        />
        <span className="eyebrow-label">{eyebrow}</span>
      </div>
      <div className="space-y-5">
        <h1 className="max-w-[12ch] text-balance">{title}</h1>
        <p className="max-w-2xl text-[16px] leading-8 text-slate-300/90 md:text-[18px]">
          {description}
        </p>
      </div>
    </div>
  );
}
