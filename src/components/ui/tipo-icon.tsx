import { Building2, LayoutGrid } from "lucide-react";
import {
  RECINTO_TIPO_ICON,
  RECINTO_TIPO_CHIP,
  ESPACIO_TIPO_ICON,
  ESPACIO_TIPO_CHIP,
  CHIP_COLOR_DEFAULT,
} from "@/lib/db/domain";
import type { RecintoTipo } from "@/lib/db/types";

// Componentes estables (declarados una sola vez a nivel de módulo), resolviendo el
// ícono con una indexación directa a la tabla en vez de a través de una función — el
// lint react-hooks/static-components marca como "componente creado en cada render"
// cualquier variable asignada desde una llamada a función y usada como etiqueta JSX,
// aunque en la práctica solo devuelva una referencia estable de una tabla.
//
// Ambos se pintan como un chip circular de color (fondo suave + ícono), no como un
// ícono en línea plano, para que el tipo se distinga a simple vista.
export function RecintoTipoIcon({
  tipo,
  size = 16,
  className = "",
}: {
  tipo: RecintoTipo;
  size?: number;
  className?: string;
}) {
  const Icono = RECINTO_TIPO_ICON[tipo] ?? Building2;
  const { bg, fg } = RECINTO_TIPO_CHIP[tipo] ?? CHIP_COLOR_DEFAULT;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full p-1.5 ${bg} ${fg} ${className}`}>
      <Icono size={size} />
    </span>
  );
}

export function EspacioTipoIcon({
  tipo,
  size = 16,
  className = "",
}: {
  tipo: string | null;
  size?: number;
  className?: string;
}) {
  const Icono = (tipo && ESPACIO_TIPO_ICON[tipo]) || LayoutGrid;
  const { bg, fg } = (tipo && ESPACIO_TIPO_CHIP[tipo]) || CHIP_COLOR_DEFAULT;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full p-1.5 ${bg} ${fg} ${className}`}>
      <Icono size={size} />
    </span>
  );
}
