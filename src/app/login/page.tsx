"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/rooms");
    }
  }, [loading, user, router]);

  async function handleSignIn() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      setError("Não foi possível entrar com o Google. Tente novamente.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Ranking Everything
        </h1>
        <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">
          Crie salas de ranking colaborativo com seus amigos.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSignIn}
        disabled={signingIn || loading}
        className="flex h-12 items-center justify-center gap-3 rounded-full bg-foreground px-6 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        <GoogleIcon />
        {signingIn ? "Entrando..." : "Entrar com Google"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.56-5.17 3.56-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.96-2.9l-3.88-3.02c-1.08.73-2.46 1.16-4.08 1.16-3.14 0-5.8-2.12-6.75-4.97H1.24v3.12C3.24 21.3 7.26 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.27a7.22 7.22 0 0 1 0-4.54V6.6H1.24a11.98 11.98 0 0 0 0 10.79l4.01-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.58 1.78l3.44-3.44C17.94 1.2 15.24 0 12 0 7.26 0 3.24 2.7 1.24 6.6l4.01 3.13C6.2 6.88 8.86 4.76 12 4.76Z"
      />
    </svg>
  );
}
