"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, type QuerySnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db, subscribeWithRetry } from "@/lib/firebase";
import {
  leaveRoom,
  removeMember,
  setMemberRole,
  useRoomMembership,
  type RoomMember,
} from "@/lib/rooms";
import { Avatar } from "@/components/ui/Avatar";
import { BackLink, PageTitle } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/RoleBadge";

export default function RoomMembersPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading: authLoading, isMaster } = useAuth();
  const router = useRouter();
  const { member: myMembership } = useRoomMembership(roomId, user?.uid);

  const [members, setMembers] = useState<RoomMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const unsubscribe = subscribeWithRetry<QuerySnapshot>(
      (onNext, onErr) => onSnapshot(membersQuery, onNext, onErr),
      (snapshot) => {
        setMembers(snapshot.docs.map((d) => d.data() as RoomMember));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [roomId]);

  if (authLoading || !user) {
    return null;
  }

  const isOwner = myMembership?.role === "owner" || isMaster;

  async function handleRoleChange(targetUid: string, role: "admin" | "member") {
    setBusyUid(targetUid);
    setError(null);
    try {
      await setMemberRole(roomId, targetUid, role);
    } catch {
      setError("Não foi possível alterar o papel desse membro.");
    } finally {
      setBusyUid(null);
    }
  }

  async function handleRemove(targetUid: string) {
    if (!confirm("Remover esse membro da sala?")) return;
    setBusyUid(targetUid);
    setError(null);
    try {
      await removeMember(roomId, targetUid);
    } catch {
      setError("Não foi possível remover esse membro.");
    } finally {
      setBusyUid(null);
    }
  }

  async function handleLeave() {
    if (!user) return;
    if (!confirm("Sair dessa sala?")) return;
    setBusyUid(user.uid);
    setError(null);
    try {
      await leaveRoom(roomId, user);
      router.push("/rooms");
    } catch {
      setError("Não foi possível sair da sala.");
      setBusyUid(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <BackLink href={`/rooms/${roomId}`}>Voltar pra sala</BackLink>
      <PageTitle>👥 Membros da Sala</PageTitle>

      {loading && <p className="text-sm text-muted">Carregando membros...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {members.map((m) => {
          const isMe = m.uid === user.uid;
          const busy = busyUid === m.uid;

          return (
            <div
              key={m.uid}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background-elevated px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={isMe ? user.photoURL : undefined}
                  alt={m.displayName}
                  size={32}
                  role={m.role}
                />
                <span className="text-sm text-foreground">
                  {m.displayName}
                  {isMe && <span className="text-muted"> (você)</span>}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <RoleBadge role={m.role} />

                {isOwner && m.role !== "owner" && (
                  <>
                    {m.role === "member" ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleRoleChange(m.uid, "admin")}
                      >
                        Promover
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleRoleChange(m.uid, "member")}
                      >
                        Rebaixar
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => handleRemove(m.uid)}
                    >
                      Remover
                    </Button>
                  </>
                )}

                {isMe && m.role !== "owner" && (
                  <Button variant="danger" size="sm" disabled={busy} onClick={handleLeave}>
                    Sair da sala
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {myMembership?.role === "owner" && (
        <p className="text-xs text-muted">
          Como dono, você não pode sair da sala — apenas excluí-la (ainda não disponível nesta
          tela).
        </p>
      )}
    </div>
  );
}
