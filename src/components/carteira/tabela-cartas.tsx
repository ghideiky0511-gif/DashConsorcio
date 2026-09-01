"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortHeader } from "@/components/carteira/sort-header";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CartaLista } from "@/lib/queries/carteira";

export function TabelaCartas({ cartas }: { cartas: CartaLista[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function editar(id: string) {
    const p = new URLSearchParams(sp.toString());
    p.set("editar", id);
    router.push(`${pathname}?${p}`);
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader field="codigo">Código</SortHeader>
            <TableHead>Cessionária</TableHead>
            <TableHead>Administradora</TableHead>
            <TableHead>Grupo / Cota</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Status</TableHead>
            <SortHeader field="valorCredito" numeric>
              Crédito atual
            </SortHeader>
            <TableHead className="text-right">Custo total</TableHead>
            <SortHeader field="previsaoResgate" numeric>
              Prev. resgate
            </SortHeader>
            <TableHead className="text-right">% lucro prev.</TableHead>
            <SortHeader field="contempladaEm" numeric>
              Contemplação
            </SortHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cartas.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={11}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                Nenhuma carta encontrada com esses filtros.
              </TableCell>
            </TableRow>
          ) : (
            cartas.map((c) => {
              const lucroNeg =
                c.percentualLucro != null && c.percentualLucro < 0;
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => editar(c.id)}
                >
                  <TableCell className="font-medium">{c.codigo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.cessionaria}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.administradora}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {c.grupoCota}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          background:
                            c.etapaCor ?? "var(--color-muted-foreground)",
                        }}
                      />
                      {c.etapa}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.status === "ATIVA" ? (
                      <Badge variant="secondary">Ativa</Badge>
                    ) : (
                      <Badge variant="outline">Cancelada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(c.valorCredito)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(c.custoTotal)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.previsaoResgate == null
                      ? "—"
                      : formatBRL(c.previsaoResgate)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      lucroNeg ? "text-destructive" : "text-positive",
                    )}
                  >
                    {c.percentualLucro == null
                      ? "—"
                      : formatPercent(c.percentualLucro)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatDate(c.contempladaEm)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
