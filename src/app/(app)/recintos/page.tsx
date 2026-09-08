import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRecintos, getEspacios } from "@/lib/data/queries";
import { RECINTO_TIPO_LABEL } from "@/lib/db/domain";
import { RecintoTipoIcon } from "@/components/ui/tipo-icon";
import { RecintoFormButton } from "./recinto-form";

export const dynamic = "force-dynamic";

export default async function RecintosPage() {
  const [recintos, espacios] = await Promise.all([getRecintos(), getEspacios()]);

  return (
    <div>
      <PageHeader title="Recintos" subtitle={`${recintos.length} recintos registrados`} />

      <div className="flex flex-col gap-3 px-4 py-4 desktop:px-8">
        {recintos.map((r) => {
          const espaciosDelRecinto = espacios.filter((e) => e.recinto_id === r.id);
          return (
            <Link key={r.id} href={`/recintos/${r.id}`}>
              <Card className="flex items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <RecintoTipoIcon tipo={r.tipo} size={18} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{r.nombre}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {RECINTO_TIPO_LABEL[r.tipo]} · {espaciosDelRecinto.length} espacio
                      {espaciosDelRecinto.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.propiedad === "cedido" && <Badge variant="warning">Cedido</Badge>}
                  {r.estado !== "operativo" && (
                    <Badge variant="danger">{r.estado === "mantencion" ? "Mantención" : "Cerrado"}</Badge>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <RecintoFormButton />
    </div>
  );
}
