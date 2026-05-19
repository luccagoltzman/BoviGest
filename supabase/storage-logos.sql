-- Executar no SQL Editor do Supabase
-- Cria bucket público para logos das empresas

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública
create policy "logos_public_read"
on storage.objects for select
to public
using (bucket_id = 'logos');

-- Upload/atualização por usuários autenticados
create policy "logos_authenticated_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'logos');

create policy "logos_authenticated_update"
on storage.objects for update
to authenticated
using (bucket_id = 'logos')
with check (bucket_id = 'logos');

create policy "logos_authenticated_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'logos');
