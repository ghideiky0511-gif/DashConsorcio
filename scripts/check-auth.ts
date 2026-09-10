/**
 * Diagnóstico de autenticação: cruza auth.users (Supabase) com public.profiles
 * e aponta o que quebra o login.
 *
 *   npm run check:auth
 *
 * Sintomas que isto explica:
 *  - login entra e volta pra tela de login / tela branca / ERR_TOO_MANY_REDIRECTS
 *  - "Acesso não liberado" logo após entrar
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

type AuthUser = {
  id: string;
  email: string | null;
  confirmed: Date | null;
};

async function main() {
  const authUsers = await prisma.$queryRawUnsafe<AuthUser[]>(
    `SELECT id::text AS id, email, email_confirmed_at AS confirmed
       FROM auth.users
       ORDER BY created_at`,
  );
  const profiles = await prisma.profile.findMany({
    orderBy: { createdAt: "asc" },
  });

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const profileByEmail = new Map(
    profiles.map((p) => [p.email.toLowerCase(), p]),
  );

  const problemas: string[] = [];
  const avisos: string[] = [];

  // Profile sintético criado pelo seed como "dono" dos registros de exemplo.
  // Nunca loga; não é problema não ter usuário no Auth.
  const SEED_SISTEMA = "sistema@hhconsorcio.local";

  console.log(`\nauth.users: ${authUsers.length}   profiles: ${profiles.length}\n`);

  for (const u of authUsers) {
    const byId = profileById.get(u.id);
    const byEmail = u.email
      ? profileByEmail.get(u.email.toLowerCase())
      : undefined;

    if (byId && byId.ativo) {
      console.log(`  OK    ${u.email}  (${byId.role})`);
      continue;
    }
    if (byId && !byId.ativo) {
      problemas.push(
        `INATIVO   ${u.email}: profile existe mas ativo=false. -> UPDATE public.profiles SET ativo=true WHERE id='${u.id}';`,
      );
      continue;
    }
    if (byEmail && byEmail.id !== u.id) {
      problemas.push(
        `ID ERRADO ${u.email}: profile tem id ${byEmail.id}, mas o Auth usa ${u.id}. ` +
          `-> UPDATE public.profiles SET id='${u.id}' WHERE email='${u.email}';`,
      );
      continue;
    }
    if (!u.confirmed) {
      problemas.push(
        `SEM CONFIRMAR ${u.email}: e-mail não confirmado no Auth (login por senha falha). ` +
          `-> confirme em Authentication > Users, ou desligue "Confirm email".`,
      );
    }
    problemas.push(
      `SEM PROFILE ${u.email}: nenhuma linha em profiles. ` +
        `-> INSERT INTO public.profiles (id,nome,email,role,ativo,"updatedAt") ` +
        `VALUES ('${u.id}','${u.email?.split("@")[0]}','${u.email}','ADMIN',true,now());`,
    );
  }

  for (const p of profiles) {
    if (p.email === SEED_SISTEMA) continue;
    if (!authUsers.some((u) => u.id === p.id)) {
      avisos.push(
        `PROFILE ÓRFÃO ${p.email}: id ${p.id} não existe em auth.users ` +
          `(usuário do Auth recriado/removido). Sozinho não quebra nada; ` +
          `vira problema se criarem um usuário novo com este e-mail.`,
      );
    }
  }

  if (avisos.length > 0) {
    console.log(`Avisos:\n`);
    for (const a of avisos) console.log("  - " + a);
    console.log("");
  }

  if (problemas.length === 0) {
    console.log("Nenhum problema que impeça login. OK.\n");
  } else {
    console.log(`${problemas.length} problema(s) que quebram o login:\n`);
    for (const p of problemas) console.log("  - " + p);
    console.log("");
  }

  await prisma.$disconnect();
  process.exit(problemas.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
