-- Vínculo de entrada de estoque com compra de gado

alter table estoque_movimentacoes
add column if not exists referencia_abate_id bigint references abates (id) on delete cascade;

alter table estoque_movimentacoes
add column if not exists referencia_compra_id bigint references compras (id) on delete cascade;

create index if not exists idx_estoque_mov_referencia_compra
  on estoque_movimentacoes (empresa_id, referencia_compra_id)
  where referencia_compra_id is not null;

create index if not exists idx_estoque_mov_referencia_abate
  on estoque_movimentacoes (empresa_id, referencia_abate_id)
  where referencia_abate_id is not null;
