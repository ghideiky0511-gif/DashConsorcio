import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatBRL, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CartaLista } from "@/lib/queries/carteira";

export function ListaCompacta({
  cartas,
  total,
}: {
  cartas: CartaLista[];
  total: number;
}) {
  const mostrando = cartas.slice(0, 12);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-sm font-medium">
          Cartas {total > 0 && <span className="text-muted-foreground">({total})</span>}
        </span>
        {total > mostrando.length && (
          <span className="text-xs text-muted-foreground">
            mostrando {mostrando.length}
          </span>
        )}
      </div>

      {mostrando.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma carta para os filtros atuais.
        </p>
      ) : (
        <ul className="divide-y">
          {mostrando.map((c) => {
            const lucroNeg =
              c.percentualLucro != null && c.percentualLucro < 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/cartas/${c.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/60"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      background:
                        c.etapaCor ?? "var(--color-muted-foreground)",
                    }}
                  />
                  <span className="w-24 shrink-0 font-medium">{c.codigo}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {c.cessionaria} · {c.etapa}
                  </span>
                  <span className="hidden w-28 shrink-0 text-right tabular-nums sm:block">
                    {formatBRL(c.valorCredito)}
                  </span>
                  <span
                    className={cn(
                      "w-16 shrink-0 text-right tabular-nums",
                      lucroNeg ? "text-destructive" : "text-positive",
                    )}
                  >
                    {c.percentualLucro == null
                      ? "—"
                      : formatPercent(c.percentualLucro)}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
