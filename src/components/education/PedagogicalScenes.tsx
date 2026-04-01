import routineMorningVisual from "../../assets/pedagogical/routine-matin.png";

export function ClassicBreakfastScene() {
  return (
    <div className="flex min-h-[210px] items-end justify-center gap-4 overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.10),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.15),rgba(15,23,42,0.55))] px-4 pb-5 pt-10">
      <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 shadow-[0_18px_60px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-5 rounded-full bg-[conic-gradient(from_120deg,#6b7280_0deg,#d6b38b_130deg,#5b3c24_250deg,#6b7280_360deg)] opacity-80" />
        <div className="absolute bottom-9 left-7 h-8 w-16 rounded-full bg-[#d4a46a]/90 blur-[1px]" />
        <div className="absolute right-7 top-8 h-10 w-10 rounded-full bg-[#f1d4a3]/95" />
      </div>

      <div className="relative flex h-28 w-20 items-center justify-center rounded-[20px_20px_14px_14px] border border-white/10 bg-slate-900/80 shadow-[0_18px_50px_rgba(15,23,42,0.35)]">
        <div className="absolute inset-x-3 bottom-3 top-8 rounded-[14px] bg-[linear-gradient(180deg,#5b3a20_0%,#24180f_100%)]" />
        <div className="absolute inset-x-4 top-4 h-5 rounded-full bg-[#d8d8d8]" />
      </div>
    </div>
  );
}

export function RoutineProductScene() {
  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950">
      <img
        src={routineMorningVisual}
        alt="Routine matin Lor'Squad"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center center" }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.06),rgba(2,6,23,0.12)_42%,rgba(2,6,23,0.42)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent" />
    </div>
  );
}
