import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { StatusScreen } from "@/components/site/StatusScreen";

export const metadata: Metadata = { title: "Página não encontrada" };

/** 404 geral (inclui barbearia inexistente). */
export default function NotFound() {
  return (
    <StatusScreen
      icon={Compass}
      eyebrow="Erro 404"
      title="Página não encontrada"
      brandName="Agendamento online"
      actions={<ButtonLink href="/">Voltar ao início</ButtonLink>}
    >
      O endereço pode ter mudado ou estar incompleto. Se você recebeu o link de uma barbearia, confira se ele está completo.
    </StatusScreen>
  );
}
