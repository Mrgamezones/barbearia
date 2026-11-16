"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking } from "@/app/barbearia/[slug]/agendamento/[token]/actions";
import { Button } from "@/components/ui/Button";

const MESSAGES = {
  not_found: "Agendamento não encontrado.",
  not_cancellable: "Este agendamento não pode mais ser cancelado.",
  too_late: "Faltam menos de 2 horas: fale com a barbearia pelo WhatsApp.",
  unknown: "Não foi possível cancelar agora. Tente novamente.",
} as const;

export function CancelBookingButton({ shopSlug, token }: { shopSlug: string; token: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setConfirming(true)}>
        Cancelar agendamento
      </Button>
    );
  }

  return (
    <div role="group" aria-label="Confirmar cancelamento" className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <p className="text-sm">Tem certeza? O horário ficará livre para outra pessoa.</p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelBooking(shopSlug, token);
              if (r.ok) router.refresh();
              else setError(MESSAGES[r.error]);
            })
          }
        >
          {pending ? "Cancelando…" : "Sim, cancelar"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Manter agendamento
        </Button>
      </div>
    </div>
  );
}
