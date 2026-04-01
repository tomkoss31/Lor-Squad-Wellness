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
          className="h-11 w-11 rounded-[18px] object-cover ring-1 ring-white/10 shadow-luxe"
        />
        <div>
          <p className="text-sm font-semibold text-white">Lor&apos;Squad Wellness</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Powered by La Base
          </p>
        </div>
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className="space-y-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-4">
          <img
            src={blasonLogo}
            alt="Lor'Squad"
            className="h-14 w-14 rounded-[20px] object-cover ring-1 ring-white/10"
          />
          <div>
            <p className="text-lg font-semibold text-white">Lor&apos;Squad Wellness</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Outil principal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3">
          <img src={laBaseLogo} alt="La Base" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="text-sm font-semibold text-white">La Base Shakes &amp; Drinks</p>
            <p className="text-xs text-slate-400">Presence club et nutrition</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-1.5 shadow-luxe">
        <img src={blasonLogo} alt="Lor'Squad" className="h-5 w-5 rounded-full object-cover" />
        <span className="font-medium text-white">Lor&apos;Squad Wellness</span>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-3 py-1.5">
        <img src={laBaseLogo} alt="La Base" className="h-5 w-5 rounded-full object-cover" />
        <span>Powered by La Base</span>
      </div>
    </div>
  );
}
