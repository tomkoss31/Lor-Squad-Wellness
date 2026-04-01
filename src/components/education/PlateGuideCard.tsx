import { Card } from "../ui/Card";

type SegmentAccent = "green" | "red" | "amber" | "blue";

interface PlateSegment {
  label: string;
  share: number;
  note: string;
  accent: SegmentAccent;
}

interface PortionGuide {
  label: string;
  value: string;
}

interface FoodExampleGroup {
  label: string;
  items: string[];
  accent: SegmentAccent;
}

interface PlateGuideCardProps {
  title: string;
  mode: "weight-loss" | "sport";
  subtitle: string;
  segments: PlateSegment[];
  portionGuides: PortionGuide[];
  foodExamples: FoodExampleGroup[];
  lipidsNote: string;
}

const accentClasses: Record<
  SegmentAccent,
  {
    dot: string;
    chip: string;
    value: string;
  }
> = {
  green: {
    dot: "bg-emerald-300/90",
    chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    value: "text-slate-100"
  },
  red: {
    dot: "bg-rose-300/90",
    chip: "border-rose-400/20 bg-rose-400/10 text-rose-100",
    value: "text-slate-100"
  },
  amber: {
    dot: "bg-amber-300/90",
    chip: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    value: "text-slate-100"
  },
  blue: {
    dot: "bg-sky-300/90",
    chip: "border-sky-400/20 bg-sky-400/10 text-sky-100",
    value: "text-slate-100"
  }
};

function buildPlateGradient(segments: PlateSegment[]) {
  const colors: Record<SegmentAccent, string> = {
    green: "#34d399",
    red: "#fb7185",
    amber: "#fbbf24",
    blue: "#38bdf8"
  };

  let cursor = 0;
  const parts = segments.map((segment) => {
    const start = cursor;
    cursor += segment.share;
    return `${colors[segment.accent]} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${parts.join(", ")})`;
}

export function PlateGuideCard({
  title,
  mode,
  subtitle,
  segments,
  portionGuides,
  foodExamples,
  lipidsNote
}: PlateGuideCardProps) {
  const gradient = buildPlateGradient(segments);
  const lipidExamples = foodExamples.find((group) => group.label === "Lipides")?.items ?? [];
  const mainExamples = foodExamples.filter((group) => group.label !== "Lipides");

  return (
    <Card className="space-y-6 bg-slate-950/35">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Assiette type</p>
        <h3 className="mt-2 text-3xl text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">{subtitle}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative flex h-80 w-80 items-center justify-center rounded-full border border-white/10 bg-slate-900/70 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.45)]">
              <div
                className="absolute inset-4 rounded-full opacity-90"
                style={{ background: gradient }}
              />
              <div className="absolute inset-10 rounded-full border border-white/10 bg-slate-950/82" />
              <div className="relative z-10 max-w-[10rem] text-center">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Assiette simple</p>
                <p className="mt-3 text-xl font-semibold text-white">
                  {mode === "sport"
                    ? "Equilibre, energie, recuperation"
                    : "Volume, satiete, regularite"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            <span className="font-semibold text-white">{lipidsNote}</span>
            {lipidExamples.length ? ` - ${lipidExamples.join(", ")}` : ""}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {segments.map((segment) => (
              <div
                key={segment.label}
                className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentClasses[segment.accent].dot}`} />
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {segment.label}
                  </p>
                </div>
                <p
                  className={`mt-3 text-3xl font-semibold ${accentClasses[segment.accent].value}`}
                >
                  {segment.share}%
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{segment.note}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Repere portions main</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {portionGuides.slice(0, 3).map((guide) => (
                <span
                  key={guide.label}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200"
                >
                  <span className="font-semibold text-white">{guide.label}</span> : {guide.value}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Exemples simples</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {mainExamples.flatMap((group) =>
                group.items.map((item) => (
                  <span
                    key={`${group.label}-${item}`}
                    className={`rounded-full border px-3 py-1.5 text-sm ${accentClasses[group.accent].chip}`}
                  >
                    {item}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
