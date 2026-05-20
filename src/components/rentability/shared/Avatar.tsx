// =============================================================================
// Avatar — pastille initiales coloré (HSL hue tunable).
// Chantier Rentabilité Premium V2 (2026-05-20).
// =============================================================================

import { CSSProperties } from "react";

export function avatarHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function initialsOf(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  initials: string;
  hue?: number;
  size?: number;
  ring?: boolean;
}

export function Avatar({ initials, hue = 200, size = 36, ring = false }: AvatarProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: `hsl(${hue}deg 45% 88%)`,
    color: `hsl(${hue}deg 60% 28%)`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "DM Sans, sans-serif",
    fontWeight: 600,
    fontSize: Math.round(size * 0.36),
    flexShrink: 0,
    boxShadow: ring
      ? "0 0 0 2px var(--ls-surface, #fff), 0 0 0 3px hsl(" + hue + "deg 45% 70%)"
      : undefined,
  };
  return (
    <span style={style} aria-hidden="true">
      {initials}
    </span>
  );
}
