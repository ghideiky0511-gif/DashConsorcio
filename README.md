# HH Gestão de Consórcio — Dashboard

Controle da carteira de cartas de consórcio (compra → processo → contemplação →
resgate/revenda) e do fluxo de caixa das parcelas a pagar.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript — pasta `src/`
- **Tailwind CSS v4**
- **Prisma 7** → Postgres do **Supabase** (driver adapter `@prisma/adapter-pg`)
- **@supabase/ssr** — autenticação e Storage
- **Recharts**, **lucide-react**, **react-hook-form** + **zod**, **date-fns**
- **Vitest** — testes das regras puras
- Deploy: **Vercel** (app) + **Supabase** (banco, auth, storage)

## Pré-requisitos

- Node.js 20.9+ (recomendado 22+)
- Uma conta no [Supabase](https://supabase.com) (plano free serve para começar)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Crie um projeto novo no painel do Supabase.
2. Em **Project Settings → Database**, copie as connection strings:
   - **Transaction pooler** (porta `6543`) → `DATABASE_URL` (runtime da app)
   - **Direct connection** (porta `5432`) → `DIRECT_URL` (migrations)
3. Em **Project Settings → API**, copie a **Project URL**, a chave **anon** e a
   chave **service_role**.

### 3. Variáveis de ambiente

```bash
cp .env.example .env
```

Preencha `.env` com os valores do passo anterior.

### 4. Banco de dados

```bash
npm run db:migrate      # cria as tabelas (prisma migrate dev)
npm run db:seed         # popula dados de exemplo
```

> **Supabase + shadow DB:** se `db:migrate` reclamar do shadow database, crie um
> segundo banco vazio e aponte `SHADOW_DATABASE_URL` para ele no `.env`.

### 5. Rodar

```bash
npm run dev
```

Acesse http://localhost:3000 — você será redirecionado para `/login`.

### 6. Primeiro usuário

O seed cria dados de exemplo, mas **não** cria login (isso vive no `auth.users`
do Supabase). Para entrar:

1. No painel do Supabase, **Authentication → Users → Add user** (com e-mail e senha).
2. No **SQL Editor**, crie o `profile` correspondente com papel de admin:

   ```sql
   insert into profiles (id, nome, email, role, ativo, "createdAt", "updatedAt")
   values ('<UUID-do-auth.users>', 'Seu Nome', 'voce@exemplo.com', 'ADMIN', true, now(), now());
   ```

3. Faça login em `/login`.

## Scripts

| Script | Ação |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `prisma generate` + build de produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Testes (Vitest) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (produção) |
| `npm run db:seed` | Popula dados de exemplo |
| `npm run db:studio` | Prisma Studio |

## Estrutura

```
prisma/
  schema.prisma        # modelo de dados
  seed.ts              # dados de exemplo
prisma7.config.ts      # config do Prisma CLI (URLs do banco)
src/
  proxy.ts             # (ex-middleware) revalida sessão + protege rotas
  app/
    login/             # tela de login
    auth/callback/     # callback do magic link
    (app)/             # área autenticada (sidebar)
      page.tsx         # Carteira (cartas + KPIs)
      fluxo-caixa/     # Fluxo de Caixa
      cartas/ importar/ configuracoes/ usuarios/
  components/layout/   # sidebar, topbar, menu do usuário
  generated/prisma/    # Prisma Client gerado (não versionado)
  lib/
    db.ts              # Prisma Client + driver adapter
    auth.ts            # getUser / getProfile / requireRole
    supabase/          # helpers @supabase/ssr (client, server, proxy)
    carta.ts           # regras puras (custo total, previsão de lucro, etapa) — testado
    format.ts          # moeda BRL, datas pt-BR, percentuais
```

## Roadmap (fases)

- **A — Scaffold & infra** ✅
- **B — Carteira & cartas** ✅ tabela com filtros, detalhe, CRUD, Visão Geral interativa
- **C — Parcelas & Fluxo de Caixa** ✅ concluída — gerar cronograma, marcar parcela
  paga (grava `MovimentoCaixa`), `/fluxo-caixa` com KPIs (saldo, livre p/ novas cartas,
  pago/a pagar no mês), abas Saldo & a pagar / Projeção 12 meses / Este mês, e alertas
  de parcela vencendo + assembleia próxima (sino no header + painel na página). Despesas
  lançadas na carta também entram automaticamente no caixa. Falta rodar `npm run
  db:deploy` para aplicar a migration em produção.
- **D — Documentos & Importação:** Storage + importador da planilha (36 colunas)
- **E — Usuários & permissões:** papéis nas actions + RLS no Supabase
- **F — Acabamento & deploy**

**Fora do plano original:** Precificador de cartas (`/precificador`) — motores de carta
ativa/cancelada, curva de juros CDI, agente de IA para ler extratos. ✅ concluído,
ver `docs/precificacao/`.
