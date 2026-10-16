"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { updateItem, useItems } from "@/lib/items";
import { useRoomMembership } from "@/lib/rooms";
import { BackLink, PageTitle } from "@/components/ui/PageHeader";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";
import { PageLoading } from "@/components/ui/Spinner";

export default function EditItemPage() {
  const { roomId, itemId } = useParams<{ roomId: string; itemId: string }>();
  const { user, loading: authLoading, isMaster } = useAuth();
  const router = useRouter();
  const { member, loading: memberLoading } = useRoomMembership(roomId, user?.uid);
  const { items, loading: itemsLoading } = useItems(roomId);

  const item = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);
  const canEdit = member?.role === "owner" || member?.role === "admin" || isMaster;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && !memberLoading && !canEdit) {
      router.replace(`/rooms/${roomId}`);
    }
  }, [authLoading, memberLoading, canEdit, roomId, router]);

  const loading = authLoading || memberLoading || itemsLoading;

  if (loading || !user || !canEdit) {
    return <PageLoading />;
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted">Item não encontrado.</p>
        <BackLink href={`/rooms/${roomId}`}>Voltar pra sala</BackLink>
      </div>
    );
  }

  async function handleSubmit(values: ItemFormValues) {
    await updateItem(roomId, itemId, values);
    router.push(`/rooms/${roomId}/items/${itemId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <BackLink href={`/rooms/${roomId}/items/${itemId}`}>Voltar pro item</BackLink>
      <PageTitle subtitle="Os votos existentes continuam valendo.">✏️ Editar Item</PageTitle>

      <ItemForm
        initialValues={{
          title: item.title,
          imageUrl: item.imageUrl,
          eventDate: item.eventDate,
        }}
        submitLabel="Salvar alterações"
        submittingLabel="Salvando..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
