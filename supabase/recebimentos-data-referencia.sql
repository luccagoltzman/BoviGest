-- Data de referência do pagamento (semana/período que o recebimento abate)
-- data_recebimento = quando o valor entrou; data_referencia = período da dívida
alter table recebimentos_clientes
add column if not exists data_referencia date;

update recebimentos_clientes
set
  data_referencia = data_recebimento
where
  data_referencia is null;

alter table recebimentos_clientes
alter column data_referencia set not null;

alter table recebimentos_clientes
alter column data_referencia set default current_date;

comment on column recebimentos_clientes.data_referencia is
  'Período/semana a que o pagamento se refere (filtro do extrato). data_recebimento = data em que entrou o valor.';

create index if not exists idx_recebimentos_clientes_referencia on recebimentos_clientes (
  empresa_id,
  cliente_id,
  data_referencia
);
