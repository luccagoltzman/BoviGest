-- Pagamentos parcelados de compras de gado (rodar no Supabase SQL Editor)
-- Banco já configurado? Rode só supabase/compras-parcelas-conta-pagamento.sql

alter table compras add column if not exists forma_pagamento text;
alter table compras add column if not exists qtd_parcelas int default 1;
alter table compras add column if not exists pagamento_quitado boolean default false;

create table if not exists compras_parcelas (
  id bigserial primary key,
  empresa_id int not null references empresas (id) on delete cascade,
  compra_id bigint not null references compras (id) on delete cascade,
  numero_parcela int not null,
  total_parcelas int not null,
  valor numeric(12, 2) not null,
  data_vencimento date not null,
  data_pagamento date,
  forma_pagamento text,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (compra_id, numero_parcela)
);

create index if not exists idx_compras_parcelas_empresa on compras_parcelas (empresa_id);
create index if not exists idx_compras_parcelas_compra on compras_parcelas (compra_id);
create index if not exists idx_compras_parcelas_vencimento on compras_parcelas (data_vencimento);
create index if not exists idx_compras_parcelas_pagamento on compras_parcelas (data_pagamento);

-- Dados bancários usados em cada pagamento de parcela
alter table compras_parcelas add column if not exists pagamento_banco text;
alter table compras_parcelas add column if not exists pagamento_agencia text;
alter table compras_parcelas add column if not exists pagamento_conta text;
alter table compras_parcelas add column if not exists pagamento_tipo_conta text;
alter table compras_parcelas add column if not exists pagamento_titular text;
alter table compras_parcelas add column if not exists pagamento_pix_tipo text;
alter table compras_parcelas add column if not exists pagamento_pix_chave text;

alter table compras_parcelas enable row level security;

drop policy if exists "compras_parcelas_por_empresa" on compras_parcelas;

create policy "compras_parcelas_por_empresa" on compras_parcelas for all using (
  empresa_id in (
    select empresa_id
    from usuarios_empresas
    where user_id = auth.uid()
  )
);
