-- Conta bancária usada no pagamento de cada parcela de compra
-- Seguro para rodar várias vezes (IF NOT EXISTS).

alter table compras_parcelas add column if not exists pagamento_banco text;
alter table compras_parcelas add column if not exists pagamento_agencia text;
alter table compras_parcelas add column if not exists pagamento_conta text;
alter table compras_parcelas add column if not exists pagamento_tipo_conta text;
alter table compras_parcelas add column if not exists pagamento_titular text;
alter table compras_parcelas add column if not exists pagamento_pix_tipo text;
alter table compras_parcelas add column if not exists pagamento_pix_chave text;
