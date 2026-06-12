-- Débito anterior (vendas fora do sistema) — rodar no Supabase SQL Editor

alter table clientes add column if not exists debito_anterior numeric default 0;
alter table clientes add column if not exists debito_anterior_observacao text;
alter table clientes add column if not exists debito_anterior_referencia date;
