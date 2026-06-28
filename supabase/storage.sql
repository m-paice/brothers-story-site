-- Bucket público para imagens de produto
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

-- Leitura pública (loja exibe as imagens sem autenticação)
create policy "public read produtos"
  on storage.objects for select
  using (bucket_id = 'produtos');

-- Upload restrito a admins autenticados
create policy "admin insert produtos"
  on storage.objects for insert
  with check (bucket_id = 'produtos' and auth.role() = 'authenticated');

-- Update e delete restrito a admins autenticados
create policy "admin update produtos"
  on storage.objects for update
  using (bucket_id = 'produtos' and auth.role() = 'authenticated');

create policy "admin delete produtos"
  on storage.objects for delete
  using (bucket_id = 'produtos' and auth.role() = 'authenticated');
