# Proposal

## Why

A barbearia hoje depende de mensagens e ligações para marcar horários, o que gera conflitos de agenda, faltas e tempo perdido no atendimento. Um site de agendamento simples, instalável no celular (PWA), permite que o cliente marque sozinho em poucos toques e que o barbeiro controle a agenda em um só lugar.

## What Changes

- Novo site público, com layout minimalista (tipografia forte, paleta neutra, poucos elementos), mobile-first, em Next.js (App Router).
- Catálogo de serviços com preço e duração: **Corte de cabelo**, **Barba**, **Bigode**, e serviços sugeridos: **Sobrancelha**, **Pezinho/acabamento**, **Hidratação capilar**, **Pigmentação de barba**, **Corte infantil** e combos (**Corte + Barba**, **Corte + Barba + Sobrancelha**).
- Fluxo de agendamento sem login: escolher um ou mais serviços → escolher data e horário livre → informar nome e WhatsApp (e-mail opcional) → confirmar.
- Agenda de um único barbeiro, com horário de funcionamento semanal, intervalos e bloqueios (folgas, feriados); horários livres calculados a partir da duração total dos serviços escolhidos.
- Página de confirmação com link único e secreto para o cliente ver ou cancelar o próprio agendamento.
- Lembretes: notificação push do PWA (se o cliente permitir) e e-mail (se informado) antes do horário marcado.
- Painel administrativo protegido por login (Supabase Auth) para o barbeiro: agenda do dia/semana, gerenciar serviços, horários de funcionamento, bloqueios e status dos agendamentos (confirmado, concluído, cancelado, não compareceu).
- PWA: manifest, ícones, service worker, instalação na tela inicial e funcionamento básico offline (páginas estáticas e catálogo em cache).
- Banco Supabase (Postgres) com RLS; prevenção de agendamentos sobrepostos no próprio banco.

Fora do escopo desta change: pagamento online, múltiplos barbeiros, contas de cliente, integração com WhatsApp API, programa de fidelidade.

## Capabilities

### New Capabilities
- `service-catalog`: serviços oferecidos (nome, descrição, preço, duração, ativo/inativo, combos) e sua exibição pública.
- `appointment-booking`: cálculo de disponibilidade, criação de agendamento sem login, prevenção de conflitos e consulta/cancelamento pelo cliente via link secreto.
- `appointment-reminders`: envio de lembretes por push (Web Push) e e-mail antes do horário agendado.
- `admin-panel`: autenticação do barbeiro e gestão de agenda, serviços, horário de funcionamento, bloqueios e status dos agendamentos.
- `pwa-shell`: instalabilidade, manifest, service worker, cache offline e layout minimalista responsivo.

### Modified Capabilities
<!-- Nenhuma: projeto novo, sem specs existentes. -->

## Impact

- Projeto novo (pasta vazia): cria aplicação Next.js + TypeScript + Tailwind CSS.
- Dependências: `@supabase/supabase-js`, `@supabase/ssr`, `web-push`, `zod`, `date-fns`/`date-fns-tz`, provedor de e-mail (Resend).
- Supabase: tabelas, funções RPC, políticas RLS, migrações SQL e agendamento periódico (pg_cron ou Vercel Cron) para disparar lembretes.
- Variáveis de ambiente: URL/chaves do Supabase, chaves VAPID para push, chave do provedor de e-mail, fuso horário da barbearia (`America/Sao_Paulo`).
- Deploy previsto na Vercel.
