-- Adiantamento: pagamento ao fornecedor sem peso/quantidade de gado
alter table compras
add column if not exists adiantamento boolean not null default false;

comment on column compras.adiantamento is
  'true = adiantamento (somente pagamento, sem peso/qtd de animais)';

create index if not exists idx_compras_adiantamento on compras (empresa_id, adiantamento)
where
  adiantamento = true;
