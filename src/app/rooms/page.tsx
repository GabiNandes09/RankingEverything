"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function RoomsPage() {
  const { user, loading, signOutUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
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
          <p className="font-medium text-black dark:text-zinc-50">
            {user.displayName}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.email}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Minhas Salas
        </h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Em breve: lista de salas, criar sala e entrar com código.
        </p>
      </div>

      <button
        type="button"
        onClick={() => signOutUser()}
        className="h-10 rounded-full border border-black/[.08] px-5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Sair
      </button>
    </div>
  );
}
