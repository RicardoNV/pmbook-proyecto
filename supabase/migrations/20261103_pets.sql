-- ==================================================
-- Mascotas / Propiedad por cuenta y foto de perfil compacta
-- Ejecutar una vez en SQL Editor del proyecto de Supabase.
-- ==================================================

begin;

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  breed text not null check (length(trim(breed)) between 1 and 60),
  age integer not null check (age between 0 and 30),
  sex text not null check (sex in ('Macho', 'Hembra')),
  weight numeric(5,1) not null check (weight between 0.1 and 100),
  size text not null check (size in ('Pequeño', 'Mediano', 'Grande')),
  color text not null check (length(trim(color)) between 1 and 60),
  owner text not null check (length(trim(owner)) between 1 and 80),
  collar text not null default 'Sin asignar' check (collar in ('Sin asignar', 'Demo Mini', 'Demo Classic', 'Demo Plus')),
  photo_data text check (photo_data is null or (
    octet_length(photo_data) <= 350000 and photo_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'
  )),
  created_at timestamptz not null default now()
);

create index pets_user_created_idx on public.pets (user_id, created_at, id);
alter table public.pets enable row level security;

revoke all on public.pets from anon, authenticated;
grant select, insert, update, delete on public.pets to authenticated;

create policy pets_select_own on public.pets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy pets_insert_own on public.pets for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy pets_update_own on public.pets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy pets_delete_own on public.pets for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on column public.pets.collar is 'Referencia ficticia; no registra ni modifica dispositivos.';
comment on column public.pets.photo_data is 'JPEG de perfil, reducido a 600 px en el cliente. Se elimina con la fila.';

commit;
