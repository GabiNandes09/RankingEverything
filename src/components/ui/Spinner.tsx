export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-gold"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16"
      role="status"
      aria-label={label}
    >
      <Spinner size={36} />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
