"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionFormDialog } from "@/components/carta/action-form-dialog";
import { ConfirmDelete } from "@/components/carta/confirm-delete";
import {
  atualizarDespesa,
  criarDespesa,
  excluirDespesa,
} from "@/app/actions/despesas";
import { formatBRL, formatDate } from "@/lib/format";
import { opcoesTipoDespesa, tipoDespesaLabel } from "@/lib/labels";
import type { Despesa } from "@/lib/queries/carta";

function toInputDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

function Campos({ despesa }: { despesa?: Despesa }) {
  return (
    <>
      {despesa ? <input type="hidden" name="id" value={despesa.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="tipo">Tipo *</Label>
        <NativeSelect id="tipo" name="tipo" defaultValue={despesa?.tipo ?? "COMISSAO"}>
          {opcoesTipoDespesa.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="valor">Valor *</Label>
        <Input
          id="valor"
          name="valor"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={despesa ? String(despesa.valor).replace(".", ",") : ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="data">Data</Label>
        <Input id="data" name="data" type="date" defaultValue={toInputDate(despesa?.data ?? null)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição</Label>
        <Input id="descricao" name="descricao" defaultValue={despesa?.descricao ?? ""} />
      </div>
    </>
  );
}

export function CustosTab({
  cartaId,
  despesas,
  valorCompra,
  custoTotal,
  podeEditar,
}: {
  cartaId: string;
  despesas: Despesa[];
  valorCompra: number;
  custoTotal: number;
  podeEditar: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Despesa | null>(null);
  const [toDelete, setToDelete] = useState<Despesa | null>(null);

  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Custo da aquisição {formatBRL(valorCompra)} + despesas ={" "}
          <strong className="text-foreground">{formatBRL(custoTotal)}</strong>
        </p>
        {podeEditar && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> Lançar despesa
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              {podeEditar && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {despesas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={podeEditar ? 5 : 4}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhuma despesa lançada.
                </TableCell>
              </TableRow>
            ) : (
              despesas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{tipoDespesaLabel[d.tipo]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.descricao || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(d.data)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(d.valor)}
                  </TableCell>
                  {podeEditar && (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Editar"
                          onClick={() => setEditing(d)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Excluir"
                          onClick={() => setToDelete(d)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
          {despesas.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total de despesas</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatBRL(totalDespesas)}
                </TableCell>
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {creating && (
        <ActionFormDialog
          title="Lançar despesa"
          action={criarDespesa.bind(null, cartaId)}
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Despesa lançada.");
          }}
        >
          <Campos />
        </ActionFormDialog>
      )}

      {editing && (
        <ActionFormDialog
          title="Editar despesa"
          action={atualizarDespesa.bind(null, cartaId)}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            toast.success("Despesa atualizada.");
          }}
        >
          <Campos despesa={editing} />
        </ActionFormDialog>
      )}

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        titulo="Excluir despesa?"
        descricao="O lançamento será removido do custo total da carta."
        sucesso="Despesa excluída."
        onConfirm={() => excluirDespesa(cartaId, toDelete!.id)}
      />
    </div>
  );
}
