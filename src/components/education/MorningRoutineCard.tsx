import { Card } from "../ui/Card";
import routineMorningVisual from "../../assets/pedagogical/visuels-petit-dejeuner-optimized.jpg";

export function MorningRoutineCard() {
  return (
    <Card className="space-y-6 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Routine du matin</p>
        <h3 className="mt-2 text-[1.9rem] leading-none text-white md:text-[2.1rem]">
          Routine matin Lor&apos;Squad
        </h3>
        <p className="mt-3 text-[14px] leading-7 text-slate-300">
          Une routine simple, reguliere et coherente avec l&apos;objectif du client.
        </p>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950">
        <div className="relative min-h-[420px]">
          <img
            src={routineMorningVisual}
            alt="Routine matin Lor'Squad"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.02),rgba(2,6,23,0.08)_44%,rgba(2,6,23,0.46)_100%)]" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <RoutinePointCard title="Aloe" detail="Hydratation / routine du matin" />
        <RoutinePointCard
          title="Boisson aux extraits vegetaux"
          detail="Boisson chaude ou froide / energie / rituel"
        />
        <RoutinePointCard
          title="Formula 1 + PDM"
          detail="Petit-dejeuner structure / plus de proteines / routine plus simple a tenir"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {["Plus de proteines", "Meilleure regularite", "Plus facile a tenir"].map((benefit) => (
          <div
            key={benefit}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
          >
            {benefit}
          </div>
        ))}
      </div>
    </Card>
  );
}

function RoutinePointCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
      <p className="text-[1.02rem] font-semibold leading-none text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}
