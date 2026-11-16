"use client";
import { useParams } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { shopPath } from "@/lib/paths";

/** Link de agendamento inválido ou de outra barbearia (status 404, sem dados do agendamento). */
export default function BookingNotFound() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <section className="container-page flex flex-col items-start gap-4 py-16">
      <h1 className="font-display text-4xl font-medium">Agendamento não encontrado</h1>
      <p className="text-muted">Confira se o link está completo. Se precisar, fale com a barbearia.</p>
      <ButtonLink href={shopPath(slug, "agendar")}>Fazer um agendamento</ButtonLink>
    </section>
  );
}
