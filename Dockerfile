# syntax=docker/dockerfile:1
# Imagem de produção do app (build standalone do Next.js, usuário não-root).
# Nenhum segredo entra na imagem: toda configuração vem do ambiente em tempo de execução.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: evita baixar binários só de desenvolvimento (CLI do Supabase); os nativos do build vêm por optionalDependencies.
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# As páginas estáticas (home, serviços) são pré-renderizadas lendo o catálogo do Supabase local.
# Só a URL interna e a anon key (pública) são usadas, apenas neste estágio; nada disso vai para a imagem final.
ARG SUPABASE_INTERNAL_URL
ARG SUPABASE_ANON_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN SUPABASE_INTERNAL_URL="$SUPABASE_INTERNAL_URL" SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -D -H -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
