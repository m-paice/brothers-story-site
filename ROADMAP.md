# Brothers Story — Roadmap

## O que temos hoje

### Vitrine (cliente final)

- [x] Listagem de produtos com filtro por categoria
- [x] Página de detalhe do produto (galeria, variações por cor/tamanho, estoque)
- [x] Carrinho de compras
- [x] Checkout com cotação de frete via SuperFrete
- [x] Pagamento via Mercado Pago Checkout Pro
- [x] Páginas de resultado de pagamento (sucesso / pendente / erro)
- [x] Autenticação de cliente (login / cadastro)
- [x] Área do cliente: pedidos, endereços, dados pessoais, senha
- [x] Páginas institucionais: Sobre, Envios, Trocas e Devoluções, Contato
- [x] Filtros personalizados: status (novidade, promoção, em estoque), faixa de preço, cor e tamanho
- [x] Tema dark responsivo

### Painel Admin (dono da loja)

- [x] Login separado (`/admin/login`)
- [x] Dashboard com métricas e gráficos por período
- [x] Gestão de produtos (CRUD, galeria de imagens, variações por cor/tamanho)
- [x] Gestão de pedidos (listagem, detalhes, mudança de status)
- [x] Geração de etiqueta SuperFrete por pedido
- [x] Visão de vendas
- [x] Configurações: dados da loja, horários, frete, páginas institucionais
- [x] Configurações: integrações (SuperFrete, Mercado Pago, endereço de origem)
- [x] Banner de onboarding quando a loja ainda não foi configurada
- [x] Wizard de setup inicial (`/admin/setup`)

### Painel SuperAdmin (plataforma)

- [x] Layout separado (`/superadmin`)
- [x] Dashboard com métricas da plataforma (total de lojas, ativas, suspensas, novas no mês, breakdown por plano)
- [x] Listagem de lojas com dono e plano atual
- [x] Ações por loja: suspender / reativar, trocar plano

### SaaS / Plataforma

- [x] Cadastro público de nova loja (`/criar-loja`)
- [x] Edge Function `criar-loja` (cria auth user, store, owner, subscription, settings)
- [x] 3 planos: Free / Pro / Enterprise
- [x] 3 papéis: `customer`, `admin` (dono de loja), `superadmin` (plataforma)
- [x] Arquitetura multi-tenant (`store_id` em todas as tabelas de dados)
- [x] Credenciais por loja (`tenant_credentials`: SuperFrete + Mercado Pago)

### Backend / Infraestrutura

- [x] 4 Edge Functions: `cotar-frete`, `criar-pagamento`, `gerar-etiqueta`, `mp-webhook`
- [x] RLS ativo em todas as tabelas
- [x] Supabase Storage — bucket `produtos` (público)
- [x] `schema.sql` — estrutura completa para recriar o banco do zero
- [x] `seed.sql` — dados essenciais (planos, loja Brothers Story, usuários, produtos)
- [x] Migrations com nomenclatura por data (`YYYYMMDD_descricao.sql`)
- [x] Deploy automático do frontend via Vercel (`main`)
- [x] Notificações de pedido por e-mail via Brevo (confirmação ao cliente + alerta ao dono da loja)
- [x] `VITE_DEFAULT_STORE_ID` para modo single-store sem subdomínio
- [x] CORS corrigido nas Edge Functions (`x-tenant-id` no `Access-Control-Allow-Headers`)
- [x] `TenantContext` ignora domínios de plataforma (Vercel, Netlify) como subdomínio de loja

---

## Próximos passos

### Prioridade alta

- [ ] **Testar fluxo `/criar-loja` ponta a ponta** — cadastro → login automático → wizard `/admin/setup` → painel admin funcionando
- [x] **Notificação de novo pedido para o dono da loja** — e-mail via Brevo quando pagamento é aprovado
- [x] **Confirmação de pedido para o cliente** — e-mail com resumo do pedido após pagamento aprovado

### Prioridade média

- [ ] **Cobrança de assinatura** — integrar Mercado Pago ou Stripe para cobrar os donos de loja mensalmente conforme o plano
- [ ] **Exportação de relatórios** — download CSV de pedidos e vendas por período
- [ ] **Múltiplos admins por loja** — feature do plano Enterprise (`store_members` já existe no banco, falta UI)
- [ ] **Limite de produtos/pedidos por plano** — validar no backend se a loja ultrapassou o limite do plano Free antes de criar

### Prioridade baixa / futuro

- [ ] **Domínio customizado por loja** — feature do plano Enterprise (ex: `loja.com.br` apontando para a vitrine certa)
- [ ] **Roteamento multi-tenant da vitrine** — resolver a loja pelo subdomínio ou domínio (hoje hardcoded para Brothers Story; desbloqueia múltiplos clientes simultâneos)
- [ ] **Portal do cliente de assinatura** — página onde o dono da loja gerencia e cancela o próprio plano
- [ ] **Suporte prioritário** — sistema de tickets ou canal dedicado para clientes Enterprise
- [ ] **OG tags dinâmicas** — meta tags por produto para compartilhamento em redes sociais

---

## Usuários de referência

| Nome | E-mail | Papel |
|---|---|---|
| Matheus Paice | matheus.paice@gmail.com | superadmin (plataforma) |
| Eduardo Lopes | eduardo.lopes@brotherstore.com | admin (dono da Brothers Story) |

Senha padrão no `seed.sql`: `password`
