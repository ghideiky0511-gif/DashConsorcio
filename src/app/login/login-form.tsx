"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
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
    <form onSubmit={entrar} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      {msg && (
        <p
          className={
            msg.tone === "erro"
              ? "text-sm text-negative"
              : "text-sm text-positive"
          }
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <button
        type="button"
        onClick={magicLink}
        disabled={pending}
        className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
      >
        Enviar link de acesso por e-mail
      </button>
    </form>
  );
}
