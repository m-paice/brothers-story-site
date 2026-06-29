-- ============================================================================
-- SaaS Migration 8/8 — Seed dos planos do SaaS
-- Idempotente. Rode após todos os scripts anteriores.
-- ============================================================================

insert into public.plans (name, slug, price, max_products, max_orders_month, features, is_active)
values
  (
    'Free',
    'free',
    0,
    50,
    100,
    '["dashboard", "produtos", "pedidos", "vendas", "configuracoes"]'::jsonb,
    true
  ),
  (
    'Pro',
    'pro',
    97.00,
    null,
    null,
    '["dashboard", "produtos", "pedidos", "vendas", "configuracoes", "frete_superfrete", "pagamento_mercadopago", "relatorios", "etiquetas"]'::jsonb,
    true
  ),
  (
    'Enterprise',
    'enterprise',
    297.00,
    null,
    null,
    '["dashboard", "produtos", "pedidos", "vendas", "configuracoes", "frete_superfrete", "pagamento_mercadopago", "relatorios", "etiquetas", "dominio_customizado", "suporte_prioritario", "multiplos_admins"]'::jsonb,
    true
  )
on conflict (slug) do update set
  name              = excluded.name,
  price             = excluded.price,
  max_products      = excluded.max_products,
  max_orders_month  = excluded.max_orders_month,
  features          = excluded.features,
  is_active         = excluded.is_active;
