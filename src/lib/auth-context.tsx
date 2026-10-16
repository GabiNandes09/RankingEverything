"use client";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentSnapshot,
} from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, db, subscribeWithRetry } from "./firebase";

export type GlobalRole = "master" | "user";

type AuthContextValue = {
  user: User | null;
  globalRole: GlobalRole | null;
  isMaster: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function upsertUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    await setDoc(userRef, {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
      globalRole: "user",
      createdAt: serverTimestamp(),
    });
    return;
  }

  await setDoc(
    userRef,
    {
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",
    },
    { merge: true },
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [globalRole, setGlobalRole] = useState<GlobalRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeWithRetry<DocumentSnapshot>(
      (onNext, onErr) => onSnapshot(doc(db, "users", user.uid), onNext, onErr),
      (snapshot) => {
        setGlobalRole((snapshot.data()?.globalRole as GlobalRole | undefined) ?? "user");
      },
      (err) => {
        console.error("globalRole snapshot error", err);
        setGlobalRole("user");
      },
    );

    return unsubscribe;
  }, [user]);

  const effectiveGlobalRole = user ? globalRole : null;

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await upsertUserProfile(result.user);
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        globalRole: effectiveGlobalRole,
        isMaster: effectiveGlobalRole === "master",
        loading,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
