import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-background-elevated p-4 shadow-[0_2px_12px_rgba(0,0,0,0.25)] ${
        interactive
          ? "transition-all duration-150 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
