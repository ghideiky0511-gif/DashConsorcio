"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, Undo2 } from "lucide-react";
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
import {
  estornarParcelaAction,
  gerarParcelasAction,
  marcarParcelaPagaAction,
} from "@/app/actions/parcelas";
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

function hoje() {
  return new Date();
}

export function ParcelasTab({
  cartaId,
  parcelas,
  parcelasTotais,
  parcelasQuitadas,
  parcelaValor,
  diaVencimento,
  podeEditar,
}: {
  cartaId: string;
  parcelas: ParcelaResumo[];
  parcelasTotais: number | null;
  parcelasQuitadas: number | null;
  parcelaValor: number | null;
  diaVencimento: number | null;
  podeEditar: boolean;
}) {
  const [gerando, setGerando] = useState(false);
  const [pagando, setPagando] = useState<ParcelaResumo | null>(null);
  const [estornando, setEstornando] = useState<string | null>(null);

  const pagas = parcelas.filter((p) => p.status === "PAGO").length;
  const atrasadas = parcelas.filter(
    (p) =>
      p.status === "ATRASADO" ||
      (p.status === "PENDENTE" && new Date(p.vencimento) < hoje()),
  ).length;
  const abertas = parcelas.filter(
    (p) => p.status === "PENDENTE" || p.status === "ATRASADO",
  ).length;

  const podeGerar =
    parcelas.length === 0 &&
    !!parcelasTotais &&
    !!parcelaValor &&
    !!diaVencimento &&
    parcelasTotais > (parcelasQuitadas ?? 0);

  async function handleGerar() {
    setGerando(true);
    const res = await gerarParcelasAction(cartaId);
    setGerando(false);
    if (res.ok) toast.success("Cronograma gerado.");
    else toast.error(res.error);
  }

  async function handleEstornar(id: string) {
    setEstornando(id);
    const res = await estornarParcelaAction(cartaId, id);
    setEstornando(null);
    if (res.ok) toast.success("Pagamento estornado.");
    else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        {podeEditar && podeGerar && (
          <Button size="sm" onClick={handleGerar} disabled={gerando}>
            <CalendarClock /> {gerando ? "Gerando…" : "Gerar cronograma"}
          </Button>
        )}
      </div>

      {parcelas.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          {podeGerar
            ? "Nenhuma parcela cadastrada. Clique em “Gerar cronograma” para criar as parcelas restantes a partir de Parcelas totais / Valor da parcela / Dia de vencimento."
            : "Nenhuma parcela cadastrada. Preencha parcelas totais, valor da parcela e dia de vencimento (aba Resumo → Editar carta) para gerar o cronograma."}
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
                {podeEditar && <TableHead className="w-28" />}
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
                  {podeEditar && (
                    <TableCell>
                      {p.status === "PAGO" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEstornar(p.id)}
                          disabled={estornando === p.id}
                        >
                          <Undo2 /> Estornar
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPagando(p)}
                        >
                          <CheckCircle2 /> Marcar pago
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pagando && (
        <ActionFormDialog
          title={`Marcar parcela nº ${pagando.numero} como paga`}
          action={marcarParcelaPagaAction.bind(null, cartaId, pagando.id)}
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
