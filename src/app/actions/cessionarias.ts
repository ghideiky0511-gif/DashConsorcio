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
  nome: z.string().trim().min(2, "Informe o nome da cessionária."),
  cnpj: z.string().trim().max(20).optional().nullable(),
  observacao: z.string().trim().max(500).optional().nullable(),
  ativa: z.boolean(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    nome: formData.get("nome"),
    cnpj: nullableText(formData.get("cnpj")),
    observacao: nullableText(formData.get("observacao")),
    ativa: formData.get("ativa") === "on" || formData.get("ativa") === "true",
  });
}

export async function criarCessionaria(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.cessionaria.create({ data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function atualizarCessionaria(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Registro inválido.");

  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.cessionaria.update({ where: { id }, data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function excluirCessionaria(id: string): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  try {
    await prisma.cessionaria.delete({ where: { id } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}
