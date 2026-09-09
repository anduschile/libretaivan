-- Backfill de 433 asignaciones que la migración 0007 no pudo crear por un desajuste de
-- nombres entre lo que asumí (leyendo el texto de 0002_seed_datos_reales.sql) y lo que
-- realmente existe hoy en la base: el espacio de la cancha principal del Polideportivo se
-- llama "Cancha Principal" (no "Cancha 20x40"), y el recinto del gimnasio se llama
-- "Gimnasio José Miguel Carrera" (no "Gimnasio Carrera"). Ambos nombres deben haberse
-- corregido en algún momento después de aplicar 0002, sin que el archivo de esa migración
-- se haya actualizado para reflejarlo — 0002 no vuelve a correr sola, así que el texto del
-- archivo y el estado real de la base quedaron desalineados.
--
-- Esto se descubrió al investigar el punto 1 del pedido de correcciones: confirmar
-- rd_espacio_conflicto contra la base real (no contra el texto de las migraciones) mostró
-- que el espacio se llama "Cancha Principal". Al recontar cuántas asignaciones había creado
-- realmente la migración 0007 (1086 de las 1519 esperadas), la diferencia exacta de 433
-- correspondía a las filas del CSV que apuntaban a "Cancha 20x40" (59) o a "Gimnasio
-- Carrera" (374) — 0007 no las insertó porque el lookup por nombre no encontró el espacio,
-- las contó como "sin_espacio" y las saltó sin insertar nada (no hubo ningún choque de
-- horario real). Verificado contra la base: no hay ningún otro par recinto/espacio de la
-- 0007 que no exista hoy — estos dos son los únicos dos.
--
-- No se toca 0007 (no se editan migraciones ya aplicadas). Este backfill reusa exactamente
-- las mismas 107 filas del CSV, con los mismos números de línea para trazabilidad, apuntando
-- a los nombres reales. Se agrega un WHERE NOT EXISTS por (espacio_id, entidad_id, fecha,
-- hora_inicio, hora_fin) para que sea seguro volver a correrla si ya se insertó algo a mano
-- mientras tanto.

create temporary table rd_backfill_stage_0008 (
  recinto_nombre text not null,
  espacio_nombre text not null,
  entidad_nombre text not null,
  dia_iso int not null check (dia_iso between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  actividad text not null,
  csv_line int not null
) on commit drop;

insert into rd_backfill_stage_0008
  (recinto_nombre, espacio_nombre, entidad_nombre, dia_iso, hora_inicio, hora_fin, actividad, csv_line)
values
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Ejército de Chile', 1, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 162),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Ejército de Chile', 2, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 163),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Ejército de Chile', 3, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 164),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Ejército de Chile', 4, '08:00', '09:00', 'Acondicionamiento Fisico Ejercito', 165),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 6, '09:00', '10:00', 'Club De Tenis Ultima Esperanza', 166),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 7, '09:00', '10:00', 'Club De Tenis Ultima Esperanza', 167),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 1, '10:00', '11:00', 'Cesfam Elige Vida Sana', 168),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 2, '10:00', '11:00', 'Cesfam Elige Vida Sana', 169),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 3, '10:00', '11:00', 'Cesfam Elige Vida Sana', 170),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 4, '10:00', '11:00', 'Cesfam Elige Vida Sana', 171),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 5, '10:00', '11:00', 'Cesfam Elige Vida Sana', 172),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 6, '10:00', '11:00', 'Club De Tenis Ultima Esperanza', 173),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 7, '10:00', '11:00', 'Club De Tenis Ultima Esperanza', 174),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 1, '11:00', '12:00', 'Cesfam Elige Vida Sana', 175),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 2, '11:00', '12:00', 'Cesfam Elige Vida Sana', 176),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 3, '11:00', '12:00', 'Cesfam Elige Vida Sanaj', 177),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 4, '11:00', '12:00', 'Cesfam Elige Vida Sana', 178),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 5, '11:00', '12:00', 'Cesfam Elige Vida Sana', 179),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 6, '11:00', '12:00', 'Club De Tenis Ultima Esperanza', 180),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 7, '11:00', '12:00', 'Club De Tenis Ultima Esperanza', 181),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 1, '12:00', '13:00', 'Cesfam Elige Vida Sana', 182),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 2, '12:00', '13:00', 'Cesfam Elige Vida Sana', 183),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 3, '12:00', '13:00', 'Cesfam Elige Vida Sana', 184),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 4, '12:00', '13:00', 'Cesfam Elige Vida Sana', 185),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Cesfam Elige Vida Sana', 5, '12:00', '13:00', 'Cesfam Elige Vida Sana', 186),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Condores Hockey', 6, '12:00', '13:00', 'Club Condores Hockey', 187),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Condores Hockey', 7, '12:00', '13:00', 'Club Condores Hockey', 188),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Condores Hockey', 6, '13:00', '14:00', 'Club Condores Hockey', 189),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Condores Hockey', 7, '13:00', '14:00', 'Club Condores Hockey', 190),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Bories Basquetbol', 5, '14:00', '15:00', 'Club Bories Basquetbol', 191),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Bories Basquetbol', 5, '15:00', '16:00', 'Club Bories Basquetbol', 192),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 1, '16:00', '17:00', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 193),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 2, '16:00', '17:00', 'Club Esmeralda Basquetbol', 194),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 3, '16:00', '17:00', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 195),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Bories Basquetbol', 4, '16:00', '17:00', 'Club Bories Basquetbol', 196),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 5, '16:00', '17:00', 'Voleibol Ind Del Juego Al Deporte Edad 07 A 11 Años', 197),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Bories Voleibol', 1, '17:00', '18:00', 'Voleibol Jovenes Club Bories', 198),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 2, '17:00', '18:00', 'Club Esmeralda Basquetbol', 199),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 3, '17:00', '18:00', 'Club Esmeralda Basquetbol', 200),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Bories Basquetbol', 4, '17:00', '18:00', 'Club Bories Basquetbol', 201),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Esmeralda Basquetbol', 5, '17:00', '18:00', 'Club Esmeralda Basquetbol', 202),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Condores Hockey', 1, '18:00', '19:00', 'Club Condores Hockey', 203),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Esmeralda Voleibol', 3, '18:00', '19:00', 'Club Esmeralda Voleibol', 204),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Esmeralda Futsal', 4, '18:00', '19:00', 'Club Esmeralda Futsal', 205),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Futsal Femenino', 5, '18:00', '19:00', 'Asociacion De Futsal Femenino', 206),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club de Voleibol Natales', 1, '19:00', '20:00', 'Club Voleybol Natales Voleybol Varones Sub16', 207),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Futsal Femenino', 2, '19:00', '20:00', 'Asociacion De Futsal Femenino', 208),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Esmeralda Voleibol', 3, '19:00', '20:00', 'Club Esmeralda Voleibol', 209),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Bories Voleibol', 4, '19:00', '20:00', 'Voleibol Jovenes Club Bories', 210),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '19:00', '20:00', 'Asociacion De Basquetbol De Ultima Esperanza', 211),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Basquetbol (taller Eva Cardenas)', 1, '20:00', '21:00', 'Basquetbol', 212),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Bories Voleibol', 2, '20:00', '21:00', 'Voleibol Adultos Club Bories', 213),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 3, '20:00', '21:00', 'Asociacion De Basquetbol De Ultima Esperanza', 214),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club Deportivo Mineros', 4, '20:00', '21:00', 'Club Deportivo Mineros', 215),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '20:00', '21:00', 'Asociacion De Basquetbol De Ultima Esperanza', 216),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 3, '21:00', '22:00', 'Asociacion De Basquetbol De Ultima Esperanza', 217),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '21:00', '22:00', 'Asociacion De Basquetbol De Ultima Esperanza', 218),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Club De Tenis Ultima Esperanza', 2, '22:00', '23:00', 'Club De Tenis Ultima Esperanza', 219),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 3, '22:00', '23:00', 'Asociacion De Basquetbol De Ultima Esperanza', 220),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Futsal Damas', 4, '22:00', '23:00', 'Futsal Damas', 221),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Asociación de Basquetbol de Última Esperanza', 5, '22:00', '23:00', 'Asociacion De Basquetbol De Ultima Esperanza', 222),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '09:00', '10:00', 'Cesfam', 223),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '09:00', '10:00', 'Cesfam', 224),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '09:00', '10:00', 'Cesfam', 225),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '10:00', '11:00', 'Cesfam', 226),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '10:00', '11:00', 'Cesfam', 227),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '10:00', '11:00', 'Cesfam', 228),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '11:00', '12:00', 'Cesfam', 229),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '11:00', '12:00', 'Cesfam', 230),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '11:00', '12:00', 'Cesfam', 231),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 1, '12:00', '13:00', 'Cesfam', 232),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 3, '12:00', '13:00', 'Cesfam', 233),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Cesfam', 4, '12:00', '13:00', 'Cesfam', 234),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '15:00', '16:00', 'Conjunto Folclorico Natales', 235),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Club De Patinaje Natales Sobre Ruedas', 2, '16:00', '17:00', 'Club De Patinaje Natales Sobre Ruedas', 236),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '16:00', '17:00', 'Conjunto Folclorico Natales', 237),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '17:00', '18:00', 'Conjunto Folclorico Natales', 238),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '17:00', '18:00', 'Conjunto Folclorico Natales', 239),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Club Karate Jiyukan', 2, '18:00', '19:00', 'Club Karate Jiyukan', 240),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Club Karate Jiyukan', 4, '18:00', '19:00', 'Club Karate Jiyukan', 241),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '18:00', '19:00', 'Conjunto Folclorico Natales', 242),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 7, '18:00', '19:00', 'Conjunto Folclorico Natales', 243),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '19:00', '20:00', 'Conjunto Folclorico Natales', 244),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Conjunto Folclórico Natales', 6, '20:00', '21:00', 'Conjunto Folclorico Natales', 245),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 1, '21:00', '22:00', 'Grupo Skabach', 246),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 3, '21:00', '22:00', 'Grupo Skabach', 247),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 5, '21:00', '22:00', 'Grupo Skabach', 248),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 1, '22:00', '23:00', 'Grupo Skabach', 249),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 3, '22:00', '23:00', 'Grupo Skabach', 250),
  ('Gimnasio José Miguel Carrera', 'Segundo piso (sala 12x4m)', 'Grupo Skabach', 5, '22:00', '23:00', 'Grupo Skabach', 251),
  ('Polideportivo', 'Cancha Principal', 'Ind Mujer En Movimiento Zumba', 1, '10:00', '11:00', 'Ind Mujer En Movimiento Zumba', 260),
  ('Polideportivo', 'Cancha Principal', 'Ind Mujer En Movimiento Zumba', 3, '10:00', '11:00', 'Ind Mujer En Movimiento Zumba', 261),
  ('Polideportivo', 'Cancha Principal', 'Ind Mujer En Movimiento Zumba', 5, '10:00', '11:00', 'Ind Mujer En Movimiento Zumba', 262),
  ('Polideportivo', 'Cancha Principal', 'Asociación de Basquetbol de Última Esperanza', 5, '13:00', '14:00', 'Asociacion De Basquetbol De Ultima Esperanza', 263),
  ('Polideportivo', 'Cancha Principal', 'Asociación de Basquetbol de Última Esperanza', 5, '14:00', '15:00', 'Asociacion De Basquetbol De Ultima Esperanza', 264),
  ('Polideportivo', 'Cancha Principal', 'Los Pumas Basquetbol', 5, '15:00', '16:00', 'Los Pumas Basquetbol', 265),
  ('Polideportivo', 'Cancha Principal', 'Club Bories Basquetbol', 3, '16:00', '17:00', 'Cancha Uno Club Bories Basquetbol', 270),
  ('Polideportivo', 'Cancha Principal', 'Los Pumas Basquetbol', 5, '16:00', '17:00', 'Los Pumas Basquetbol', 273),
  ('Polideportivo', 'Cancha Principal', 'Asociación de Futbol Selecciones', 5, '17:00', '18:00', 'Asociacion De Futbol Selecciones', 280),
  ('Polideportivo', 'Cancha Principal', 'Newcom Club Natales', 3, '18:00', '19:00', 'Newcom Club Natales', 285),
  ('Polideportivo', 'Cancha Principal', 'Club Esmeralda Basquetbol', 3, '19:00', '20:00', 'Esmeralda Sub 15 Varones', 286),
  ('Polideportivo', 'Cancha Principal', 'Club Natalinos T/P', 2, '21:00', '22:00', 'Cancha Balonmano Club “Natalinos T/P”', 287),
  ('Polideportivo', 'Cancha Principal', 'Club de Voleibol Natales', 5, '21:00', '22:00', 'Club De Voleibol Natales Adultos Varones', 289),
  ('Polideportivo', 'Cancha Principal', 'Asociación de Futbol Selecciones', 2, '22:00', '23:00', 'Asociacion De Futbol Selecciones', 290),
  ('Polideportivo', 'Cancha Principal', 'Club Bories Voleibol', 4, '22:00', '23:00', 'Voleibol Adultos Club Bories', 291),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Deportes Municipalidad', 2, '21:00', '22:00', 'Deportes Municipalidad', 374),
  ('Gimnasio José Miguel Carrera', 'Cancha', 'Magisterio', 1, '22:00', '23:00', 'Magisterio', 375)
;

do $$
declare
  v_stage record;
  v_espacio_id uuid;
  v_entidad_id uuid;
  v_fecha date;
  v_creadas int := 0;
  v_saltadas int := 0;
  v_ya_existian int := 0;
  v_sin_espacio int := 0;
  v_sin_entidad int := 0;
  v_observaciones constant text :=
    'Carga piloto septiembre 2026, extraída de planilla real de programación. Pendiente de respaldo formal.';
begin
  for v_stage in select * from rd_backfill_stage_0008 order by csv_line loop
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
        if exists (
          select 1 from rd_asignacion
          where espacio_id = v_espacio_id and entidad_id = v_entidad_id
            and fecha = v_fecha and hora_inicio = v_stage.hora_inicio and hora_fin = v_stage.hora_fin
        ) then
          v_ya_existian := v_ya_existian + 1;
        else
          begin
            insert into rd_asignacion (
              espacio_id, entidad_id, fecha, hora_inicio, hora_fin, tipo,
              actividad, documento_respaldo, observaciones, creado_por
            )
            values (
              v_espacio_id, v_entidad_id, v_fecha, v_stage.hora_inicio, v_stage.hora_fin, 'puntual',
              v_stage.actividad, null, v_observaciones,
              'migracion 0008 (backfill nombres correctos post-0007)'
            );
            v_creadas := v_creadas + 1;
          exception when exclusion_violation then
            v_saltadas := v_saltadas + 1;
            raise notice 'Asignación saltada por conflicto — línea CSV %, espacio "%" (%), entidad "%", fecha %, %-%',
              v_stage.csv_line, v_stage.espacio_nombre, v_stage.recinto_nombre, v_stage.entidad_nombre,
              v_fecha, v_stage.hora_inicio, v_stage.hora_fin;
          end;
        end if;
      end if;
      v_fecha := v_fecha + interval '1 day';
    end loop;
  end loop;

  raise notice 'Backfill 0008: % asignaciones creadas, % ya existían, % saltadas por conflicto, % filas sin espacio, % filas sin entidad.',
    v_creadas, v_ya_existian, v_saltadas, v_sin_espacio, v_sin_entidad;
end $$;
