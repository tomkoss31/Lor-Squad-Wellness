import { Card } from "../ui/Card";
import classicBreakfastVisual from "../../../assets/visuels-pedagogiques/petit-dejeuner-francais.png";
import breakfastSupportVisual from "../../../assets/visuels-pedagogiques/routine-matin.png";

const comparisonRows = [
  { label: "Proteines", classic: "Faible", structured: "Plus elevees" },
  { label: "Fibres", classic: "Faible a moyenne", structured: "Plus structurees" },
  { label: "Satiete", classic: "Variable", structured: "Meilleure" },
  { label: "Regularite", classic: "Irreguliere", structured: "Reproductible" }
];

export function BreakfastComparison() {
  return (
    <Card className="space-y-6 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Repere du matin</p>
        <h3 className="mt-2 text-[1.9rem] leading-none text-white md:text-[2.1rem]">
          Tout commence par le petit-dejeuner
        </h3>
        <p className="mt-3 text-[14px] leading-7 text-slate-300">
          Hydratation, energie et structure des le matin.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ImageScenarioCard
          title="Petit-dejeuner classique"
          subtitle="Rapide, familier, mais souvent peu structure pour tenir toute la matinee."
          image={classicBreakfastVisual}
          imageAlt="Petit-dejeuner classique"
          points={["Peu de proteines", "Faim plus rapide", "Routine irreguliere"]}
        />

        <SupportVisualCard />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-4 md:p-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Lecture utile</p>
        <div className="mt-4 grid gap-3">
          {comparisonRows.map((row) => (
            <div
              key={row.label}
              className="grid gap-2 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 md:grid-cols-[110px_1fr_1fr]"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{row.label}</p>
              <p className="text-sm text-slate-300">{row.classic}</p>
              <p className="text-sm font-medium text-white">{row.structured}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ImageScenarioCard({
  title,
  subtitle,
  image,
  imageAlt,
  points
}: {
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  points: string[];
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
      <div className="relative min-h-[320px] bg-slate-950">
        <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.14)_45%,rgba(2,6,23,0.58)_100%)]" />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h4 className="text-[1.5rem] leading-none text-white">{title}</h4>
          <p className="mt-3 text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>
        <div className="grid gap-2">
          {points.map((point) => (
            <div
              key={point}
              className="rounded-[18px] border border-white/8 bg-slate-950/35 px-4 py-3 text-sm text-slate-200"
            >
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupportVisualCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
      <div className="relative min-h-[320px] bg-slate-950">
        <img
          src={breakfastSupportVisual}
          alt="Visuel pedagogique petit-dejeuner Lor'Squad"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.03),rgba(2,6,23,0.08)_40%,rgba(2,6,23,0.52)_100%)]" />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h4 className="text-[1.5rem] leading-none text-white">Routine Lor&apos;Squad</h4>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            L&apos;objectif n&apos;est pas de compliquer le matin, mais de creer une routine plus
            stable et plus facile a reproduire.
          </p>
        </div>
        <div className="grid gap-2">
          {["Aloe", "Boisson aux extraits vegetaux", "Formula 1"].map((point) => (
            <div
              key={point}
              className="rounded-[18px] border border-white/8 bg-slate-950/35 px-4 py-3 text-sm text-slate-200"
            >
              {point}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
