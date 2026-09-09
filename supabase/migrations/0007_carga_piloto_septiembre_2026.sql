-- Carga piloto de septiembre 2026 (datos reales de programación de la Corporación).
-- Fuente: supabase/seed/septiembre_2026_para_cargar.csv (344 filas originales de la
-- planilla del cliente). Se carga como asignaciones puntuales acotadas a septiembre 2026
-- (1 al 30), no como convenios: el objetivo es un piloto con datos reales antes de
-- comprometer estas horas a más largo plazo. No toca las migraciones 0001 a 0006.
--
-- Antes de escribir esta migración se releyeron 0001-0006 para usar los nombres EXACTOS
-- de recintos/espacios/entidades ya cargados (el CSV trae el texto tal como aparece en
-- las planillas originales, que no coincide carácter por carácter con lo ya cargado).
-- Hallazgo relevante: el CSV tiene una fila de recinto "Piscina Municipal 2025" como si
-- fuera un recinto propio, pero en 0002 la piscina está modelada como el espacio
-- "Piscina" DENTRO del recinto "Polideportivo" — no existe un recinto "Piscina Municipal"
-- separado. Por eso los dos espacios nuevos que pide el cliente ("Piscina - Espacio 1" y
-- "Piscina - Espacio 2") se crean dentro de "Polideportivo", no en un recinto nuevo. El
-- espacio "Piscina" original (la piscina completa, sin dividir) se deja intacto y sin
-- usar en esta carga; no se le agregó una fila en rd_espacio_conflicto contra las dos
-- mitades nuevas porque nada la usa en este período — queda como TODO si en el futuro se
-- vuelve a asignar la piscina completa en paralelo con sus mitades.
--
-- Regla dura: el 18 y el 19 de septiembre de 2026 (viernes y sábado) son feriados
-- irrenunciables — ningún recinto genera asignaciones ni bloqueos esos dos días.
--
-- Criterio de mapeo a espacio (grillas de origen son por recinto completo, salvo que la
-- celda lo diga explícitamente):
--   - "sala de máquinas"/"musculación" en el texto (dentro de Polideportivo) -> "Sala de musculación".
--   - "pasillo"/"arquería"/"camarines" en el texto (dentro de Polideportivo, sin espacio_sugerido) -> "Pasillo de entrada".
--   - espacio_sugerido del CSV (Transversal 1/2, Piscina - Espacio 1) siempre gana cuando viene relleno.
--   - Estadio Víctor Bórquez Miranda: TODAS las filas de este recinto se asignaron a
--     "Cancha grande" por defecto (supuesto explícito del cliente): la planilla no
--     distingue cancha grande de cancha chica, así que no había forma de saber cuál
--     corresponde a cada fila.
--   - Cualquier otro caso -> espacio principal/cancha completa del recinto (Polideportivo -> "Cancha 20x40").
--
-- Entidades: se dedupean por nombre EXACTO contra rd_entidad ya existente (WHERE NOT
-- EXISTS). Varias entidades del CSV se canonicalizaron a un nombre único cuando el mismo
-- monitor/profesor aparecía bajo nombres ligeramente distintos en distintas filas (ej.
-- "Club Iteria Patinaje"/"Club Patinaje Iteria"/"Patinaje Club Iteria" -> un solo nombre;
-- "Ralda Basquetbol" en la fila de Transversal 2 es un artefacto de una celda combinada
-- que se cortó entre dos columnas del documento original — se canonizó a "Club Esmeralda
-- Basquetbol" porque el monitor coincide exactamente con esa fila). El texto ORIGINAL del
-- CSV se conserva de todas formas en rd_asignacion.actividad, tal como pide el cliente,
-- incluso cuando la entidad enlazada usa el nombre canónico. El detalle completo de estas
-- decisiones (y las marcadas como dudosas) va en el informe entregado aparte, no en esta
-- migración.
--
-- Igual que en 0004: si una asignación choca con algo ya confirmado (restricción de
-- exclusión del mismo espacio, o el trigger de espacios relacionados de Transversal vs
-- Cancha 20x40), se salta esa fecha puntual con RAISE NOTICE en vez de abortar todo.

-- =========================================================================
-- 0. Nuevo tipo de entidad: institución pública
-- =========================================================================
alter table rd_entidad drop constraint if exists rd_entidad_tipo_check;
alter table rd_entidad add constraint rd_entidad_tipo_check check (tipo in (
  'club_deportivo', 'establecimiento_educacional', 'organizacion_comunitaria',
  'taller', 'empresa', 'particular', 'programa_propio', 'institucion_publica'
));

-- =========================================================================
-- 0.1 rd_asignacion no tenía columna "observaciones" (0001 solo la definió en
-- rd_convenio). El pedido de carga piloto pide dejar una nota fija de "pendiente de
-- respaldo formal" por asignación sin usar documento_respaldo (que debe quedar NULL),
-- así que se agrega la columna con el mismo nombre/propósito que ya tiene en rd_convenio,
-- en vez de forzar ese texto dentro de otro campo.
-- =========================================================================
alter table rd_asignacion add column if not exists observaciones text;

-- =========================================================================
-- 1. Espacios nuevos: Piscina - Espacio 1 / Piscina - Espacio 2 (dentro de Polideportivo)
-- =========================================================================
do $$
declare
  v_polideportivo uuid;
begin
  select id into v_polideportivo from rd_recinto where nombre = 'Polideportivo';
  if v_polideportivo is null then
    raise exception 'No se encontró el recinto "Polideportivo" (revisar 0002_seed_datos_reales.sql).';
  end if;

  if not exists (select 1 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Piscina - Espacio 1') then
    insert into rd_espacio (recinto_id, nombre, tipo) values (v_polideportivo, 'Piscina - Espacio 1', 'piscina');
  end if;

  if not exists (select 1 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Piscina - Espacio 2') then
    insert into rd_espacio (recinto_id, nombre, tipo) values (v_polideportivo, 'Piscina - Espacio 2', 'piscina');
  end if;
end $$;

-- =========================================================================
-- 2. Entidades nuevas (dedup exacto por nombre contra rd_entidad existente)
-- =========================================================================
do $$
begin
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Iteria Patinaje', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Iteria Patinaje');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Circo Aéreo', 'taller', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Circo Aéreo');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela E-1', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela E-1');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Newcom Club Natales', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Newcom Club Natales');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Bories Voleibol', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Bories Voleibol');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club De Patinaje Natales Sobre Ruedas', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club De Patinaje Natales Sobre Ruedas');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Deportivo Mineros', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Deportivo Mineros');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Esmeralda Basquetbol', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Esmeralda Basquetbol');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club De Basquetbol Senior', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club De Basquetbol Senior');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Los Pumas Basquetbol', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Los Pumas Basquetbol');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Cesfam', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Cesfam');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club de Voleibol Natales', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club de Voleibol Natales');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Newcom', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Newcom');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Asociación de Basquetbol de Última Esperanza', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Asociación de Basquetbol de Última Esperanza');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Bories Basquetbol', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Bories Basquetbol');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Arqueria', 'taller', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Arqueria');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Asociación de Tenis de Mesa Puerto Natales', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Asociación de Tenis de Mesa Puerto Natales');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela Nicolás Mladinic', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela Nicolás Mladinic');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Cesfam Taller de Artrosis', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Cesfam Taller de Artrosis');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Conjunto Folclórico Natales', 'organizacion_comunitaria', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Conjunto Folclórico Natales');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Taller Tenis De Mesa', 'taller', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Taller Tenis De Mesa');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Asociación de Tenis de Mesa Natales Patagonia', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Asociación de Tenis de Mesa Natales Patagonia');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Judo (taller Monitor Mesa)', 'taller', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Judo (taller Monitor Mesa)');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Ejército de Chile', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Ejército de Chile');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club De Tenis Ultima Esperanza', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club De Tenis Ultima Esperanza');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Cesfam Elige Vida Sana', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Cesfam Elige Vida Sana');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Condores Hockey', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Condores Hockey');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Esmeralda Voleibol', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Esmeralda Voleibol');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Esmeralda Futsal', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Esmeralda Futsal');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Asociación de Futsal Femenino', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Asociación de Futsal Femenino');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Basquetbol (taller Eva Cardenas)', 'taller', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Basquetbol (taller Eva Cardenas)');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Futsal Damas', 'taller', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Futsal Damas');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Karate Jiyukan', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Karate Jiyukan');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Grupo Skabach', 'organizacion_comunitaria', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Grupo Skabach');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Ind Eleccion Deportiva Atletismo', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Ind Eleccion Deportiva Atletismo');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela De Futbol Orlando Torterolio', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela De Futbol Orlando Torterolio');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Ind Mujer En Movimiento Zumba', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Ind Mujer En Movimiento Zumba');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Asociación de Futbol Selecciones', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Asociación de Futbol Selecciones');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Club Natalinos T/P', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Club Natalinos T/P');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela De Futbol Carlos Rodriguez', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela De Futbol Carlos Rodriguez');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela Fernando Solabarrieta', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela Fernando Solabarrieta');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela De Futbol Filial Colo Colo', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela De Futbol Filial Colo Colo');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela De Futbol Unión Austral', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela De Futbol Unión Austral');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Fuerzas Armadas de Chile', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Fuerzas Armadas de Chile');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Master Municipal', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Master Municipal');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Taller Municipal Adultos 1', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Taller Municipal Adultos 1');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Ind Del Juego Al Deporte 2', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Ind Del Juego Al Deporte 2');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Espacio Educativo y Cultural Kalen', 'organizacion_comunitaria', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Espacio Educativo y Cultural Kalen');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Taller Municipal Adulto Mayor', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Taller Municipal Adulto Mayor');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela Baudilia Avendaño de Youssuff', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela Baudilia Avendaño de Youssuff');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Ind Eleccion Deportiva 2', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Ind Eleccion Deportiva 2');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela Capitán Juan de Ladrilleros', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela Capitán Juan de Ladrilleros');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Nadadores Contra Corriente', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Nadadores Contra Corriente');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Ind Personas Mayores', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Ind Personas Mayores');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela Coronel Santiago Bueras', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela Coronel Santiago Bueras');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Nado Libre', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Nado Libre');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Colegio Natales', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Colegio Natales');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela Libertador Bernardo O''Higgins', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela Libertador Bernardo O''Higgins');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Ind Jovenes En Movimiento', 'programa_propio', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Ind Jovenes En Movimiento');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela De Futbol Gallito Gonzalez', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela De Futbol Gallito Gonzalez');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Escuela Arturo Vidal', 'club_deportivo', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Escuela Arturo Vidal');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Deportes Municipalidad', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Deportes Municipalidad');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Magisterio', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Magisterio');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Carabineros de Chile', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Carabineros de Chile');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Armada de Chile', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Armada de Chile');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Municipalidad', 'institucion_publica', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Municipalidad');
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  select 'Jardín Bello Amanecer', 'establecimiento_educacional', false, true
  where not exists (select 1 from rd_entidad where nombre = 'Jardín Bello Amanecer');
end $$;

-- =========================================================================
-- 3. Asignaciones puntuales de septiembre 2026, vía tabla de staging
-- =========================================================================
create temporary table rd_seed_stage_202609 (
  recinto_nombre text not null,
  espacio_nombre text not null,
  entidad_nombre text not null,
  dia_iso int not null check (dia_iso between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  actividad text not null,
  csv_line int not null
) on commit drop;

insert into rd_seed_stage_202609
  (recinto_nombre, espacio_nombre, entidad_nombre, dia_iso, hora_inicio, hora_fin, actividad, csv_line)
values
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 7, '09:00', '10:00', 'Club Iteria Patinaje', 2),
  ('Sala de uso múltiple', 'Sala 1', 'Circo Aéreo', 1, '10:00', '11:00', 'Circo Aereo', 3),
  ('Sala de uso múltiple', 'Sala 1', 'Circo Aéreo', 2, '10:00', '11:00', 'Circo Aereo', 4),
  ('Sala de uso múltiple', 'Sala 1', 'Escuela E-1', 3, '10:00', '11:00', 'Escuela E-1 (09:45 A 11:15)', 5),
  ('Sala de uso múltiple', 'Sala 1', 'Newcom Club Natales', 4, '10:00', '11:00', 'Newcom Club Natales', 6),
  ('Sala de uso múltiple', 'Sala 1', 'Circo Aéreo', 5, '10:00', '11:00', 'Circo Aereo', 7),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 6, '10:00', '11:00', 'Patinaje Club Iteria', 8),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 7, '10:00', '11:00', 'Club Iteria Patinaje', 9),
  ('Sala de uso múltiple', 'Sala 1', 'Circo Aéreo', 1, '11:00', '12:00', 'Circo Aereo', 10),
  ('Sala de uso múltiple', 'Sala 1', 'Circo Aéreo', 2, '11:00', '12:00', 'Circo Aereo', 11),
  ('Sala de uso múltiple', 'Sala 1', 'Escuela E-1', 3, '11:00', '12:00', 'Escuela E-1 (09:45 A 11:15)', 12),
  ('Sala de uso múltiple', 'Sala 1', 'Newcom Club Natales', 4, '11:00', '12:00', 'Newcom Club Natales', 13),
  ('Sala de uso múltiple', 'Sala 1', 'Circo Aéreo', 5, '11:00', '12:00', 'Circo Aereo', 14),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 6, '11:00', '12:00', 'Patinaje Club Iteria', 15),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 7, '11:00', '12:00', 'Club Iteria Patinaje', 16),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 6, '12:00', '13:00', 'Patinaje Club Iteria', 17),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Voleibol', 7, '12:00', '13:00', 'Voleibol Jovenes Club Bories', 18),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 6, '13:00', '14:00', 'Patinaje Club Iteria', 19),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Voleibol', 7, '13:00', '14:00', 'Voleibol Jovenes Club Bories', 20),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 1, '14:00', '15:00', 'Patinaje Club Iteria', 21),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 4, '14:00', '15:00', 'Patinaje Club Iteria', 22),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 5, '14:00', '15:00', 'Patinaje Club Iteria', 23),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 6, '14:00', '15:00', 'Club De Patinaje Natales Sobre Ruedas', 24),
  ('Sala de uso múltiple', 'Sala 1', 'Club Deportivo Mineros', 7, '14:00', '15:00', 'Voleibol Club Deportivo Mineros', 25),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 1, '15:00', '16:00', 'Patinaje Club Iteria', 26),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 3, '15:00', '16:00', 'Club De Patinaje Natales Sobre Ruedas', 27),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 4, '15:00', '16:00', 'Patinaje Club Iteria', 28),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 5, '15:00', '16:00', 'Patinaje Club Iteria', 29),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 6, '15:00', '16:00', 'Club De Patinaje Natales Sobre Ruedas', 30),
  ('Sala de uso múltiple', 'Sala 1', 'Club Deportivo Mineros', 7, '15:00', '16:00', 'Voleibol Club Deportivo Mineros', 31),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 1, '16:00', '17:00', 'Patinaje Club Iteria', 32),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Voleibol', 2, '16:00', '17:00', 'Voleibol Infantil Bories', 33),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 3, '16:00', '17:00', 'Club De Patinaje Natales Sobre Ruedas', 34),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 4, '16:00', '17:00', 'Club Esmeralda Basquetbol', 35),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 5, '16:00', '17:00', 'Club De Patinaje Natales Sobre Ruedas', 36),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 6, '16:00', '17:00', 'Club De Patinaje Natales Sobre Ruedas', 37),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Basquetbol Senior', 7, '16:00', '17:00', 'Club De Basquetbol Senior', 38),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 1, '17:00', '18:00', 'Club Esmeralda Basquetbol', 39),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Voleibol', 2, '17:00', '18:00', 'Voleibol Infantil Bories', 40),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 3, '17:00', '18:00', 'Club De Patinaje Natales Sobre Ruedas', 41),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 4, '17:00', '18:00', 'Club Esmeralda Basquetbol', 42),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 5, '17:00', '18:00', 'Club De Patinaje Natales Sobre Ruedas', 43),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Patinaje Natales Sobre Ruedas', 6, '17:00', '18:00', 'Club De Patinaje Natales Sobre Ruedas', 44),
  ('Sala de uso múltiple', 'Sala 1', 'Los Pumas Basquetbol', 7, '17:00', '18:00', 'Los Pumas', 45),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 1, '18:00', '19:00', 'Club Esmeralda Basquetbol', 46),
  ('Sala de uso múltiple', 'Sala 1', 'Cesfam', 2, '18:00', '19:00', 'Cesfam', 47),
  ('Sala de uso múltiple', 'Sala 1', 'Club de Voleibol Natales', 3, '18:00', '19:00', 'Voleibol Jovenes Club Natales', 48),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 4, '18:00', '19:00', 'Club Esmeralda Basquetbol', 49),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 5, '18:00', '19:00', 'Club Patinaje Iteria', 50),
  ('Sala de uso múltiple', 'Sala 1', 'Los Pumas Basquetbol', 6, '18:00', '19:00', 'Pumas Basquetbol', 51),
  ('Sala de uso múltiple', 'Sala 1', 'Los Pumas Basquetbol', 7, '18:00', '19:00', 'Los Pumas', 52),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 1, '19:00', '20:00', 'Club Patinaje Iteria', 53),
  ('Sala de uso múltiple', 'Sala 1', 'Newcom', 2, '19:00', '20:00', 'Newcom', 54),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 3, '19:00', '20:00', 'Club Patinaje Iteria', 55),
  ('Sala de uso múltiple', 'Sala 1', 'Asociación de Basquetbol de Última Esperanza', 4, '19:00', '20:00', 'Asociacion De Basquetbol De Ultima Esperanza', 56),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 5, '19:00', '20:00', 'Club Patinaje Iteria', 57),
  ('Sala de uso múltiple', 'Sala 1', 'Los Pumas Basquetbol', 6, '19:00', '20:00', 'Los Pumas Basquetbol', 58),
  ('Sala de uso múltiple', 'Sala 1', 'Newcom', 7, '19:00', '20:00', 'Newcom', 59),
  ('Sala de uso múltiple', 'Sala 1', 'Club Iteria Patinaje', 1, '20:00', '21:00', 'Club Patinaje Iteria', 60),
  ('Sala de uso múltiple', 'Sala 1', 'Newcom', 2, '20:00', '21:00', 'Newcom', 61),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Basquetbol', 3, '20:00', '21:00', 'Club Deportivo Bories Basquetbol', 62),
  ('Sala de uso múltiple', 'Sala 1', 'Asociación de Basquetbol de Última Esperanza', 4, '20:00', '21:00', 'Asociacion De Basquetbol De Ultima Esperanza', 63),
  ('Sala de uso múltiple', 'Sala 1', 'Asociación de Basquetbol de Última Esperanza', 5, '20:00', '21:00', 'Asociacion De Basquetbol De Ultima Esperanza', 64),
  ('Sala de uso múltiple', 'Sala 1', 'Asociación de Basquetbol de Última Esperanza', 6, '20:00', '21:00', 'Asociacion De Basquetbol De Ultima Esperanza', 65),
  ('Sala de uso múltiple', 'Sala 1', 'Newcom', 7, '20:00', '21:00', 'Newcom', 66),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Basquetbol', 1, '21:00', '22:00', 'Club Bories Basquetbol', 67),
  ('Sala de uso múltiple', 'Sala 1', 'Newcom Club Natales', 2, '21:00', '22:00', 'Newcom Club Natales', 68),
  ('Sala de uso múltiple', 'Sala 1', 'Club De Basquetbol Senior', 3, '21:00', '22:00', 'Club De Basquetbol Senior', 69),
  ('Sala de uso múltiple', 'Sala 1', 'Asociación de Basquetbol de Última Esperanza', 4, '21:00', '22:00', 'Asociacion De Basquetbol De Ultima Esperanza', 70),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Basquetbol', 5, '21:00', '22:00', 'Club Bories Basquetbol', 71),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 1, '22:00', '23:00', 'Club Esmeralda Basquetbol', 72),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 2, '22:00', '23:00', 'Club Esmeralda Basquetbol', 73),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 3, '22:00', '23:00', 'Club Esmeralda Basquetbol', 74),
  ('Sala de uso múltiple', 'Sala 1', 'Club Esmeralda Basquetbol', 4, '22:00', '23:00', 'Club Esmeralda Basquetbol', 75),
  ('Sala de uso múltiple', 'Sala 1', 'Club Bories Basquetbol', 5, '22:00', '23:00', 'Club Bories Basquetbol', 76),
  ('Sala de uso múltiple', 'Sala 2', 'Arqueria', 6, '10:00', '11:00', 'Arqueria', 77),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 7, '10:00', '11:00', 'Asociacion De Tenis De Mesa Puerto Natales', 78),
  ('Sala de uso múltiple', 'Sala 2', 'Escuela Nicolás Mladinic', 4, '11:00', '12:00', 'Horario De Ingreso 11:30 Escuela Nicolas Mladinic', 79),
  ('Sala de uso múltiple', 'Sala 2', 'Escuela Nicolás Mladinic', 5, '11:00', '12:00', 'Horario De Ingreso 11:30 Escuela Nicolas Mladinic', 80),
  ('Sala de uso múltiple', 'Sala 2', 'Arqueria', 6, '11:00', '12:00', 'Arqueria', 81),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 7, '11:00', '12:00', 'Asociacion De Tenis De Mesa Puerto Natales', 82),
  ('Sala de uso múltiple', 'Sala 2', 'Escuela Nicolás Mladinic', 3, '12:00', '13:00', 'Escuela Nicolas Mladinic', 83),
  ('Sala de uso múltiple', 'Sala 2', 'Escuela Nicolás Mladinic', 4, '12:00', '13:00', 'Escuela Nicolas Mladinic', 84),
  ('Sala de uso múltiple', 'Sala 2', 'Escuela Nicolás Mladinic', 5, '12:00', '13:00', 'Escuela Nicolas Mladinic', 85),
  ('Sala de uso múltiple', 'Sala 2', 'Arqueria', 6, '12:00', '13:00', 'Arqueria', 86),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 7, '12:00', '13:00', 'Asociacion De Tenis De Mesa Puerto Natales', 87),
  ('Sala de uso múltiple', 'Sala 2', 'Escuela Nicolás Mladinic', 5, '13:00', '14:00', 'Escuela Nicolas Mladinic', 88),
  ('Sala de uso múltiple', 'Sala 2', 'Arqueria', 6, '13:00', '14:00', 'Arqueria', 89),
  ('Sala de uso múltiple', 'Sala 2', 'Arqueria', 7, '13:00', '14:00', 'Arqueria', 90),
  ('Sala de uso múltiple', 'Sala 2', 'Cesfam Taller de Artrosis', 2, '14:00', '15:00', 'Cesfam Taller De Artrosis', 91),
  ('Sala de uso múltiple', 'Sala 2', 'Cesfam Taller de Artrosis', 3, '14:00', '15:00', 'Cesfam Taller De Artrosis', 92),
  ('Sala de uso múltiple', 'Sala 2', 'Escuela Nicolás Mladinic', 5, '14:00', '15:00', 'Escuela Nicolas Mladinic', 93),
  ('Sala de uso múltiple', 'Sala 2', 'Arqueria', 7, '14:00', '15:00', 'Arqueria', 94),
  ('Sala de uso múltiple', 'Sala 2', 'Cesfam Taller de Artrosis', 2, '15:00', '16:00', 'Cesfam Taller De Artrosis', 95),
  ('Sala de uso múltiple', 'Sala 2', 'Conjunto Folclórico Natales', 7, '15:00', '16:00', 'Folckor', 96),
  ('Sala de uso múltiple', 'Sala 2', 'Taller Tenis De Mesa', 1, '16:00', '17:00', 'Taller Tenis De Mesa', 97),
  ('Sala de uso múltiple', 'Sala 2', 'Taller Tenis De Mesa', 3, '16:00', '17:00', 'Taller Tenis De Mesa', 98),
  ('Sala de uso múltiple', 'Sala 2', 'Taller Tenis De Mesa', 5, '16:00', '17:00', 'Taller Tenis De Mesa', 99),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 6, '16:00', '17:00', 'Asociacion De Tenis De Mesa Puerto Natales', 100),
  ('Sala de uso múltiple', 'Sala 2', 'Conjunto Folclórico Natales', 7, '16:00', '17:00', 'Folckor', 101),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 1, '17:00', '18:00', 'Asociacion De Tenis De Mesa Puerto Natales', 102),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 2, '17:00', '18:00', 'Asociacion De Tenis De Mesa Puerto Natales', 103),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 3, '17:00', '18:00', 'Asociacion De Tenis De Mesa Puerto Natales', 104),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 4, '17:00', '18:00', 'Asociacion De Tenis De Mesa Puerto Natales', 105),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 5, '17:00', '18:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 106),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 6, '17:00', '18:00', 'Asociacion De Tenis De Mesa Puerto Natales', 107),
  ('Sala de uso múltiple', 'Sala 2', 'Conjunto Folclórico Natales', 7, '17:00', '18:00', 'Folckor', 108),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 1, '18:00', '19:00', 'Asociacion De Tenis De Mesa Puerto Natales', 109),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 2, '18:00', '19:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 110),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 3, '18:00', '19:00', 'Asociacion De Tenis De Mesa Puerto Natales', 111),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 4, '18:00', '19:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 112),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 5, '18:00', '19:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 113),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 6, '18:00', '19:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 114),
  ('Sala de uso múltiple', 'Sala 2', 'Conjunto Folclórico Natales', 7, '18:00', '19:00', 'Folclor', 115),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 1, '19:00', '20:00', 'Asociacion De Tenis De Mesa Puerto Natales', 116),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 2, '19:00', '20:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 117),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 3, '19:00', '20:00', 'Asociacion De Tenis De Mesa Puerto Natales', 118),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 4, '19:00', '20:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 119),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 5, '19:00', '20:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 120),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 6, '19:00', '20:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 121),
  ('Sala de uso múltiple', 'Sala 2', 'Conjunto Folclórico Natales', 7, '19:00', '20:00', 'Folclor', 122),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 1, '20:00', '21:00', 'Asociacion De Tenis De Mesa Puerto Natales', 123),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 2, '20:00', '21:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 124),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 3, '20:00', '21:00', 'Asociacion De Tenis De Mesa Puerto Natales', 125),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 4, '20:00', '21:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 126),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 5, '20:00', '21:00', 'Asociacion De Tenis De Mesa Puerto Natales', 127),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 6, '20:00', '21:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 128),
  ('Sala de uso múltiple', 'Sala 2', 'Conjunto Folclórico Natales', 7, '20:00', '21:00', 'Folclor', 129),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 1, '21:00', '22:00', 'Asociacion De Tenis De Mesa Puerto Natales', 130),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 2, '21:00', '22:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 131),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 3, '21:00', '22:00', 'Asociacion De Tenis De Mesa Puerto Natales', 132),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 4, '21:00', '22:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 133),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 5, '21:00', '22:00', 'Asociacion De Tenis De Mesa Puerto Natales', 134),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 1, '22:00', '23:00', 'Asociacion De Tenis De Mesa Puerto Natales', 135),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 2, '22:00', '23:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 136),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 3, '22:00', '23:00', 'Asociacion De Tenis De Mesa Puerto Natales', 137),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Natales Patagonia', 4, '22:00', '23:00', 'Tenis De Mesa Asociacion De Tenis De Mesa Natales Patagonia', 138),
  ('Sala de uso múltiple', 'Sala 2', 'Asociación de Tenis de Mesa Puerto Natales', 5, '22:00', '23:00', 'Asociacion De Tenis De Mesa Puerto Natales', 139),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 1, '16:00', '17:00', 'Judo', 140),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 3, '16:00', '17:00', 'Judo', 141),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 5, '16:00', '17:00', 'Judo', 142),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 1, '17:00', '18:00', 'Judo', 143),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 2, '17:00', '18:00', 'Judo', 144),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 3, '17:00', '18:00', 'Judo', 145),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 4, '17:00', '18:00', 'Judo', 146),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 5, '17:00', '18:00', 'Judo', 147),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 1, '18:00', '19:00', 'Judo', 148),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 2, '18:00', '19:00', 'Judo', 149),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 3, '18:00', '19:00', 'Judo', 150),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 4, '18:00', '19:00', 'Judo', 151),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 5, '18:00', '19:00', 'Judo', 152),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 1, '19:00', '20:00', 'Judo', 153),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 2, '19:00', '20:00', 'Judo', 154),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 3, '19:00', '20:00', 'Judo', 155),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 4, '19:00', '20:00', 'Judo', 156),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 5, '19:00', '20:00', 'Judo', 157),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 2, '20:00', '21:00', 'Judo', 158),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 4, '20:00', '21:00', 'Judo', 159),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 2, '21:00', '22:00', 'Judo', 160),
  ('Sala de uso múltiple', 'Sala 3', 'Judo (taller Monitor Mesa)', 4, '21:00', '22:00', 'Judo', 161),
  ('Gimnasio Carrera', 'Cancha', 'Ejército de Chile', 1, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 162),
  ('Gimnasio Carrera', 'Cancha', 'Ejército de Chile', 2, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 163),
  ('Gimnasio Carrera', 'Cancha', 'Ejército de Chile', 3, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 164),
  ('Gimnasio Carrera', 'Cancha', 'Ejército de Chile', 4, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 165),
  ('Gimnasio Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 6, '09:00', '10:00', 'Club De Tenis Ultima Esperanza', 166),
  ('Gimnasio Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 7, '09:00', '10:00', 'Club De Tenis Ultima Esperanza', 167),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 1, '10:00', '11:00', 'Cesfam Elige Vida Sana', 168),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 2, '10:00', '11:00', 'Cesfam Elige Vida Sana', 169),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 3, '10:00', '11:00', 'Cesfam Elige Vida Sana', 170),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 4, '10:00', '11:00', 'Cesfam Elige Vida Sana', 171),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 5, '10:00', '11:00', 'Cesfam Elige Vida Sana', 172),
  ('Gimnasio Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 6, '10:00', '11:00', 'Club De Tenis Ultima Esperanza', 173),
  ('Gimnasio Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 7, '10:00', '11:00', 'Club De Tenis Ultima Esperanza', 174),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 1, '11:00', '12:00', 'Cesfam Elige Vida Sana', 175),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 2, '11:00', '12:00', 'Cesfam Elige Vida Sana', 176),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 3, '11:00', '12:00', 'Cesfam Elige Vida Sanaj', 177),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 4, '11:00', '12:00', 'Cesfam Elige Vida Sana', 178),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 5, '11:00', '12:00', 'Cesfam Elige Vida Sana', 179),
  ('Gimnasio Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 6, '11:00', '12:00', 'Club De Tenis Ultima Esperanza', 180),
  ('Gimnasio Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 7, '11:00', '12:00', 'Club De Tenis Ultima Esperanza', 181),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 1, '12:00', '13:00', 'Cesfam Elige Vida Sana', 182),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 2, '12:00', '13:00', 'Cesfam Elige Vida Sana', 183),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 3, '12:00', '13:00', 'Cesfam Elige Vida Sana', 184),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 4, '12:00', '13:00', 'Cesfam Elige Vida Sana', 185),
  ('Gimnasio Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 5, '12:00', '13:00', 'Cesfam Elige Vida Sana', 186),
  ('Gimnasio Carrera', 'Cancha', 'Club Condores Hockey', 6, '12:00', '13:00', 'Club Condores Hockey', 187),
  ('Gimnasio Carrera', 'Cancha', 'Club Condores Hockey', 7, '12:00', '13:00', 'Club Condores Hockey', 188),
  ('Gimnasio Carrera', 'Cancha', 'Club Condores Hockey', 6, '13:00', '14:00', 'Club Condores Hockey', 189),
  ('Gimnasio Carrera', 'Cancha', 'Club Condores Hockey', 7, '13:00', '14:00', 'Club Condores Hockey', 190),
  ('Gimnasio Carrera', 'Cancha', 'Club Bories Basquetbol', 5, '14:00', '15:00', 'Club Bories Basquetbol', 191),
  ('Gimnasio Carrera', 'Cancha', 'Club Bories Basquetbol', 5, '15:00', '16:00', 'Club Bories Basquetbol', 192),
  ('Gimnasio Carrera', 'Cancha', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 1, '16:00', '17:00', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 193),
  ('Gimnasio Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 2, '16:00', '17:00', 'Club Esmeralda Basquetbol', 194),
  ('Gimnasio Carrera', 'Cancha', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 3, '16:00', '17:00', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 195),
  ('Gimnasio Carrera', 'Cancha', 'Club Bories Basquetbol', 4, '16:00', '17:00', 'Club Bories Basquetbol', 196),
  ('Gimnasio Carrera', 'Cancha', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 5, '16:00', '17:00', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 197),
  ('Gimnasio Carrera', 'Cancha', 'Club Bories Voleibol', 1, '17:00', '18:00', 'Voleibol Jovenes Club Bories', 198),
  ('Gimnasio Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 2, '17:00', '18:00', 'Club Esmeralda Basquetbol', 199),
  ('Gimnasio Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 3, '17:00', '18:00', 'Club Esmeralda Basquetbol', 200),
  ('Gimnasio Carrera', 'Cancha', 'Club Bories Basquetbol', 4, '17:00', '18:00', 'Club Bories Basquetbol', 201),
  ('Gimnasio Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 5, '17:00', '18:00', 'Club Esmeralda Basquetbol', 202),
  ('Gimnasio Carrera', 'Cancha', 'Club Condores Hockey', 1, '18:00', '19:00', 'Club Condores Hockey', 203),
  ('Gimnasio Carrera', 'Cancha', 'Club Esmeralda Voleibol', 3, '18:00', '19:00', 'Club Esmeralda Voleibol', 204),
  ('Gimnasio Carrera', 'Cancha', 'Club Esmeralda Futsal', 4, '18:00', '19:00', 'Club Esmeralda Futsal', 205),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Futsal Femenino', 5, '18:00', '19:00', 'Asociacion De Futsal Femenino', 206),
  ('Gimnasio Carrera', 'Cancha', 'Club de Voleibol Natales', 1, '19:00', '20:00', 'Club Voleybol Natales Voleybol Varones Sub16', 207),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Futsal Femenino', 2, '19:00', '20:00', 'Asociacion De Futsal Femenino', 208),
  ('Gimnasio Carrera', 'Cancha', 'Club Esmeralda Voleibol', 3, '19:00', '20:00', 'Club Esmeralda Voleibol', 209),
  ('Gimnasio Carrera', 'Cancha', 'Club Bories Voleibol', 4, '19:00', '20:00', 'Voleibol Jovenes Club Bories', 210),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '19:00', '20:00', 'Asociacion De Basquetbol De Ultima Esperanza', 211),
  ('Gimnasio Carrera', 'Cancha', 'Basquetbol (taller Eva Cardenas)', 1, '20:00', '21:00', 'Basquetbol', 212),
  ('Gimnasio Carrera', 'Cancha', 'Club Bories Voleibol', 2, '20:00', '21:00', 'Voleibol Adultos Club Bories', 213),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 3, '20:00', '21:00', 'Asociacion De Basquetbol De Ultima Esperanza', 214),
  ('Gimnasio Carrera', 'Cancha', 'Club Deportivo Mineros', 4, '20:00', '21:00', 'Club Deportivo Mineros', 215),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '20:00', '21:00', 'Asociacion De Basquetbol De Ultima Esperanza', 216),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 3, '21:00', '22:00', 'Asociacion De Basquetbol De Ultima Esperanza', 217),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '21:00', '22:00', 'Asociacion De Basquetbol De Ultima Esperanza', 218),
  ('Gimnasio Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 2, '22:00', '23:00', 'Club De Tenis Ultima Esperanza', 219),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 3, '22:00', '23:00', 'Asociacion De Basquetbol De Ultima Esperanza', 220),
  ('Gimnasio Carrera', 'Cancha', 'Futsal Damas', 4, '22:00', '23:00', 'Futsal Damas', 221),
  ('Gimnasio Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '22:00', '23:00', 'Asociacion De Basquetbol De Ultima Esperanza', 222),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '09:00', '10:00', 'Cesfam', 223),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '09:00', '10:00', 'Cesfam', 224),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '09:00', '10:00', 'Cesfam', 225),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '10:00', '11:00', 'Cesfam', 226),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '10:00', '11:00', 'Cesfam', 227),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '10:00', '11:00', 'Cesfam', 228),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '11:00', '12:00', 'Cesfam', 229),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '11:00', '12:00', 'Cesfam', 230),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '11:00', '12:00', 'Cesfam', 231),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '12:00', '13:00', 'Cesfam', 232),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '12:00', '13:00', 'Cesfam', 233),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '12:00', '13:00', 'Cesfam', 234),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '15:00', '16:00', 'Conjunto Folclorico Natales', 235),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Club De Patinaje Natales Sobre Ruedas', 2, '16:00', '17:00', 'Club De Patinaje Natales Sobre Ruedas', 236),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '16:00', '17:00', 'Conjunto Folclorico Natales', 237),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '17:00', '18:00', 'Conjunto Folclorico Natales', 238),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '17:00', '18:00', 'Conjunto Folclorico Natales', 239),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Club Karate Jiyukan', 2, '18:00', '19:00', 'Club Karate Jiyukan', 240),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Club Karate Jiyukan', 4, '18:00', '19:00', 'Club Karate Jiyukan', 241),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '18:00', '19:00', 'Conjunto Folclorico Natales', 242),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '18:00', '19:00', 'Conjunto Folclorico Natales', 243),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '19:00', '20:00', 'Conjunto Folclorico Natales', 244),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '20:00', '21:00', 'Conjunto Folclorico Natales', 245),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 1, '21:00', '22:00', 'Grupo Skabach', 246),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 3, '21:00', '22:00', 'Grupo Skabach', 247),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 5, '21:00', '22:00', 'Grupo Skabach', 248),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 1, '22:00', '23:00', 'Grupo Skabach', 249),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 3, '22:00', '23:00', 'Grupo Skabach', 250),
  ('Gimnasio Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 5, '22:00', '23:00', 'Grupo Skabach', 251),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ind Eleccion Deportiva Atletismo', 5, '16:00', '17:00', 'Ind Eleccion Deportiva Atletismo', 252),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Escuela De Futbol Orlando Torterolio', 1, '17:00', '18:00', 'Escuela De Futbol Orlando Torterolio', 253),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Escuela De Futbol Orlando Torterolio', 2, '17:00', '18:00', 'Escuela De Futbol Orlando Torterolio', 254),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ind Eleccion Deportiva Atletismo', 5, '17:00', '18:00', 'Ind Eleccion Deportiva Atletismo', 255),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ind Eleccion Deportiva Atletismo', 1, '19:00', '20:00', 'Ind Eleccion Deportiva Atletismo', 256),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ind Eleccion Deportiva Atletismo', 2, '19:00', '20:00', 'Ind Eleccion Deportiva Atletismo', 257),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ind Eleccion Deportiva Atletismo', 3, '19:00', '20:00', 'Ind Eleccion Deportiva Atletismo', 258),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ind Eleccion Deportiva Atletismo', 4, '19:00', '20:00', 'Ind Eleccion Deportiva Atletismo', 259),
  ('Polideportivo', 'Cancha 20x40', 'Ind Mujer En Movimiento Zumba', 1, '10:00', '11:00', 'Ind Mujer En Movimiento Zumba', 260),
  ('Polideportivo', 'Cancha 20x40', 'Ind Mujer En Movimiento Zumba', 3, '10:00', '11:00', 'Ind Mujer En Movimiento Zumba', 261),
  ('Polideportivo', 'Cancha 20x40', 'Ind Mujer En Movimiento Zumba', 5, '10:00', '11:00', 'Ind Mujer En Movimiento Zumba', 262),
  ('Polideportivo', 'Cancha 20x40', 'Asociación de Basquetbol de Última Esperanza', 5, '13:00', '14:00', 'Asociacion De Basquetbol De Ultima Esperanza', 263),
  ('Polideportivo', 'Cancha 20x40', 'Asociación de Basquetbol de Última Esperanza', 5, '14:00', '15:00', 'Asociacion De Basquetbol De Ultima Esperanza', 264),
  ('Polideportivo', 'Cancha 20x40', 'Los Pumas Basquetbol', 5, '15:00', '16:00', 'Los Pumas Basquetbol', 265),
  ('Polideportivo', 'Transversal 1', 'Club Bories Basquetbol', 1, '16:00', '17:00', 'Club Bories Basquetbol', 266),
  ('Polideportivo', 'Transversal 2', 'Club Esmeralda Basquetbol', 1, '16:00', '17:00', 'Club Esmeralda Basquetbol', 267),
  ('Polideportivo', 'Transversal 1', 'Club Bories Basquetbol', 2, '16:00', '17:00', 'Club Bories Basquetbol', 268),
  ('Polideportivo', 'Transversal 2', 'Club Esmeralda Basquetbol', 2, '16:00', '17:00', 'Ralda Basquetbol', 269),
  ('Polideportivo', 'Cancha 20x40', 'Club Bories Basquetbol', 3, '16:00', '17:00', 'Cancha Uno Club Bories Basquetbol', 270),
  ('Polideportivo', 'Transversal 1', 'Los Pumas Basquetbol', 4, '16:00', '17:00', 'Los Pumas Basquetbol', 271),
  ('Polideportivo', 'Transversal 2', 'Club Esmeralda Basquetbol', 4, '16:00', '17:00', 'Club Esmeralda Basquetbol', 272),
  ('Polideportivo', 'Cancha 20x40', 'Los Pumas Basquetbol', 5, '16:00', '17:00', 'Los Pumas Basquetbol', 273),
  ('Polideportivo', 'Transversal 1', 'Club Esmeralda Basquetbol', 1, '17:00', '18:00', 'Club Esmeralda Basquetbol', 274),
  ('Polideportivo', 'Transversal 2', 'Club Esmeralda Basquetbol', 1, '17:00', '18:00', 'Club Esmeralda Series Menores', 275),
  ('Polideportivo', 'Transversal 1', 'Los Pumas Basquetbol', 3, '17:00', '18:00', 'Basquetbol', 276),
  ('Polideportivo', 'Transversal 2', 'Club Esmeralda Basquetbol', 3, '17:00', '18:00', 'Club Esmeralda Series Menores', 277),
  ('Polideportivo', 'Transversal 1', 'Los Pumas Basquetbol', 4, '17:00', '18:00', 'Basquetbol', 278),
  ('Polideportivo', 'Transversal 2', 'Club Esmeralda Basquetbol', 4, '17:00', '18:00', 'Club Esmeralda Series Menores', 279),
  ('Polideportivo', 'Cancha 20x40', 'Asociación de Futbol Selecciones', 5, '17:00', '18:00', 'Asociacion De Futbol Selecciones', 280),
  ('Polideportivo', 'Transversal 1', 'Club Esmeralda Basquetbol', 1, '18:00', '19:00', 'Club Esmeralda Varones', 281),
  ('Polideportivo', 'Transversal 2', 'Los Pumas Basquetbol', 1, '18:00', '19:00', 'Los Pumas Basquetbol', 282),
  ('Polideportivo', 'Transversal 1', 'Club Esmeralda Basquetbol', 2, '18:00', '19:00', 'Basquetbol Club Esmeralda Serie Infantil', 283),
  ('Polideportivo', 'Transversal 2', 'Los Pumas Basquetbol', 2, '18:00', '19:00', 'Los Pumas Basquetbol', 284),
  ('Polideportivo', 'Cancha 20x40', 'Newcom Club Natales', 3, '18:00', '19:00', 'Newcom Club Natales', 285),
  ('Polideportivo', 'Cancha 20x40', 'Club Esmeralda Basquetbol', 3, '19:00', '20:00', 'Esmeralda Sub 15 Varones', 286),
  ('Polideportivo', 'Cancha 20x40', 'Club Natalinos T/P', 2, '21:00', '22:00', 'Cancha Balonmano Club “Natalinos T/P”', 287),
  ('Polideportivo', 'Sala de musculación', 'Club Bories Voleibol', 4, '21:00', '22:00', 'Voleibol Adultos Club Bories', 288),
  ('Polideportivo', 'Cancha 20x40', 'Club de Voleibol Natales', 5, '21:00', '22:00', 'Club De Voleibol Natales Adultos Varones', 289),
  ('Polideportivo', 'Cancha 20x40', 'Asociación de Futbol Selecciones', 2, '22:00', '23:00', 'Asociacion De Futbol Selecciones', 290),
  ('Polideportivo', 'Cancha 20x40', 'Club Bories Voleibol', 4, '22:00', '23:00', 'Voleibol Adultos Club Bories', 291),
  ('Estadio Francisco Lastra', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 4, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez', 292),
  ('Estadio Francisco Lastra', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 5, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez', 293),
  ('Estadio Francisco Lastra', 'Cancha', 'Escuela Fernando Solabarrieta', 1, '18:00', '19:00', 'Escuela Fernando Solabarrieta', 294),
  ('Estadio Francisco Lastra', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 2, '18:00', '19:00', 'Escuela De Futbol Carlos Rodriguez', 295),
  ('Estadio Francisco Lastra', 'Cancha', 'Escuela De Futbol Filial Colo Colo', 3, '18:00', '19:00', 'Escuela De Futbol Filial Colo Colo', 296),
  ('Estadio Francisco Lastra', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 4, '18:00', '19:00', 'Escuela De Futbol Carlos Rodriguez', 297),
  ('Estadio Francisco Lastra', 'Cancha', 'Escuela De Futbol Unión Austral', 5, '18:00', '19:00', 'Escuiela De Futbol Union Austral', 298),
  ('Polideportivo', 'Piscina - Espacio 1', 'Fuerzas Armadas de Chile', 1, '08:30', '09:30', 'Fuerzas Armadas De Chile', 299),
  ('Polideportivo', 'Piscina - Espacio 1', 'Master Municipal', 2, '08:30', '09:30', 'Master Municipal', 300),
  ('Polideportivo', 'Piscina - Espacio 1', 'Master Municipal', 3, '08:30', '09:30', 'Master Municipal', 301),
  ('Polideportivo', 'Piscina - Espacio 1', 'Master Municipal', 4, '08:30', '09:30', 'Master Municipal', 302),
  ('Polideportivo', 'Piscina - Espacio 1', 'Master Municipal', 5, '08:30', '09:30', 'Master Municipal', 303),
  ('Polideportivo', 'Piscina - Espacio 1', 'Taller Municipal Adultos 1', 3, '09:30', '10:30', 'Taller Municipal Adultos 1', 304),
  ('Polideportivo', 'Piscina - Espacio 1', 'Taller Municipal Adultos 1', 5, '09:30', '10:30', 'Taller Municipal Adultos 1', 305),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Del Juego Al Deporte 2', 6, '09:30', '10:30', 'Ind Del Juego Al Deporte 2', 306),
  ('Polideportivo', 'Piscina - Espacio 1', 'Espacio Educativo y Cultural Kalen', 1, '10:30', '11:30', 'Espacio Educativo Y Cultural Kalen Primero A Cuarto Basico', 307),
  ('Polideportivo', 'Piscina - Espacio 1', 'Taller Municipal Adulto Mayor', 2, '10:30', '11:30', 'Taller Municipal Adulto Mayor', 308),
  ('Polideportivo', 'Piscina - Espacio 1', 'Taller Municipal Adulto Mayor', 3, '10:30', '11:30', 'Taller Mucipal Adulto Mayor', 309),
  ('Polideportivo', 'Piscina - Espacio 1', 'Taller Municipal Adulto Mayor', 4, '10:30', '11:30', 'Taller Mucipal Adulto Mayor', 310),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Baudilia Avendaño de Youssuff', 5, '10:30', '11:30', 'Escuela Baudilia Avendaño De Youssuf Cuarto Basico', 311),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Eleccion Deportiva 2', 6, '10:30', '11:30', 'Ind Eleccion Deportiva 2', 312),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Capitán Juan de Ladrilleros', 1, '11:30', '12:30', 'Escuela Capitan Juan De Ladrilleros Sexto Basico', 313),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Baudilia Avendaño de Youssuff', 2, '11:30', '12:30', 'Escuela Baudilia Avendaño De Youssuf Primero Basico', 314),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Baudilia Avendaño de Youssuff', 3, '11:30', '12:30', 'Escuela Baudilia Avendaño De Youssuf Segundo Basico', 315),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Baudilia Avendaño de Youssuff', 4, '11:30', '12:30', 'Escuela Baudilia Avendaño De Youssuf Tercero Basico', 316),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Capitán Juan de Ladrilleros', 5, '11:30', '12:30', 'Escuela Capitan Juan De Ladrilleros Cuarto Basico', 317),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nadadores Contra Corriente', 6, '11:30', '12:30', 'Nadadores Contra Corrientes', 318),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Capitán Juan de Ladrilleros', 1, '14:00', '15:00', 'Escuela Capitan Juan De Ladrilleros Segundo Basico', 319),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Personas Mayores', 2, '14:00', '15:00', 'Ind Personas Mayores', 320),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Coronel Santiago Bueras', 3, '14:00', '15:00', 'Escuela Coronel Santiago Bueras Septimo Basico', 321),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Capitán Juan de Ladrilleros', 4, '14:00', '15:00', 'Escuela Capitan Juan De Ladrilleros Tercero Basico', 322),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Personas Mayores', 5, '14:00', '15:00', 'Ind Personas Mayores', 323),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 6, '14:00', '15:00', 'Nado Libre', 324),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Personas Mayores', 1, '15:00', '16:00', 'Ind Personas Mayores', 325),
  ('Polideportivo', 'Piscina - Espacio 1', 'Taller Municipal Adultos 1', 2, '15:00', '16:00', 'Taller Municipal Adultos 1', 326),
  ('Polideportivo', 'Piscina - Espacio 1', 'Colegio Natales', 3, '15:00', '16:00', 'Colegio Natales Segundo Basico', 327),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Libertador Bernardo O''Higgins', 4, '15:00', '16:00', 'Escuela Libertador Bernardo Ohigins', 328),
  ('Polideportivo', 'Piscina - Espacio 1', 'Escuela Libertador Bernardo O''Higgins', 5, '15:00', '16:00', 'Escuela Libertador Bernardo Ohigins', 329),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 6, '15:00', '16:00', 'Nado Libre', 330),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Del Juego Al Deporte 2', 2, '16:00', '17:00', 'Ind Del Juego Al Deporte 2', 331),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Del Juego Al Deporte 2', 4, '16:00', '17:00', 'Ind Del Juego Al Deporte 2', 332),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 6, '16:00', '17:00', 'Nado Libre', 333),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Eleccion Deportiva 2', 2, '17:00', '18:00', 'Ind Eleccion Deportiva 2', 334),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Eleccion Deportiva 2', 4, '17:00', '18:00', 'Ind Eleccion Deportiva 2', 335),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 6, '17:00', '18:00', 'Nado Libre', 336),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 2, '18:00', '19:00', 'Nado Libre', 337),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 4, '18:00', '19:00', 'Nado Libre', 338),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 6, '18:00', '19:00', 'Nado Libre', 339),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Jovenes En Movimiento', 2, '19:00', '20:00', 'Ind Jovenes En Movimiento', 340),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Jovenes En Movimiento', 4, '19:00', '20:00', 'Ind Jovenes En Movimiento', 341),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 6, '19:00', '20:00', 'Nado Libre', 342),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 1, '20:00', '21:00', 'Nado Libre', 343),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 2, '20:00', '21:00', 'Nado Libre', 344),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 3, '20:00', '21:00', 'Nado Libre', 345),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 4, '20:00', '21:00', 'Nado Libre', 346),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 5, '20:00', '21:00', 'Nado Libre', 347),
  ('Polideportivo', 'Piscina - Espacio 1', 'Ind Jovenes En Movimiento', 6, '20:00', '21:00', 'Ind Jovenes En Movimiento', 348),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 1, '21:00', '22:00', 'Nado Libre', 349),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 2, '21:00', '22:00', 'Nado Libre', 350),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 3, '21:00', '22:00', 'Nado Libre', 351),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 4, '21:00', '22:00', 'Nado Libre', 352),
  ('Polideportivo', 'Piscina - Espacio 1', 'Nado Libre', 5, '21:00', '22:00', 'Nado Libre', 353),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Orlando Torterolio', 6, '10:00', '11:00', 'Escuela De Futbol Orlando Torterolio', 358),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Orlando Torterolio', 6, '11:00', '12:00', 'Escuela De Futbol Orlando Torterolio', 359),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Orlando Torterolio', 6, '12:00', '13:00', 'Escuela De Futbol Orlando Torterolio', 360),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Orlando Torterolio', 5, '14:00', '15:00', 'Escuela De Futbol Orlando Torterolio', 361),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Orlando Torterolio', 5, '15:00', '16:00', 'Escuela De Futbol Orlando Torterolio', 362),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Gallito Gonzalez', 2, '16:00', '17:00', 'Escuela De Futbol Gallito Gonzalez', 363),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Gallito Gonzalez', 5, '16:00', '17:00', 'Escuela De Futbol Gallito Gonzalez', 364),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 1, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez', 365),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Filial Colo Colo', 2, '17:00', '18:00', 'Escuela De Futbol Filial Colo Colo', 366),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 3, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez', 367),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Filial Colo Colo', 4, '17:00', '18:00', 'Escuela De Futbol Filial Colo Colo', 368),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 5, '17:00', '18:00', 'Escuela De Futbol Carlos Rodriguez', 369),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 1, '18:00', '19:00', 'Escuela De Futbol Carlos Rodriguez', 370),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Carlos Rodriguez', 3, '18:00', '19:00', 'Escuela De Futbol Carlos Rodriguez', 371),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela De Futbol Filial Colo Colo', 4, '18:00', '19:00', 'Escuela De Futbol Filial Colo Colo', 372),
  ('Cancha Luis Gallito González', 'Cancha', 'Escuela Arturo Vidal', 5, '18:00', '19:00', 'Escuela Arturo Vidal', 373),
  ('Gimnasio Carrera', 'Cancha', 'Deportes Municipalidad', 2, '21:00', '22:00', 'Deportes Municipalidad', 374),
  ('Gimnasio Carrera', 'Cancha', 'Magisterio', 1, '22:00', '23:00', 'Magisterio', 375),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ejército de Chile', 1, '09:00', '10:00', 'Ejercito De Chile', 376),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ejército de Chile', 2, '09:00', '10:00', 'Ejercito De Chile', 377),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ejército de Chile', 3, '09:00', '10:00', 'Ejercito De Chile', 378),
  ('Estadio Víctor Bórquez Miranda', 'Cancha grande', 'Ejército de Chile', 4, '09:00', '10:00', 'Ejercito De Chile', 379),
  ('Cancha Luis Gallito González', 'Cancha', 'Carabineros de Chile', 1, '14:00', '15:00', 'Carabineros De Chile', 380),
  ('Cancha Luis Gallito González', 'Cancha', 'Armada de Chile', 3, '15:00', '16:00', 'Armada De Chile', 381),
  ('Cancha Luis Gallito González', 'Cancha', 'Municipalidad', 4, '20:00', '21:00', 'Municipalidad', 382)
;

do $$
declare
  v_stage record;
  v_espacio_id uuid;
  v_entidad_id uuid;
  v_fecha date;
  v_creadas int := 0;
  v_saltadas int := 0;
  v_sin_espacio int := 0;
  v_sin_entidad int := 0;
  v_observaciones constant text :=
    'Carga piloto septiembre 2026, extraída de planilla real de programación. Pendiente de respaldo formal.';
begin
  for v_stage in select * from rd_seed_stage_202609 order by csv_line loop
    select e.id into v_espacio_id
    from rd_espacio e
    join rd_recinto r on r.id = e.recinto_id
    where r.nombre = v_stage.recinto_nombre and e.nombre = v_stage.espacio_nombre;

    if v_espacio_id is null then
      v_sin_espacio := v_sin_espacio + 1;
      raise notice 'Espacio no encontrado — línea CSV %, recinto "%", espacio "%". Fila omitida.',
        v_stage.csv_line, v_stage.recinto_nombre, v_stage.espacio_nombre;
      continue;
    end if;

    select id into v_entidad_id from rd_entidad where nombre = v_stage.entidad_nombre;
    if v_entidad_id is null then
      v_sin_entidad := v_sin_entidad + 1;
      raise notice 'Entidad no encontrada — línea CSV %, entidad "%". Fila omitida.',
        v_stage.csv_line, v_stage.entidad_nombre;
      continue;
    end if;

    v_fecha := date '2026-09-01';
    while v_fecha <= date '2026-09-30' loop
      if extract(isodow from v_fecha)::int = v_stage.dia_iso
         and v_fecha not in (date '2026-09-18', date '2026-09-19')
      then
        begin
          insert into rd_asignacion (
            espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo,
            actividad, documento_respaldo, observaciones, creado_por
          )
          values (
            v_espacio_id, v_entidad_id, v_fecha, v_stage.hora_inicio, v_stage.hora_fin, 'puntual',
            v_stage.actividad, null, v_observaciones,
            'migracion 0007 (carga piloto septiembre 2026)'
          );
          v_creadas := v_creadas + 1;
        exception when exclusion_violation then
          v_saltadas := v_saltadas + 1;
          raise notice 'Asignación saltada por conflicto — línea CSV %, espacio "%" (%), entidad "%", fecha %, %-%',
            v_stage.csv_line, v_stage.espacio_nombre, v_stage.recinto_nombre, v_stage.entidad_nombre,
            v_fecha, v_stage.hora_inicio, v_stage.hora_fin;
        end;
      end if;
      v_fecha := v_fecha + interval '1 day';
    end loop;
  end loop;

  raise notice 'Carga piloto septiembre 2026: % asignaciones creadas, % saltadas por conflicto, % filas sin espacio, % filas sin entidad.',
    v_creadas, v_saltadas, v_sin_espacio, v_sin_entidad;
end $$;

-- =========================================================================
-- 4. Bloqueos recurrentes de la Piscina Municipal (Piscina - Espacio 1 y 2)
-- =========================================================================
-- IMPORTANTE: rd_bloqueo (definida en 0001) solo tiene fecha_desde/fecha_hasta (día
-- completo) — no tiene hora_inicio/hora_fin. No se le agregaron columnas de hora en esta
-- migración para no tocar el comportamiento de los bloqueos ya existentes ni la UI que
-- los consume (getBloqueosEntreFechas, getResumenHoy, semana-grid, bloque-grid) sin que
-- el cliente lo haya pedido. Como consecuencia, cada bloqueo de abajo se carga como un
-- día puntual (fecha_desde = fecha_hasta) y el rango horario real queda SOLO en el campo
-- descripcion — la UI va a mostrar el bloqueo como si ocupara el día, no solo el tramo.
-- Ver el informe final para la recomendación de agregar hora_inicio/hora_fin a rd_bloqueo
-- si esto termina siendo confuso en la práctica.
do $$
declare
  v_polideportivo uuid;
  v_esp1 uuid;
  v_esp2 uuid;
  v_fecha date;
  v_dow int;
begin
  select id into v_polideportivo from rd_recinto where nombre = 'Polideportivo';
  select id into v_esp1 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Piscina - Espacio 1';
  select id into v_esp2 from rd_espacio where recinto_id = v_polideportivo and nombre = 'Piscina - Espacio 2';

  v_fecha := date '2026-09-01';
  while v_fecha <= date '2026-09-30' loop
    if v_fecha not in (date '2026-09-18', date '2026-09-19') then
      v_dow := extract(isodow from v_fecha)::int; -- 1=lunes .. 7=domingo

      -- Cloración de agua: todos los domingos, 08:30 a 14:30.
      if v_dow = 7 then
        insert into rd_bloqueo (espacio_id, fecha_desde, fecha_hasta, motivo, descripcion, creado_por) values
          (v_esp1, v_fecha, v_fecha, 'mantencion',
           'Cloración de agua, recurrente semanal. Horario real 08:30 a 14:30 (no representable a nivel de hora en rd_bloqueo; ver nota de la migración 0007).',
           'migracion 0007 (carga piloto septiembre 2026)'),
          (v_esp2, v_fecha, v_fecha, 'mantencion',
           'Cloración de agua, recurrente semanal. Horario real 08:30 a 14:30 (no representable a nivel de hora en rd_bloqueo; ver nota de la migración 0007).',
           'migracion 0007 (carga piloto septiembre 2026)');
      else
        -- Colación diaria (lunes a sábado): TODO(cliente) — el horario 12:30-14:00 se
        -- INFIRIÓ del vacío que deja la planilla de la Piscina entre el bloque de
        -- 11:30-12:30 y el de 14:00-15:00; el CSV no menciona la palabra "colación" en
        -- ninguna fila. Falta que José confirme este horario exacto.
        insert into rd_bloqueo (espacio_id, fecha_desde, fecha_hasta, motivo, descripcion, creado_por) values
          (v_esp1, v_fecha, v_fecha, 'mantencion',
           'Colación del personal. Horario inferido 12:30 a 14:00 a partir del vacío en la planilla original — pendiente de confirmar con José (ver informe de la migración 0007).',
           'migracion 0007 (carga piloto septiembre 2026)'),
          (v_esp2, v_fecha, v_fecha, 'mantencion',
           'Colación del personal. Horario inferido 12:30 a 14:00 a partir del vacío en la planilla original — pendiente de confirmar con José (ver informe de la migración 0007).',
           'migracion 0007 (carga piloto septiembre 2026)');
      end if;
    end if;
    v_fecha := v_fecha + interval '1 day';
  end loop;
end $$;

-- TODO(cliente): el bloqueo mensual más extenso (~24 horas) que mencionó José NO se
-- carga acá — la fecha exacta no está confirmada todavía. Ver informe final.
