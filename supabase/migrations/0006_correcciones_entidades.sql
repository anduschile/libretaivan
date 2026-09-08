-- Correcciones sobre el catálogo cargado en 0005_entidades_clubes_escuelas.sql.
-- Se hace como migración nueva (no se edita 0005) para no reescribir una migración
-- que ya puede estar aplicada.

do $$
declare
  v_club_id uuid;
  v_escuela_id uuid;
begin
  -- 1) "Club Manuel Cuyul" y "Escuela Manuel Cuyul" eran la misma institución
  -- (dictadas por error como si fueran dos). Se fusionan en "Club Manuel Cuyul".
  -- Si alguna llegó a tener una asignación o convenio (no debería, todavía no se
  -- generó nada para este catálogo), se reasigna a la que se mantiene antes de
  -- borrar la duplicada. Con "if ... is not null" el bloque no hace nada si el
  -- catálogo de 0005 todavía no se ha cargado, así que es seguro correrlo en
  -- cualquier orden.
  select id into v_club_id from rd_entidad where nombre = 'Club Manuel Cuyul';
  select id into v_escuela_id from rd_entidad where nombre = 'Escuela Manuel Cuyul';

  if v_club_id is not null and v_escuela_id is not null then
    update rd_asignacion set entidad_id = v_club_id where entidad_id = v_escuela_id;
    update rd_convenio set entidad_id = v_club_id where entidad_id = v_escuela_id;
    delete from rd_entidad where id = v_escuela_id;
  end if;

  -- 2) "Escuela Pumas" no es un colegio, es una escuela de fútbol (club deportivo
  -- infantil-juvenil). La regla "empieza con 'Escuela' -> establecimiento_educacional"
  -- no aplica acá ni en general: muchos clubes deportivos chilenos usan "Escuela" en
  -- su nombre sin ser colegios. No se vuelve a aplicar esa regla a nada más — donde
  -- haya duda, el tipo por defecto es club_deportivo y se corrige a mano si corresponde.
  update rd_entidad set tipo = 'club_deportivo' where nombre = 'Escuela Pumas';

  -- "Club Torteroglio" NO se toca: hay una inconsistencia de nombre sin resolver
  -- (pudo mencionarse también como "Escuela Torteroglio") pendiente de que el
  -- cliente la aclare.
end $$;
