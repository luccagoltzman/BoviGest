-- Quem efetua o pagamento da parcela e conta de origem (quando terceiro)
alter table compras_parcelas
add column if not exists pagador_tipo text not null default 'proprio';

alter table compras_parcelas add column if not exists origem_banco text;
alter table compras_parcelas add column if not exists origem_agencia text;
alter table compras_parcelas add column if not exists origem_conta text;
alter table compras_parcelas add column if not exists origem_tipo_conta text;
alter table compras_parcelas add column if not exists origem_titular text;
alter table compras_parcelas add column if not exists origem_pix_tipo text;
alter table compras_parcelas add column if not exists origem_pix_chave text;

comment on column compras_parcelas.pagador_tipo is
  'proprio = eu/minha empresa | terceiro = outra pessoa pagou';

comment on column compras_parcelas.origem_banco is
  'Conta bancária de origem quando pagador_tipo = terceiro';
