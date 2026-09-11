"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionFormDialog } from "@/components/carta/action-form-dialog";
import { marcarParcelaPagaAction } from "@/app/actions/parcelas";
import { formatBRL, formatDate } from "@/lib/format";
import type { ParcelaEmAberto } from "@/lib/queries/fluxo-caixa";

export function ParcelasLista({
  parcelas,
  podeEditar,
  vazio = "Nenhuma parcela em aberto.",
}: {
  parcelas: ParcelaEmAberto[];
  podeEditar: boolean;
  vazio?: string;
}) {
  const [pagando, setPagando] = useState<ParcelaEmAberto | null>(null);

  if (parcelas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {vazio}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Carta</TableHead>
            <TableHead className="w-16">Nº</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Situação</TableHead>
            {podeEditar && <TableHead className="w-36" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {parcelas.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/cartas/${p.cartaId}`}
                  className="font-medium hover:underline"
                >
                  {p.cartaCodigo}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {p.numero}
              </TableCell>
              <TableCell>{formatDate(p.vencimento)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBRL(p.valorPrevisto)}
              </TableCell>
              <TableCell>
                {p.atrasada ? (
                  <Badge variant="destructive">Atrasada</Badge>
                ) : (
                  <Badge variant="outline">Pendente</Badge>
                )}
              </TableCell>
              {podeEditar && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPagando(p)}
                  >
                    <CheckCircle2 /> Marcar pago
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagando && (
        <ActionFormDialog
          title={`Marcar parcela nº ${pagando.numero} (${pagando.cartaCodigo}) como paga`}
          action={marcarParcelaPagaAction.bind(null, pagando.cartaId, pagando.id)}
          onClose={() => setPagando(null)}
          onSuccess={() => {
            setPagando(null);
            toast.success("Pagamento registrado.");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="valorPago">Valor pago *</Label>
            <Input
              id="valorPago"
              name="valorPago"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={String(pagando.valorPrevisto).replace(".", ",")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dataPagamento">Data do pagamento *</Label>
            <Input
              id="dataPagamento"
              name="dataPagamento"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formaPagamento">Forma de pagamento</Label>
            <Input id="formaPagamento" name="formaPagamento" placeholder="Boleto, PIX…" />
          </div>
        </ActionFormDialog>
      )}
    </div>
  );
}
