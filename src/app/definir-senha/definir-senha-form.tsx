"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function DefinirSenhaForm() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (senha.length < 8) {
      setMsg("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setMsg("As senhas não são iguais.");
      return;
    }

    startTransition(async () => {
      const { error } = await createClient().auth.updateUser({ password: senha });
      if (error) {
        setMsg("Não foi possível salvar a senha. Tente pedir um novo convite.");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmar">Confirmar senha</Label>
        <Input
          id="confirmar"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
      </div>

      {msg && <p className="text-sm text-destructive">{msg}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando…" : "Salvar e entrar"}
      </Button>
    </form>
  );
}
