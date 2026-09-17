import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirma o token do e-mail (convite, redefinição de senha ou link mágico)
 * e cria a sessão.
 *
 * Usa `token_hash`/`type` (verificado no servidor via `verifyOtp`) em vez de
 * só `code`: o Supabase devolve convite/reset como fluxo implícito (tokens
 * no fragmento "#" da URL), que o servidor nunca enxerga — por isso os
 * templates de e-mail (Dashboard → Authentication → Email Templates) devem
 * linkar pra cá com `token_hash={{ .TokenHash }}&type=...` em vez de
 * `{{ .ConfirmationURL }}`. `code` continua suportado por compatibilidade.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("[auth/callback] verifyOtp falhou:", error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.error("[auth/callback] exchangeCodeForSession falhou:", error.message);
  } else {
    console.error("[auth/callback] sem token_hash/code na query string:", request.url);
  }

  return NextResponse.redirect(new URL("/login?erro=auth", origin));
}
