import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentSnapshot,
  type QuerySnapshot,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { db, subscribeWithRetry } from "./firebase";

export type VoteStatus = "voted" | "abstained_no_participation" | "abstained_no_vote";

export interface RoomItem {
  id: string;
  title: string;
  imageUrl?: string;
  eventDate?: string; // ISO date (YYYY-MM-DD)
  addedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ItemVote {
  uid: string;
  status: VoteStatus;
  score: number | null;
  votedAt?: Timestamp;
  updatedAt?: Timestamp;
}

export async function addItem(
  roomId: string,
  user: User,
  input: { title: string; imageUrl?: string; eventDate?: string },
): Promise<string> {
  const itemRef = doc(collection(db, "rooms", roomId, "items"));
  await setDoc(itemRef, {
    title: input.title,
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    ...(input.eventDate ? { eventDate: input.eventDate } : {}),
    addedBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return itemRef.id;
}

export async function updateItem(
  roomId: string,
  itemId: string,
  input: { title: string; imageUrl?: string; eventDate?: string },
): Promise<void> {
  await updateDoc(doc(db, "rooms", roomId, "items", itemId), {
    title: input.title,
    imageUrl: input.imageUrl ?? null,
    eventDate: input.eventDate ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteItem(roomId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", roomId, "items", itemId));
}

export async function castVote(
  roomId: string,
  itemId: string,
  user: User,
  input: { status: VoteStatus; score: number | null },
): Promise<void> {
  const voteRef = doc(db, "rooms", roomId, "items", itemId, "votes", user.uid);
  await setDoc(
    voteRef,
    {
      uid: user.uid,
      status: input.status,
      score: input.status === "voted" ? input.score : null,
      updatedAt: serverTimestamp(),
      votedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function useItems(roomId: string | undefined) {
  const [items, setItems] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading when roomId changes
    setLoading(true);
    const unsubscribe = subscribeWithRetry<QuerySnapshot>(
      (onNext, onErr) => onSnapshot(collection(db, "rooms", roomId, "items"), onNext, onErr),
      (snapshot) => {
        setItems(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RoomItem, "id">) })),
        );
        setLoading(false);
      },
      () => {
        setItems([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  return { items: roomId ? items : [], loading: roomId ? loading : false };
}

export function useItemVotes(roomId: string | undefined, itemId: string | undefined) {
  const [votes, setVotes] = useState<ItemVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !itemId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading when roomId/itemId changes
    setLoading(true);
    const unsubscribe = subscribeWithRetry<QuerySnapshot>(
      (onNext, onErr) =>
        onSnapshot(collection(db, "rooms", roomId, "items", itemId, "votes"), onNext, onErr),
      (snapshot) => {
        setVotes(snapshot.docs.map((d) => d.data() as ItemVote));
        setLoading(false);
      },
      () => {
        setVotes([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId, itemId]);

  return { votes: roomId && itemId ? votes : [], loading: roomId && itemId ? loading : false };
}

export function useMyVote(
  roomId: string | undefined,
  itemId: string | undefined,
  uid: string | undefined,
) {
  const [vote, setVote] = useState<ItemVote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !itemId || !uid) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading when deps change
    setLoading(true);
    const unsubscribe = subscribeWithRetry<DocumentSnapshot>(
      (onNext, onErr) =>
        onSnapshot(doc(db, "rooms", roomId, "items", itemId, "votes", uid), onNext, onErr),
      (snapshot) => {
        setVote(snapshot.exists() ? (snapshot.data() as ItemVote) : null);
        setLoading(false);
      },
      () => {
        setVote(null);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId, itemId, uid]);

  return {
    vote: roomId && itemId && uid ? vote : null,
    loading: roomId && itemId && uid ? loading : false,
  };
}

// Subscribes to every item's votes subcollection individually (avoids a
// collectionGroup query across "votes", which has proven unreliable for
// this project — see the "Minhas Salas" fix). Fine for the small item
// counts a friend-group room realistically has.
export function useAllItemVotes(roomId: string | undefined, itemIds: string[]) {
  const [votesByItem, setVotesByItem] = useState<Record<string, ItemVote[]>>({});
  const unsubsRef = useRef<Record<string, () => void>>({});

  const key = itemIds.slice().sort().join(",");

  // Incrementally diffs subscriptions on every [roomId, key] change, without
  // tearing down the ones that are still needed (a plain useEffect cleanup
  // would fire on every change, defeating the diff below).
  useEffect(() => {
    if (!roomId) return;

    const currentIds = key ? key.split(",") : [];
    const unsubs = unsubsRef.current;

    for (const id of Object.keys(unsubs)) {
      if (!currentIds.includes(id)) {
        unsubs[id]();
        delete unsubs[id];
        setVotesByItem((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }

    for (const id of currentIds) {
      if (unsubs[id]) continue;
      unsubs[id] = onSnapshot(
        collection(db, "rooms", roomId, "items", id, "votes"),
        (snapshot) => {
          setVotesByItem((prev) => ({
            ...prev,
            [id]: snapshot.docs.map((d) => d.data() as ItemVote),
          }));
        },
      );
    }
  }, [roomId, key]);

  // Unmount-only cleanup.
  useEffect(() => {
    const unsubs = unsubsRef.current;
    return () => {
      for (const id of Object.keys(unsubs)) {
        unsubs[id]();
        delete unsubs[id];
      }
    };
  }, []);

  return votesByItem;
}

export interface ItemRanking {
  item: RoomItem;
  average: number | null;
  voteCount: number;
}

export function computeSharedRanking(
  items: RoomItem[],
  votesByItem: Record<string, ItemVote[]>,
): ItemRanking[] {
  return items
    .map((item) => {
      const votes = (votesByItem[item.id] ?? []).filter((v) => v.status === "voted" && v.score != null);
      const voteCount = votes.length;
      const average = voteCount > 0 ? votes.reduce((sum, v) => sum + (v.score ?? 0), 0) / voteCount : null;
      return { item, average, voteCount };
    })
    .sort((a, b) => {
      if (a.average == null && b.average == null) return a.item.title.localeCompare(b.item.title);
      if (a.average == null) return 1;
      if (b.average == null) return -1;
      if (b.average !== a.average) return b.average - a.average;
      return b.voteCount - a.voteCount;
    });
}

export function computePersonalRanking(
  items: RoomItem[],
  myVotesByItem: Record<string, ItemVote | undefined>,
): ItemRanking[] {
  return items
    .filter((item) => myVotesByItem[item.id]?.status === "voted")
    .map((item) => ({
      item,
      average: myVotesByItem[item.id]?.score ?? null,
      voteCount: 1,
    }))
    .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
}
