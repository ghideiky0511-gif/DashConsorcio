"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Role } from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  firstZodError,
  nullableText,
  ok,
  prismaErrorMessage,
} from "@/lib/action-utils";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da administradora."),
  cnpj: z.string().trim().max(20).optional().nullable(),
  contato: z.string().trim().max(200).optional().nullable(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    nome: formData.get("nome"),
    cnpj: nullableText(formData.get("cnpj")),
    contato: nullableText(formData.get("contato")),
  });
}

export async function criarAdministradora(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.administradora.create({ data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function atualizarAdministradora(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Registro inválido.");

  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.administradora.update({ where: { id }, data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function excluirAdministradora(id: string): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  try {
    await prisma.administradora.delete({ where: { id } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}
