-- Carga inicial de datos reales del cliente (recintos, espacios, conflictos y horarios).
-- No incluye entidades ni convenios: esos los carga el cliente desde la app con sus datos reales.
-- Esta migración es idempotente respecto de sí misma (usa DELETE + INSERT no; se asume que
-- corre una sola vez sobre una base nueva). Si necesitas volver a correrla, limpia antes las
-- tablas rd_horario_operacion, rd_espacio_conflicto, rd_espacio y rd_recinto.

do $$
declare
  v_polideportivo uuid;
  v_gimnasio uuid;
  v_sala_multiple uuid;
  v_cancha_luis_gallo uuid;
  v_estadio_lastra uuid;
  v_estadio_borquez uuid;

  v_esp_cancha_poli uuid;
  v_esp_transversal1 uuid;
  v_esp_transversal2 uuid;
  v_esp_pasillo uuid;
  v_esp_piscina uuid;
  v_esp_musculacion uuid;
  v_esp_cafeteria uuid;

  v_esp_gim_cancha uuid;
  v_esp_gim_2piso uuid;

  v_esp_sala1 uuid;
  v_esp_sala2 uuid;
  v_esp_sala3 uuid;

  v_esp_luis_gallo uuid;
  v_esp_lastra uuid;
  v_esp_borquez_grande uuid;
  v_esp_borquez_chica uuid;

  v_recinto uuid;
  v_dia int;
begin
  -- ---------------------------------------------------------------------
  -- RECINTOS
  -- ---------------------------------------------------------------------
  insert into rd_recinto (nombre, tipo, propiedad, estado)
  values ('Polideportivo', 'polideportivo', 'propio', 'operativo')
  returning id into v_polideportivo;

  insert into rd_recinto (nombre, tipo, propiedad, estado)
  values ('Gimnasio Carrera', 'gimnasio', 'propio', 'operativo')
  returning id into v_gimnasio;

  insert into rd_recinto (nombre, tipo, propiedad, estado)
  values ('Sala de uso múltiple', 'sala_multiple', 'propio', 'operativo')
  returning id into v_sala_multiple;

  insert into rd_recinto (nombre, tipo, propiedad, estado)
  values ('Cancha Luis Gallito González', 'cancha', 'propio', 'operativo')
  returning id into v_cancha_luis_gallo;

  insert into rd_recinto (nombre, tipo, propiedad, estado)
  values ('Estadio Francisco Lastra', 'estadio', 'propio', 'operativo')
  returning id into v_estadio_lastra;

  insert into rd_recinto (nombre, tipo, propiedad, estado)
  values ('Estadio Víctor Bórquez Miranda', 'estadio', 'propio', 'operativo')
  returning id into v_estadio_borquez;

  -- ---------------------------------------------------------------------
  -- ESPACIOS — Polideportivo
  -- ---------------------------------------------------------------------
  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_polideportivo, 'Cancha 20x40', 'cancha')
  returning id into v_esp_cancha_poli;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_polideportivo, 'Transversal 1', 'media_cancha')
  returning id into v_esp_transversal1;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_polideportivo, 'Transversal 2', 'media_cancha')
  returning id into v_esp_transversal2;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_polideportivo, 'Pasillo de entrada', 'pasillo')
  returning id into v_esp_pasillo;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_polideportivo, 'Piscina', 'piscina')
  returning id into v_esp_piscina;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_polideportivo, 'Sala de musculación', 'sala')
  returning id into v_esp_musculacion;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_polideportivo, 'Cafetería', 'otro')
  returning id into v_esp_cafeteria;

  -- Cancha completa entra en conflicto con cada transversal; entre sí las transversales
  -- se usan en paralelo y no tienen conflicto.
  insert into rd_espacio_conflicto (espacio_a, espacio_b) values
    (v_esp_cancha_poli, v_esp_transversal1),
    (v_esp_cancha_poli, v_esp_transversal2);

  -- ---------------------------------------------------------------------
  -- ESPACIOS — Gimnasio Carrera
  -- ---------------------------------------------------------------------
  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_gimnasio, 'Cancha', 'cancha')
  returning id into v_esp_gim_cancha;

  insert into rd_espacio (recinto_id, nombre, tipo, capacidad_referencial)
  values (v_gimnasio, 'Segundo piso (sala 12x4m)', 'sala', null)
  returning id into v_esp_gim_2piso;

  -- ---------------------------------------------------------------------
  -- ESPACIOS — Sala de uso múltiple
  -- ---------------------------------------------------------------------
  insert into rd_espacio (recinto_id, nombre, tipo, actividad_fija)
  values (v_sala_multiple, 'Sala 1', 'sala', 'patinaje')
  returning id into v_esp_sala1;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_sala_multiple, 'Sala 2', 'sala')
  returning id into v_esp_sala2;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_sala_multiple, 'Sala 3', 'sala')
  returning id into v_esp_sala3;

  -- ---------------------------------------------------------------------
  -- ESPACIOS — Canchas y estadios de cancha única / independiente
  -- ---------------------------------------------------------------------
  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_cancha_luis_gallo, 'Cancha', 'cancha')
  returning id into v_esp_luis_gallo;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_estadio_lastra, 'Cancha', 'cancha')
  returning id into v_esp_lastra;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_estadio_borquez, 'Cancha grande', 'cancha')
  returning id into v_esp_borquez_grande;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_estadio_borquez, 'Cancha chica', 'cancha')
  returning id into v_esp_borquez_chica;
  -- Cancha grande y cancha chica del Estadio Bórquez son independientes: sin conflicto entre ellas.

  -- ---------------------------------------------------------------------
  -- HORARIO NORMAL — todos los recintos propios, todo el año
  -- Lunes(1) a viernes(5): 08:00–23:00 · Sábado(6) y domingo(7): 09:00–21:00
  -- ---------------------------------------------------------------------
  foreach v_recinto in array array[
    v_polideportivo, v_gimnasio, v_sala_multiple,
    v_cancha_luis_gallo, v_estadio_lastra, v_estadio_borquez
  ]
  loop
    for v_dia in 1..5 loop
      insert into rd_horario_operacion (recinto_id, dia_semana, hora_apertura, hora_cierre, etiqueta)
      values (v_recinto, v_dia, '08:00', '23:00', 'normal');
    end loop;
    for v_dia in 6..7 loop
      insert into rd_horario_operacion (recinto_id, dia_semana, hora_apertura, hora_cierre, etiqueta)
      values (v_recinto, v_dia, '09:00', '21:00', 'normal');
    end loop;
  end loop;

  -- ---------------------------------------------------------------------
  -- HORARIO INVIERNO — Estadio Francisco Lastra y Estadio Víctor Bórquez Miranda
  -- TODO(cliente): falta confirmar el rango exacto de fechas de invierno (vigencia_desde /
  -- vigencia_hasta). Se cargan las filas con vigencia NULL para no perder el dato de que
  -- existe un horario reducido de invierno, pero la UI NO las aplica automáticamente a la
  -- validación de conflictos hasta que estas fechas se completen (ver informe final).
  -- ---------------------------------------------------------------------
  foreach v_recinto in array array[v_estadio_lastra, v_estadio_borquez]
  loop
    for v_dia in 1..7 loop
      insert into rd_horario_operacion
        (recinto_id, dia_semana, hora_apertura, hora_cierre, vigencia_desde, vigencia_hasta, etiqueta)
      values
        (v_recinto, v_dia, '08:00', '17:00', null, null, 'invierno');
    end loop;
  end loop;
end $$;
