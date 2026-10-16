import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  labelProps?: LabelHTMLAttributes<HTMLLabelElement>;
}

export function Field({ label, children, labelProps }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-muted" {...labelProps}>
      {label}
      {children}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 rounded-xl border border-border bg-background-elevated-2 px-3.5 text-base text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-gold/50 focus:ring-2 focus:ring-gold/20 ${className}`}
      {...rest}
    />
  );
}
