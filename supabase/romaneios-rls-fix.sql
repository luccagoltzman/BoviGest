-- Corrige RLS de romaneios para o mesmo padrão da tabela abates
-- (evita bloqueio silencioso quando current_user_empresa_id() diverge)
-- Rodar no SQL Editor do Supabase

drop policy if exists romaneios_select on romaneios;
drop policy if exists romaneios_insert on romaneios;
drop policy if exists romaneios_update on romaneios;
drop policy if exists romaneios_delete on romaneios;

create policy romaneios_select on romaneios for select to authenticated
using (
  empresa_id in (
    select empresa_id from usuarios_empresas where user_id = auth.uid()
  )
);

create policy romaneios_insert on romaneios for insert to authenticated
with check (
  empresa_id in (
    select empresa_id from usuarios_empresas where user_id = auth.uid()
  )
);

create policy romaneios_update on romaneios for update to authenticated
using (
  empresa_id in (
    select empresa_id from usuarios_empresas where user_id = auth.uid()
  )
)
with check (
  empresa_id in (
    select empresa_id from usuarios_empresas where user_id = auth.uid()
  )
);

create policy romaneios_delete on romaneios for delete to authenticated
using (
  empresa_id in (
    select empresa_id from usuarios_empresas where user_id = auth.uid()
  )
);

drop policy if exists romaneio_itens_select on romaneio_itens;
drop policy if exists romaneio_itens_insert on romaneio_itens;
drop policy if exists romaneio_itens_update on romaneio_itens;
drop policy if exists romaneio_itens_delete on romaneio_itens;

create policy romaneio_itens_select on romaneio_itens for select to authenticated
using (
  romaneio_id in (
    select r.id
    from romaneios r
    where r.empresa_id in (
      select empresa_id from usuarios_empresas where user_id = auth.uid()
    )
  )
);

create policy romaneio_itens_insert on romaneio_itens for insert to authenticated
with check (
  romaneio_id in (
    select r.id
    from romaneios r
    where r.empresa_id in (
      select empresa_id from usuarios_empresas where user_id = auth.uid()
    )
  )
);

create policy romaneio_itens_update on romaneio_itens for update to authenticated
using (
  romaneio_id in (
    select r.id
    from romaneios r
    where r.empresa_id in (
      select empresa_id from usuarios_empresas where user_id = auth.uid()
    )
  )
)
with check (
  romaneio_id in (
    select r.id
    from romaneios r
    where r.empresa_id in (
      select empresa_id from usuarios_empresas where user_id = auth.uid()
    )
  )
);

create policy romaneio_itens_delete on romaneio_itens for delete to authenticated
using (
  romaneio_id in (
    select r.id
    from romaneios r
    where r.empresa_id in (
      select empresa_id from usuarios_empresas where user_id = auth.uid()
    )
  )
);
