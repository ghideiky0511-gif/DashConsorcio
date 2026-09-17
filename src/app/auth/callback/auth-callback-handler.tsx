"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Processa o retorno do link de e-mail (convite, reset de senha ou link
 * mágico). O Supabase devolve os tokens no fragmento "#" da URL (fluxo
 * implícito) — isso só existe no navegador, nunca chega no servidor. Por
 * isso essa etapa roda aqui: o supabase-js já detecta o "#access_token" e
 * grava a sessão assim que o client é criado (detectSessionInUrl), então
 * getSession() abaixo só precisa esperar isso terminar.
 */
export function AuthCallbackHandler() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const next = search.get("next") || "/";
    let cancelado = false;

    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelado) return;
        router.replace(data.session ? next : "/login?erro=auth");
      });

    return () => {
      cancelado = true;
    };
  }, [router, search]);

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">Entrando…</p>
    </div>
  );
}
