"use client";
import { useTransition } from "react";
import { deleteBlock } from "@/app/admin/(painel)/bloqueios/actions";
import { Button } from "@/components/ui/Button";

export function DeleteBlockButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="ghost" disabled={pending} onClick={() => start(async () => void (await deleteBlock(id)))}>
      Remover
    </Button>
  );
}
