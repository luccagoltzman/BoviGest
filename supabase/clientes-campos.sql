-- Campos adicionais no cadastro de clientes (rodar no Supabase SQL Editor)

alter table clientes add column if not exists nome_empresa text;
alter table clientes add column if not exists complemento text;
alter table clientes add column if not exists cep text;
alter table clientes add column if not exists numero text;
alter table clientes add column if not exists bairro text;
alter table clientes add column if not exists cidade text;
alter table clientes add column if not exists uf text;
alter table clientes add column if not exists data_nascimento date;
