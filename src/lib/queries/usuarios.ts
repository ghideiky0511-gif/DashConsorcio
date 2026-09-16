import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

/** id (auth.users) → último login, lido via Admin API (não existe em `profiles`). */
async function getUltimosLogins(): Promise<Map<string, string | null>> {
  const mapa = new Map<string, string | null>();
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return mapa; // sem SUPABASE_SERVICE_ROLE_KEY: segue sem essa coluna.
  }

  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) break;
    for (const u of data.users) mapa.set(u.id, u.last_sign_in_at ?? null);
    if (data.users.length < 200) break;
    page += 1;
  }
  return mapa;
}

export async function getUsuarios() {
  const [rows, ultimosLogins] = await Promise.all([
    prisma.profile.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] }),
    getUltimosLogins(),
  ]);
  return rows.map((r) => ({ ...r, ultimoLogin: ultimosLogins.get(r.id) ?? null }));
}
