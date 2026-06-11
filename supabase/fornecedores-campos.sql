-- Campos adicionais no cadastro de fornecedores (rodar no Supabase SQL Editor)

alter table fornecedores add column if not exists data_nascimento date;
alter table fornecedores add column if not exists cep text;
alter table fornecedores add column if not exists numero text;
alter table fornecedores add column if not exists bairro text;
alter table fornecedores add column if not exists uf text;
alter table fornecedores add column if not exists complemento text;
alter table fornecedores add column if not exists banco text;
alter table fornecedores add column if not exists agencia text;
alter table fornecedores add column if not exists conta text;
alter table fornecedores add column if not exists tipo_conta text;
alter table fornecedores add column if not exists titular_conta text;
alter table fornecedores add column if not exists pix_tipo text;
alter table fornecedores add column if not exists pix_chave text;
