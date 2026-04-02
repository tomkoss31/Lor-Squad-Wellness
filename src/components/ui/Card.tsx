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
        "glass-panel rounded-[24px] p-4 shadow-luxe sm:rounded-[28px] sm:p-5 md:rounded-[32px] md:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
