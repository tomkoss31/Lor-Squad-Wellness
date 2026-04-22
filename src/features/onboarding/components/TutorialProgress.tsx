// Chantier Tuto interactif client (2026-04-24).
// Barre de progression points utilisée en bas de chaque tooltip.

export function TutorialProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isDone = i < current;
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: isActive ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: isDone ? "#1D9E75" : isActive ? "#BA7517" : "rgba(0,0,0,0.15)",
              transition: "all 0.25s",
            }}
          />
        );
      })}
    </div>
  );
}
