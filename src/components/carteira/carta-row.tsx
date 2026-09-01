"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import type { CartaLista } from "@/lib/queries/carteira";

export function CartaRow({ carta }: { carta: CartaLista }) {
  const router = useRouter();
  const lucroNeg = carta.percentualLucro != null && carta.percentualLucro < 0;

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/cartas/${carta.id}`)}
    >
      <TableCell className="font-medium">{carta.codigo}</TableCell>
      <TableCell className="text-muted-foreground">{carta.cessionaria}</TableCell>
      <TableCell className="text-muted-foreground">
        {carta.administradora}
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">
        {carta.grupoCota}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: carta.etapaCor ?? "var(--color-muted-foreground)" }}
          />
          {carta.etapa}
        </span>
      </TableCell>
      <TableCell>
        {carta.status === "ATIVA" ? (
          <Badge variant="secondary">Ativa</Badge>
        ) : (
          <Badge variant="outline">Cancelada</Badge>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatBRL(carta.valorCredito)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatBRL(carta.custoTotal)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {carta.previsaoResgate == null ? "—" : formatBRL(carta.previsaoResgate)}
      </TableCell>
      <TableCell
        className={cn(
          "text-right tabular-nums",
          lucroNeg ? "text-destructive" : "text-positive",
        )}
      >
        {carta.percentualLucro == null ? "—" : formatPercent(carta.percentualLucro)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatDate(carta.contempladaEm)}
      </TableCell>
    </TableRow>
  );
}
