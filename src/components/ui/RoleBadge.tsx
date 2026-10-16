import type { MemberRole } from "@/lib/rooms";

const ROLE: Record<MemberRole, { label: string; icon: string; className: string }> = {
  owner: {
    label: "Dono",
    icon: "👑",
    className: "bg-gold/15 text-gold border-gold/30",
  },
  admin: {
    label: "Admin",
    icon: "🛡️",
    className: "bg-silver/15 text-silver border-silver/30",
  },
  member: {
    label: "Membro",
    icon: "🎬",
    className: "bg-foreground/10 text-muted border-border",
  },
};

export function RoleBadge({ role }: { role: MemberRole }) {
  const { label, icon, className } = ROLE[role];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}
