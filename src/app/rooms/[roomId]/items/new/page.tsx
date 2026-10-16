"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { addItem } from "@/lib/items";
import { useRoomMembership } from "@/lib/rooms";

export default function NewItemPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading, isMaster } = useAuth();
  const router = useRouter();
  const { member, loading: memberLoading } = useRoomMembership(roomId, user?.uid);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const canAdd = member?.role === "owner" || member?.role === "admin" || isMaster;

  useEffect(() => {
    if (!authLoading && !memberLoading && !canAdd) {
      router.replace(`/rooms/${roomId}`);
    }
  }, [authLoading, memberLoading, canAdd, roomId, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      await addItem(roomId, user, {
        title: title.trim(),
        imageUrl: imageUrl.trim() || undefined,
        eventDate: eventDate || undefined,
      });
      router.push(`/rooms/${roomId}`);
    } catch {
      setError("Não foi possível adicionar o item. Tente novamente.");
      setSubmitting(false);
    }
  }

  if (authLoading || memberLoading || !user || !canAdd) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Adicionar Item</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nome do filme"
            className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-base dark:border-white/[.145] dark:bg-[#111]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Imagem (URL, opcional)
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
            className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-base dark:border-white/[.145] dark:bg-[#111]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Data do evento (opcional)
          <input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className="h-11 rounded-lg border border-black/[.08] bg-white px-3 text-base dark:border-white/[.145] dark:bg-[#111]"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Adicionando..." : "Adicionar item"}
        </button>
      </form>
    </div>
  );
}
