import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Troca o `code` do magic link por uma sessão e redireciona. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    }
    console.error("[auth/callback] exchangeCodeForSession falhou:", error.message);
  } else {
    console.error("[auth/callback] sem `code` na query string:", request.url);
  }

  return NextResponse.redirect(`${origin}/login?erro=auth`);
}
