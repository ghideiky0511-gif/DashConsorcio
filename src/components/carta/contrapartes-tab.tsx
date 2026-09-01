"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ActionFormDialog } from "@/components/carta/action-form-dialog";
import { ConfirmDelete } from "@/components/carta/confirm-delete";
import {
  atualizarContraparte,
  criarContraparte,
  excluirContraparte,
} from "@/app/actions/contrapartes";
import { opcoesPapelContraparte, papelContraparteLabel } from "@/lib/labels";
import type { Contraparte } from "@/lib/queries/carta";

function Campos({ cp }: { cp?: Contraparte }) {
  return (
    <>
      {cp ? <input type="hidden" name="id" value={cp.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="papel">Papel *</Label>
        <NativeSelect id="papel" name="papel" defaultValue={cp?.papel ?? "CEDENTE"}>
          {opcoesPapelContraparte.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" name="nome" defaultValue={cp?.nome ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="documento">CPF / CNPJ</Label>
          <Input id="documento" name="documento" defaultValue={cp?.documento ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" defaultValue={cp?.telefone ?? ""} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={cp?.email ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="observacao">Observação</Label>
        <Input id="observacao" name="observacao" defaultValue={cp?.observacao ?? ""} />
      </div>
    </>
  );
}

export function ContrapartesTab({
  cartaId,
  contrapartes,
  podeEditar,
}: {
  cartaId: string;
  contrapartes: Contraparte[];
  podeEditar: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Contraparte | null>(null);
  const [toDelete, setToDelete] = useState<Contraparte | null>(null);

  return (
    <div className="space-y-4">
      {podeEditar && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus /> Adicionar contraparte
          </Button>
        </div>
      )}

      {contrapartes.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma contraparte cadastrada.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contrapartes.map((cp) => (
            <div key={cp.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="secondary">
                    {papelContraparteLabel[cp.papel]}
                  </Badge>
                  <p className="mt-2 font-medium">{cp.nome}</p>
                </div>
                {podeEditar && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar"
                      onClick={() => setEditing(cp)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Excluir"
                      onClick={() => setToDelete(cp)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
              <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                {cp.documento && <div>Doc.: {cp.documento}</div>}
                {cp.email && <div>{cp.email}</div>}
                {cp.telefone && <div>{cp.telefone}</div>}
                {cp.observacao && (
                  <div className="text-foreground">{cp.observacao}</div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <ActionFormDialog
          title="Adicionar contraparte"
          action={criarContraparte.bind(null, cartaId)}
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success("Contraparte adicionada.");
          }}
        >
          <Campos />
        </ActionFormDialog>
      )}

      {editing && (
        <ActionFormDialog
          title="Editar contraparte"
          action={atualizarContraparte.bind(null, cartaId)}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            toast.success("Contraparte atualizada.");
          }}
        >
          <Campos cp={editing} />
        </ActionFormDialog>
      )}

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        titulo="Excluir contraparte?"
        descricao={
          <>
            {toDelete ? <strong>{toDelete.nome}</strong> : null} será removida
            desta carta.
          </>
        }
        sucesso="Contraparte excluída."
        onConfirm={() => excluirContraparte(cartaId, toDelete!.id)}
      />
    </div>
  );
}
