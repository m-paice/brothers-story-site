-- ============================================================================
-- SaaS Migration 3/8 — Backfill: cria loja padrão e migra dados existentes
-- Idempotente. Rode APÓS saas_2_add_store_id.sql.
--
-- Cria um plano Free e a loja "Brothers Story" com todos os dados atuais.
-- Os dados existentes (produtos, pedidos, etc.) são vinculados a essa loja.
-- ============================================================================

do $$
declare
  v_plan_id  uuid;
  v_store_id uuid;
  v_owner_id uuid;
begin

  -- 1. Plano Free (caso seed ainda não rodou)
  insert into public.plans (name, slug, price, max_products, max_orders_month, features)
  values ('Free', 'free', 0, 50, 100, '["dashboard", "produtos", "pedidos", "vendas"]')
  on conflict (slug) do nothing;

  select id into v_plan_id from public.plans where slug = 'free';

  -- 2. Loja padrão "Brothers Story"
  --    Usa o primeiro usuário com role = 'admin' como dono; se não houver, owner_id = null.
  select p.id into v_owner_id
  from public.profiles p
  where p.role = 'admin'
  limit 1;

  insert into public.stores (id, slug, name, owner_id, plan_id, status)
  values (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'brothers-story',
    'Brothers Story',
    v_owner_id,
    v_plan_id,
    'active'
  )
  on conflict (id) do nothing;

  select id into v_store_id from public.stores where slug = 'brothers-story';

  -- 3. Credenciais vazias para a loja padrão
  insert into public.tenant_credentials (store_id)
  values (v_store_id)
  on conflict (store_id) do nothing;

  -- 4. Assinatura no plano Free
  insert into public.store_subscriptions (store_id, plan_id, status)
  values (v_store_id, v_plan_id, 'active')
  on conflict do nothing;

  -- 5. Dono como membro da loja (role = owner)
  if v_owner_id is not null then
    insert into public.store_members (store_id, user_id, role)
    values (v_store_id, v_owner_id, 'owner')
    on conflict (store_id, user_id) do nothing;

    -- Também todos os outros admins viram membros
    insert into public.store_members (store_id, user_id, role)
    select v_store_id, p.id, 'admin'
    from public.profiles p
    where p.role = 'admin' and p.id != v_owner_id
    on conflict (store_id, user_id) do nothing;
  end if;

  -- 6. Backfill: products
  update public.products
  set store_id = v_store_id
  where store_id is null;

  -- 7. Backfill: product_variants (via product)
  update public.product_variants pv
  set store_id = p.store_id
  from public.products p
  where pv.product_id = p.id
    and pv.store_id is null;

  -- 8. Backfill: orders
  update public.orders
  set store_id = v_store_id
  where store_id is null;

  -- 9. Backfill: sales
  update public.sales
  set store_id = v_store_id
  where store_id is null;

  -- 10. Backfill: store_settings (linha id=1)
  update public.store_settings
  set store_id = v_store_id
  where store_id is null;

  -- 11. Preferred store para todos os perfis que ainda não têm
  update public.profiles
  set current_store_id = v_store_id
  where current_store_id is null;

end $$;
