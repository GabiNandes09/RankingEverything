import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, type FirestoreError, type Unsubscribe } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

// Right after sign-in (or a page reload that restores a persisted session),
// there's a brief race where onSnapshot can fire a spurious
// "permission-denied" before Firebase Auth's token is fully attached to the
// Firestore client. onSnapshot does NOT retry on its own once it errors, so
// this retries a couple of times with a short delay before surfacing the
// error for real.
export function subscribeWithRetry<TSnapshot>(
  subscribe: (
    onNext: (snapshot: TSnapshot) => void,
    onError: (error: FirestoreError) => void,
  ) => Unsubscribe,
  onNext: (snapshot: TSnapshot) => void,
  onFinalError: (error: FirestoreError) => void,
  retriesLeft = 2,
): Unsubscribe {
  let unsubscribe: Unsubscribe = () => {};
  let cancelled = false;

  function attempt(remaining: number) {
    unsubscribe = subscribe(onNext, (error) => {
      if (cancelled) return;
      if (error.code === "permission-denied" && remaining > 0) {
        setTimeout(() => {
          if (!cancelled) attempt(remaining - 1);
        }, 400);
      } else {
        onFinalError(error);
      }
    });
  }

  attempt(retriesLeft);

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
