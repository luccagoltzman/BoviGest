-- Bucket de logos das empresas — executar no SQL Editor do Supabase
-- Corrige: {"statusCode":"404","error":"Bucket not found"}

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

-- Políticas (recriar para evitar conflito ao rodar de novo)
drop policy if exists "logos_public_read" on storage.objects;
drop policy if exists "logos_authenticated_select" on storage.objects;
drop policy if exists "logos_authenticated_insert" on storage.objects;
drop policy if exists "logos_authenticated_update" on storage.objects;
drop policy if exists "logos_authenticated_delete" on storage.objects;

-- Leitura pública (exibir logo no app)
create policy "logos_public_read"
on storage.objects for select
to public
using (bucket_id = 'logos');

-- SELECT para authenticated (necessário para upsert/substituir arquivo)
create policy "logos_authenticated_select"
on storage.objects for select
to authenticated
using (bucket_id = 'logos');

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
