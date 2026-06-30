-- Quantidade prevista de peças na entrada de estoque (calculada: 2 dianteiros + 2 traseiros por animal)

alter table compras
add column if not exists qtd_dianteiro integer not null default 0;

alter table compras
add column if not exists qtd_traseiro integer not null default 0;

comment on column compras.qtd_dianteiro is 'Calculado: quantidade_animais × 2';
comment on column compras.qtd_traseiro is 'Calculado: quantidade_animais × 2';

update compras
set
  qtd_dianteiro = greatest(quantidade_animais, 0) * 2,
  qtd_traseiro = greatest(quantidade_animais, 0) * 2
where coalesce(adiantamento, false) = false;
