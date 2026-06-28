-- ============================================================================
-- Brother Store — galeria de imagens do produto
-- Rode este arquivo no SQL Editor do Supabase (idempotente).
--
-- products.image continua sendo a CAPA (usada em cards, carrinho, etc.).
-- products.images guarda a galeria completa (ordenada) para o carrossel.
-- ============================================================================

alter table public.products
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Backfill: produtos que já têm capa entram na galeria com a própria capa.
update public.products
  set images = jsonb_build_array(image)
  where (images is null or images = '[]'::jsonb) and coalesce(image, '') <> '';
