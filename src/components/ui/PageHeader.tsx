import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-gold"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  );
}

export function PageTitle({
  children,
  subtitle,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-marquee text-3xl leading-none text-gold-gradient sm:text-4xl">
        {children}
      </h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
  );
}
