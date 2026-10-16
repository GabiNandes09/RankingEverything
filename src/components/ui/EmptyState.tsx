import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      {icon && <div className="text-4xl opacity-70">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}
