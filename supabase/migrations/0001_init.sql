-- Sistema de administración de recintos deportivos — Fase 1
-- Todas las tablas usan el prefijo rd_ (proyecto Supabase compartido con otras apps de AndusChile).

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists btree_gist;   -- exclusion constraint sobre uuid + tsrange

-- =========================================================================
-- RECINTO
-- =========================================================================
create table rd_recinto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('polideportivo', 'gimnasio', 'cancha', 'estadio', 'sala_multiple')),
  direccion text,
  zona_horaria text not null default 'America/Punta_Arenas',
  propiedad text not null default 'propio' check (propiedad in ('propio', 'cedido')),
  titular text,
  estado text not null default 'operativo' check (estado in ('operativo', 'mantencion', 'cerrado')),
  created_at timestamptz not null default now()
);

-- =========================================================================
-- ESPACIO
-- =========================================================================
create table rd_espacio (
  id uuid primary key default gen_random_uuid(),
  recinto_id uuid not null references rd_recinto(id) on delete cascade,
  nombre text not null,
  tipo text,
  capacidad_referencial int,
  actividad_fija text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_rd_espacio_recinto on rd_espacio(recinto_id);

-- Pares de espacios mutuamente excluyentes (ej. cancha completa vs sus 2 mitades)
create table rd_espacio_conflicto (
  espacio_a uuid not null references rd_espacio(id) on delete cascade,
  espacio_b uuid not null references rd_espacio(id) on delete cascade,
  primary key (espacio_a, espacio_b),
  check (espacio_a <> espacio_b)
);

-- =========================================================================
-- HORARIO DE OPERACIÓN
-- =========================================================================
create table rd_horario_operacion (
  id uuid primary key default gen_random_uuid(),
  recinto_id uuid references rd_recinto(id) on delete cascade,
  espacio_id uuid references rd_espacio(id) on delete cascade,
  dia_semana int not null check (dia_semana between 1 and 7), -- 1=lunes ... 7=domingo
  hora_apertura time not null,
  hora_cierre time not null,
  vigencia_desde date,
  vigencia_hasta date,
  etiqueta text,
  created_at timestamptz not null default now(),
  check (recinto_id is not null or espacio_id is not null),
  check (hora_apertura < hora_cierre)
);

create index idx_rd_horario_recinto on rd_horario_operacion(recinto_id);
create index idx_rd_horario_espacio on rd_horario_operacion(espacio_id);

-- =========================================================================
-- ENTIDAD
-- =========================================================================
create table rd_entidad (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in (
    'club_deportivo', 'establecimiento_educacional', 'organizacion_comunitaria',
    'taller', 'empresa', 'particular', 'programa_propio'
  )),
  con_fines_de_lucro boolean not null default false,
  rut text,
  personalidad_juridica boolean,
  vigencia_directiva date,
  representante text,
  telefono text,
  correo text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- CONVENIO
-- =========================================================================
create table rd_convenio (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references rd_entidad(id),
  espacio_id uuid not null references rd_espacio(id),
  dias_semana int[] not null,
  hora_inicio time not null,
  hora_fin time not null,
  vigencia_desde date not null,
  vigencia_hasta date,
  documento_respaldo text,
  estado text not null default 'activo' check (estado in ('activo', 'terminado', 'suspendido')),
  observaciones text,
  created_at timestamptz not null default now(),
  check (hora_inicio < hora_fin)
);

create index idx_rd_convenio_entidad on rd_convenio(entidad_id);
create index idx_rd_convenio_espacio on rd_convenio(espacio_id);

-- =========================================================================
-- ASIGNACION
-- =========================================================================
create table rd_asignacion (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references rd_espacio(id),
  entidad_id uuid not null references rd_entidad(id),
  convenio_id uuid references rd_convenio(id),
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  rango tsrange generated always as (
    tsrange((fecha + hora_inicio)::timestamp, (fecha + hora_fin)::timestamp)
  ) stored,
  tipo text not null default 'puntual' check (tipo in ('puntual', 'convenio', 'evento_municipal')),
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  actividad text,
  participantes_estimados int,
  documento_respaldo text,
  uso_efectivo boolean,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hora_inicio < hora_fin),

  -- Ningún espacio puede tener dos asignaciones confirmadas que se solapen en el tiempo
  exclude using gist (espacio_id with =, rango with &&) where (estado = 'confirmada')
);

create index idx_rd_asignacion_fecha on rd_asignacion(fecha);
create index idx_rd_asignacion_espacio_fecha on rd_asignacion(espacio_id, fecha);
create index idx_rd_asignacion_entidad on rd_asignacion(entidad_id);
create index idx_rd_asignacion_convenio on rd_asignacion(convenio_id);

create or replace function rd_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rd_trg_asignacion_updated_at
before update on rd_asignacion
for each row execute function rd_set_updated_at();

-- Conflicto entre espacios relacionados (ej. cancha completa vs sus mitades).
-- La restricción de exclusión de arriba solo cubre solapamientos dentro del MISMO espacio;
-- este trigger cubre el caso de espacios físicamente distintos que no pueden usarse a la vez.
create or replace function rd_check_espacio_conflicto() returns trigger as $$
declare
  v_otro record;
  v_choque record;
begin
  if new.estado <> 'confirmada' then
    return new;
  end if;

  for v_otro in
    select case when espacio_a = new.espacio_id then espacio_b else espacio_a end as espacio_id
    from rd_espacio_conflicto
    where espacio_a = new.espacio_id or espacio_b = new.espacio_id
  loop
    select a.fecha, a.hora_inicio, a.hora_fin, e.nombre as entidad_nombre, esp.nombre as espacio_nombre
    into v_choque
    from rd_asignacion a
    join rd_entidad e on e.id = a.entidad_id
    join rd_espacio esp on esp.id = a.espacio_id
    where a.espacio_id = v_otro.espacio_id
      and a.estado = 'confirmada'
      and a.id <> new.id
      and a.rango && tsrange((new.fecha + new.hora_inicio)::timestamp, (new.fecha + new.hora_fin)::timestamp)
    limit 1;

    if found then
      raise exception
        'Conflicto con espacio relacionado "%": ya está asignado a "%" el % de % a % y no puede usarse en simultáneo con este espacio.',
        v_choque.espacio_nombre, v_choque.entidad_nombre, v_choque.fecha, v_choque.hora_inicio, v_choque.hora_fin
        using errcode = '23P01';
    end if;
  end loop;

  return new;
end;
$$ language plpgsql;

create trigger rd_trg_check_espacio_conflicto
before insert or update on rd_asignacion
for each row execute function rd_check_espacio_conflicto();

-- =========================================================================
-- BLOQUEO
-- =========================================================================
create table rd_bloqueo (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid references rd_espacio(id) on delete cascade,
  recinto_id uuid references rd_recinto(id) on delete cascade,
  fecha_desde date not null,
  fecha_hasta date not null,
  motivo text not null check (motivo in ('mantencion', 'evento', 'clima', 'municipal_prioritario')),
  descripcion text,
  creado_por text,
  created_at timestamptz not null default now(),
  check (espacio_id is not null or recinto_id is not null),
  check (fecha_desde <= fecha_hasta)
);

create index idx_rd_bloqueo_espacio on rd_bloqueo(espacio_id);
create index idx_rd_bloqueo_recinto on rd_bloqueo(recinto_id);

-- =========================================================================
-- RLS — Fase 1: un solo administrador. Cualquier usuario autenticado
-- ve y edita todo. Se deja RLS activo desde el inicio para no migrar
-- datos en producción cuando en fase 2 se agreguen roles.
-- =========================================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'rd_recinto', 'rd_espacio', 'rd_espacio_conflicto', 'rd_horario_operacion',
    'rd_entidad', 'rd_convenio', 'rd_asignacion', 'rd_bloqueo'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      t || '_authenticated_full_access', t
    );
  end loop;
end $$;
