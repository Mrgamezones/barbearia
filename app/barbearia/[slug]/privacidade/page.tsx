import type { Metadata } from "next";
import { requireShop } from "@/lib/data/public";
import { formatAddress, formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Política de privacidade" };
export const revalidate = 3600;

export default async function PrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const s = await requireShop((await params).slug);
  return (
    <article className="container-page flex max-w-3xl flex-col gap-6 py-12 text-text md:py-16 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted [&_li]:text-muted">
      <p className="eyebrow">LGPD</p>
      <h1 className="font-display text-4xl font-medium md:text-5xl">Política de privacidade</h1>
      <p>
        Esta política explica como a {s.name} trata os dados pessoais informados no agendamento online, em conformidade com a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018).
      </p>

      <h2>Quais dados coletamos</h2>
      <ul>
        <li>Nome e número de WhatsApp — obrigatórios para identificar o agendamento e falar com você.</li>
        <li>E-mail — opcional, usado para enviar a confirmação e os lembretes.</li>
        <li>Data, horário e serviços escolhidos.</li>
        <li>Inscrição de notificação do navegador — apenas se você ativar os lembretes por push.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Registrar e gerenciar o seu horário (base legal: execução de contrato/procedimentos preliminares).</li>
        <li>Enviar confirmação e lembretes do agendamento.</li>
        <li>Entrar em contato sobre o atendimento, se necessário.</li>
      </ul>
      <p>Não vendemos nem compartilhamos seus dados para fins de marketing.</p>

      <h2>Mensagens pelo WhatsApp</h2>
      <p>
        Se você mantiver marcada a opção &quot;Receber confirmação e lembretes pelo WhatsApp&quot;, usamos o número informado apenas para enviar
        mensagens sobre o seu agendamento: a confirmação, o aviso de cancelamento (feito por você ou pela barbearia) e os lembretes de 24 horas e
        de 2 horas antes. Nunca enviamos propaganda por esse canal.
      </p>
      <p>
        Para deixar de receber, desmarque a opção ao agendar ou peça à barbearia{s.whatsapp ? <> pelo WhatsApp {formatPhone(s.whatsapp)}</> : null}.
        As mensagens são enviadas pela plataforma oficial do WhatsApp Business (Meta).
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        Usamos fornecedores para operar o site: hospedagem e banco de dados (Vercel e Supabase), envio de e-mails (Resend), envio de mensagens pelo
        WhatsApp (Meta) e o serviço de notificações do seu navegador. Eles tratam os dados apenas para prestar esses serviços.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <p>Mantemos os dados dos agendamentos por até 12 meses após o atendimento, para histórico e atendimento ao cliente. Depois disso, eles são excluídos ou anonimizados.</p>

      <h2>Segurança</h2>
      <p>
        O acesso aos agendamentos é restrito à barbearia. O link que você recebe para ver ou cancelar o horário é único e secreto: não o compartilhe.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento
        {s.whatsapp ? <> pelo WhatsApp {formatPhone(s.whatsapp)}</> : null}
        {formatAddress(s) ? <> ou pessoalmente em {formatAddress(s)}</> : null}.
      </p>
    </article>
  );
}
