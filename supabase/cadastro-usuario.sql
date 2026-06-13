-- Cadastro com e-mail pré-autorizado pelo admin — rodar no SQL Editor do Supabase

-- user_id fica nulo até o usuário concluir o cadastro
alter table usuarios_empresas alter column user_id drop not null;

-- status: 0 inativo, 1 ativo, 2 aguardando cadastro
alter table usuarios_empresas drop constraint if exists usuarios_empresas_status_check;
alter table usuarios_empresas add constraint usuarios_empresas_status_check
  check (status in (0, 1, 2));

drop index if exists usuarios_empresas_user_id_idx;
create unique index if not exists usuarios_empresas_user_id_idx
  on usuarios_empresas (user_id)
  where user_id is not null;

create unique index if not exists usuarios_empresas_empresa_email_idx
  on usuarios_empresas (empresa_id, lower(email))
  where email is not null;

-- Verifica se o e-mail foi autorizado (anon pode chamar antes do signUp)
create or replace function public.verificar_email_cadastro(p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row usuarios_empresas%rowtype;
begin
  select * into v_row
  from usuarios_empresas
  where lower(trim(email)) = lower(trim(p_email))
    and user_id is null
    and status = 2
  limit 1;

  if not found then
    return json_build_object('autorizado', false);
  end if;

  return json_build_object(
    'autorizado', true,
    'perfil', v_row.perfil
  );
end;
$$;

-- Vincula auth.uid() ao convite pendente após signUp / primeiro login
create or replace function public.completar_cadastro_usuario(p_nome text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_nome text;
  v_row usuarios_empresas%rowtype;
begin
  if v_user_id is null then
    raise exception 'Não autenticado';
  end if;

  select u.email, coalesce(nullif(trim(p_nome), ''), u.raw_user_meta_data->>'nome')
  into v_email, v_nome
  from auth.users u
  where u.id = v_user_id;

  if v_email is null then
    raise exception 'Usuário não encontrado';
  end if;

  if v_nome is null or trim(v_nome) = '' then
    raise exception 'Informe o nome completo';
  end if;

  select * into v_row
  from usuarios_empresas
  where lower(trim(email)) = lower(trim(v_email))
    and user_id is null
    and status = 2
  limit 1;

  if not found then
    raise exception 'E-mail não autorizado ou cadastro já concluído';
  end if;

  update usuarios_empresas
  set user_id = v_user_id,
      nome = trim(v_nome),
      status = 1
  where id = v_row.id;

  return json_build_object(
    'empresa_id', v_row.empresa_id,
    'perfil', v_row.perfil,
    'nome', trim(v_nome)
  );
end;
$$;

grant execute on function public.verificar_email_cadastro(text) to anon, authenticated;
grant execute on function public.completar_cadastro_usuario(text) to authenticated;

-- No Supabase: Authentication → Providers → Email → desative "Confirm email"
-- para login imediato após o cadastro em /cadastro (sem e-mail de confirmação).
