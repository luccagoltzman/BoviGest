-- Pagamentos parcelados de compras de gado (rodar no Supabase SQL Editor)

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

alter table compras_parcelas enable row level security;

create policy "compras_parcelas_por_empresa" on compras_parcelas for all using (
  empresa_id in (
    select empresa_id
    from usuarios_empresas
    where user_id = auth.uid()
  )
);
