import { blasonLogo, laBaseLogo } from "../../data/visualContent";

interface BrandSignatureProps {
  variant?: "inline" | "stacked" | "compact";
}

export function BrandSignature({ variant = "inline" }: BrandSignatureProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3">
        <img
          src={blasonLogo}
          alt="Lor'Squad"
          className="h-11 w-11 rounded-[18px] object-cover shadow-soft"
        />
        <div>
          <p className="text-sm font-semibold text-white">Lor&apos;Squad Wellness</p>
          <p className="text-[11px] text-slate-500">Powered by La Base</p>
        </div>
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className="space-y-4 rounded-[24px] bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <img
            src={blasonLogo}
            alt="Lor'Squad"
            className="h-14 w-14 rounded-[20px] object-cover shadow-soft"
          />
          <div>
            <p className="text-lg font-semibold text-white">Lor&apos;Squad Wellness</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Accompagnement premium
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[18px] bg-slate-950/30 px-3 py-3">
          <img src={laBaseLogo} alt="La Base" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="text-sm font-semibold text-white">La Base Shakes &amp; Drinks</p>
            <p className="text-xs text-slate-400">Présence club et nutrition</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
      <div className="inline-flex items-center gap-2">
        <img src={blasonLogo} alt="Lor'Squad" className="h-6 w-6 rounded-full object-cover" />
        <span className="font-medium text-white">Lor&apos;Squad Wellness</span>
      </div>
      <div className="inline-flex items-center gap-2 text-slate-500">
        <img src={laBaseLogo} alt="La Base" className="h-6 w-6 rounded-full object-cover" />
        <span>Powered by La Base</span>
      </div>
    </div>
  );
}
