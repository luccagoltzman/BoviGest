-- Romaneio de pesagem pós-abate — rodar no SQL Editor do Supabase

create table if not exists romaneios (
  id bigserial primary key,
  empresa_id int not null references empresas (id),
  abate_id bigint not null references abates (id) on delete cascade,
  fornecedor_id uuid references fornecedores (id),
  fornecedor_nome text,
  data_romaneio date not null,
  observacao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (abate_id)
);

create table if not exists romaneio_itens (
  id bigserial primary key,
  romaneio_id bigint not null references romaneios (id) on delete cascade,
  ordem int not null check (ordem > 0),
  dianteiro_1 numeric(12, 2) not null default 0,
  dianteiro_2 numeric(12, 2) not null default 0,
  traseiro_1 numeric(12, 2) not null default 0,
  traseiro_2 numeric(12, 2) not null default 0,
  tipo text not null default 'VACA',
  unique (romaneio_id, ordem)
);

create index if not exists romaneios_empresa_id_idx on romaneios (empresa_id);
create index if not exists romaneios_abate_id_idx on romaneios (abate_id);
create index if not exists romaneio_itens_romaneio_id_idx on romaneio_itens (romaneio_id);

create index if not exists romaneios_fornecedor_id_idx on romaneios (fornecedor_id);

-- Se a tabela já existir sem o vínculo ao cadastro de fornecedores:
alter table romaneios add column if not exists fornecedor_id uuid references fornecedores (id);

alter table romaneios enable row level security;
alter table romaneio_itens enable row level security;

drop policy if exists romaneios_select on romaneios;
drop policy if exists romaneios_insert on romaneios;
drop policy if exists romaneios_update on romaneios;
drop policy if exists romaneios_delete on romaneios;

create policy romaneios_select on romaneios for select to authenticated
using (empresa_id = public.current_user_empresa_id());

create policy romaneios_insert on romaneios for insert to authenticated
with check (empresa_id = public.current_user_empresa_id());

create policy romaneios_update on romaneios for update to authenticated
using (empresa_id = public.current_user_empresa_id())
with check (empresa_id = public.current_user_empresa_id());

create policy romaneios_delete on romaneios for delete to authenticated
using (empresa_id = public.current_user_empresa_id());

drop policy if exists romaneio_itens_select on romaneio_itens;
drop policy if exists romaneio_itens_insert on romaneio_itens;
drop policy if exists romaneio_itens_update on romaneio_itens;
drop policy if exists romaneio_itens_delete on romaneio_itens;

create policy romaneio_itens_select on romaneio_itens for select to authenticated
using (
  romaneio_id in (
    select id from romaneios where empresa_id = public.current_user_empresa_id()
  )
);

create policy romaneio_itens_insert on romaneio_itens for insert to authenticated
with check (
  romaneio_id in (
    select id from romaneios where empresa_id = public.current_user_empresa_id()
  )
);

create policy romaneio_itens_update on romaneio_itens for update to authenticated
using (
  romaneio_id in (
    select id from romaneios where empresa_id = public.current_user_empresa_id()
  )
);

create policy romaneio_itens_delete on romaneio_itens for delete to authenticated
using (
  romaneio_id in (
    select id from romaneios where empresa_id = public.current_user_empresa_id()
  )
);
