-- Retalho manual por abate (rodar no Supabase SQL Editor)

alter table abates add column if not exists peso_retalho_kg numeric(12, 2) not null default 0;
