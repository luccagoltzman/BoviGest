-- Quem efetua o pagamento + favoritos por cliente
alter table recebimentos_clientes
add column if not exists nome_pagador text;

comment on column recebimentos_clientes.nome_pagador is
  'Nome de quem efetivamente pagou (pode ser diferente do cliente devedor)';

create table if not exists recebimentos_pagadores_favoritos (
  id bigserial primary key,
  empresa_id int not null references empresas (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists recebimentos_pagadores_favoritos_unique_nome
  on recebimentos_pagadores_favoritos (empresa_id, cliente_id, lower(trim(nome)));

create index if not exists idx_pagadores_favoritos_cliente
  on recebimentos_pagadores_favoritos (empresa_id, cliente_id);

alter table recebimentos_pagadores_favoritos enable row level security;

drop policy if exists recebimentos_pagadores_favoritos_select on recebimentos_pagadores_favoritos;
drop policy if exists recebimentos_pagadores_favoritos_insert on recebimentos_pagadores_favoritos;
drop policy if exists recebimentos_pagadores_favoritos_delete on recebimentos_pagadores_favoritos;

create policy recebimentos_pagadores_favoritos_select
  on recebimentos_pagadores_favoritos for select
  using (empresa_id = public.current_user_empresa_id());

create policy recebimentos_pagadores_favoritos_insert
  on recebimentos_pagadores_favoritos for insert
  with check (empresa_id = public.current_user_empresa_id());

create policy recebimentos_pagadores_favoritos_delete
  on recebimentos_pagadores_favoritos for delete
  using (empresa_id = public.current_user_empresa_id());
