# Proposal

## Why

O site da barbearia (change `add-barbershop-booking`) precisa rodar de forma idêntica em qualquer máquina, sem instalar Node, Postgres ou Supabase manualmente. Também precisa ser validado em Android e iOS antes de ir ao ar, e a máquina de desenvolvimento é Windows: não tem Android SDK e não consegue rodar o simulador de iOS, que só existe no macOS.

## What Changes

- Containerização do app Next.js com imagem de produção (`Dockerfile` multi-stage, build `standalone`, usuário não-root).
- Supabase local em containers (Postgres, Auth, API REST, Studio, servidor de e-mail de teste) com migrações e seed aplicados automaticamente.
- `docker compose` orquestrando app + Supabase + simulação, com um comando para subir (`npm run docker:up`), um para derrubar e um para resetar os dados.
- Acesso do navegador ao Supabase pelo mesmo endereço do site (proxy no próprio app), para funcionar igual no host e dentro dos containers.
- Simulação mobile com Playwright em container: perfis **Android** (Pixel 7 e Galaxy S9+, motor Chromium) e **iOS** (iPhone 15 e iPhone SE, motor WebKit, o mesmo do Safari).
- Execução final: suíte de simulação que percorre o site nesses aparelhos (home, serviços, agendamento completo, cancelamento, offline, painel) e gera relatório HTML com screenshots, vídeos e traces por aparelho.
- Modo visual: Playwright UI acessível no navegador do host para assistir/rodar a simulação aparelho por aparelho.

Fora do escopo: emulador Android real, simulador iOS real ou aparelhos em nuvem (BrowserStack); teste real de instalação do PWA e de push no iOS; deploy em produção via containers (o deploy continua na Vercel).

## Capabilities

### New Capabilities
- `container-runtime`: ambiente local completo em Docker (app + Supabase), comandos de ciclo de vida, configuração por variáveis de ambiente e saúde dos serviços.
- `mobile-device-simulation`: execução do site em perfis emulados de Android e iOS, cenários cobertos, artefatos gerados (relatório, screenshots, vídeos) e modo visual.

### Modified Capabilities
<!-- Nenhuma: não há specs arquivadas ainda; as specs de add-barbershop-booking não mudam de comportamento. -->

## Impact

- Depende da change `add-barbershop-booking` estar implementada (ou em implementação); esta change só adiciona infraestrutura e testes, sem alterar regras de negócio.
- Novos arquivos: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `e2e/mobile/*`, `playwright.config.ts` (perfis de aparelho), scripts npm e seção no README.
- Ajuste no app: `next.config` com `output: 'standalone'` e rewrite `/supabase/*`; cliente Supabase do navegador passa a usar a URL do próprio site.
- Requisitos da máquina: Docker Desktop com WSL2 e ~6 GB de RAM livres para Supabase + app + navegadores.
