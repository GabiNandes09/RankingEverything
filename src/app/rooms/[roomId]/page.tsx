"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  computePersonalRanking,
  computeSharedRanking,
  useAllItemVotes,
  useItems,
} from "@/lib/items";
import { deleteRoom, updateRoomName, useRoom, useRoomMembership } from "@/lib/rooms";
import { BackLink } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RankBadge } from "@/components/ui/RankBadge";
import { StarRating } from "@/components/ui/StarRating";

const SCALE_LABEL: Record<string, string> = {
  "0-10": "0 a 10",
  "0-5-stars": "0 a 5 estrelas",
};

function toStars(average: number, ratingScale: string): number {
  return ratingScale === "0-5-stars" ? average : average / 2;
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
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

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
        <p className="text-muted">{error ?? "Sala não encontrada."}</p>
        <Link href="/rooms" className="text-sm font-medium text-gold hover:underline">
          Voltar pra Minhas Salas
        </Link>
      </div>
    );
  }

  if (room.deletedAt) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-4xl" aria-hidden>
          🗑️
        </span>
        <p className="text-muted">A sala &quot;{room.name}&quot; foi excluída.</p>
        <Link href="/rooms" className="text-sm font-medium text-gold hover:underline">
          Voltar pra Minhas Salas
        </Link>
      </div>
    );
  }

  const canManageItems = member?.role === "owner" || member?.role === "admin" || isMaster;
  const canRenameRoom = canManageItems;
  const canDeleteRoom = member?.role === "owner" || isMaster;
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

  function startEditingName() {
    setNameDraft(room?.name ?? "");
    setNameError(null);
    setEditingName(true);
  }

  async function saveRoomName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError("O nome não pode ficar vazio.");
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateRoomName(roomId, trimmed);
      setEditingName(false);
    } catch {
      setNameError("Não foi possível salvar o nome.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleDeleteRoom() {
    if (!confirm(`Excluir a sala "${room?.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteRoom(roomId);
      router.push("/rooms");
    } catch {
      setNameError("Não foi possível excluir a sala.");
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
        <BackLink href="/rooms">Minhas Salas</BackLink>
        <Link
          href={`/rooms/${room.id}/members`}
          className="text-sm text-muted transition-colors hover:text-gold"
        >
          👥 Membros
        </Link>
      </div>

      <div>
        {editingName ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                autoFocus
                maxLength={80}
                className="font-marquee text-2xl"
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveRoomName();
                  if (event.key === "Escape") setEditingName(false);
                }}
              />
              <Button size="sm" disabled={savingName} onClick={saveRoomName}>
                {savingName ? "..." : "Salvar"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={savingName}
                onClick={() => setEditingName(false)}
              >
                Cancelar
              </Button>
            </div>
            {nameError && <p className="text-sm text-danger">{nameError}</p>}
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-marquee text-3xl leading-none text-gold-gradient sm:text-4xl">
              {room.name}
            </h1>

            {(canRenameRoom || canDeleteRoom) && (
              <div className="flex shrink-0 gap-2">
                {canRenameRoom && (
                  <Button variant="secondary" size="sm" onClick={startEditingName}>
                    Editar
                  </Button>
                )}
                {canDeleteRoom && (
                  <Button variant="danger" size="sm" onClick={handleDeleteRoom}>
                    Excluir
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        {nameError && !editingName && <p className="mt-1 text-sm text-danger">{nameError}</p>}
        <p className="text-sm text-muted">
          {room.category} · Escala {SCALE_LABEL[room.ratingScale] ?? room.ratingScale}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-background-elevated px-3.5 py-2.5 text-sm">
        <span className="text-muted">Código:</span>
        <span className="font-mono text-base font-semibold tracking-[0.3em] text-gold">
          {room.code}
        </span>
        <button
          type="button"
          onClick={copyInvite}
          className="ml-auto text-xs font-medium text-muted transition-colors hover:text-gold"
        >
          {copied ? "Copiado! ✓" : "Copiar link"}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-background-elevated p-1">
          <ToggleButton active={view === "shared"} onClick={() => setView("shared")}>
            🏆 Compartilhado
          </ToggleButton>
          <ToggleButton active={view === "personal"} onClick={() => setView("personal")}>
            ⭐ Meu ranking
          </ToggleButton>
        </div>

        {canManageItems && (
          <Button href={`/rooms/${roomId}/items/new`} size="sm" icon={<span aria-hidden>+</span>}>
            Adicionar item
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          placeholder="🔍 Filtrar por nome"
          className="h-9 flex-1 text-sm"
        />
        <Input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="h-9 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {items.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
            <span className="text-4xl" aria-hidden>
              🎞️
            </span>
            <p className="font-medium text-foreground">Nenhum item ainda</p>
            <p className="max-w-xs text-sm text-muted">
              {canManageItems
                ? 'Clique em "Adicionar item" pra começar.'
                : "O dono ou um admin ainda não adicionou itens."}
            </p>
          </div>
        )}

        {items.length > 0 && ranking.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            {view === "personal"
              ? "Você ainda não votou em nenhum item (com esse filtro)."
              : "Nenhum item encontrado com esse filtro."}
          </p>
        )}

        {ranking.map(({ item, average, voteCount }, index) => (
          <Link
            key={item.id}
            href={`/rooms/${roomId}/items/${item.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-background-elevated p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-gold/30"
          >
            <RankBadge position={index + 1} />

            <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-background-elevated-2">
              {item.imageUrl && (
                <Image
                  src={item.imageUrl}
                  alt=""
                  width={40}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{item.title}</p>
              {item.eventDate && <p className="text-xs text-muted">{item.eventDate}</p>}
            </div>

            <div className="shrink-0 text-right">
              {average != null ? (
                <>
                  <StarRating
                    value={toStars(average, room.ratingScale)}
                    readOnly
                    size="sm"
                  />
                  {view === "shared" && (
                    <p className="mt-0.5 text-xs text-muted">
                      {voteCount} voto{voteCount === 1 ? "" : "s"}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted">Sem votos</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gradient-to-br from-[#ffe08a] to-gold-strong text-accent-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
