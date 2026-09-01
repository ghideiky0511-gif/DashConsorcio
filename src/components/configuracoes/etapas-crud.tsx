"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  atualizarEtapa,
  criarEtapa,
  excluirEtapa,
  moverEtapa,
} from "@/app/actions/etapas";
import type { ActionResult } from "@/lib/action-utils";

export type EtapaRow = {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  ativa: boolean;
  _count: { cartas: number };
};

export function EtapasCrud({ etapas }: { etapas: EtapaRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EtapaRow | null>(null);
  const [toDelete, setToDelete] = useState<EtapaRow | null>(null);
  const [pending, start] = useTransition();

  function mover(id: string, direcao: "cima" | "baixo") {
    start(async () => {
      const res = await moverEtapa(id, direcao);
      if (!res.ok) toast.error(res.error);
    });
  }

  function confirmarExclusao() {
    if (!toDelete) return;
    start(async () => {
      const res = await excluirEtapa(toDelete.id);
      if (res.ok) {
        toast.success("Etapa excluída.");
        setToDelete(null);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A ordem define o funil da carteira e a etapa deduzida na importação.
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Adicionar
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead className="w-20">Ativa</TableHead>
              <TableHead className="w-20 text-right">Cartas</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {etapas.map((etapa, i) => (
              <TableRow key={etapa.id}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {etapa.ordem}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full border"
                      style={{ background: etapa.cor ?? "transparent" }}
                    />
                    {etapa.nome}
                  </span>
                </TableCell>
                <TableCell>
                  {etapa.ativa ? (
                    <Badge variant="secondary">Sim</Badge>
                  ) : (
                    <Badge variant="outline">Não</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {etapa._count.cartas}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Subir"
                      disabled={i === 0 || pending}
                      onClick={() => mover(etapa.id, "cima")}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Descer"
                      disabled={i === etapas.length - 1 || pending}
                      onClick={() => mover(etapa.id, "baixo")}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar"
                      onClick={() => setEditing(etapa)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Excluir"
                      onClick={() => setToDelete(etapa)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {creating && (
        <EtapaDialog
          title="Adicionar etapa"
          action={criarEtapa}
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Etapa criada.");
          }}
        />
      )}

      {editing && (
        <EtapaDialog
          title="Editar etapa"
          etapa={editing}
          action={atualizarEtapa}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            toast.success("Etapa atualizada.");
          }}
        />
      )}

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o: boolean) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? <strong>{toDelete.nome}</strong> : null} será removida.
              Só é possível se nenhuma carta estiver nela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={confirmarExclusao}
            >
              {pending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EtapaDialog({
  title,
  etapa,
  action,
  onClose,
  onSuccess,
}: {
  title: string;
  etapa?: EtapaRow;
  action: (
    prev: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [ativa, setAtiva] = useState(etapa?.ativa ?? true);
  const [cor, setCor] = useState(etapa?.cor ?? "#94a3b8");

  useEffect(() => {
    if (state?.ok) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open onOpenChange={(o: boolean) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {etapa ? <input type="hidden" name="id" value={etapa.id} /> : null}

          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" name="nome" required defaultValue={etapa?.nome ?? ""} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cor">Cor</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent"
                aria-label="Escolher cor"
              />
              <Input
                name="cor"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                placeholder="#94a3b8"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="ativa">Ativa</Label>
            <Switch
              id="ativa"
              checked={ativa}
              onCheckedChange={(v: boolean) => setAtiva(v)}
            />
            <input type="hidden" name="ativa" value={ativa ? "true" : "false"} />
          </div>

          {state && !state.ok ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
