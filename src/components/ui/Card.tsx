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
        "glass-panel rounded-[24px] p-5 sm:rounded-[28px] sm:p-6 md:p-7",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
