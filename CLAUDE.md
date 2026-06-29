# Brothers Story — Especificações do Projeto

## Visão Geral

Loja virtual de moda masculina. SPA React com admin embutido, backend 100% Supabase.

- **URL de produção**: gerenciada pelo Vercel (deploy automático via `main`)
- **Projeto Supabase**: `bqotguvfiquscfgohgfo` — `https://bqotguvfiquscfgohgfo.supabase.co`

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS (tema dark) |
| Roteamento | React Router DOM v7 |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/senha) |
| Storage | Supabase Storage — bucket `produtos` (público) |
| Edge Functions | Supabase Edge Functions (Deno) |
| Pagamentos | Mercado Pago Checkout Pro |
| Frete | SuperFrete (cotação + etiqueta) |
| Deploy | Vercel (SPA rewrite: `/* → /index.html`) |

---

## Variáveis de Ambiente

### Frontend (`.env` local / Vercel Environment Variables)

```
VITE_SUPABASE_URL=https://bqotguvfiquscfgohgfo.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key do Supabase Dashboard → Project Settings → API>
```

Copiar de `.env.example` para criar o `.env` local.

### Edge Functions (secrets no Supabase)

Gerenciados via `npx supabase secrets set`. Ver seção de comandos abaixo.

---

## Estrutura de Pastas

```
src/
  components/         # Componentes reutilizáveis (Checkout, ProductCard, Header…)
  components/admin/   # Componentes exclusivos do admin
  context/            # React Contexts (CartContext, SettingsContext, AuthContext)
  lib/                # Clientes e helpers (supabase.ts, products.ts, storage.ts…)
  pages/              # Páginas da loja (Home, Produto, Sobre, Contato…)
  pages/admin/        # Páginas do painel admin
  styles/             # CSS global (index.css, admin.css)
  types/              # Tipos TypeScript compartilhados
  utils/              # Utilitários (image.ts, body.tsx…)

supabase/
  functions/          # Edge Functions (Deno)
    cotar-frete/      # POST /cotar-frete — cotação via SuperFrete
    criar-pagamento/  # POST /criar-pagamento — cria preferência no Mercado Pago
    gerar-etiqueta/   # POST /gerar-etiqueta — gera etiqueta SuperFrete
    mp-webhook/       # POST /mp-webhook — webhook de notificação do Mercado Pago
  *.sql               # Scripts SQL para rodar no banco remoto

scripts/
  migrate-images.ts   # Migra imagens do Google Drive → Supabase Storage
```

---

## Banco de Dados (tabelas principais)

| Tabela | Descrição |
|---|---|
| `products` | Produtos com `image`, `images[]`, dimensões e flags |
| `product_variants` | Variações por cor/tamanho com estoque |
| `orders` | Pedidos com status, endereço e totais |
| `order_items` | Itens de cada pedido (product_id, variant_id, qty, price) |
| `store_settings` | Linha única (id=1) com JSONB `data` — configurações da loja |
| `accounts` | Usuários clientes (vinculados ao Supabase Auth) |

Todas as tabelas têm RLS ativo. Ver arquivos `.sql` em `supabase/` para detalhes.

### Configurações da loja (`store_settings`)

Acesso via `useSettings()` ou `src/lib/settings.ts`. Inclui:
- `store`: nome, tagline, Instagram, WhatsApp
- `hours`: horários por dia da semana
- `shipping`: frete grátis a partir de, taxa padrão
- `pages`: conteúdo (título, subtítulo, corpo) de Sobre/Contato/Envios/Trocas

---

## Supabase Storage

- **Bucket**: `produtos` (público — sem autenticação para leitura)
- **Upload**: autenticado apenas (`auth.role() = 'authenticated'`)
- **Helper frontend**: `src/lib/storage.ts` → `uploadProductImage(file)` / `deleteProductImage(url)`
- **SQL de criação**: `supabase/storage.sql`

---

## Scripts Locais

### Desenvolvimento

```bash
npm run dev          # Inicia o servidor de desenvolvimento (Vite)
npm run build        # Compila TypeScript + Vite para produção
npm run preview      # Serve o build de produção localmente
npm run lint         # ESLint
```

### Migração de imagens

```bash
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> npx tsx scripts/migrate-images.ts
```

A chave `service_role` está em: Supabase Dashboard → Project Settings → API → `service_role`.

---

## Comandos Supabase CLI

> Todos os comandos usam `npx supabase` (CLI instalado como devDependency).
> O projeto já está vinculado (`ref: bqotguvfiquscfgohgfo`).

### Autenticação e vínculo

```bash
# Fazer login (abre o browser)
npx supabase login

# Vincular ao projeto remoto
npx supabase link --project-ref bqotguvfiquscfgohgfo

# Desvincular
npx supabase unlink
```

### Edge Functions

```bash
# Listar funções deployadas
npx supabase functions list

# Deploy de uma função específica
npx supabase functions deploy cotar-frete
npx supabase functions deploy criar-pagamento
npx supabase functions deploy gerar-etiqueta
npx supabase functions deploy mp-webhook

# Deploy de todas as funções de uma vez
npx supabase functions deploy

# Servir funções localmente (para testes)
npx supabase functions serve

# Criar nova função
npx supabase functions new nome-da-funcao

# Baixar função do remoto
npx supabase functions download nome-da-funcao

# Deletar função do remoto
npx supabase functions delete nome-da-funcao
```

### Banco de Dados

```bash
# Executar SQL arbitrário contra o banco remoto (arquivo)
npx supabase db query --linked --file supabase/migrations/20260629_minha_migration.sql

# Executar SQL inline
npx supabase db query --linked "SELECT count(*) FROM products;"

# Gerar diff do esquema local vs remoto
npx supabase db diff

# Fazer dump do esquema remoto
npx supabase db dump --linked -f supabase/schema_dump.sql

# Fazer dump apenas dos dados
npx supabase db dump --linked --data-only -f supabase/data_dump.sql

# Puxar esquema do remoto para migration local
npx supabase db pull

# Empurrar migrations locais para o remoto
npx supabase db push

# Resetar banco local (destrói e recria — apenas local)
npx supabase db reset

# Checar problemas de tipagem e segurança
npx supabase db lint
npx supabase db advisors --linked
```

### Secrets (variáveis das Edge Functions)

```bash
# Listar secrets configurados
npx supabase secrets list

# Definir um ou mais secrets
npx supabase secrets set MINHA_CHAVE=valor
npx supabase secrets set CHAVE_A=valor CHAVE_B=valor

# Remover um secret
npx supabase secrets unset MINHA_CHAVE
```

### Storage

```bash
# Listar objetos no bucket
npx supabase storage ls ss://produtos

# Copiar arquivo para o bucket
npx supabase storage cp ./imagem.jpg ss://produtos/imagem.jpg

# Mover objeto
npx supabase storage mv ss://produtos/antigo.jpg ss://produtos/novo.jpg

# Remover objeto
npx supabase storage rm ss://produtos/imagem.jpg
```

### Migrations

```bash
# Criar nova migration (arquivo vazio em supabase/migrations/)
npx supabase migration new nome-da-migration

# Listar migrations
npx supabase migration list

# Reparar estado de migration no remoto
npx supabase migration repair --status applied <versao>
```

#### Convenção de nomenclatura

- **`supabase/schema.sql`** — dump completo do esquema atual (fonte da verdade para recriar do zero). Atualizar com `npx supabase db dump --linked -f supabase/schema.sql` após mudanças estruturais.
- **`supabase/seed.sql`** — dados essenciais para popular o banco após reset: planos, loja Brothers Story, usuários (Eduardo + Matheus), produtos e variações.
- **`supabase/migrations/YYYYMMDD_descricao.sql`** — novas migrations incrementais. Exemplo: `20260629_add_store_domain.sql`. Executar manualmente com `npx supabase db query --linked --file supabase/migrations/arquivo.sql`.

#### Reset completo do banco

```bash
# 1. Recriar toda a estrutura
npx supabase db query --linked --file supabase/schema.sql

# 2. Aplicar migrations em ordem cronológica
npx supabase db query --linked --file supabase/migrations/20260601_saas_create_tables.sql
npx supabase db query --linked --file supabase/migrations/20260602_saas_rls.sql
# ... demais migrations em ordem de data

# 3. Popular com dados essenciais (usuários, loja, produtos)
npx supabase db query --linked --file supabase/seed.sql
```

> **Senha padrão dos usuários de seed**: `password`
> Matheus (`matheus.paice@gmail.com`) = superadmin | Eduardo (`eduardo.lopes@brotherstore.com`) = admin/dono da Brothers Story

### Projetos e Organização

```bash
# Listar projetos da conta
npx supabase projects list

# Status dos serviços locais (quando usando stack local)
npx supabase status

# Iniciar stack local (Docker)
npx supabase start

# Parar stack local
npx supabase stop
```

---

## Fluxo de Deploy

1. **Frontend** — push para `main` no GitHub → Vercel detecta e faz build automático.
2. **Edge Functions** — deploy manual via CLI após alterações:
   ```bash
   npx supabase functions deploy nome-da-funcao
   ```
3. **SQL / Schema** — rodar manualmente com:
   ```bash
   npx supabase db query --linked --file supabase/arquivo.sql
   ```

---

## Diretrizes de Desenvolvimento

- **Agentes**: sempre que possível, usar um time de agentes para executar as tarefas.
- **Estilos**: novos componentes devem seguir os estilos já existentes na aplicação (classes CSS de `admin.css` / `index.css`, variáveis CSS do tema dark).
- **Código**: simples, direto e fácil de ler — sem abstrações desnecessárias.
- **TypeScript**: 100% tipado; sem `any` implícito.

---

## Notas Importantes

- **Nunca commitar antes de revisão do usuário.** Avisar quando estiver pronto para commit.
- O campo `quantity` nas Edge Functions do SuperFrete deve ser sempre `1` por item; para múltiplas unidades, repetir o objeto no array (`flatMap`).
- RLS: upserts precisam de política `FOR ALL` (não só `FOR UPDATE`) pois geram tanto INSERT quanto UPDATE internamente.
- Scripts `.sql` em `supabase/` são idempotentes (usam `ON CONFLICT DO NOTHING` e blocos `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`).
