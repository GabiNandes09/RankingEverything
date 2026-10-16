"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRoom, useRoomMembership } from "@/lib/rooms";

const SCALE_LABEL: Record<string, string> = {
  "0-10": "0 a 10",
  "0-5-stars": "0 a 5 estrelas",
};

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading, isMaster } = useAuth();
  const router = useRouter();

  const { room, loading: roomLoading, error } = useRoom(roomId);
  const { member, loading: memberLoading } = useRoomMembership(roomId, user?.uid);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const loading = authLoading || roomLoading || memberLoading;

  if (loading || !user) {
    return null;
  }

  if (error || !room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          {error ?? "Sala não encontrada."}
        </p>
        <Link href="/rooms" className="text-sm font-medium underline">
          Voltar pra Minhas Salas
        </Link>
      </div>
    );
  }

  const canManageItems = member?.role === "owner" || member?.role === "admin" || isMaster;
  const inviteLink =
    typeof window !== "undefined" ? `${window.location.origin}/rooms/${room.id}` : "";

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/rooms" className="text-sm text-zinc-500 hover:underline">
          ← Minhas Salas
        </Link>
        <Link
          href={`/rooms/${room.id}/members`}
          className="text-sm text-zinc-500 hover:underline"
        >
          Membros
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{room.name}</h1>
        <p className="text-sm text-zinc-500">
          {room.category} · Escala {SCALE_LABEL[room.ratingScale] ?? room.ratingScale}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm dark:border-white/[.145] dark:bg-[#111]">
        <span className="text-zinc-500">Código:</span>
        <span className="font-mono font-medium tracking-widest">{room.code}</span>
        <button
          type="button"
          onClick={copyInvite}
          className="ml-auto text-xs font-medium underline"
        >
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      {canManageItems && (
        <button
          type="button"
          disabled
          title="Em breve"
          className="flex h-10 w-fit items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background opacity-60"
        >
          Adicionar item
        </button>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/[.12] py-16 text-center dark:border-white/[.15]">
        <p className="font-medium text-zinc-600 dark:text-zinc-400">
          Itens e ranking em breve
        </p>
        <p className="max-w-xs text-sm text-zinc-500">
          A votação, o ranking compartilhado e o ranking pessoal ainda estão por vir.
        </p>
      </div>
    </div>
  );
}
