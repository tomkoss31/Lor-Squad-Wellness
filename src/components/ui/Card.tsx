import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div {...props} className={["lor-card", className].join(" ")}>
      {children}
    </div>
  );
}

export default Card;
