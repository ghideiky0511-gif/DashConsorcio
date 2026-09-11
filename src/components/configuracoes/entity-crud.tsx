"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionResult } from "@/lib/action-utils";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "toggle" | "select" | "number";
  required?: boolean;
  placeholder?: string;
  showInTable?: boolean;
  /** Opções do tipo "select". O primeiro valor "" vira "não definido" quando o campo não é obrigatório. */
  options?: Array<{ value: string; label: string }>;
  /** Passado direto ao <input type="number"> (ex.: 0.01 pra percentuais). */
  step?: number;
  hint?: string;
};

export type EntityRow = { id: string; nome: string; _count?: { cartas: number } } & Record<
  string,
  unknown
>;

type FormAction = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

export function EntityCrud({
  singular,
  feminino = true,
  rows,
  fields,
  criar,
  atualizar,
  excluir,
}: {
  singular: string;
  feminino?: boolean;
  rows: EntityRow[];
  fields: FieldDef[];
  criar: FormAction;
  atualizar: FormAction;
  excluir: (id: string) => Promise<ActionResult>;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EntityRow | null>(null);
  const [toDelete, setToDelete] = useState<EntityRow | null>(null);
  const [deletePending, startDelete] = useTransition();

  const tableFields = fields.filter((f) => f.showInTable !== false);
  const suffix = feminino ? "a" : "o";

  function confirmarExclusao() {
    if (!toDelete) return;
    startDelete(async () => {
      const res = await excluir(toDelete.id);
      if (res.ok) {
        toast.success(`${singular} excluíd${suffix}.`);
        setToDelete(null);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Adicionar
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {tableFields.map((f) => (
                <TableHead key={f.name}>{f.label}</TableHead>
              ))}
              <TableHead className="w-20 text-right">Cartas</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tableFields.length + 2}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhum registro ainda.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {tableFields.map((f) => (
                    <TableCell key={f.name}>
                      {f.type === "toggle" ? (
                        row[f.name] ? (
                          <Badge variant="secondary">Sim</Badge>
                        ) : (
                          <Badge variant="outline">Não</Badge>
                        )
                      ) : f.type === "select" ? (
                        f.options?.find((o) => o.value === String(row[f.name] ?? ""))
                          ?.label || <span className="text-muted-foreground">—</span>
                      ) : (
                        (row[f.name] as string) || (
                          <span className="text-muted-foreground">—</span>
                        )
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row._count?.cartas ?? 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Editar"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Excluir"
                        onClick={() => setToDelete(row)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {creating && (
        <EntityDialog
          title={`Adicionar ${singular.toLowerCase()}`}
          fields={fields}
          action={criar}
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success(`${singular} criad${suffix}.`);
          }}
        />
      )}

      {editing && (
        <EntityDialog
          title={`Editar ${singular.toLowerCase()}`}
          fields={fields}
          values={editing}
          action={atualizar}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            toast.success(`${singular} atualizad${suffix}.`);
          }}
        />
      )}

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o: boolean) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {singular.toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? <strong>{toDelete.nome}</strong> : null} será
              removid{suffix}. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={confirmarExclusao}
            >
              {deletePending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EntityDialog({
  title,
  fields,
  values,
  action,
  onClose,
  onSuccess,
}: {
  title: string;
  fields: FieldDef[];
  values?: EntityRow;
  action: FormAction;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);

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
          {values?.id ? (
            <input type="hidden" name="id" value={values.id} />
          ) : null}

          {fields.map((f) => {
            if (f.type === "toggle") {
              return (
                <ToggleField
                  key={f.name}
                  field={f}
                  defaultChecked={values ? Boolean(values[f.name]) : true}
                />
              );
            }
            if (f.type === "select") {
              return (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </Label>
                  <NativeSelect
                    id={f.name}
                    name={f.name}
                    required={f.required}
                    defaultValue={values ? String(values[f.name] ?? "") : ""}
                  >
                    {!f.required && <option value="">Não definido</option>}
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </NativeSelect>
                  {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                </div>
              );
            }
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type === "number" ? "number" : "text"}
                  step={f.step}
                  required={f.required}
                  placeholder={f.placeholder}
                  defaultValue={values ? String(values[f.name] ?? "") : ""}
                />
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            );
          })}

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

function ToggleField({
  field,
  defaultChecked,
}: {
  field: FieldDef;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <Label htmlFor={field.name}>{field.label}</Label>
      <Switch
        id={field.name}
        checked={checked}
        onCheckedChange={(v: boolean) => setChecked(v)}
      />
      <input type="hidden" name={field.name} value={checked ? "true" : "false"} />
    </div>
  );
}
