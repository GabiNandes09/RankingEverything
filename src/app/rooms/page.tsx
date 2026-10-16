"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMyRooms } from "@/lib/rooms";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
};

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
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <Image
              src={user.photoURL}
              alt={user.displayName ?? "Foto de perfil"}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-medium text-black dark:text-zinc-50">{user.displayName}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOutUser()}
          className="h-9 rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Sair
        </button>
      </div>

      <div className="flex gap-3">
        <Link
          href="/rooms/new"
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Criar sala
        </Link>
        <Link
          href="/rooms/join"
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Entrar com código
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Minhas Salas</h2>

        {roomsLoading && (
          <p className="text-sm text-zinc-500">Carregando salas...</p>
        )}

        {roomsError && (
          <p className="text-sm break-words text-red-600">
            Erro ao carregar salas: {roomsError}
          </p>
        )}

        {!roomsLoading && !roomsError && rooms.length === 0 && (
          <p className="text-sm text-zinc-500">
            Você ainda não participa de nenhuma sala. Crie uma ou entre com um código.
          </p>
        )}

        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/rooms/${room.id}`}
            className="flex items-center justify-between rounded-xl border border-black/[.08] bg-white px-4 py-3 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-[#111] dark:hover:bg-[#1a1a1a]"
          >
            <div>
              <p className="font-medium text-black dark:text-zinc-50">{room.name}</p>
              <p className="text-sm text-zinc-500">{room.category}</p>
            </div>
            <span className="rounded-full bg-black/[.06] px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300">
              {ROLE_LABEL[room.role] ?? room.role}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
