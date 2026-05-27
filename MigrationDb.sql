drop table if exists usuarios_empresas CASCADE;
drop table if exists clientes CASCADE;
drop table if exists empresas CASCADE;

create table empresas (
  id int4 primary key generated always as identity,
  nome text not null
);

insert into empresas (nome) values ('teste');

create table usuarios_empresas (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null,
  empresa_id int4 not null references empresas (id)
);

--- CLIENTS --
create table clientes (
  id uuid primary key default gen_random_uuid (),
  empresa_id int4 not null references empresas (id),
  nome text not null,
  doc text not null,
  telefone text,
  endereco text,
  limite_credito numeric,
  status smallint default 1 check (status in (0, 1)),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table clientes ENABLE row LEVEL SECURITY;

create policy clientes_por_empresa on clientes for all using (
  empresa_id in (
    select
      empresa_id
    from
      usuarios_empresas
    where
      user_id = auth.uid ()
  )
);

insert into
  clientes (
    empresa_id,
    nome,
    doc,
    telefone,
    endereco,
    limite_credito,
    status
  )
values
  (
    1,
    'Açougue Central',
    '98.765.432/0001-10',
    '(16) 98888-1111',
    'Rua A, 100',
    50000,
    1
  ),
  (
    1,
    'Super Carnes Ltda',
    '87.654.321/0001-20',
    '(16) 97777-2222',
    'Av. B, 200',
    80000,
    1
  ),
  (
    1,
    'Frigorífico Regional',
    '76.543.210/0001-30',
    '(17) 96666-3333',
    'Rua C, 300',
    120000,
    1
  ),
  (
    1,
    'Açougue do Bairro',
    '65.432.109/0001-40',
    '(16) 95555-4444',
    'Rua D, 400',
    25000,
    1
  ),
  (
    1,
    'Restaurante Churrascaria',
    '54.321.098/0001-50',
    '(16) 94444-5555',
    'Av. E, 500',
    35000,
    1
  ),
  (
    1,
    'Mercado do Produtor',
    '43.210.987/0001-60',
    '(18) 93333-6666',
    'Rua F, 600',
    60000,
    1
  ),
  (
    1,
    'Distribuidora Carnes Norte',
    '32.109.876/0001-70',
    '(19) 92222-7777',
    'Av. G, 700',
    90000,
    1
  ),
  (
    1,
    'Açougue Premium',
    '21.098.765/0001-80',
    '(16) 91111-8888',
    'Rua H, 800',
    40000,
    1
  ),
  (
    1,
    'Mercearia São João',
    '12.345.678/0001-90',
    '(16) 90000-1111',
    'Rua I, 900',
    30000,
    1
  ),
  (
    1,
    'Padaria Pão Quente',
    '11.234.567/0001-01',
    '(16) 90000-2222',
    'Av. J, 1000',
    20000,
    1
  );

--- FORNECEDORES ---
create table fornecedores (
  id uuid primary key default gen_random_uuid (),
  empresa_id int not null,
  nome text not null,
  doc text not null,
  telefone text,
  cidade text,
  endereco text,
  dados_bancarios text,
  status smallint default 1 check (status in (0, 1)), -- 1 = ativo, 0 = inativo
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table fornecedores enable row level security;

create policy "fornecedores_por_empresa" on fornecedores for all using (
  empresa_id in (
    select
      empresa_id
    from
      usuarios_empresas
    where
      user_id = auth.uid ()
  )
);

insert into
  fornecedores (
    empresa_id,
    nome,
    doc,
    telefone,
    cidade,
    endereco,
    dados_bancarios
  )
values
  (
    1,
    'Fazenda São João',
    '12.345.678/0001-90',
    '(16) 99234-5678',
    'Ribeirão Preto',
    'Rua A, 123',
    'Banco X, 1234, 56789-0'
  ),
  (
    1,
    'Fazenda Santa Maria',
    '23.456.789/0001-01',
    '(16) 98123-4567',
    'Sertãozinho',
    'Rua B, 456',
    'Banco Y, 4321, 98765-0'
  ),
  (
    1,
    'Rancho do Vale',
    '34.567.890/0001-12',
    '(17) 98765-4321',
    'Barretos',
    'Rua C, 789',
    'Banco Z, 5678, 12345-6'
  ),
  (
    1,
    'Fazenda Boi Gordo',
    '45.678.901/0001-23',
    '(18) 97654-3210',
    'Araçatuba',
    'Rua D, 101',
    'Banco X, 8765, 54321-0'
  ),
  (
    1,
    'Sítio Esperança',
    '56.789.012/0001-34',
    '(19) 96543-2109',
    'Piracicaba',
    'Rua E, 202',
    'Banco Y, 1357, 24680-9'
  );

--- Custos operacinas ---
create table if not exists public.custos_operacionais (
  id uuid default gen_random_uuid () primary key,
  empresa_id int not null,
  data date not null,
  categoria text not null,
  descricao text not null,
  valor numeric(12, 2) not null,
  centro_custo text,
  status smallint default 1, -- 1 = ativo, 0 = excluído
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Índice para buscar por empresa
create index if not exists idx_custos_empresa on public.custos_operacionais (empresa_id);

alter table custos_operacionais enable row level security;

create policy "custos_operacionais_por_empresa" on custos_operacionais for all using (
  empresa_id in (
    select
      empresa_id
    from
      usuarios_empresas
    where
      user_id = auth.uid ()
  )
);

insert into
  public.custos_operacionais (
    empresa_id,
    data,
    categoria,
    descricao,
    valor,
    centro_custo
  )
values
  (
    '1',
    '2025-02-15',
    'Energia',
    'Conta de luz - sede',
    1200.00,
    'Produção'
  ),
  (
    '1',
    '2025-02-14',
    'Transporte',
    'Combustível - frota',
    3500.00,
    'Logística'
  ),
  (
    '1',
    '2025-02-10',
    'Funcionários',
    'Salários - fev/25',
    18500.00,
    'Administrativo'
  ),
  (
    '1',
    '2025-02-08',
    'Embalagem',
    'Caixas e plástico',
    890.00,
    'Produção'
  ),
  (
    '1',
    '2025-02-05',
    'Manutenção',
    'Manutenção câmara fria',
    2200.00,
    'Produção'
  ),
  (
    '1',
    '2025-02-01',
    'Impostos',
    'ISS e encargos',
    3100.00,
    'Administrativo'
  ),
  (
    '1',
    '2025-01-28',
    'Abate',
    'Taxa inspeção sanitária',
    450.00,
    'Produção'
  ),
  (
    '1',
    '2025-01-25',
    'Outros',
    'Material de escritório',
    320.00,
    'Administrativo'
  ),
  (
    '1',
    '2025-01-20',
    'Transporte',
    'Frete - vendas externas',
    1800.00,
    'Logística'
  ),
  (
    '1',
    '2025-01-15',
    'Funcionários',
    'Vale refeição - colaboradores',
    2500.00,
    'Administrativo'
  );

--- configuracoes ----
create table if not exists public.configuracoes (
  id uuid default gen_random_uuid () primary key,
  empresa_id int not null references empresas (id),
  logo_file text,
  primary_color text,
  secondary_color text,
  sidebar_color text,
  sidebar_end_color text,
  button_gradient_end_color text,
  background_glow_color text,
  status smallint default 1 check (status in (0, 1)),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create unique index if not exists idx_configuracoes_empresa on public.configuracoes (empresa_id);

alter table public.configuracoes enable row level security;

create policy "configuracoes_por_empresa" on public.configuracoes for all using (
  empresa_id in (
    select
      empresa_id
    from
      usuarios_empresas
    where
      user_id = auth.uid ()
  )
);

insert into
  public.configuracoes (
    empresa_id,
    logo_file,
    primary_color,
    secondary_color,
    sidebar_color,
    sidebar_end_color,
    button_gradient_end_color,
    background_glow_color
  )
values
  (
    1,
    '',
    '#003944',
    '#ba5912',
    '#0f2f1d',
    '#092012',
    '#138ea7',
    '#138ea7'
  );

-- Para o frigorifico Maramil -- update configuracoes
UPDATE configuracoes
SET
  logo_file = 'https://xgruezbenfvnlrvnxyng.supabase.co/storage/v1/object/public/system-logos/WhatsApp%20Image%202026-05-13%20at%2015.59.10.jpeg',
  primary_color = '#256f3e',
  secondary_color = '#d69e2e',
  sidebar_color = '#11351f',
  sidebar_end_color = '#092012',
  button_gradient_end_color = '#38a169',
  background_glow_color = '#38a169',
  status = 1,
  updated_at = NOW()
WHERE
  empresa_id = 1;

--- Compras de gato ----
create table compras (
  id bigserial primary key,
  empresa_id int not null references empresas (id),
  fornecedor_id uuid not null references fornecedores (id),
  data date not null,
  quantidade_animais int not null,
  -- 0 = morto | 1 = vivo
  condicao_gado smallint not null default 1,
  peso_total numeric(12, 2) not null,
  valor_total numeric(12, 2) not null,
  tipo_gado text,
  observacoes text,
  status text default 'Pendente',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table compras add column valor_imposto numeric(12,2) default 0,
add column valor_kg numeric(12,2) default 0,
add column subtotal numeric(12,2) default 0,
add column gta_valor numeric(12,2) default 0,
add column tipo_imposto text default 'fixo',
add column valor_final numeric(12,2) default 0;

comment on column compras.condicao_gado is '0 = morto | 1 = vivo';

create index idx_compras_empresa on compras (empresa_id);

create index idx_compras_fornecedor on compras (fornecedor_id);

alter table compras enable row level security;

create policy "compras_por_empresa" on compras for all using (
  empresa_id in (
    select
      empresa_id
    from
      usuarios_empresas
    where
      user_id = auth.uid ()
  )
);

--- Viagens ----
create table viagens (
  id bigint generated always as identity primary key,
  empresa_id int not null references empresas (id),
  referencia_tipo text not null,
  referencia_id bigint,
  data date not null,
  veiculo text not null,
  motorista text,
  origem text not null,
  destino text not null,
  finalidade text,
  km numeric(10, 2),
  carga_kg numeric(12, 2),
  custo_total numeric(12, 2) default 0,
  observacoes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_viagens_empresa on viagens (empresa_id);

create index idx_viagens_referencia on viagens (referencia_tipo, referencia_id);

alter table viagens enable row level security;

create policy "viagens_por_empresa" on viagens for all using (
  empresa_id in (
    select
      empresa_id
    from
      usuarios_empresas
    where
      user_id = auth.uid ()
  )
);


--- MOVIMENTACOES CLIENTES ---
create table movimentacoes_clientes (
  id bigserial primary key,
  empresa_id int not null references empresas(id),
  cliente_id uuid not null references clientes(id),
  observacao text,
  data_movimentacao date not null default current_date,
  movimentacao_status text default 'Pendente',
  valor_total numeric(12,2) not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_movimentacoes_clientes_empresa
on movimentacoes_clientes(empresa_id);

create index idx_movimentacoes_clientes_cliente
on movimentacoes_clientes(cliente_id);

alter table movimentacoes_clientes enable row level security;

create policy "movimentacoes_clientes_por_empresa"
on movimentacoes_clientes
for all
using (
  empresa_id in (
    select empresa_id
    from usuarios_empresas
    where user_id = auth.uid()
  )
);

--- ITENS DA MOVIMENTACAO ---
create table movimentacao_itens (
  id bigserial primary key,

  movimentacao_cliente_id bigint not null
  references movimentacoes_clientes(id)
  on delete cascade,
  tipo_corte text not null,
  peso_total_kg numeric(12,2) not null default 0,
  valor_kg numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_movimentacao_itens_movimentacao
on movimentacao_itens(movimentacao_cliente_id);

create index idx_movimentacao_itens_corte
on movimentacao_itens(tipo_corte);

--- COMPOSICAO DOS ITENS ---
create table movimentacao_item_composicoes (
  id bigserial primary key,
  movimentacao_item_id bigint not null
  references movimentacao_itens(id)
  on delete cascade,
  tipo_corte text not null,
  peso_kg numeric(12,2) not null default 0,
  created_at timestamp with time zone default now()
);

create index idx_movimentacao_item_composicoes_item
on movimentacao_item_composicoes(movimentacao_item_id);

create index idx_movimentacao_item_composicoes_corte
on movimentacao_item_composicoes(tipo_corte);

--- RECEBIMENTOS CLIENTES ---
create table recebimentos_clientes (
  id bigserial primary key,
  empresa_id int not null references empresas(id),
  cliente_id uuid not null
  references clientes(id),
  valor numeric(12,2) not null,
  forma_pagamento text,
  observacao text,
  data_recebimento date not null default current_date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_recebimentos_clientes_empresa
on recebimentos_clientes(empresa_id);

create index idx_recebimentos_clientes_cliente
on recebimentos_clientes(cliente_id);

alter table recebimentos_clientes enable row level security;

create policy "recebimentos_clientes_por_empresa"
on recebimentos_clientes
for all
using (
  empresa_id in (
    select empresa_id
    from usuarios_empresas
    where user_id = auth.uid()
  )
);

----- ESTOQUE DE CORTES ---------

-- =========================
-- ESTOQUE MOVIMENTAÇÕES
-- =========================

drop table if exists estoque_movimentacoes cascade;

create table estoque_movimentacoes (
  id bigserial primary key,
  empresa_id int not null references empresas (id),
  lote text not null,

  tipo_movimentacao smallint not null check (tipo_movimentacao in (0, 1)),

  peso_bruto_kg numeric(12, 2) not null default 0,
  peso_liquido_kg numeric(12, 2) not null default 0,

  data_movimentacao date not null default current_date,
  observacoes text,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table estoque_movimentacoes
add column referencia_venda_id bigint null;

create index idx_estoque_empresa on estoque_movimentacoes (empresa_id);
create index idx_estoque_lote on estoque_movimentacoes (lote);
create index idx_estoque_tipo on estoque_movimentacoes (tipo_movimentacao);

alter table estoque_movimentacoes enable row level security;

create policy "estoque_movimentacoes_por_empresa" on estoque_movimentacoes
for all using (
  empresa_id in (
    select empresa_id
    from usuarios_empresas
    where user_id = auth.uid()
  )
);

-- =========================
-- ITENS DA MOVIMENTAÇÃO
-- =========================

drop table if exists estoque_movimentacao_itens cascade;

create table estoque_movimentacao_itens (
  id bigserial primary key,
  empresa_id int not null references empresas (id),
  movimentacao_id bigint not null references estoque_movimentacoes (id) on delete cascade,

  corte text not null,

  peso_bruto_kg numeric(12, 2) not null,
  peso_liquido_kg numeric(12, 2) not null,

  agrupamento_id uuid,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index idx_mov_item_movimentacao on estoque_movimentacao_itens (movimentacao_id);
create index idx_mov_item_empresa on estoque_movimentacao_itens (empresa_id);
create index idx_mov_item_corte on estoque_movimentacao_itens (corte);

alter table estoque_movimentacao_itens enable row level security;

create policy "estoque_movimentacao_itens_por_empresa" on estoque_movimentacao_itens
for all using (
  empresa_id in (
    select empresa_id
    from usuarios_empresas
    where user_id = auth.uid()
  )
);


-- =========================
-- VIEW ESTOQUE ATUAL
-- =========================

drop view if exists vw_estoque_atual;

create or replace view vw_estoque_atual as
select
  i.empresa_id,
  i.corte,
  sum(
    case
      when m.tipo_movimentacao = 1 then i.peso_bruto_kg
      else -i.peso_bruto_kg
    end
  ) as saldo_bruto_kg,

  sum(
    case
      when m.tipo_movimentacao = 1 then i.peso_liquido_kg
      else -i.peso_liquido_kg
    end
  ) as saldo_liquido_kg
from estoque_movimentacao_itens i
join estoque_movimentacoes m on m.id = i.movimentacao_id
group by i.empresa_id, i.corte;
