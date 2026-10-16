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
import { Avatar } from "@/components/ui/Avatar";
import { BackLink } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";

const STATUS_LABEL: Record<VoteStatus, string> = {
  voted: "Votou",
  abstained_no_participation: "Não participou",
  abstained_no_vote: "Não quis votar",
};

function toStars(score: number, ratingScale: string): number {
  return ratingScale === "0-5-stars" ? score : score / 2;
}

function fromStars(stars: number, ratingScale: string): number {
  return ratingScale === "0-5-stars" ? stars : stars * 2;
}

function formatScore(score: number, ratingScale: string): string {
  return ratingScale === "0-5-stars" ? `${score}/5` : `${score}/10`;
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const [members, setMembers] = useState<Record<string, RoomMember>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(collection(db, "rooms", roomId, "members"), (snapshot) => {
      const map: Record<string, RoomMember> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data() as RoomMember;
        map[data.uid] = data;
      });
      setMembers(map);
    });
    return unsubscribe;
  }, [roomId]);

  const loading = authLoading || roomLoading || memberLoading || itemsLoading || votesLoading;
  const canManage = member?.role === "owner" || member?.role === "admin" || isMaster;

  if (loading || !user || !room) {
    return null;
  }

  if (!item) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted">Item não encontrado.</p>
        <Link href={`/rooms/${roomId}`} className="text-sm font-medium text-gold hover:underline">
          Voltar pra sala
        </Link>
      </div>
    );
  }

  async function submitVote(status: VoteStatus, score: number | null) {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await castVote(roomId, itemId, user, { status, score });
      if (status === "voted") {
        setJustVoted(true);
        setTimeout(() => setJustVoted(false), 1200);
      }
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

  const myStars = myVote?.status === "voted" && myVote.score != null
    ? toStars(myVote.score, room.ratingScale)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <BackLink href={`/rooms/${roomId}`}>Voltar pra sala</BackLink>

      {item.imageUrl && (
        <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-background-elevated-2 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <Image src={item.imageUrl} alt={item.title} fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-marquee text-3xl leading-none text-foreground">{item.title}</h1>
          {item.eventDate && <p className="mt-1 text-sm text-muted">{item.eventDate}</p>}
          <div className="mt-2 flex items-center gap-2">
            {average != null ? (
              <>
                <StarRating value={toStars(average, room.ratingScale)} readOnly size="sm" />
                <span className="text-sm text-muted">
                  {formatScore(Number(average.toFixed(1)), room.ratingScale)} ·{" "}
                  {votedVotes.length} voto{votedVotes.length === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <p className="text-sm text-muted">Sem votos ainda</p>
            )}
          </div>
        </div>

        {canManage && (
          <Button variant="danger" size="sm" onClick={handleDelete} className="shrink-0">
            Excluir
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background-elevated p-6">
        <p className="text-sm font-medium text-muted">
          {justVoted ? "Voto registrado! 🎉" : "Toque ou arraste pra dar sua nota"}
        </p>

        <StarRating
          value={myStars}
          onChange={(stars) =>
            submitVote("voted", fromStars(stars, room.ratingScale))
          }
          size="xl"
        />

        {myVote?.status === "voted" && myVote.score != null && (
          <p className="font-marquee text-2xl text-gold-gradient">
            {formatScore(myVote.score, room.ratingScale)}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitVote("abstained_no_participation", null)}
            className={`h-9 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
              myVote?.status === "abstained_no_participation"
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            🙈 Não participei
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitVote("abstained_no_vote", null)}
            className={`h-9 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
              myVote?.status === "abstained_no_vote"
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            🤐 Não quero votar
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">Votos de todos os membros</p>
        {votes.length === 0 && <p className="text-sm text-muted">Ninguém votou ainda.</p>}
        {votes.map((v) => {
          const voter = members[v.uid];
          return (
            <div
              key={v.uid}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background-elevated px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar
                  src={voter?.uid === user.uid ? user.photoURL : undefined}
                  alt={voter?.displayName ?? v.uid}
                  size={28}
                  role={voter?.role}
                />
                <span className="truncate text-sm text-foreground">
                  {v.uid === user.uid ? "Você" : (voter?.displayName ?? v.uid)}
                </span>
              </div>
              {v.status === "voted" && v.score != null ? (
                <StarRating value={toStars(v.score, room.ratingScale)} readOnly size="sm" />
              ) : (
                <span className="shrink-0 text-xs text-muted">{STATUS_LABEL[v.status]}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
