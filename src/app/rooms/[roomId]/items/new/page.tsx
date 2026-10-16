"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { addItem } from "@/lib/items";
import { useRoomMembership } from "@/lib/rooms";
import { BackLink, PageTitle } from "@/components/ui/PageHeader";
import { ItemForm, type ItemFormValues } from "@/components/ItemForm";

export default function NewItemPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading, isMaster } = useAuth();
  const router = useRouter();
  const { member, loading: memberLoading } = useRoomMembership(roomId, user?.uid);

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

  if (authLoading || memberLoading || !user || !canAdd) {
    return null;
  }

  async function handleSubmit(values: ItemFormValues) {
    if (!user) return;
    await addItem(roomId, user, values);
    router.push(`/rooms/${roomId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <BackLink href={`/rooms/${roomId}`}>Voltar pra sala</BackLink>
      <PageTitle subtitle="O que vamos rankear dessa vez?">🎞️ Adicionar Item</PageTitle>

      <ItemForm
        submitLabel="Adicionar item"
        submittingLabel="Adicionando..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
