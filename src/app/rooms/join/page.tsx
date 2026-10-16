"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { joinRoomByCode } from "@/lib/rooms";

export default function JoinRoomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      const roomId = await joinRoomByCode(user, code);
      router.push(`/rooms/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar na sala.");
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 bg-zinc-50 px-6 py-12 dark:bg-black">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Entrar com código</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Código da sala
          <input
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AB12CD"
            maxLength={6}
            className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-center text-lg tracking-[0.3em] uppercase dark:border-white/[.145] dark:bg-[#111]"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
