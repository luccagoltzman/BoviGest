-- Peso bruto total por lado (dianteiro / traseiro) informado no cadastro da compra

alter table compras
add column if not exists peso_bruto_dianteiro_kg numeric(12, 2) not null default 0;

alter table compras
add column if not exists peso_bruto_traseiro_kg numeric(12, 2) not null default 0;

comment on column compras.peso_bruto_dianteiro_kg is 'Peso bruto total de todos os dianteiros (estoque agregado)';
comment on column compras.peso_bruto_traseiro_kg is 'Peso bruto total de todos os traseiros (estoque agregado)';
