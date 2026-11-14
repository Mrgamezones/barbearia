"use client";
import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusScreen } from "@/components/site/StatusScreen";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusScreen
      icon={TriangleAlert}
      eyebrow="Algo deu errado"
      title="Não foi possível carregar"
      actions={
        <>
          <Button onClick={reset}>Tentar de novo</Button>
          <ButtonLink href="/" variant="outline">
            Voltar ao início
          </ButtonLink>
        </>
      }
    >
      Tivemos um problema ao abrir esta página. Tente de novo em instantes.
      {error.digest ? <span className="mt-2 block text-xs">Código: {error.digest}</span> : null}
    </StatusScreen>
  );
}
