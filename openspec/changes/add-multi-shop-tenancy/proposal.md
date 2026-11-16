# Proposal

## Why

O sistema vai ser vendido para 10 ou mais barbearias, e a primeira contratada é a Demir Barbershop. Hoje o código atende **uma** barbearia só: configuração em linha única (`business_settings.id = 1`), horários com o dia da semana como chave, uma regra de "sem sobreposição" que vale para o banco inteiro, qualquer admin vendo tudo e rotas fixas (`/`, `/agendar`, `/admin`). Para atender várias barbearias com **um único deploy no Netlify e um único projeto Supabase**, cada dado precisa pertencer a uma barbearia, e cada dono deve ver só a própria. O deploy de produção ainda não foi feito (tasks 4.x de `add-netlify-deploy` pendentes), então é o momento de mudar as rotas sem quebrar links já divulgados.

## What Changes

- **BREAKING** Todas as tabelas de negócio (serviços, configurações, horários, bloqueios, agendamentos, administradores) passam a ter `shop_id`. As funções do banco (horários livres, criar e cancelar agendamento, painel) passam a receber a barbearia e só enxergam os dados dela.
- **BREAKING** Novas rotas, cada barbearia identificada por um código no endereço (*slug*):
  - `/barbearia/<slug>`: site público (início, agendar, serviços, privacidade, gerenciar agendamento).
  - `/painel/<slug>`: painel do dono, com login. Um usuário só abre o painel das barbearias às quais está vinculado.
  - As rotas antigas `/agendar`, `/servicos`, `/privacidade`, `/agendamento/<token>` e `/admin` deixam de existir.
- Barbearia de demonstração em `/barbearia/demonstracao`, com os dados de exemplo atuais ("Barbearia Modelo"), para mostrar o sistema ao barbeiro antes da venda. A raiz `/` redireciona para ela.
- Cadastro de barbearia por script (`scripts/create-shop.mjs`), que cria a barbearia, o horário, os serviços e o login do dono. Não haverá painel de super administrador nesta mudança.
- PWA por barbearia: manifesto e ícone instalado abrem o site da própria barbearia. Links de e-mail, WhatsApp e lembretes apontam para o endereço da barbearia.
- Cadastro da **Demir Barbershop** (slug `demir-barbershop`):
  - atendimento das 8h às 19h;
  - endereço: Rua Abaré, 2;
  - serviços: Corte de cabelo (R$ 30,00), Barba (R$ 20,00), Sobrancelha (R$ 10,00) e o combo Corte, barba e sobrancelha (R$ 40,00).
- Padronização dos textos exibidos, conforme as normas brasileiras de redação:
  - horas sem zero à esquerda ("8h às 19h", "12h30"), em vez do atual "09h";
  - valores como "R$ 30,00";
  - endereço no formato "Logradouro, número – Bairro, Cidade – UF, CEP".

## Capabilities

### New Capabilities
- `shop-tenancy`: barbearias identificadas por slug, rotas públicas e de painel por barbearia, isolamento de dados e acesso do dono somente à própria barbearia.
- `shop-provisioning`: cadastro de barbearias por script e barbearia de demonstração.

### Modified Capabilities
- Nenhuma nos specs principais. Os specs atuais (`container-runtime`, `mobile-device-simulation`) não mudam de comportamento. As capacidades de agendamento, painel e PWA ainda estão só nas changes em andamento (`add-barbershop-booking`, `add-premium-visual-identity`, `add-whatsapp-notifications`, `add-netlify-deploy`), não em `openspec/specs/`, e citam as rotas antigas. Veja design.md, decisão 9.

## Impact

- **Banco:** nova migration que cria `shops` e `shop_admins`, adiciona `shop_id` às tabelas, reescreve políticas RLS e funções, e troca a exclusão de sobreposição para valer por barbearia. Ajusta `supabase/seed.sql` (barbearia de demonstração) e `supabase/production-setup.example.sql`.
- **App:** `app/(public)/*` passa para `app/barbearia/[slug]/*` e `app/admin/*` para `app/painel/[slug]/*`. Mudam também `middleware.ts`, `lib/data/public.ts` (cache por barbearia), `lib/admin/auth.ts`, `app/manifest.ts`, `app/sw.ts`, `lib/notifications/*` e `lib/hours.ts`.
- **Scripts:** novo `scripts/create-shop.mjs`; `scripts/create-admin.mjs` passa a vincular o admin a uma barbearia.
- **Testes:** unitários, testes de banco (`supabase/tests`) e todo o E2E (`e2e/`) mudam de rotas, e entram testes de isolamento entre barbearias.
- **Documentação:** README e `docs/deploy-netlify.md` (cadastrar uma barbearia nova).
- **Domínio:** um domínio só para todas as barbearias. As sugestões de nome estão no design.md, seção "Domínio".
