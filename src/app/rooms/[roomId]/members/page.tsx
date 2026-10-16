"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useRoomMembership, type MemberRole, type RoomMember } from "@/lib/rooms";

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Dono",
  admin: "Admin",
  member: "Membro",
};

export default function RoomMembersPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { member: myMembership } = useRoomMembership(roomId, user?.uid);

  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!roomId) return;
    const membersQuery = query(
      collection(db, "rooms", roomId, "members"),
      orderBy("joinedAt", "asc"),
    );
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      setMembers(snapshot.docs.map((d) => d.data() as RoomMember));
      setLoading(false);
    });
    return unsubscribe;
  }, [roomId]);

  if (authLoading || !user) {
    return null;
  }

  const isOwner = myMembership?.role === "owner";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href={`/rooms/${roomId}`} className="text-sm text-zinc-500 hover:underline">
        ← Voltar pra sala
      </Link>

      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Membros da Sala</h1>

      {loading && <p className="text-sm text-zinc-500">Carregando membros...</p>}

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div
            key={m.uid}
            className="flex items-center justify-between rounded-lg border border-black/[.08] bg-white px-4 py-3 dark:border-white/[.145] dark:bg-[#111]"
          >
            <span className="text-sm text-black dark:text-zinc-50">{m.displayName}</span>
            <span className="rounded-full bg-black/[.06] px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-white/[.08] dark:text-zinc-300">
              {ROLE_LABEL[m.role]}
            </span>
          </div>
        ))}
      </div>

      {!isOwner && (
        <p className="text-xs text-zinc-500">
          Promover/remover membros e sair da sala ainda não estão disponíveis nesta tela.
        </p>
      )}
    </div>
  );
}
