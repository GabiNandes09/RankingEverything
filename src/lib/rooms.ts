import type { User } from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";

export type RatingScale = "0-10" | "0-5-stars";
export type MemberRole = "owner" | "admin" | "member";

export interface Room {
  id: string;
  name: string;
  category: string;
  ratingScale: RatingScale;
  code: string;
  ownerId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp | null;
}

export interface RoomMember {
  uid: string;
  role: MemberRole;
  displayName: string;
  joinedAt?: Timestamp;
}

// Avoids visually ambiguous characters (0/O, 1/I, etc).
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await getDoc(doc(db, "roomCodes", code));
    if (!existing.exists()) return code;
  }
  throw new Error("Não foi possível gerar um código único. Tente novamente.");
}

export async function createRoom(
  user: User,
  input: { name: string; category: string; ratingScale: RatingScale },
): Promise<string> {
  const code = await generateUniqueRoomCode();
  const roomRef = doc(collection(db, "rooms"));

  // The room doc is created first and awaited so the follow-up writes
  // (which check its data via security rules) see it as committed.
  await setDoc(roomRef, {
    name: input.name,
    category: input.category,
    ratingScale: input.ratingScale,
    code,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });

  const memberRef = doc(db, "rooms", roomRef.id, "members", user.uid);
  const roomCodeRef = doc(db, "roomCodes", code);

  await Promise.all([
    setDoc(memberRef, {
      uid: user.uid,
      role: "owner" satisfies MemberRole,
      displayName: user.displayName ?? "",
      joinedAt: serverTimestamp(),
    }),
    setDoc(roomCodeRef, { roomId: roomRef.id }),
  ]);

  return roomRef.id;
}

export async function joinRoomByCode(user: User, rawCode: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const codeSnap = await getDoc(doc(db, "roomCodes", code));
  if (!codeSnap.exists()) {
    throw new Error("Código não encontrado.");
  }

  const roomId = codeSnap.data().roomId as string;
  const memberRef = doc(db, "rooms", roomId, "members", user.uid);
  const existingMember = await getDoc(memberRef);

  if (existingMember.exists()) {
    return roomId;
  }

  try {
    await setDoc(memberRef, {
      uid: user.uid,
      role: "member" satisfies MemberRole,
      displayName: user.displayName ?? "",
      joinedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("Não foi possível entrar nessa sala. Ela pode ter sido excluída.");
  }

  return roomId;
}

export interface MyRoom extends Room {
  role: MemberRole;
}

export function useMyRooms(uid: string | undefined) {
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading when the subscribed uid changes
    setLoading(true);
    const membershipsQuery = query(collectionGroup(db, "members"), where("uid", "==", uid));

    const unsubscribe = onSnapshot(membershipsQuery, async (snapshot) => {
      const results = await Promise.all(
        snapshot.docs.map(async (memberSnap) => {
          const roomRef = memberSnap.ref.parent.parent;
          if (!roomRef) return null;

          const roomSnap = await getDoc(roomRef);
          if (!roomSnap.exists()) return null;

          const data = roomSnap.data() as Omit<Room, "id">;
          if (data.deletedAt) return null;

          return {
            id: roomSnap.id,
            ...data,
            role: (memberSnap.data().role as MemberRole) ?? "member",
          } satisfies MyRoom;
        }),
      );

      setRooms(
        results
          .filter((room): room is MyRoom => room !== null)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setLoading(false);
    });

    return unsubscribe;
  }, [uid]);

  return { rooms: uid ? rooms : [], loading: uid ? loading : false };
}

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading/error when roomId changes
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(db, "rooms", roomId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setRoom(null);
          setError("Sala não encontrada.");
        } else {
          setRoom({ id: snapshot.id, ...(snapshot.data() as Omit<Room, "id">) });
        }
        setLoading(false);
      },
      () => {
        setRoom(null);
        setError("Você não tem acesso a essa sala.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  return {
    room: roomId ? room : null,
    loading: roomId ? loading : false,
    error: roomId ? error : null,
  };
}

export function useRoomMembership(roomId: string | undefined, uid: string | undefined) {
  const [member, setMember] = useState<RoomMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !uid) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading when roomId/uid changes
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, "rooms", roomId, "members", uid), (snapshot) => {
      setMember(snapshot.exists() ? (snapshot.data() as RoomMember) : null);
      setLoading(false);
    });

    return unsubscribe;
  }, [roomId, uid]);

  return {
    member: roomId && uid ? member : null,
    loading: roomId && uid ? loading : false,
  };
}
