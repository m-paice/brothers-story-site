-- ============================================================================
-- Brother Store — variação por COR + TAMANHO (estoque por combinação)
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
--
-- A variação passa a ser a combinação (cor, tamanho), cada uma com seu estoque.
-- Variações antigas ficam com cor vazia (produtos só com tamanho seguem valendo).
-- ============================================================================

alter table public.product_variants
  add column if not exists color text not null default '';

-- Troca a unicidade de (produto, tamanho) para (produto, cor, tamanho).
alter table public.product_variants
  drop constraint if exists product_variants_product_id_size_key;

-- Cria a nova unicidade (ignora se já existir).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_variants_prod_color_size_key'
  ) then
    alter table public.product_variants
      add constraint product_variants_prod_color_size_key
      unique (product_id, color, size);
  end if;
end $$;
