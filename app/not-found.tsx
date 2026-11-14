import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { StatusScreen } from "@/components/site/StatusScreen";
import { getSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "Página não encontrada" };

export default async function NotFound() {
  const { name } = await getSettings().catch(() => ({ name: "Barbearia" }));
  return (
    <StatusScreen
      icon={Compass}
      eyebrow="Erro 404"
      title="Página não encontrada"
      brandName={name}
      actions={
        <>
          <ButtonLink href="/">Voltar ao início</ButtonLink>
          <ButtonLink href="/agendar" variant="outline">
            Agendar horário
          </ButtonLink>
        </>
      }
    >
      O endereço pode ter mudado ou estar incompleto.
    </StatusScreen>
  );
}
