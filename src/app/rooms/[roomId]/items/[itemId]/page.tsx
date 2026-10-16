"use client";

import Image from "next/image";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  castVote,
  deleteItem,
  useItemVotes,
  useItems,
  useMyVote,
  type VoteStatus,
} from "@/lib/items";
import { useRoom, useRoomMembership, type RoomMember } from "@/lib/rooms";

const STATUS_LABEL: Record<VoteStatus, string> = {
  voted: "Votou",
  abstained_no_participation: "Não participou",
  abstained_no_vote: "Não quis votar",
};

function scoreOptions(ratingScale: string): number[] {
  if (ratingScale === "0-5-stars") {
    const options: number[] = [];
    for (let i = 0; i <= 10; i++) options.push(i / 2);
    return options;
  }
  const options: number[] = [];
  for (let i = 0; i <= 20; i++) options.push(i / 2);
  return options;
}

function formatScore(score: number, ratingScale: string): string {
  if (ratingScale === "0-5-stars") {
    const full = Math.floor(score);
    const half = score - full === 0.5;
    return "★".repeat(full) + (half ? "½" : "") + ` (${score})`;
  }
  return score.toString();
}

export default function ItemPage() {
  const { roomId, itemId } = useParams<{ roomId: string; itemId: string }>();
  const { user, loading: authLoading, isMaster } = useAuth();
  const router = useRouter();

  const { room, loading: roomLoading } = useRoom(roomId);
  const { member, loading: memberLoading } = useRoomMembership(roomId, user?.uid);
  const { items, loading: itemsLoading } = useItems(roomId);
  const { votes, loading: votesLoading } = useItemVotes(roomId, itemId);
  const { vote: myVote } = useMyVote(roomId, itemId, user?.uid);

  const item = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);

  const [score, setScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(collection(db, "rooms", roomId, "members"), (snapshot) => {
      const names: Record<string, string> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data() as RoomMember;
        names[data.uid] = data.displayName;
      });
      setMemberNames(names);
    });
    return unsubscribe;
  }, [roomId]);

  useEffect(() => {
    if (myVote?.status === "voted" && myVote.score != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the score picker from the user's existing vote
      setScore(myVote.score);
    }
  }, [myVote]);

  const loading = authLoading || roomLoading || memberLoading || itemsLoading || votesLoading;
  const canManage = member?.role === "owner" || member?.role === "admin" || isMaster;

  if (loading || !user || !room) {
    return null;
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Item não encontrado.</p>
        <Link href={`/rooms/${roomId}`} className="text-sm font-medium underline">
          Voltar pra sala
        </Link>
      </div>
    );
  }

  async function submitVote(status: VoteStatus) {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await castVote(roomId, itemId, user, {
        status,
        score: status === "voted" ? score : null,
      });
    } catch {
      setError("Não foi possível registrar seu voto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Excluir este item? Essa ação não pode ser desfeita.")) return;
    try {
      await deleteItem(roomId, itemId);
      router.push(`/rooms/${roomId}`);
    } catch {
      setError("Não foi possível excluir o item.");
    }
  }

  const votedVotes = votes.filter((v) => v.status === "voted" && v.score != null);
  const average =
    votedVotes.length > 0
      ? votedVotes.reduce((sum, v) => sum + (v.score ?? 0), 0) / votedVotes.length
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/rooms/${roomId}`} className="text-sm text-zinc-500 hover:underline">
        ← Voltar pra sala
      </Link>

      {item.imageUrl && (
        <div className="relative h-56 w-full overflow-hidden rounded-xl bg-black/[.04] dark:bg-white/[.06]">
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">{item.title}</h1>
          {item.eventDate && <p className="text-sm text-zinc-500">{item.eventDate}</p>}
          <p className="text-sm text-zinc-500">
            {average != null
              ? `Média: ${formatScore(average, room.ratingScale)} (${votedVotes.length} voto${votedVotes.length === 1 ? "" : "s"})`
              : "Sem votos ainda"}
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleDelete}
            className="h-9 shrink-0 rounded-full border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            Excluir
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-[#111]">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Seu voto</p>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={score}
            onChange={(event) => setScore(Number(event.target.value))}
            className="h-10 rounded-lg border border-black/[.08] bg-white px-3 text-sm dark:border-white/[.145] dark:bg-[#111]"
          >
            {scoreOptions(room.ratingScale).map((opt) => (
              <option key={opt} value={opt}>
                {formatScore(opt, room.ratingScale)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitVote("voted")}
            className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
          >
            Votar
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitVote("abstained_no_participation")}
            className="h-9 rounded-full border border-black/[.08] px-3 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Não participei
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitVote("abstained_no_vote")}
            className="h-9 rounded-full border border-black/[.08] px-3 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Não quero votar
          </button>
        </div>

        {myVote && (
          <p className="text-xs text-zinc-500">
            Seu status atual: {STATUS_LABEL[myVote.status]}
            {myVote.status === "voted" && myVote.score != null
              ? ` — ${formatScore(myVote.score, room.ratingScale)}`
              : ""}
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Votos de todos os membros
        </p>
        {votes.length === 0 && (
          <p className="text-sm text-zinc-500">Ninguém votou ainda.</p>
        )}
        {votes.map((v) => (
          <div
            key={v.uid}
            className="flex items-center justify-between rounded-lg border border-black/[.08] bg-white px-4 py-2 text-sm dark:border-white/[.145] dark:bg-[#111]"
          >
            <span className="text-zinc-500">
              {v.uid === user.uid ? "Você" : (memberNames[v.uid] ?? v.uid)}
            </span>
            <span className="font-medium text-black dark:text-zinc-50">
              {v.status === "voted" && v.score != null
                ? formatScore(v.score, room.ratingScale)
                : STATUS_LABEL[v.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
