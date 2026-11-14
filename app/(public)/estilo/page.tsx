import { CalendarCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeatureItem } from "@/components/ui/FeatureItem";
import { Stepper } from "@/components/ui/Stepper";
import { StyleGuideDemo } from "@/components/ui/StyleGuideDemo";
import { TextField } from "@/components/ui/TextField";
import { TimeChip } from "@/components/ui/TimeChip";

export const metadata: Metadata = { title: "Guia de estilo", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Guia de estilo: disponível apenas em desenvolvimento e testes. */
export default function StylePage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLE_GUIDE !== "1") notFound();
  return (
    <div className="container-page flex flex-col gap-12 py-12">
      <section className="flex flex-col gap-3" aria-label="Tipografia">
        <p className="eyebrow" data-testid="type-eyebrow">Eyebrow • Caixa alta</p>
        <h1 className="title-display" data-testid="type-display">
          Título display, <span className="text-gold">em dourado.</span>
        </h1>
        <h2 className="title-section" data-testid="type-h2">Título de seção (h2)</h2>
        <h3 className="title-card" data-testid="type-h3">Subtítulo (h3)</h3>
        <p className="max-w-prose text-base text-text" data-testid="type-body">Texto de corpo em Inter, 16 px, sobre o fundo escuro.</p>
        <p className="text-sm text-muted" data-testid="type-small">Texto secundário em cinza quente, 14 px.</p>
      </section>

      <section className="flex flex-wrap gap-3" aria-label="Botões">
        <Button>Ação principal</Button>
        <Button variant="outline">Contornado</Button>
        <Button variant="ghost">Discreto</Button>
        <Button variant="outline" disabled>Desabilitado</Button>
        <ButtonLink href="/agendar" variant="outline">Link</ButtonLink>
      </section>

      <Card className="flex flex-col gap-6">
        <Stepper
          current={2}
          steps={[
            { title: "Serviço", description: "Escolha o serviço" },
            { title: "Data e hora", description: "Selecione data e horário" },
            { title: "Seus dados", description: "Nome e WhatsApp" },
            { title: "Confirmar", description: "Revise e confirme" },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Nome" placeholder="Seu nome" autoComplete="name" />
          <TextField label="WhatsApp" placeholder="(11) 99999-8888" error="WhatsApp inválido." />
          <TextField label="E-mail (opcional)" hint="Para receber a confirmação." type="email" />
        </div>
        <StyleGuideDemo />
        <div role="group" aria-label="Exemplo de horários" className="grid max-w-xs grid-cols-3 gap-2">
          <TimeChip selected={false}>09:00</TimeChip>
          <TimeChip selected>09:30</TimeChip>
          <TimeChip selected={false} disabled>10:00</TimeChip>
        </div>
      </Card>

      <section className="grid gap-6 md:grid-cols-2" aria-label="Diferencial e avatar">
        <FeatureItem icon={CalendarCheck} title="Agendamento rápido" description="Escolha o horário em poucos toques." />
        <div className="flex items-center gap-4">
          <Avatar name="Rafael Costa" />
          <Avatar name="Rafael Costa" size={40} />
        </div>
      </section>
    </div>
  );
}
