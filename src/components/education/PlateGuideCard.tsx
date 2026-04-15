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
    dot: "bg-[#2DD4BF]",
    chip: "border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]",
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
    dot: "bg-[#2DD4BF]",
    chip: "border-sky-400/20 bg-[rgba(45,212,191,0.1)] text-[#2DD4BF]",
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
    <Card className="space-y-6 bg-[var(--ls-bg)]/80">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--ls-text-hint)]">Assiette type</p>
        <h3 className="mt-2 text-3xl text-white">{title}</h3>
      </div>

      <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5 xl:pt-2">
          <div className="flex justify-center xl:justify-start">
            <div className="relative flex h-[19.5rem] w-[19.5rem] items-center justify-center rounded-full border border-white/10 bg-slate-900/70 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.45)] 2xl:h-[20.5rem] 2xl:w-[20.5rem]">
              <div
                className="absolute inset-4 rounded-full opacity-90"
                style={{ background: gradient }}
              />
              <div className="absolute inset-11 rounded-full border border-white/10 bg-slate-950/82" />
              <div className="relative z-10 max-w-[11rem] px-2 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--ls-text-hint)]">Assiette simple</p>
                <p className="mt-4 text-xl font-semibold leading-7 text-white">
                  {mode === "sport"
                    ? "Equilibre, energie, recuperation"
                    : "Volume, satiete, regularite"}
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-[22rem] px-1 text-center xl:text-left">
            <p className="text-sm leading-7 text-[var(--ls-text-muted)]">{subtitle}</p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--ls-text-hint)]">
              Bons lipides
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ls-text)]">
              <span className="font-semibold text-white">{lipidsNote}</span>
            </p>
            {lipidExamples.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {lipidExamples.map((item) => (
                  <span
                    key={`lipid-${item}`}
                    className={`rounded-full border px-3 py-1.5 text-sm ${accentClasses.blue.chip}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {segments.map((segment) => (
              <div
                key={segment.label}
                className="rounded-[26px] border border-white/10 bg-slate-950/30 px-6 py-5 shadow-[inset_0_1px_0_rgba(128,128,128,0.05)] md:min-h-[188px]"
              >
                <div className={`h-1.5 w-14 rounded-full ${accentClasses[segment.accent].dot}`} />
                <div className="mt-5 space-y-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--ls-text-hint)]">
                    {segment.label}
                  </p>
                  <p
                    className={`text-[3rem] font-semibold leading-none tracking-[-0.045em] ${accentClasses[segment.accent].value}`}
                  >
                    {segment.share}%
                  </p>
                </div>
                <p className="mt-5 max-w-[18rem] text-base leading-8 text-[var(--ls-text-muted)]">
                  {segment.note}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="rounded-[22px] border border-white/10 bg-[var(--ls-bg)]/80 px-5 py-4">
              <p className="eyebrow-label">Repère portions main</p>
              <div className="mt-4 grid gap-2">
                {portionGuides.map((guide) => (
                  <div
                    key={guide.label}
                    className="flex items-center justify-between gap-3 rounded-[18px] bg-[var(--ls-surface2)] px-4 py-3.5 text-sm text-[var(--ls-text)]"
                  >
                    <span className="text-base font-semibold text-white">{guide.label}</span>
                    <span className="text-right text-base text-[var(--ls-text-muted)]">{guide.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-5 py-4">
              <p className="eyebrow-label">Exemples simples</p>
              <div className="mt-4 grid gap-3">
                {mainExamples.map((group) => (
                  <div
                    key={group.label}
                    className="rounded-[18px] bg-[var(--ls-bg)]/60 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-white">{group.label}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span
                          key={`${group.label}-${item}`}
                          className={`rounded-full border px-3 py-1.5 text-sm ${accentClasses[group.accent].chip}`}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
