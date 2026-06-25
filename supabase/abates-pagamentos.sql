-- Baixa de pagamentos de abates

alter table abates add column if not exists prestador_id uuid references prestadores_servico (id);
alter table abates add column if not exists pagamento_status text not null default 'pendente';
alter table abates add column if not exists data_pagamento date;
alter table abates add column if not exists forma_pagamento text;
alter table abates add column if not exists baixa_id bigint;

create table if not exists abates_baixas (
  id bigserial primary key,
  empresa_id int not null references empresas (id),
  prestador_id uuid not null references prestadores_servico (id),
  data_pagamento date not null,
  semana_inicio date not null,
  semana_fim date not null,
  valor_total numeric(14, 2) not null default 0,
  forma_pagamento text,
  observacao text,
  pagamento_banco text,
  pagamento_agencia text,
  pagamento_conta text,
  pagamento_tipo_conta text,
  pagamento_titular text,
  pagamento_pix_tipo text,
  pagamento_pix_chave text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists abates_baixa_itens (
  id bigserial primary key,
  baixa_id bigint not null references abates_baixas (id) on delete cascade,
  abate_id bigint not null references abates (id) on delete restrict,
  valor numeric(14, 2) not null default 0,
  unique (abate_id)
);

create index if not exists abates_baixas_empresa_id_idx on abates_baixas (empresa_id);
create index if not exists abates_baixas_prestador_id_idx on abates_baixas (prestador_id);
create index if not exists abates_baixa_itens_baixa_id_idx on abates_baixa_itens (baixa_id);
create index if not exists abates_pagamento_status_idx on abates (pagamento_status);
create index if not exists abates_baixa_id_idx on abates (baixa_id);

alter table abates
  drop constraint if exists abates_pagamento_status_check;

alter table abates
  add constraint abates_pagamento_status_check
  check (pagamento_status in ('pendente', 'pago'));

alter table abates_baixas enable row level security;
alter table abates_baixa_itens enable row level security;

drop policy if exists abates_baixas_select on abates_baixas;
drop policy if exists abates_baixas_insert on abates_baixas;
drop policy if exists abates_baixas_update on abates_baixas;
drop policy if exists abates_baixas_delete on abates_baixas;

create policy abates_baixas_select on abates_baixas for select to authenticated
using (empresa_id = public.current_user_empresa_id());

create policy abates_baixas_insert on abates_baixas for insert to authenticated
with check (empresa_id = public.current_user_empresa_id());

create policy abates_baixas_update on abates_baixas for update to authenticated
using (empresa_id = public.current_user_empresa_id())
with check (empresa_id = public.current_user_empresa_id());

create policy abates_baixas_delete on abates_baixas for delete to authenticated
using (empresa_id = public.current_user_empresa_id());

drop policy if exists abates_baixa_itens_select on abates_baixa_itens;
drop policy if exists abates_baixa_itens_insert on abates_baixa_itens;
drop policy if exists abates_baixa_itens_delete on abates_baixa_itens;

create policy abates_baixa_itens_select on abates_baixa_itens for select to authenticated
using (
  baixa_id in (
    select id from abates_baixas where empresa_id = public.current_user_empresa_id()
  )
);

create policy abates_baixa_itens_insert on abates_baixa_itens for insert to authenticated
with check (
  baixa_id in (
    select id from abates_baixas where empresa_id = public.current_user_empresa_id()
  )
);

create policy abates_baixa_itens_delete on abates_baixa_itens for delete to authenticated
using (
  baixa_id in (
    select id from abates_baixas where empresa_id = public.current_user_empresa_id()
  )
);

-- Abates antigos sem status explícito passam a pendente
update abates
set pagamento_status = 'pendente'
where pagamento_status is null;
