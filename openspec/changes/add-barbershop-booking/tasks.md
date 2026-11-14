# Tasks

## 1. Setup do projeto

- [x] 1.1 Criar app Next.js 15 (App Router, TypeScript, Tailwind, ESLint) na raiz e verificar que `npm run dev` sobe e `npm run build` passa
- [x] 1.2 Instalar dependências (`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `date-fns`, `date-fns-tz`, `web-push`, `resend`, `@serwist/next`, `lucide-react`) e Vitest + Testing Library + Playwright; verificar que `npm test` roda um teste de exemplo
- [x] 1.3 Inicializar Supabase CLI (`supabase init`), criar `.env.example` com todas as variáveis do design e `lib/supabase/{server,browser,admin}.ts`; verificar que `supabase start` sobe localmente e o app conecta
- [x] 1.4 Criar `README.md` com setup local, variáveis de ambiente e comandos; verificar seguindo os passos num clone limpo

## 2. Banco de dados e catálogo de serviços

- [x] 2.1 Migração com `services`, `business_settings`, `business_hours`, `schedule_blocks`, `admins` e função `is_admin()`, com RLS (anon lê só serviços ativos e configurações públicas); verificar com teste SQL/pgTAP ou script que anon não lê serviços inativos nem `admins`
- [x] 2.2 Constraints de validação de serviço (nome não vazio, `price_cents >= 0`, `duration_min > 0 AND duration_min % 5 = 0`); verificar que inserts inválidos falham
- [x] 2.3 `supabase/seed.sql` com os 10 serviços iniciais (preços/durações de exemplo), horário padrão (ter–sáb 09:00–19:00, almoço 12:00–13:00, dom/seg fechado) e configurações de exemplo; verificar com `supabase db reset` e consulta aos 10 serviços ativos
- [x] 2.4 Utilitários `lib/format.ts` (BRL, duração, datas pt-BR no fuso America/Sao_Paulo) com testes unitários cobrindo "R$ 45,00" e "30 min"

## 3. Layout minimalista e shell público

- [x] 3.1 Tokens de tema (claro/escuro via `prefers-color-scheme`), fonte Inter via `next/font`, componentes base (Button, Input, Card, Stepper) com foco visível e alvos ≥ 44 px; verificar com teste de acessibilidade (axe) sem violações
- [x] 3.2 Página inicial (apresentação, CTA "Agendar", endereço, WhatsApp) e `/servicos` renderizando serviços ativos do banco; verificar com teste que serviço inativo não aparece e em viewport 320 px não há rolagem horizontal (Playwright)

## 4. Agendamento público

- [x] 4.1 Migração de `appointments` (com `during tstzrange` gerado, `btree_gist` e constraint EXCLUDE para status ≠ cancelled), `appointment_services` com snapshots e enums de status/origem; verificar que dois inserts sobrepostos falham com `23P01` e um cancelado não bloqueia
- [x] 4.2 Função `get_available_slots(date, total_minutes)` (passo de 15 min, funcionamento, intervalo, bloqueios, agendamentos ativos, antecedência 60 min, janela de 30 dias); verificar com testes SQL para cada cenário da spec `appointment-booking` (fechamento, horário ocupado, dia bloqueado, horário próximo, data além do limite)
- [x] 4.3 Função `create_booking(...)` (valida serviços ativos, recalcula total/duração, checa bloqueios, limite de 2 futuros por telefone, gera `manage_token` com hash, retorna "slot_taken" em conflito); verificar com testes incluindo duas chamadas concorrentes no mesmo horário
- [x] 4.4 Schemas `zod` (nome 2–80, WhatsApp BR normalizado para E.164, e-mail opcional) com testes unitários para telefone "1234" inválido e formatos válidos
- [x] 4.5 Fluxo `/agendar` em etapas (serviços → data → horário → dados → confirmar) com estado na URL e resumo de duração/total; verificar com teste E2E do caminho feliz e do bloqueio sem serviço selecionado
- [x] 4.6 Tratamento de "horário acabou de ser ocupado" na UI, voltando à etapa de horários atualizada; verificar com teste E2E simulando conflito
- [x] 4.7 Página `/agendamento/[token]` (detalhes, status, `noindex`, sem cache) via `get_booking_by_token`, e cancelamento via `cancel_booking_by_token` respeitando prazo de 2 h; verificar com testes E2E para link inválido, cancelamento dentro e fora do prazo e horário voltando a ficar livre
- [x] 4.8 Rate limit por IP na Server Action de criação; verificar com teste que excesso de requisições retorna erro amigável

## 5. Painel administrativo

- [x] 5.1 Login com e-mail/senha (Supabase Auth + `@supabase/ssr`), middleware protegendo `/admin` e checagem `is_admin()`; verificar com E2E que visitante é redirecionado e usuário não-admin não recebe dados
- [x] 5.2 Políticas RLS de admin para leitura/escrita de agendamentos, serviços, horários, bloqueios e configurações; verificar com testes de RLS para admin vs. não-admin vs. anon
- [x] 5.3 Agenda do dia/semana (ordem cronológica, total previsto, link wa.me) e alteração de status (concluído, não compareceu, cancelado); verificar com E2E que cancelar pelo painel libera o horário
- [x] 5.4 Agendamento manual (`source = admin`, sem antecedência mínima/limite por cliente, com regra de conflito); verificar com teste de encaixe em 20 min
- [x] 5.5 CRUD de serviços com reordenação, ativar/desativar e proibição de exclusão quando há agendamentos; verificar com teste que mudar preço não altera agendamento existente
- [x] 5.6 Telas de horário de funcionamento e de bloqueios (dia inteiro ou período, aviso listando agendamentos afetados sem cancelá-los); verificar com E2E de domingo fechado e bloqueio com agendamentos existentes
- [x] 5.7 Tela de configurações da barbearia (nome, endereço, WhatsApp, texto); verificar que a alteração aparece no site público
- [x] 5.8 Documentar no README como criar o usuário admin (Auth + tabela `admins`); verificar seguindo o passo a passo localmente

## 6. PWA

- [x] 6.1 `app/manifest.ts`, ícones 192/512/maskable e cor de tema; verificar com Lighthouse (categoria PWA/instalabilidade) sem falhas
- [x] 6.2 Service worker com Serwist (precache do shell, SWR para catálogo, NetworkOnly para ações/API/admin, fallback `/offline`); verificar com Playwright offline que home e serviços abrem e `/agendar` mostra aviso de conexão
- [x] 6.3 Dica de instalação no iOS (dispensável, lembrada por localStorage); verificar manualmente no Safari iOS ou com emulação de user agent

## 7. Lembretes

- [x] 7.1 Migração de `push_subscriptions` e `reminders` (único por agendamento/tipo/canal); `create_booking` cria lembretes h24/h2 apenas com `send_at` futuro; verificar com teste que agendamento a 5 h só gera h2
- [x] 7.2 Botão "Ativar lembrete" na confirmação, pedindo permissão só após clique, e `/api/push/subscribe` associando inscrição ao agendamento (validando token); verificar com teste e com fallback explicativo quando não há suporte
- [x] 7.3 E-mail de confirmação via Resend com detalhes e link de gerenciamento; verificar com teste usando mock do provedor
- [x] 7.4 Rota `/api/cron/reminders` protegida por `CRON_SECRET`, com `FOR UPDATE SKIP LOCKED`, envio push (`web-push`/VAPID) e e-mail, marcação `sent_at`, remoção de inscrições 404/410 e ignorando cancelados; verificar com testes de idempotência (duas execuções = um envio), cancelado e push expirado com e-mail
- [ ] 7.5 Handlers `push` e `notificationclick` no service worker abrindo o link de gerenciamento; verificar manualmente com notificação de teste no Chrome
- [ ] 7.6 Configurar Vercel Cron (15 min) ou `pg_cron` + `pg_net`, documentando no README e gerando chaves VAPID; verificar disparo em ambiente de preview

## 8. Integração e entrega

- [x] 8.1 Página de política de privacidade (LGPD) linkada no formulário; verificar presença do link no fluxo
- [ ] 8.2 Teste E2E ponta a ponta: cliente agenda → admin vê na agenda → cliente cancela pelo link → horário volta livre; verificar passando em CI
- [ ] 8.3 Deploy na Vercel com Supabase de produção, migrações aplicadas e admin criado; verificar agendamento real em produção e Lighthouse ≥ 90 em performance e acessibilidade no mobile

## Workflow follow-up

- Arquivar a change (`/opsx:archive`) após revisão e validação em produção.
