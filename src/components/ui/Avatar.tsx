import Image from "next/image";
import type { MemberRole } from "@/lib/rooms";

const RING: Record<MemberRole, string> = {
  owner: "ring-gold",
  admin: "ring-silver",
  member: "ring-border",
};

export function Avatar({
  src,
  alt,
  size = 40,
  role,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  role?: MemberRole;
}) {
  const ring = role ? RING[role] : "ring-border";

  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex shrink-0 items-center justify-center rounded-full bg-background-elevated-2 text-sm font-medium text-muted ring-2 ${ring}`}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-full ring-2 ${ring}`}
    />
  );
}
