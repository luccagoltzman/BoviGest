-- Retalho controlado em vendas: animais abatidos no dia da venda

alter table movimentacao_itens
add column if not exists qtd_animais_abate int;

comment on column movimentacao_itens.qtd_animais_abate is
  'Quantidade de animais abatidos no dia (vendas de Retalho)';
