import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentSnapshot,
  type QuerySnapshot,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, subscribeWithRetry } from "./firebase";

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
  const myRoomRef = doc(db, "users", user.uid, "rooms", roomRef.id);

  await Promise.all([
    setDoc(memberRef, {
      uid: user.uid,
      role: "owner" satisfies MemberRole,
      displayName: user.displayName ?? "",
      joinedAt: serverTimestamp(),
    }),
    setDoc(roomCodeRef, { roomId: roomRef.id }),
    setDoc(myRoomRef, {
      name: input.name,
      category: input.category,
      ratingScale: input.ratingScale,
      code,
      ownerId: user.uid,
      role: "owner" satisfies MemberRole,
    }),
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
  let role: MemberRole = "member";

  if (existingMember.exists()) {
    role = (existingMember.data().role as MemberRole) ?? "member";
  } else {
    try {
      await setDoc(memberRef, {
        uid: user.uid,
        role,
        displayName: user.displayName ?? "",
        joinedAt: serverTimestamp(),
      });
    } catch {
      throw new Error("Não foi possível entrar nessa sala. Ela pode ter sido excluída.");
    }
  }

  const roomSnap = await getDoc(doc(db, "rooms", roomId));
  if (roomSnap.exists()) {
    const data = roomSnap.data() as Omit<Room, "id">;
    await setDoc(doc(db, "users", user.uid, "rooms", roomId), {
      name: data.name,
      category: data.category,
      ratingScale: data.ratingScale,
      code: data.code,
      ownerId: data.ownerId,
      role,
    });
  }

  return roomId;
}

// Denormalized copy of each room the user belongs to, kept at
// users/{uid}/rooms/{roomId} so listing "my rooms" is a plain read of the
// user's own subtree — no collectionGroup query (and its index/rules
// complexity) needed.
export interface MyRoom {
  id: string;
  name: string;
  category: string;
  ratingScale: RatingScale;
  code: string;
  ownerId: string;
  role: MemberRole;
}

export function useMyRooms(uid: string | undefined) {
  const [rooms, setRooms] = useState<MyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading when the subscribed uid changes
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeWithRetry<QuerySnapshot>(
      (onNext, onErr) => onSnapshot(collection(db, "users", uid, "rooms"), onNext, onErr),
      (snapshot) => {
        setRooms(
          snapshot.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<MyRoom, "id">) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("useMyRooms snapshot error", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  return {
    rooms: uid ? rooms : [],
    loading: uid ? loading : false,
    error: uid ? error : null,
  };
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

    const unsubscribe = subscribeWithRetry<DocumentSnapshot>(
      (onNext, onErr) => onSnapshot(doc(db, "rooms", roomId), onNext, onErr),
      (snapshot) => {
        if (!snapshot.exists()) {
          setRoom(null);
          setError("Sala não encontrada.");
        } else {
          setRoom({ id: snapshot.id, ...(snapshot.data() as Omit<Room, "id">) });
          setError(null);
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
    const unsubscribe = subscribeWithRetry<DocumentSnapshot>(
      (onNext, onErr) => onSnapshot(doc(db, "rooms", roomId, "members", uid), onNext, onErr),
      (snapshot) => {
        setMember(snapshot.exists() ? (snapshot.data() as RoomMember) : null);
        setLoading(false);
      },
      () => {
        setMember(null);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId, uid]);

  return {
    member: roomId && uid ? member : null,
    loading: roomId && uid ? loading : false,
  };
}
