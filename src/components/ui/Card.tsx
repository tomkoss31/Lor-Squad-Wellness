import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "../../lib/utils";

export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[32px] p-5 shadow-luxe md:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
