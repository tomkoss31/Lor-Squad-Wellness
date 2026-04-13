interface AvatarProps {
  name: string;
  size?: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ name, size = 44 }: AvatarProps) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(201,168,76,0.14)] font-['Syne'] text-sm font-bold text-[var(--lor-gold2)]"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
