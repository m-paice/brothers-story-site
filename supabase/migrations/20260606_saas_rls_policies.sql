-- ============================================================================
-- SaaS Migration 6/8 — Atualiza políticas RLS para multi-tenant
-- Idempotente. Rode APÓS saas_5_helper_functions.sql.
-- ============================================================================

-- ============================================================================
-- PRODUCTS
-- ============================================================================
drop policy if exists "products_select_public"        on public.products;
drop policy if exists "products_write_authenticated"   on public.products;
drop policy if exists "products_write_admin"           on public.products;

-- Leitura pública apenas dos produtos da loja acessada
create policy "products_select_public" on public.products
  for select using (true);

-- Escrita: membro admin/owner da loja OU global admin
create policy "products_write_store_admin" on public.products
  for all to authenticated
  using  (public.is_store_admin(store_id) or public.is_global_admin())
  with check (public.is_store_admin(store_id) or public.is_global_admin());

-- ============================================================================
-- PRODUCT_VARIANTS
-- ============================================================================
drop policy if exists "variants_select_public"        on public.product_variants;
drop policy if exists "variants_write_authenticated"   on public.product_variants;
drop policy if exists "variants_write_admin"           on public.product_variants;

create policy "variants_select_public" on public.product_variants
  for select using (true);

create policy "variants_write_store_admin" on public.product_variants
  for all to authenticated
  using  (public.is_store_admin(store_id) or public.is_global_admin())
  with check (public.is_store_admin(store_id) or public.is_global_admin());

-- ============================================================================
-- ORDERS
-- ============================================================================
drop policy if exists "orders_select_own_or_admin"    on public.orders;
drop policy if exists "orders_update_admin"           on public.orders;
drop policy if exists "orders_delete_admin"           on public.orders;

-- Cliente lê seus próprios pedidos; admin da loja lê todos da loja
create policy "orders_select" on public.orders
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_store_admin(store_id)
    or public.is_global_admin()
  );

-- Insert: anon e authenticated (checkout)
create policy "orders_insert_public" on public.orders
  for insert to anon, authenticated with check (true);

create policy "orders_update_store_admin" on public.orders
  for update to authenticated
  using  (public.is_store_admin(store_id) or public.is_global_admin())
  with check (public.is_store_admin(store_id) or public.is_global_admin());

create policy "orders_delete_store_admin" on public.orders
  for delete to authenticated
  using (public.is_store_admin(store_id) or public.is_global_admin());

-- ============================================================================
-- SALES
-- ============================================================================
drop policy if exists "sales_all_authenticated"       on public.sales;
drop policy if exists "sales_all_admin"               on public.sales;

create policy "sales_store_admin" on public.sales
  for all to authenticated
  using  (public.is_store_admin(store_id) or public.is_global_admin())
  with check (public.is_store_admin(store_id) or public.is_global_admin());

-- ============================================================================
-- STORE_SETTINGS
-- ============================================================================
drop policy if exists "public read store_settings"    on public.store_settings;
drop policy if exists "admin write store_settings"    on public.store_settings;

create policy "store_settings_select_public" on public.store_settings
  for select using (true);

create policy "store_settings_write_admin" on public.store_settings
  for all to authenticated
  using  (public.is_store_admin(store_id) or public.is_global_admin())
  with check (public.is_store_admin(store_id) or public.is_global_admin());

-- ============================================================================
-- STORES
-- ============================================================================
drop policy if exists "stores_select_public" on public.stores;

create policy "stores_select_public" on public.stores
  for select using (true);

create policy "stores_update_owner" on public.stores
  for update to authenticated
  using  (public.is_store_owner(id) or public.is_global_admin())
  with check (public.is_store_owner(id) or public.is_global_admin());

create policy "stores_insert_global_admin" on public.stores
  for insert to authenticated
  with check (public.is_global_admin());

create policy "stores_delete_global_admin" on public.stores
  for delete to authenticated
  using (public.is_global_admin());

-- ============================================================================
-- STORE_MEMBERS
-- ============================================================================
drop policy if exists "store_members_authenticated" on public.store_members;

-- Membros leem membros da própria loja
create policy "store_members_select" on public.store_members
  for select to authenticated
  using (public.is_store_member(store_id) or public.is_global_admin());

-- Apenas owner/admin da loja gerencia membros
create policy "store_members_write" on public.store_members
  for all to authenticated
  using  (public.is_store_admin(store_id) or public.is_global_admin())
  with check (public.is_store_admin(store_id) or public.is_global_admin());

-- ============================================================================
-- STORE_SUBSCRIPTIONS
-- ============================================================================
drop policy if exists "store_subscriptions_authenticated" on public.store_subscriptions;

create policy "store_subscriptions_select" on public.store_subscriptions
  for select to authenticated
  using (public.is_store_member(store_id) or public.is_global_admin());

create policy "store_subscriptions_write_global" on public.store_subscriptions
  for all to authenticated
  using  (public.is_global_admin())
  with check (public.is_global_admin());

-- ============================================================================
-- TENANT_CREDENTIALS
-- ============================================================================
drop policy if exists "tenant_credentials_authenticated" on public.tenant_credentials;

-- Somente o admin da loja vê e edita suas credenciais
create policy "tenant_credentials_select" on public.tenant_credentials
  for select to authenticated
  using (public.is_store_admin(store_id) or public.is_global_admin());

create policy "tenant_credentials_write" on public.tenant_credentials
  for all to authenticated
  using  (public.is_store_admin(store_id) or public.is_global_admin())
  with check (public.is_store_admin(store_id) or public.is_global_admin());

-- ============================================================================
-- PLANS
-- ============================================================================
drop policy if exists "plans_select_public" on public.plans;

create policy "plans_select_public" on public.plans
  for select using (true);

create policy "plans_write_global_admin" on public.plans
  for all to authenticated
  using  (public.is_global_admin())
  with check (public.is_global_admin());
