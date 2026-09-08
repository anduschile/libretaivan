-- Convenios confirmados con colegios del SLEP (gimnasios cedidos).
-- Por cada colegio se crea: recinto cedido, espacio "Gimnasio", horario de operación
-- igual a la ventana del convenio (fuera de esa ventana el espacio no es de la
-- Corporación), entidad tipo programa_propio para el taller que se dicta ahí, y el/los
-- convenio(s) que unen esa entidad con ese espacio.
--
-- TODO(cliente): `vigencia_desde` se cargó con la fecha de esta migración (2026-09-08)
-- como marcador porque no se confirmó la fecha real de inicio de estos convenios.
-- Corregirla cuando el cliente la confirme (rd_convenio.vigencia_desde).
--
-- Convención de "convenio incompleto": cuando falta un dato (actividad exacta u
-- horario exacto), en vez de agregar una columna nueva se prefija `observaciones`
-- con "[INCOMPLETO] ..." — la UI (ver src/lib/db/domain.ts, esConvenioIncompleto)
-- detecta ese prefijo y muestra un badge de advertencia en vez de tratarlo como un
-- convenio cerrado.

do $$
declare
  v_fecha_placeholder date := '2026-09-08';

  v_recinto uuid;
  v_espacio uuid;
  v_entidad uuid;
begin
  -- =========================================================================
  -- Escuela Capitán Libertador General Bernardo O'Higgins — confirmado completo
  -- =========================================================================
  insert into rd_recinto (nombre, tipo, propiedad, titular, estado)
  values (
    'Gimnasio - Escuela Capitán Libertador General Bernardo O''Higgins',
    'gimnasio', 'cedido', 'Escuela Capitán Libertador General Bernardo O''Higgins', 'operativo'
  )
  returning id into v_recinto;

  insert into rd_espacio (recinto_id, nombre, tipo, actividad_fija)
  values (v_recinto, 'Gimnasio', 'gimnasio', 'Pilates y Zumba')
  returning id into v_espacio;

  insert into rd_horario_operacion (espacio_id, dia_semana, hora_apertura, hora_cierre, etiqueta)
  values
    (v_espacio, 1, '20:00', '22:00', 'ventana_convenio'),
    (v_espacio, 3, '20:00', '22:00', 'ventana_convenio'),
    (v_espacio, 5, '20:00', '22:00', 'ventana_convenio');

  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  values ('Pilates y Zumba - Escuela O''Higgins', 'programa_propio', false, true)
  returning id into v_entidad;

  insert into rd_convenio (
    entidad_id, espacio_id, dias_semana, hora_inicio, hora_fin,
    vigencia_desde, vigencia_hasta, documento_respaldo, estado, observaciones
  )
  values (
    v_entidad, v_espacio, array[1,3,5], '20:00', '22:00',
    v_fecha_placeholder, null, 'oficio', 'activo',
    'Convenio confirmado con la escuela: Pilates y Zumba, lunes/miércoles/viernes 20:00-22:00.'
  );

  -- =========================================================================
  -- Escuela Capitán Juan de Ladrilleros — actividad sin confirmar
  -- =========================================================================
  insert into rd_recinto (nombre, tipo, propiedad, titular, estado)
  values (
    'Gimnasio - Escuela Capitán Juan de Ladrilleros',
    'gimnasio', 'cedido', 'Escuela Capitán Juan de Ladrilleros', 'operativo'
  )
  returning id into v_recinto;

  -- actividad_fija se deja NULL: no se confirmó qué taller se dicta acá (ver TODO más abajo).
  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_recinto, 'Gimnasio', 'gimnasio')
  returning id into v_espacio;

  insert into rd_horario_operacion (espacio_id, dia_semana, hora_apertura, hora_cierre, etiqueta)
  values
    (v_espacio, 6, '10:00', '18:00', 'ventana_convenio'),
    (v_espacio, 7, '10:00', '20:00', 'ventana_convenio');

  -- TODO(cliente): no confirmó qué taller/actividad se dicta en este horario.
  -- No se inventa un nombre: se deja un placeholder explícito y visible en la UI.
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  values ('Taller por confirmar — Ladrilleros', 'programa_propio', false, true)
  returning id into v_entidad;

  -- Sábado y domingo tienen horas de término distintas (18:00 vs 20:00), y rd_convenio
  -- solo admite un hora_inicio/hora_fin por fila: se cargan como dos convenios separados
  -- en vez de uno con dias_semana {6,7}.
  insert into rd_convenio (
    entidad_id, espacio_id, dias_semana, hora_inicio, hora_fin,
    vigencia_desde, vigencia_hasta, documento_respaldo, estado, observaciones
  )
  values
    (
      v_entidad, v_espacio, array[6], '10:00', '18:00',
      v_fecha_placeholder, null, 'oficio', 'activo',
      '[INCOMPLETO] Falta confirmar con el cliente qué taller/actividad se dicta en este horario.'
    ),
    (
      v_entidad, v_espacio, array[7], '10:00', '20:00',
      v_fecha_placeholder, null, 'oficio', 'activo',
      '[INCOMPLETO] Falta confirmar con el cliente qué taller/actividad se dicta en este horario.'
    );

  -- =========================================================================
  -- Escuela Baudilia Avendaño de Youssuff — actividad y tramo semana sin confirmar
  -- =========================================================================
  insert into rd_recinto (nombre, tipo, propiedad, titular, estado)
  values (
    'Gimnasio - Escuela Baudilia Avendaño de Youssuff',
    'gimnasio', 'cedido', 'Escuela Baudilia Avendaño de Youssuff', 'operativo'
  )
  returning id into v_recinto;

  insert into rd_espacio (recinto_id, nombre, tipo)
  values (v_recinto, 'Gimnasio', 'gimnasio')
  returning id into v_espacio;

  -- Solo el fin de semana está confirmado. El tramo de lunes a viernes (3 horas diarias
  -- en la tarde) NO se carga: falta confirmar la hora exacta de inicio/término, y cargar
  -- un horario inventado bloquearía disponibilidad real sin motivo.
  -- TODO(cliente): confirmar hora de inicio y término del tramo lunes a viernes, y
  -- entonces agregar aquí las filas rd_horario_operacion (dia_semana 1 a 5) y el
  -- rd_convenio correspondiente para esos días.
  insert into rd_horario_operacion (espacio_id, dia_semana, hora_apertura, hora_cierre, etiqueta)
  values
    (v_espacio, 6, '10:00', '18:00', 'ventana_convenio'),
    (v_espacio, 7, '10:00', '19:00', 'ventana_convenio');

  -- TODO(cliente): mismo caso que Ladrilleros, no se confirmó la actividad.
  insert into rd_entidad (nombre, tipo, con_fines_de_lucro, activa)
  values ('Taller por confirmar — Avendaño', 'programa_propio', false, true)
  returning id into v_entidad;

  insert into rd_convenio (
    entidad_id, espacio_id, dias_semana, hora_inicio, hora_fin,
    vigencia_desde, vigencia_hasta, documento_respaldo, estado, observaciones
  )
  values
    (
      v_entidad, v_espacio, array[6], '10:00', '18:00',
      v_fecha_placeholder, null, 'oficio', 'activo',
      '[INCOMPLETO] Falta confirmar con el cliente qué taller/actividad se dicta en este horario. También falta cargar el tramo de lunes a viernes (horas por confirmar).'
    ),
    (
      v_entidad, v_espacio, array[7], '10:00', '19:00',
      v_fecha_placeholder, null, 'oficio', 'activo',
      '[INCOMPLETO] Falta confirmar con el cliente qué taller/actividad se dicta en este horario. También falta cargar el tramo de lunes a viernes (horas por confirmar).'
    );
end $$;

-- Nota: esta migración NO genera filas en rd_asignacion. La generación de las sesiones
-- semanales a partir de un convenio hoy vive en la app (ver
-- src/app/(app)/organizaciones/convenios/actions.ts, crearConvenio) y se dispara al
-- crear el convenio desde la UI; estos convenios se cargaron directo por SQL para
-- reflejar acuerdos ya vigentes, así que sus asignaciones todavía no existen. Falta
-- decidir cómo generarlas (una función que reuse esa misma lógica, o recrear estos
-- convenios desde la UI una vez resueltos los TODO).
