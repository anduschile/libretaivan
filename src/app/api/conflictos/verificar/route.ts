import { NextResponse } from "next/server";
import { verificarConflicto } from "@/lib/data/conflictos";

export async function POST(request: Request) {
  const body = await request.json();
  const { espacioId, fecha, horaInicio, horaFin, excluirAsignacionId } = body ?? {};

  if (!espacioId || !fecha || !horaInicio || !horaFin) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }

  try {
    const conflicto = await verificarConflicto({
      espacioId,
      fecha,
      horaInicio,
      horaFin,
      excluirAsignacionId,
    });
    return NextResponse.json({ conflicto });
  } catch {
    return NextResponse.json({ error: "No se pudo verificar el conflicto." }, { status: 500 });
  }
}
