import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
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

async function joinRoomCore(user: User, roomId: string): Promise<void> {
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
}

export async function joinRoomByCode(user: User, rawCode: string): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  const codeSnap = await getDoc(doc(db, "roomCodes", code));
  if (!codeSnap.exists()) {
    throw new Error("Código não encontrado.");
  }

  const roomId = codeSnap.data().roomId as string;
  await joinRoomCore(user, roomId);
  return roomId;
}

/** Auto-join flow for someone who opened a direct room link (not a code). */
export async function joinRoomById(user: User, roomId: string): Promise<void> {
  await joinRoomCore(user, roomId);
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

export function useRoom(roomId: string | undefined, enabled = true) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !enabled) return;

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
  }, [roomId, enabled]);

  return {
    room: roomId && enabled ? room : null,
    loading: roomId && enabled ? loading : false,
    error: roomId && enabled ? error : null,
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

async function syncMyRoomRole(roomId: string, uid: string, role: MemberRole): Promise<void> {
  // Best-effort: the denormalized "my rooms" index exists so simple listing
  // never needs a collectionGroup query (see CLAUDE.md). Keeping its role
  // field in sync is a display nicety, not a security boundary — the real
  // role always lives on rooms/{roomId}/members/{uid}.
  try {
    await setDoc(doc(db, "users", uid, "rooms", roomId), { role }, { merge: true });
  } catch {
    // ignore — the member doc under rooms/{roomId}/members/{uid} is the source of truth
  }
}

export async function setMemberRole(
  roomId: string,
  targetUid: string,
  role: "admin" | "member",
): Promise<void> {
  await setDoc(doc(db, "rooms", roomId, "members", targetUid), { role }, { merge: true });
  await syncMyRoomRole(roomId, targetUid, role);
}

export async function removeMember(roomId: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "members", targetUid));
  try {
    await deleteDoc(doc(db, "users", targetUid, "rooms", roomId));
  } catch {
    // best-effort cleanup of the removed member's own index entry
  }
}

export async function leaveRoom(roomId: string, user: User): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "members", user.uid));
  try {
    await deleteDoc(doc(db, "users", user.uid, "rooms", roomId));
  } catch {
    // best-effort
  }
}

export async function updateRoomName(roomId: string, name: string): Promise<void> {
  await updateDoc(doc(db, "rooms", roomId), { name, updatedAt: serverTimestamp() });

  // Best-effort: every member has their own denormalized copy of the room
  // name (users/{uid}/rooms/{roomId}) for the "Minhas Salas" list — keep
  // them in sync. The owner is allowed to write any member's entry (see
  // firestore.rules), but a stray failure here shouldn't block the rename.
  try {
    const membersSnap = await getDocs(collection(db, "rooms", roomId, "members"));
    await Promise.all(
      membersSnap.docs.map((memberDoc) =>
        setDoc(doc(db, "users", memberDoc.id, "rooms", roomId), { name }, { merge: true }).catch(
          () => {},
        ),
      ),
    );
  } catch {
    // ignore
  }
}

export async function deleteRoom(roomId: string): Promise<void> {
  await updateDoc(doc(db, "rooms", roomId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Best-effort: a deleted room should drop out of everyone's "Minhas
  // Salas" list immediately rather than waiting for them to notice.
  try {
    const membersSnap = await getDocs(collection(db, "rooms", roomId, "members"));
    await Promise.all(
      membersSnap.docs.map((memberDoc) =>
        deleteDoc(doc(db, "users", memberDoc.id, "rooms", roomId)).catch(() => {}),
      ),
    );
  } catch {
    // ignore
  }
}

// Live item/member counts for a room card in "Minhas Salas". Each visible
// room gets its own two small listeners (same reasoning as elsewhere in
// this file: direct subcollection reads instead of a collectionGroup
// query), which is fine for the handful of rooms a friend group has.
export function useRoomCounts(roomId: string) {
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    const unsubItems = onSnapshot(
      collection(db, "rooms", roomId, "items"),
      (snapshot) => setItemCount(snapshot.size),
      () => setItemCount(null),
    );
    const unsubMembers = onSnapshot(
      collection(db, "rooms", roomId, "members"),
      (snapshot) => setMemberCount(snapshot.size),
      () => setMemberCount(null),
    );
    return () => {
      unsubItems();
      unsubMembers();
    };
  }, [roomId]);

  return { itemCount, memberCount };
}
