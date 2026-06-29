# Plano de Migração — Single-tenant → SaaS Multi-tenant

## Decisões arquiteturais

### Identificação do tenant
- **Subdomínio** (recomendado): `loja1.brotherstore.com`, `loja2.brotherstore.com`
- **Path** (fallback dev): `localhost:5173/loja1/*`

### Credenciais por tenant
- Tabela `tenant_credentials` no banco (Supabase RLS garante isolamento)
- Cada loja cadastra seu próprio token MP, SuperFrete, CEP origem e dados do remetente

---

## Fases de implementação

---

### FASE 1 — Banco de dados

#### Novas tabelas
```
plans              → planos do SaaS (Free, Pro, Enterprise)
stores             → cada loja é um tenant (slug, owner_id, plan_id, status, settings)
store_members      → usuários vinculados a uma loja (owner, admin, staff)
store_subscriptions → histórico de assinatura por loja
tenant_credentials → credenciais de MP + SuperFrete por loja (RLS isolado)
```

#### Tabelas alteradas (adicionar store_id)
```
products           → store_id UUID NOT NULL FK stores
product_variants   → store_id UUID NOT NULL FK stores (denormalizado)
orders             → store_id UUID NOT NULL FK stores
sales              → store_id UUID NOT NULL FK stores
store_settings     → store_id UUID (virar multi-registro, sair do singleton id=1)
profiles           → current_store_id UUID (preferência de loja ativa)
```

#### Triggers a adaptar
```
set_order_number()        → número inclui slug da loja (ex: "brother-2025-0001")
set_sale_defaults()       → idem para vendas
apply_stock_on_order_change() → validar que variante pertence ao tenant do pedido
apply_stock_on_sale_change()  → idem
```

#### Novas funções RLS
```sql
is_store_admin(store_id)  → usuário é owner/admin dessa loja
can_access_store(store_id) → usuário tem qualquer acesso a essa loja
is_global_admin()          → super_admin da plataforma
```

#### Script de migração (8 fases, idempotente)
```
1_create_saas_tables.sql
2_add_store_id_columns.sql
3_backfill_store_data.sql       ← cria loja padrão com dados atuais
4_add_constraints_indexes.sql
5_create_helper_functions.sql
6_update_rls_policies.sql
7_migrate_triggers.sql
8_seed_plans.sql
```

---

### FASE 2 — Autenticação (3 níveis)

#### Níveis
```
super_admin  → dono do SaaS, acessa tudo
store_admin  → dono/gerente de uma loja, acessa só a sua
customer     → comprador, acessa só seus próprios dados
```

#### AuthContext (src/context/AuthContext.tsx)
```typescript
// Adicionar
globalRole: 'super_admin' | 'store_admin' | 'customer' | null
stores: { storeId, storeName, storeRole }[]
currentStoreId: string | null
isSuperAdmin: boolean
isStoreAdmin: boolean
switchStore(storeId): void
```

#### ProtectedRoute (src/components/admin/ProtectedRoute.tsx)
```typescript
// Suporte a requiredRole + requiredPermission
// super_admin passa por tudo
// store_admin precisa ter currentStoreId válido
```

---

### FASE 3 — Frontend: identificação do tenant

#### Novo: src/context/TenantContext.tsx
```typescript
// Extrai storeId de subdomínio ou path param
// Expõe: { storeId, isAdminDomain }
```

#### Atualização em src/main.tsx
```typescript
// Ordem de providers:
BrowserRouter
  TenantProvider          // ← novo (1º)
    SettingsProvider      // lê storeId de TenantContext
      AuthProvider
        CartProvider
          App
```

---

### FASE 4 — Frontend: isolamento de dados

#### src/lib/products.ts
```typescript
// fetchProducts(storeId) → .eq('store_id', storeId)
// fetchProduct(id, storeId) → idem
```

#### src/lib/settings.ts
```typescript
// fetchSettings(storeId) → .eq('store_id', storeId)
// saveSettings(settings, storeId) → upsert com store_id
```

#### src/context/CartContext.tsx
```typescript
// localStorage key: ef:cart:${storeId}:v2
// ef:favorites:${storeId}
```

#### src/lib/orders.ts
```typescript
// createOrder → incluir store_id no insert
```

---

### FASE 5 — Admin: multi-store

#### Novo layout: src/pages/admin/AdminMultiStoreLayout.tsx
```
Sidebar com seletor de lojas (se store_admin com múltiplas)
Rotas: /admin/:storeId/dashboard
        /admin/:storeId/produtos
        /admin/:storeId/pedidos
        /admin/:storeId/vendas
        /admin/:storeId/configuracoes
```

#### Novo: src/pages/admin/StoreSelector.tsx
```
Lista de lojas do admin com cards
Redireciona para /admin/:storeId/dashboard ao selecionar
```

#### Super admin panel (novo): src/pages/admin/SuperAdmin.tsx
```
Lista todas as lojas
Cria nova loja
Gerencia planos/assinaturas
Analytics globais
```

---

### FASE 6 — Edge Functions

#### Nova tabela: tenant_credentials
```
mercadopago_access_token
mercadopago_webhook_secret
superfrete_token
superfrete_use_sandbox
origin_cep
sender_name / sender_document / sender_address ...
```

#### Como cada função identifica o tenant
```
cotar-frete       → header X-Tenant-ID (enviado pelo frontend)
criar-pagamento   → header X-Tenant-ID ou JWT do usuário
gerar-etiqueta    → JWT do admin → store_members → tenant_id
mp-webhook        → query param ?tenant_id= (passado na notification_url)
```

#### Mudança em todas as funções
```typescript
// 1. Identificar tenant
// 2. Buscar credenciais em tenant_credentials
// 3. Filtrar queries com .eq('store_id', storeId)
// 4. Usar credenciais do tenant (não mais Deno.env globais)
```

---

### FASE 7 — Billing (assinaturas)

```
Integração Stripe ou Pagar.me
Planos: Free (limite de produtos/pedidos), Pro, Enterprise
Tela de upgrade no admin da loja
Webhook de cobrança → atualiza store_subscriptions
Bloqueio de features por plano
```

---

### FASE 8 — Onboarding

```
Página pública: /criar-loja
  - Nome da loja, slug, email do dono
  - Escolha do plano
  - Pagamento (se pago)
  - Cria store + store_members(owner) + tenant_credentials(vazio)
  - Redireciona para /admin/:slug/configuracoes

Wizard de configuração inicial:
  - Dados da loja (logo, cores, redes sociais)
  - Credenciais MP e SuperFrete
  - Dados do remetente (para etiquetas)
  - Primeiro produto
```

---

## Resumo de esforço por fase

| Fase | Complexidade | Estimativa |
|------|-------------|------------|
| 1 — Banco de dados | Alta | 3-4 dias |
| 2 — Autenticação | Média | 2 dias |
| 3 — TenantContext | Baixa | 1 dia |
| 4 — Isolamento de dados | Média | 2 dias |
| 5 — Admin multi-store | Alta | 3-4 dias |
| 6 — Edge Functions | Média | 2-3 dias |
| 7 — Billing | Alta | 4-5 dias |
| 8 — Onboarding | Média | 2-3 dias |
| **Total** | | **~3-4 semanas** |

## O que NÃO muda

- Componentes de UI (ProductCard, CartDrawer, Checkout, FilterBar, etc.)
- Utilitários (format, image, color, cep)
- Páginas estáticas (Sobre, Contato, etc. — já leem de SettingsContext)
- Fluxo de compra (carrinho → checkout → pagamento)
- Emails transacionais
- Deploy (Vercel + Supabase continuam)
