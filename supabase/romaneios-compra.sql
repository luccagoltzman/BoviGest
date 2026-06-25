-- Romaneio vinculado à compra de gado — rodar no SQL Editor do Supabase

alter table romaneios add column if not exists compra_id bigint references compras (id) on delete cascade;

alter table romaneios alter column abate_id drop not null;

create unique index if not exists romaneios_compra_id_uidx
  on romaneios (compra_id)
  where compra_id is not null;

create index if not exists romaneios_compra_id_idx on romaneios (compra_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'romaneios_origem_check'
  ) then
    alter table romaneios add constraint romaneios_origem_check check (
      (abate_id is not null and compra_id is null)
      or (abate_id is null and compra_id is not null)
    );
  end if;
end $$;
