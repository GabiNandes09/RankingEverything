"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { joinRoomByCode } from "@/lib/rooms";
import { BackLink, PageTitle } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PageLoading } from "@/components/ui/Spinner";

export default function JoinRoomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);
    try {
      const roomId = await joinRoomByCode(user, code);
      router.push(`/rooms/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar na sala.");
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return <PageLoading />;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <BackLink href="/rooms">Minhas Salas</BackLink>
      <PageTitle subtitle="Cola o código de 6 caracteres que te mandaram.">
        🎟️ Entrar com código
      </PageTitle>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Código da sala">
          <Input
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AB12CD"
            maxLength={6}
            className="text-center text-lg font-semibold tracking-[0.3em] uppercase"
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
