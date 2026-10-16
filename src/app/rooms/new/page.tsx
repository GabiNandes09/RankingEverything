"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { createRoom, type RatingScale } from "@/lib/rooms";

export default function NewRoomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Filmes");
  const [ratingScale, setRatingScale] = useState<RatingScale>("0-10");
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
      const roomId = await createRoom(user, {
        name: name.trim(),
        category: category.trim(),
        ratingScale,
      });
      router.push(`/rooms/${roomId}`);
    } catch {
      setError("Não foi possível criar a sala. Tente novamente.");
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 bg-zinc-50 px-6 py-12 dark:bg-black">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Criar Sala</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nome da sala
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Clube do Cinema"
            className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-base dark:border-white/[.145] dark:bg-[#111]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Categoria
          <input
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Filmes"
            className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-base dark:border-white/[.145] dark:bg-[#111]"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">Escala de nota</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ratingScale"
              checked={ratingScale === "0-10"}
              onChange={() => setRatingScale("0-10")}
            />
            0 a 10 (com decimais)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ratingScale"
              checked={ratingScale === "0-5-stars"}
              onChange={() => setRatingScale("0-5-stars")}
            />
            0 a 5 estrelas (meio ponto)
          </label>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Criando..." : "Criar sala"}
        </button>
      </form>
    </div>
  );
}
