# Spec Delta

## ADDED Requirements

### Requirement: Build exige Supabase acessível
O build de produção (`npm run build`) MUST verificar, antes de compilar, se a API do Supabase configurada para o servidor responde. Se ela não responder, o build MUST parar sem pré-renderizar páginas e mostrar uma única mensagem em pt-BR com a URL tentada e como resolver. O build MUST NOT terminar com sucesso usando dados de cache de builds anteriores no lugar do banco.

#### Scenario: Supabase desligado
- **WHEN** o Supabase local está parado e o desenvolvedor executa `npm run build`
- **THEN** o comando termina com código diferente de zero em poucos segundos, sem stack traces de `ECONNREFUSED`, e a mensagem mostra a URL tentada e sugere `npm run docker:up` ou `npx supabase start`

#### Scenario: Variáveis ausentes
- **WHEN** nenhuma das variáveis de URL e chave anônima do Supabase está definida e o build é executado
- **THEN** o build para antes de compilar e a mensagem indica quais variáveis definir

#### Scenario: Supabase no ar
- **WHEN** a API do Supabase configurada responde e `npm run build` é executado
- **THEN** o build segue normalmente e pré-renderiza as páginas públicas com os dados atuais do banco

#### Scenario: Build da imagem Docker
- **WHEN** a imagem do app é gerada pelo `docker compose` com o Supabase local no ar
- **THEN** a verificação usa a mesma URL que o servidor usaria (`SUPABASE_INTERNAL_URL`, se definida) e o build da imagem conclui
