import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role — só pode ser usado em server actions,
 * nunca importado por um client component. Necessário para a Admin API
 * (convidar/excluir usuário do auth.users), que a chave anon não alcança.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — preencha o .env (Project Settings → API) para gerenciar usuários.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
