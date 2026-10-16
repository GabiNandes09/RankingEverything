const PODIUM: Record<number, { className: string; glow: string }> = {
  1: { className: "bg-gradient-to-br from-[#ffe9a8] to-gold-strong text-[#2a1e04]", glow: "shadow-[0_0_16px_rgba(244,197,66,0.55)]" },
  2: { className: "bg-gradient-to-br from-[#eef0f4] to-silver-strong text-[#20222a]", glow: "shadow-[0_0_14px_rgba(214,218,227,0.4)]" },
  3: { className: "bg-gradient-to-br from-[#f0b67f] to-bronze-strong text-[#2a1708]", glow: "shadow-[0_0_14px_rgba(217,138,78,0.4)]" },
};

export function RankBadge({ position }: { position: number }) {
  const podium = PODIUM[position];

  if (podium) {
    return (
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${podium.className} ${podium.glow}`}
      >
        {position}
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-medium text-muted">
      {position}
    </span>
  );
}
