"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { addItem } from "@/lib/items";
import { useRoomMembership } from "@/lib/rooms";
import { BackLink, PageTitle } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

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
      <BackLink href={`/rooms/${roomId}`}>Voltar pra sala</BackLink>
      <PageTitle subtitle="O que vamos rankear dessa vez?">🎞️ Adicionar Item</PageTitle>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Título">
          <Input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Nome do filme"
          />
        </Field>

        <Field label="Imagem (URL, opcional)">
          <Input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://..."
          />
        </Field>

        <Field label="Data do evento (opcional)">
          <Input
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Adicionando..." : "Adicionar item"}
        </Button>
      </form>
    </div>
  );
}
