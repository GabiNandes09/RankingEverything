"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";

export interface ItemFormValues {
  title: string;
  imageUrl?: string;
  eventDate?: string;
}

export function ItemForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
}: {
  initialValues?: ItemFormValues;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: ItemFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.imageUrl ?? "");
  const [eventDate, setEventDate] = useState(initialValues?.eventDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        imageUrl: imageUrl.trim() || undefined,
        eventDate: eventDate || undefined,
      });
    } catch {
      setError("Não foi possível salvar o item. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Título">
        <Input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nome do filme"
        />
      </Field>

      <Field label="Imagem (URL, opcional)">
        <Input
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://..."
        />
      </Field>

      <Field label="Data do evento (opcional)">
        <Input
          type="date"
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
