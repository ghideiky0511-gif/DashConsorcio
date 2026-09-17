"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<{ tone: "erro" | "ok"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const { error } = await createClient().auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setMsg({ tone: "erro", text: "E-mail ou senha inválidos." });
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  function magicLink() {
    if (!email) {
      setMsg({ tone: "erro", text: "Informe o e-mail para receber o link." });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${next.startsWith("/") ? next : "/"}`,
        },
      });
      setMsg(
        error
          ? { tone: "erro", text: "Não foi possível enviar o link." }
          : { tone: "ok", text: "Link de acesso enviado para o seu e-mail." },
      );
    });
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      {msg && (
        <p
          className={
            msg.tone === "erro"
              ? "text-sm text-destructive"
              : "text-sm text-positive"
          }
        >
          {msg.text}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>

      <button
        type="button"
        onClick={magicLink}
        disabled={pending}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
      >
        Enviar link de acesso por e-mail
      </button>
    </form>
  );
}
