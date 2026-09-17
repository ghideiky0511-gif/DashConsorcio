"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProfile, requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Role } from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  firstZodError,
  ok,
  prismaErrorMessage,
} from "@/lib/action-utils";

function revalidar() {
  revalidatePath("/usuarios");
}

/**
 * Link de convite/reset volta pra cá: /auth/callback processa a sessão (o
 * Supabase manda os tokens no fragmento "#" da URL, fluxo implícito — só o
 * navegador enxerga isso, por isso o processamento é client-side) e manda
 * pra "next". Usa NEXT_PUBLIC_SITE_URL (produção) quando definida — senão
 * cai pro host da requisição atual, útil em dev local. Sem isso, convidar
 * rodando `npm run dev` geraria um link apontando pra localhost, que o
 * convidado não consegue abrir.
 */
async function urlConvite() {
  let origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    origin = `${proto}://${h.get("host")}`;
  }
  return `${origin}/auth/callback?next=${encodeURIComponent("/definir-senha")}`;
}

const convidarSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().email("E-mail inválido."),
  role: z.nativeEnum(Role),
});

export async function convidarUsuarioAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  const parsed = convidarSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const { nome, email, role } = parsed.data;

  const existente = await prisma.profile.findUnique({ where: { email } });
  if (existente) return fail("Já existe um usuário com esse e-mail.");

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Falha ao iniciar cliente admin.");
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: await urlConvite(),
  });
  if (error || !data.user) {
    return fail(error?.message ?? "Falha ao convidar usuário no Supabase Auth.");
  }

  try {
    await prisma.profile.create({
      data: { id: data.user.id, nome, email, role, ativo: true },
    });
  } catch (e) {
    // Rollback: sem profile, o convite ficaria "órfão" e travaria no /sem-acesso.
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    return fail(prismaErrorMessage(e));
  }

  revalidar();
  return ok();
}

const papelSchema = z.object({ role: z.nativeEnum(Role) });

export async function atualizarPapelUsuarioAction(
  id: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const eu = await requireRole(Role.ADMIN);
  if (id === eu.id) return fail("Você não pode alterar seu próprio papel.");

  const parsed = papelSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.profile.update({ where: { id }, data: { role: parsed.data.role } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar();
  return ok();
}

async function garantirNaoUltimoAdminAtivo(id: string): Promise<string | null> {
  const alvo = await prisma.profile.findUnique({ where: { id } });
  if (!alvo) return "Usuário não encontrado.";
  if (alvo.role !== Role.ADMIN) return null;

  const outrosAdminsAtivos = await prisma.profile.count({
    where: { role: Role.ADMIN, ativo: true, id: { not: id } },
  });
  if (outrosAdminsAtivos === 0) {
    return "Precisa haver ao menos um administrador ativo.";
  }
  return null;
}

export async function alternarAtivoUsuarioAction(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  const eu = await requireRole(Role.ADMIN);
  if (id === eu.id) return fail("Você não pode desativar sua própria conta.");

  if (!ativo) {
    const erro = await garantirNaoUltimoAdminAtivo(id);
    if (erro) return fail(erro);
  }

  try {
    await prisma.profile.update({ where: { id }, data: { ativo } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar();
  return ok();
}

export async function excluirUsuarioAction(id: string): Promise<ActionResult> {
  const eu = await requireRole(Role.ADMIN);
  if (id === eu.id) return fail("Você não pode excluir sua própria conta.");

  const erro = await garantirNaoUltimoAdminAtivo(id);
  if (erro) return fail(erro);

  try {
    await prisma.profile.delete({ where: { id } });
  } catch (e) {
    return fail(
      prismaErrorMessage(
        e,
        "Não foi possível excluir: este usuário tem registros vinculados (cartas, despesas, documentos). Desative a conta em vez de excluir.",
      ),
    );
  }

  // Perfil já removido (acesso bloqueado); se a conta do Auth não sair, não tem problema.
  try {
    createAdminClient().auth.admin.deleteUser(id).catch(() => {});
  } catch {
    // sem SUPABASE_SERVICE_ROLE_KEY — segue mesmo assim.
  }

  revalidar();
  return ok();
}

export async function reenviarConviteAction(id: string): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const alvo = await prisma.profile.findUnique({ where: { id } });
  if (!alvo) return fail("Usuário não encontrado.");

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Falha ao iniciar cliente admin.");
  }

  const redirectTo = await urlConvite();
  const { error } = await admin.auth.admin.inviteUserByEmail(alvo.email, { redirectTo });
  if (error) {
    // E-mail já confirmado no Auth (ex.: o link do convite anterior chegou a ser
    // aberto uma vez, por um scanner de segurança ou clique antigo, antes de
    // expirar) — Supabase recusa reconvidar. Manda link de redefinição de senha
    // em vez disso, que volta pro mesmo /definir-senha.
    if (error.message.toLowerCase().includes("already been registered")) {
      const supabase = await createClient();
      const { error: erroReset } = await supabase.auth.resetPasswordForEmail(alvo.email, {
        redirectTo,
      });
      if (erroReset) return fail(erroReset.message);
      return ok();
    }
    return fail(error.message);
  }
  return ok();
}

/** Usado pela UI para saber quem é "eu" e desabilitar ações sobre a própria conta. */
export async function getMeuPerfil() {
  return requireProfile();
}
