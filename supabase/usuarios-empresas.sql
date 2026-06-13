-- Campos e políticas para gestão de usuários — rodar no SQL Editor do Supabase

alter table usuarios_empresas add column if not exists nome text;
alter table usuarios_empresas add column if not exists email text;
alter table usuarios_empresas add column if not exists perfil text not null default 'operador';
alter table usuarios_empresas add column if not exists status smallint not null default 1;
alter table usuarios_empresas alter column user_id drop not null;

alter table usuarios_empresas drop constraint if exists usuarios_empresas_status_check;
alter table usuarios_empresas add constraint usuarios_empresas_status_check
  check (status in (0, 1, 2));
-- status: 0 inativo, 1 ativo, 2 aguardando cadastro (user_id nulo)
alter table usuarios_empresas add column if not exists created_at timestamptz default now();

alter table usuarios_empresas drop constraint if exists usuarios_empresas_perfil_check;
alter table usuarios_empresas add constraint usuarios_empresas_perfil_check
  check (perfil in ('master', 'administrador', 'operador', 'financeiro'));

create unique index if not exists usuarios_empresas_user_id_idx
  on usuarios_empresas (user_id);

create index if not exists usuarios_empresas_empresa_id_idx
  on usuarios_empresas (empresa_id);

-- Evita recursão infinita nas policies RLS
create or replace function public.current_user_empresa_id()
returns int
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id
  from usuarios_empresas
  where user_id = auth.uid()
  limit 1;
$$;

alter table usuarios_empresas enable row level security;

drop policy if exists "usuarios_empresas_select" on usuarios_empresas;
drop policy if exists "usuarios_empresas_insert" on usuarios_empresas;
drop policy if exists "usuarios_empresas_update" on usuarios_empresas;

create policy "usuarios_empresas_select"
on usuarios_empresas for select
to authenticated
using (empresa_id = public.current_user_empresa_id());

create policy "usuarios_empresas_insert"
on usuarios_empresas for insert
to authenticated
with check (empresa_id = public.current_user_empresa_id());

create policy "usuarios_empresas_update"
on usuarios_empresas for update
to authenticated
using (empresa_id = public.current_user_empresa_id())
with check (empresa_id = public.current_user_empresa_id());

drop policy if exists "usuarios_empresas_delete" on usuarios_empresas;

create policy "usuarios_empresas_delete"
on usuarios_empresas for delete
to authenticated
using (empresa_id = public.current_user_empresa_id());
