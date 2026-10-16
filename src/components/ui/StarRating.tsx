"use client";

import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const SIZE_PX: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 18,
  md: 28,
  lg: 40,
  xl: 56,
};

interface StarRatingProps {
  /** 0 to 5, in 0.5 steps. */
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * Interactive 5-star picker: click/tap a star, or press and drag across the
 * whole row (mouse or touch, via Pointer Events) for continuous half-star
 * selection. `onChange` only fires on commit (release) — drag updates are
 * local-only so we don't spam writes mid-gesture.
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  className = "",
}: StarRatingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayValue = clamp(dragValue ?? value);
  const starSize = SIZE_PX[size];

  function valueFromClientX(clientX: number): number {
    const el = containerRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width === 0 ? 0 : (clientX - rect.left) / rect.width;
    const raw = clamp(ratio * 5);
    return Math.round(raw * 2) / 2;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setDragValue(valueFromClientX(event.clientX));
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly || !dragging) return;
    setDragValue(valueFromClientX(event.clientX));
  }

  function commit(event: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly || !dragging) return;
    const finalValue = valueFromClientX(event.clientX);
    setDragging(false);
    setDragValue(null);
    onChange?.(finalValue);
  }

  return (
    <div
      ref={containerRef}
      className={`inline-flex select-none items-center gap-1 ${
        readOnly ? "" : "touch-none cursor-pointer"
      } ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commit}
      onPointerCancel={commit}
      role={readOnly ? undefined : "slider"}
      aria-label={readOnly ? undefined : "Nota em estrelas"}
      aria-valuemin={readOnly ? undefined : 0}
      aria-valuemax={readOnly ? undefined : 5}
      aria-valuenow={readOnly ? undefined : displayValue}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} fillFraction={clamp(displayValue - i, 0, 1)} sizePx={starSize} />
      ))}
    </div>
  );
}

function clamp(n: number, min = 0, max = 5) {
  return Math.min(Math.max(n, min), max);
}

function Star({ fillFraction, sizePx }: { fillFraction: number; sizePx: number }) {
  const gradientId = useId();

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 24 24"
      className="shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset={`${fillFraction * 100}%`} stopColor="var(--gold)" />
          <stop offset={`${fillFraction * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 6.17 6.6.75-4.95 4.6 1.3 6.73L12 17.6l-5.85 3.15 1.3-6.73-4.95-4.6 6.6-.75z"
        fill={`url(#${gradientId})`}
        stroke="var(--border)"
        strokeWidth="1"
        className="[stroke:rgba(244,241,234,0.25)]"
      />
    </svg>
  );
}
