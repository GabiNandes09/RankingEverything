"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMyRooms, useRoomCounts, type MemberRole, type MyRoom } from "@/lib/rooms";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { PageLoading } from "@/components/ui/Spinner";

export default function RoomsPage() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();
  const { rooms, loading: roomsLoading, error: roomsError } = useMyRooms(user?.uid);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={user.photoURL} alt={user.displayName ?? "Foto de perfil"} />
          <div>
            <p className="font-medium text-foreground">{user.displayName}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={() => signOutUser()}>
          Sair
        </Button>
      </div>

      <div className="flex gap-3">
        <Button href="/rooms/new" className="flex-1" icon={<span aria-hidden>🏆</span>}>
          Criar sala
        </Button>
        <Button
          href="/rooms/join"
          variant="secondary"
          className="flex-1"
          icon={<span aria-hidden>🎟️</span>}
        >
          Entrar com código
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-marquee text-xl tracking-wide text-muted">Minhas Salas</h2>

        {roomsLoading && <p className="text-sm text-muted">Carregando salas...</p>}

        {roomsError && (
          <p className="text-sm break-words text-danger">
            Erro ao carregar salas: {roomsError}
          </p>
        )}

        {!roomsLoading && !roomsError && rooms.length === 0 && (
          <EmptyState
            icon="🍿"
            title="Nenhuma sala ainda"
            description="Crie uma sala ou entre com um código pra começar a rankear."
          />
        )}

        {rooms.map((room) => (
          <RoomListItem key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}

function RoomListItem({ room }: { room: MyRoom }) {
  const { itemCount, memberCount } = useRoomCounts(room.id);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background-elevated p-4 shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-150 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{room.name}</p>
        <p className="text-sm text-muted">{room.category}</p>
        <p className="mt-1 text-xs text-muted">
          🎞️ {itemCount ?? "…"} {itemCount === 1 ? "item" : "itens"} · 👥{" "}
          {memberCount ?? "…"} {memberCount === 1 ? "participante" : "participantes"}
        </p>
      </div>
      <RoleBadge role={room.role as MemberRole} />
    </Link>
  );
}
