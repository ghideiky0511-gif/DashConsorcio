import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatDate, formatMonth } from "@/lib/format";
import { statusParcelaLabel } from "@/lib/labels";
import type { ParcelaResumo } from "@/lib/queries/carta";
import type { StatusParcela } from "@/generated/prisma/client";

const badgeVariant: Record<
  StatusParcela,
  "secondary" | "outline" | "destructive"
> = {
  PAGO: "secondary",
  PENDENTE: "outline",
  ATRASADO: "destructive",
  CANCELADO: "outline",
};

export function ParcelasTab({ parcelas }: { parcelas: ParcelaResumo[] }) {
  const hoje = new Date();
  const pagas = parcelas.filter((p) => p.status === "PAGO").length;
  const atrasadas = parcelas.filter(
    (p) =>
      p.status === "ATRASADO" ||
      (p.status === "PENDENTE" && new Date(p.vencimento) < hoje),
  ).length;
  const abertas = parcelas.filter(
    (p) => p.status === "PENDENTE" || p.status === "ATRASADO",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <strong>{parcelas.length}</strong> parcelas cadastradas
        </span>
        <span className="text-muted-foreground">·</span>
        <span>{pagas} pagas</span>
        <span>{abertas} em aberto</span>
        {atrasadas > 0 && (
          <span className="text-destructive">{atrasadas} atrasadas</span>
        )}
      </div>

      {parcelas.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma parcela cadastrada. A geração de cronograma e a baixa de
          pagamento entram na Fase C (Parcelas &amp; Fluxo de Caixa).
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nº</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor previsto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pago em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {p.numero}
                  </TableCell>
                  <TableCell>{formatMonth(p.competencia)}</TableCell>
                  <TableCell>{formatDate(p.vencimento)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(p.valorPrevisto)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariant[p.status]}>
                      {statusParcelaLabel[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.dataPagamento
                      ? `${formatDate(p.dataPagamento)}${p.valorPago != null ? ` · ${formatBRL(p.valorPago)}` : ""}`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
