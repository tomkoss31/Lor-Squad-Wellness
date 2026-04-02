import { Card } from "../ui/Card";
import hydrationRoutineVisual from "../../assets/pedagogical/visuels-hydratation.png";

export function HydrationRoutinePrimerCard() {
  return (
    <Card className="space-y-6 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
          Repere pedagogique
        </p>
        <h3 className="mt-2 text-[1.9rem] leading-none text-white md:text-[2.1rem]">
          Hydratation &amp; routine du matin
        </h3>
        <p className="mt-3 text-[14px] leading-7 text-slate-300">
          Comprendre les bases avant de demarrer le programme.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Cette page aide a montrer pourquoi mieux boire et mieux structurer le matin change
          deja beaucoup de choses.
        </p>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950">
        <div className="relative min-h-[520px]">
          <img
            src={hydrationRoutineVisual}
            alt="Hydratation et routine du matin"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.03),rgba(2,6,23,0.12)_48%,rgba(2,6,23,0.4)_100%)]" />
        </div>
      </div>
    </Card>
  );
}
