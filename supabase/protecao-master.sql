-- Proteção de usuários Master — rodar no SQL Editor do Supabase
-- Administradores não podem inativar, excluir nem alterar usuários Master.

create or replace function public.current_user_perfil()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select perfil
  from usuarios_empresas
  where user_id = auth.uid()
  limit 1;
$$;

drop policy if exists "usuarios_empresas_insert" on usuarios_empresas;
drop policy if exists "usuarios_empresas_update" on usuarios_empresas;
drop policy if exists "usuarios_empresas_delete" on usuarios_empresas;

create policy "usuarios_empresas_insert"
on usuarios_empresas for insert
to authenticated
with check (
  empresa_id = public.current_user_empresa_id()
  and (
    public.current_user_perfil() = 'master'
    or perfil <> 'master'
  )
);

create policy "usuarios_empresas_update"
on usuarios_empresas for update
to authenticated
using (
  empresa_id = public.current_user_empresa_id()
  and (
    public.current_user_perfil() = 'master'
    or perfil <> 'master'
  )
)
with check (
  empresa_id = public.current_user_empresa_id()
  and (
    public.current_user_perfil() = 'master'
    or perfil <> 'master'
  )
);

create policy "usuarios_empresas_delete"
on usuarios_empresas for delete
to authenticated
using (
  empresa_id = public.current_user_empresa_id()
  and (
    public.current_user_perfil() = 'master'
    or perfil <> 'master'
  )
);
