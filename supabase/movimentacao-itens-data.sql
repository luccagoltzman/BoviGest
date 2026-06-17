-- Data por peça na venda — rodar no SQL Editor do Supabase

alter table movimentacao_itens
  add column if not exists data_movimentacao date;

create index if not exists idx_movimentacao_itens_data
  on movimentacao_itens (data_movimentacao);
