import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { StatusScreen } from "@/components/site/StatusScreen";

export const metadata: Metadata = { title: "Sem conexão" };
export const dynamic = "force-static";

/** Exibida pelo service worker quando uma página não está em cache e não há conexão. */
export default function OfflinePage() {
  return (
    <StatusScreen
      icon={WifiOff}
      eyebrow="Sem conexão"
      title="Você está offline"
      actions={
        <ButtonLink href="/" variant="outline">
          Voltar ao início
        </ButtonLink>
      }
    >
      Para ver horários livres, agendar ou cancelar é preciso estar conectado. Assim que a internet voltar, tente de novo.
    </StatusScreen>
  );
}
