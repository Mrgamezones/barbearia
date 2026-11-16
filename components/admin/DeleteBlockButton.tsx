"use client";
import { useTransition } from "react";
import { deleteBlock } from "@/app/painel/[slug]/bloqueios/actions";
import { Button } from "@/components/ui/Button";
import { usePanelSlug } from "./usePanelSlug";

export function DeleteBlockButton({ id }: { id: string }) {
  const slug = usePanelSlug();
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" disabled={pending} onClick={() => start(async () => void (await deleteBlock(slug, id)))}>
      Remover
    </Button>
  );
}
