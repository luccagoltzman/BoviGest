-- Prestadores de serviço (ex.: dono do abatedouro)

create table if not exists prestadores_servico (
  id uuid primary key default gen_random_uuid(),
  empresa_id int not null references empresas (id),
  nome text not null,
  doc text,
  telefone text,
  data_nascimento date,
  cep text,
  endereco text,
  numero text,
  bairro text,
  cidade text,
  uf text,
  complemento text,
  dados_bancarios text,
  banco text,
  agencia text,
  conta text,
  tipo_conta text,
  titular_conta text,
  pix_tipo text,
  pix_chave text,
  status smallint not null default 1 check (status in (0, 1)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists prestadores_servico_empresa_id_idx
  on prestadores_servico (empresa_id);

alter table prestadores_servico enable row level security;

drop policy if exists prestadores_servico_select on prestadores_servico;
drop policy if exists prestadores_servico_insert on prestadores_servico;
drop policy if exists prestadores_servico_update on prestadores_servico;
drop policy if exists prestadores_servico_delete on prestadores_servico;

create policy prestadores_servico_select on prestadores_servico for select to authenticated
using (empresa_id = public.current_user_empresa_id());

create policy prestadores_servico_insert on prestadores_servico for insert to authenticated
with check (empresa_id = public.current_user_empresa_id());

create policy prestadores_servico_update on prestadores_servico for update to authenticated
using (empresa_id = public.current_user_empresa_id())
with check (empresa_id = public.current_user_empresa_id());

create policy prestadores_servico_delete on prestadores_servico for delete to authenticated
using (empresa_id = public.current_user_empresa_id());
