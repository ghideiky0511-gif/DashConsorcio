"use client";

import { useState, useTransition } from "react";
import { Plus, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { ActionFormDialog } from "@/components/carta/action-form-dialog";
import { ConfirmDelete } from "@/components/carta/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { roleLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { Role } from "@/generated/prisma/client";
import {
  alternarAtivoUsuarioAction,
  atualizarPapelUsuarioAction,
  convidarUsuarioAction,
  excluirUsuarioAction,
  reenviarConviteAction,
} from "@/app/actions/usuarios";

// `Role` do Prisma gerado é usado só como tipo aqui (elidido no build). Pegar
// os valores de `roleLabel` (objeto puro) em vez de `Object.values(Role)`
// evita puxar o runtime do Prisma pro bundle do navegador — ver gotcha
// documentado (client lib + generated/prisma como valor quebra o Turbopack).
const ROLES = Object.keys(roleLabel) as Role[];

type UsuarioRow = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  ultimoLogin: string | null;
};

export function UsuariosCrud({
  rows,
  meuId,
}: {
  rows: UsuarioRow[];
  meuId: string;
}) {
  const [convidando, setConvidando] = useState(false);
  const [toDelete, setToDelete] = useState<UsuarioRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setConvidando(true)}>
          <Plus className="size-4" />
          Convidar usuário
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum usuário cadastrado.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((u) => (
              <UsuarioLinha
                key={u.id}
                usuario={u}
                souEu={u.id === meuId}
                onExcluir={() => setToDelete(u)}
              />
            ))
          )}
        </TableBody>
      </Table>

      {convidando ? (
        <ActionFormDialog
          title="Convidar usuário"
          action={convidarUsuarioAction}
          onClose={() => setConvidando(false)}
          onSuccess={() => {
            setConvidando(false);
            toast.success("Usuário convidado com sucesso! E-mail enviado.");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Papel</Label>
            <NativeSelect id="role" name="role" defaultValue="VISUALIZADOR">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </ActionFormDialog>
      ) : null}

      <ConfirmDelete
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        titulo="Excluir usuário?"
        descricao={
          <>
            {toDelete ? <strong>{toDelete.nome}</strong> : null} perde o acesso
            ao sistema imediatamente e a conta é removida. Essa ação não pode
            ser desfeita.
          </>
        }
        sucesso="Usuário excluído."
        onConfirm={() => excluirUsuarioAction(toDelete!.id)}
      />
    </div>
  );
}

function UsuarioLinha({
  usuario,
  souEu,
  onExcluir,
}: {
  usuario: UsuarioRow;
  souEu: boolean;
  onExcluir: () => void;
}) {
  const [pending, start] = useTransition();
  const [reenviando, startReenvio] = useTransition();

  function alterarPapel(role: Role) {
    start(async () => {
      const r = await atualizarPapelUsuarioAction(usuario.id, null, (() => {
        const fd = new FormData();
        fd.set("role", role);
        return fd;
      })());
      if (r.ok) toast.success("Papel atualizado.");
      else toast.error(r.error);
    });
  }

  function alternarAtivo(ativo: boolean) {
    start(async () => {
      const r = await alternarAtivoUsuarioAction(usuario.id, ativo);
      if (r.ok) toast.success(ativo ? "Usuário ativado." : "Usuário desativado.");
      else toast.error(r.error);
    });
  }

  function reenviarConvite() {
    startReenvio(async () => {
      const r = await reenviarConviteAction(usuario.id);
      if (r.ok) toast.success("Convite reenviado.");
      else toast.error(r.error);
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {usuario.nome}
        {souEu ? (
          <span className="ml-2 text-xs text-muted-foreground">(você)</span>
        ) : null}
      </TableCell>
      <TableCell>{usuario.email}</TableCell>
      <TableCell>
        {souEu ? (
          <Badge variant="outline">{roleLabel[usuario.role]}</Badge>
        ) : (
          <NativeSelect
            className="h-8 w-40"
            value={usuario.role}
            disabled={pending}
            onChange={(e) => alterarPapel(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </NativeSelect>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {usuario.ultimoLogin ? formatDateTime(usuario.ultimoLogin) : "Nunca acessou"}
      </TableCell>
      <TableCell>
        <Switch
          checked={usuario.ativo}
          disabled={souEu || pending}
          onCheckedChange={alternarAtivo}
        />
      </TableCell>
      <TableCell>
        {!souEu ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="Reenviar convite"
              disabled={reenviando}
              onClick={reenviarConvite}
            >
              <RotateCw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Excluir usuário"
              onClick={onExcluir}
            >
              <X className="size-4 text-destructive" />
            </Button>
          </div>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
