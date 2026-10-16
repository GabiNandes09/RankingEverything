"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { createRoom, type RatingScale } from "@/lib/rooms";
import { BackLink, PageTitle } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export default function NewRoomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Filmes");
  const [ratingScale, setRatingScale] = useState<RatingScale>("0-10");
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
      const roomId = await createRoom(user, {
        name: name.trim(),
        category: category.trim(),
        ratingScale,
      });
      router.push(`/rooms/${roomId}`);
    } catch {
      setError("Não foi possível criar a sala. Tente novamente.");
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-12">
      <BackLink href="/rooms">Minhas Salas</BackLink>
      <PageTitle subtitle="Toda sessão de pipoca merece um ranking.">
        🏆 Criar Sala
      </PageTitle>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nome da sala">
          <Input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Clube do Cinema"
          />
        </Field>

        <Field label="Categoria">
          <Input
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Filmes"
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm text-muted">Escala de nota</legend>
          <ScaleOption
            checked={ratingScale === "0-10"}
            onSelect={() => setRatingScale("0-10")}
            icon="🔟"
            label="0 a 10"
            description="Com decimais"
          />
          <ScaleOption
            checked={ratingScale === "0-5-stars"}
            onSelect={() => setRatingScale("0-5-stars")}
            icon="⭐"
            label="0 a 5 estrelas"
            description="Meia estrela"
          />
        </fieldset>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Criando..." : "Criar sala"}
        </Button>
      </form>
    </div>
  );
}

function ScaleOption({
  checked,
  onSelect,
  icon,
  label,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: string;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
        checked
          ? "border-gold/50 bg-gold/10"
          : "border-border bg-background-elevated-2 hover:border-foreground/20"
      }`}
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <span
        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
          checked ? "border-gold bg-gold" : "border-border"
        }`}
      />
    </button>
  );
}
