-- Prueba de aislamiento / Datos ficticios, revertidos al terminar.
-- Ejecutar completo en SQL Editor despues de la migracion.
begin;

insert into auth.users (id, email) values
  ('f1000000-0000-4000-8000-000000000001', 'rls-a@example.invalid'),
  ('f1000000-0000-4000-8000-000000000002', 'rls-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
insert into public.pets (id, name, breed, age, sex, weight, size, color, owner)
values ('f2000000-0000-4000-8000-000000000001', 'Prueba A', 'Mestizo', 2, 'Macho', 10, 'Mediano', 'Negro', 'A');

select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
insert into public.pets (id, name, breed, age, sex, weight, size, color, owner)
values ('f2000000-0000-4000-8000-000000000002', 'Prueba B', 'Mestizo', 2, 'Hembra', 10, 'Mediano', 'Blanco', 'B');

do $$
begin
  if (select count(*) from public.pets) <> 1 then raise exception 'RLS: lectura cruzada'; end if;
  update public.pets set name = 'Acceso indebido' where id = 'f2000000-0000-4000-8000-000000000001';
  if found then raise exception 'RLS: edicion cruzada'; end if;
  delete from public.pets where id = 'f2000000-0000-4000-8000-000000000001';
  if found then raise exception 'RLS: eliminacion cruzada'; end if;
  begin
    update public.pets set user_id = 'f1000000-0000-4000-8000-000000000001';
    raise exception 'RLS: transferencia de propietario permitida';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.pets (user_id, name, breed, age, sex, weight, size, color, owner)
    values ('f1000000-0000-4000-8000-000000000001', 'Intruso', 'Mestizo', 1, 'Macho', 10, 'Mediano', 'Negro', 'B');
    raise exception 'RLS: insercion en otra cuenta permitida';
  exception when insufficient_privilege then null;
  end;
  update public.pets set name = 'Propia editada' where id = 'f2000000-0000-4000-8000-000000000002';
  if not found then raise exception 'RLS: no permite editar mascota propia'; end if;
  delete from public.pets where id = 'f2000000-0000-4000-8000-000000000002';
  if not found then raise exception 'RLS: no permite eliminar mascota propia'; end if;
end $$;

reset role;
do $$
begin
  if has_table_privilege('anon', 'public.pets', 'SELECT') then raise exception 'Acceso anonimo permitido'; end if;
  if (select name from public.pets where id = 'f2000000-0000-4000-8000-000000000001') <> 'Prueba A' then
    raise exception 'Mascota de A modificada';
  end if;
end $$;

rollback;
select 'OK: aislamiento, escritura propia y acceso anonimo. Pruebas revertidas.' as resultado;
