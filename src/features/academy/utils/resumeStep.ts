// Chantier Academy direction 4 (2026-04-28).
// Persistance localStorage du step interne par section. Permet a un
// user qui skip une section a mi-parcours de reprendre exactement au
// step ou il s est arrete.
//
// Cle localStorage : lorsquad-academy-resume-step
// Format : { [sectionId]: stepIndex }
// Reset automatique quand la section est completee (markSectionDone
// appelle clearResumeStep).

const STORAGE_KEY = "lorsquad-academy-resume-step";

type ResumeMap = Record<string, number>;

function readMap(): ResumeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as ResumeMap;
  } catch {
    return {};
  }
}

function writeMap(map: ResumeMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode
  }
}

export function getResumeStep(sectionId: string): number {
  const map = readMap();
  return map[sectionId] ?? 0;
}

export function setResumeStep(sectionId: string, step: number) {
  const map = readMap();
  map[sectionId] = step;
  writeMap(map);
}

export function clearResumeStep(sectionId: string) {
  const map = readMap();
  delete map[sectionId];
  writeMap(map);
}
