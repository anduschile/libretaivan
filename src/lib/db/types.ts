// Tipos de la base de datos, escritos a mano (no hay conexión al proyecto Supabase
// compartido en este entorno para generarlos automáticamente con `supabase gen types`).
// Si más adelante corres `supabase gen types typescript`, este archivo se puede
// reemplazar por el generado sin tocar el resto del código: los tipos de dominio en
// `src/lib/db/domain.ts` son los que usa la UI.

export type RecintoTipo = "polideportivo" | "gimnasio" | "cancha" | "estadio" | "sala_multiple";
export type RecintoPropiedad = "propio" | "cedido";
export type RecintoEstado = "operativo" | "mantencion" | "cerrado";
export type EntidadTipo =
  | "club_deportivo"
  | "establecimiento_educacional"
  | "organizacion_comunitaria"
  | "taller"
  | "empresa"
  | "particular"
  | "programa_propio";
export type ConvenioEstado = "activo" | "terminado" | "suspendido";
export type AsignacionTipo = "puntual" | "convenio" | "evento_municipal";
export type AsignacionEstado = "confirmada" | "cancelada";
export type BloqueoMotivo = "mantencion" | "evento" | "clima" | "municipal_prioritario";

export interface RdRecinto {
  id: string;
  nombre: string;
  tipo: RecintoTipo;
  direccion: string | null;
  zona_horaria: string;
  propiedad: RecintoPropiedad;
  titular: string | null;
  estado: RecintoEstado;
  created_at: string;
}

export interface RdEspacio {
  id: string;
  recinto_id: string;
  nombre: string;
  tipo: string | null;
  capacidad_referencial: number | null;
  actividad_fija: string | null;
  activo: boolean;
  created_at: string;
}

export interface RdEspacioConflicto {
  espacio_a: string;
  espacio_b: string;
}

export interface RdHorarioOperacion {
  id: string;
  recinto_id: string | null;
  espacio_id: string | null;
  dia_semana: number;
  hora_apertura: string;
  hora_cierre: string;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  etiqueta: string | null;
  created_at: string;
}

export interface RdEntidad {
  id: string;
  nombre: string;
  tipo: EntidadTipo;
  con_fines_de_lucro: boolean;
  rut: string | null;
  personalidad_juridica: boolean | null;
  vigencia_directiva: string | null;
  representante: string | null;
  telefono: string | null;
  correo: string | null;
  activa: boolean;
  created_at: string;
}

export interface RdConvenio {
  id: string;
  entidad_id: string;
  espacio_id: string;
  dias_semana: number[];
  hora_inicio: string;
  hora_fin: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  documento_respaldo: string | null;
  estado: ConvenioEstado;
  observaciones: string | null;
  created_at: string;
}

export interface RdAsignacion {
  id: string;
  espacio_id: string;
  entidad_id: string;
  convenio_id: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: AsignacionTipo;
  estado: AsignacionEstado;
  actividad: string | null;
  participantes_estimados: number | null;
  documento_respaldo: string | null;
  uso_efectivo: boolean | null;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface RdBloqueo {
  id: string;
  espacio_id: string | null;
  recinto_id: string | null;
  fecha_desde: string;
  fecha_hasta: string;
  motivo: BloqueoMotivo;
  descripcion: string | null;
  creado_por: string | null;
  created_at: string;
}

