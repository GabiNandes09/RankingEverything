"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-[#ffe08a] via-gold to-gold-strong text-accent-foreground font-semibold shadow-[0_4px_20px_rgba(244,197,66,0.35)] hover:brightness-110 active:brightness-95",
  secondary:
    "border border-border bg-background-elevated text-foreground hover:bg-background-elevated-2",
  ghost: "text-muted hover:text-foreground hover:bg-background-elevated",
  danger:
    "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-full",
  md: "h-11 px-5 text-sm gap-2 rounded-full",
  lg: "h-12 px-7 text-base gap-2.5 rounded-full",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

interface LinkProps extends BaseProps {
  href: string;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  icon,
  href,
  ...rest
}: ButtonProps | LinkProps) {
  const classes = `inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {icon}
      {children}
    </button>
  );
}
