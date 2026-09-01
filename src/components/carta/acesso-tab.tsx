"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { salvarAcesso } from "@/app/actions/acesso";
import type { CartaDetalhe } from "@/lib/queries/carta";

export function AcessoTab({
  cartaId,
  acesso,
  podeEditar,
}: {
  cartaId: string;
  acesso: CartaDetalhe["acesso"];
  podeEditar: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    salvarAcesso.bind(null, cartaId),
    null,
  );
  const [verSenha, setVerSenha] = useState(false);

  useEffect(() => {
    if (state?.ok) toast.success("Acesso salvo.");
  }, [state]);

  return (
    <form action={formAction} className="max-w-xl space-y-4 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">
        Credenciais de acesso à conta do consorciado. Visíveis para operadores e
        administradores.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="emailCadastro">E-mail de cadastro</Label>
        <Input
          id="emailCadastro"
          name="emailCadastro"
          defaultValue={acesso?.emailCadastro ?? ""}
          disabled={!podeEditar}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cotaChave">Cota Chave</Label>
        <Input
          id="cotaChave"
          name="cotaChave"
          defaultValue={acesso?.cotaChave ?? ""}
          disabled={!podeEditar}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="celular">Celular cadastrado</Label>
        <Input
          id="celular"
          name="celular"
          defaultValue={acesso?.celular ?? ""}
          disabled={!podeEditar}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <div className="flex gap-2">
          <Input
            id="senha"
            name="senha"
            type={verSenha ? "text" : "password"}
            defaultValue={acesso?.senha ?? ""}
            disabled={!podeEditar}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVerSenha((v) => !v)}
          >
            {verSenha ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacao">Observação</Label>
        <Input
          id="observacao"
          name="observacao"
          defaultValue={acesso?.observacao ?? ""}
          disabled={!podeEditar}
        />
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      {podeEditar && (
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar acesso"}
        </Button>
      )}
    </form>
  );
}
