"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  computePersonalRanking,
  computeSharedRanking,
  useAllItemVotes,
  useItems,
} from "@/lib/items";
import { useRoom, useRoomMembership } from "@/lib/rooms";

const SCALE_LABEL: Record<string, string> = {
  "0-10": "0 a 10",
  "0-5-stars": "0 a 5 estrelas",
};

function formatAverage(average: number, ratingScale: string): string {
  if (ratingScale === "0-5-stars") {
    const full = Math.floor(average);
    const half = average - full >= 0.25 && average - full < 0.75;
    const roundedUp = average - full >= 0.75;
    return "★".repeat(full + (roundedUp ? 1 : 0)) + (half ? "½" : "") + ` (${average.toFixed(1)})`;
  }
  return average.toFixed(1);
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading, isMaster } = useAuth();
  const router = useRouter();

  const { room, loading: roomLoading, error } = useRoom(roomId);
  const { member, loading: memberLoading } = useRoomMembership(roomId, user?.uid);
  const { items, loading: itemsLoading } = useItems(roomId);
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const votesByItem = useAllItemVotes(roomId, itemIds);

  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"shared" | "personal">("shared");
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const loading = authLoading || roomLoading || memberLoading || itemsLoading;

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

  const filteredItems = items.filter((item) => {
    const matchesName = item.title.toLowerCase().includes(nameFilter.trim().toLowerCase());
    const matchesDate = !dateFilter || item.eventDate === dateFilter;
    return matchesName && matchesDate;
  });

  const myVotesByItem = Object.fromEntries(
    Object.entries(votesByItem).map(([itemId, votes]) => [
      itemId,
      votes.find((v) => v.uid === user.uid),
    ]),
  );

  const ranking =
    view === "shared"
      ? computeSharedRanking(filteredItems, votesByItem)
      : computePersonalRanking(filteredItems, myVotesByItem);

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

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-black/[.08] p-1 dark:border-white/[.145]">
          <button
            type="button"
            onClick={() => setView("shared")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              view === "shared"
                ? "bg-foreground text-background"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            Ranking compartilhado
          </button>
          <button
            type="button"
            onClick={() => setView("personal")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              view === "personal"
                ? "bg-foreground text-background"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            Meu ranking
          </button>
        </div>

        {canManageItems && (
          <Link
            href={`/rooms/${roomId}/items/new`}
            className="flex h-9 shrink-0 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Adicionar item
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          placeholder="Filtrar por nome"
          className="h-9 flex-1 rounded-lg border border-black/[.08] bg-white px-3 text-sm dark:border-white/[.145] dark:bg-[#111]"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="h-9 rounded-lg border border-black/[.08] bg-white px-3 text-sm dark:border-white/[.145] dark:bg-[#111]"
        />
      </div>

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/[.12] py-16 text-center dark:border-white/[.15]">
            <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhum item ainda</p>
            <p className="max-w-xs text-sm text-zinc-500">
              {canManageItems
                ? "Clique em \"Adicionar item\" pra começar."
                : "O dono ou um admin ainda não adicionou itens."}
            </p>
          </div>
        )}

        {items.length > 0 && ranking.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            {view === "personal"
              ? "Você ainda não votou em nenhum item (com esse filtro)."
              : "Nenhum item encontrado com esse filtro."}
          </p>
        )}

        {ranking.map(({ item, average, voteCount }, index) => (
          <Link
            key={item.id}
            href={`/rooms/${roomId}/items/${item.id}`}
            className="flex items-center gap-3 rounded-xl border border-black/[.08] bg-white px-4 py-3 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-[#111] dark:hover:bg-[#1a1a1a]"
          >
            <span className="w-5 shrink-0 text-sm font-medium text-zinc-400">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-black dark:text-zinc-50">{item.title}</p>
              {item.eventDate && <p className="text-xs text-zinc-500">{item.eventDate}</p>}
            </div>
            <div className="shrink-0 text-right">
              {average != null ? (
                <>
                  <p className="font-medium text-black dark:text-zinc-50">
                    {formatAverage(average, room.ratingScale)}
                  </p>
                  {view === "shared" && (
                    <p className="text-xs text-zinc-500">
                      {voteCount} voto{voteCount === 1 ? "" : "s"}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-500">Sem votos</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
