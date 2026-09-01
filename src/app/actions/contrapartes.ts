"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { PapelContraparte } from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  firstZodError,
  nullableText,
  ok,
  prismaErrorMessage,
} from "@/lib/action-utils";

const schema = z.object({
  papel: z.nativeEnum(PapelContraparte),
  nome: z.string().trim().min(2, "Informe o nome."),
  documento: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("E-mail inválido.").nullable().optional(),
  telefone: z.string().trim().max(30).optional().nullable(),
  observacao: z.string().trim().max(300).optional().nullable(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    papel: formData.get("papel"),
    nome: formData.get("nome"),
    documento: nullableText(formData.get("documento")),
    email: nullableText(formData.get("email")),
    telefone: nullableText(formData.get("telefone")),
    observacao: nullableText(formData.get("observacao")),
  });
}

function revalidar(cartaId: string) {
  revalidatePath(`/cartas/${cartaId}`);
  revalidatePath("/");
}

export async function criarContraparte(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.contraparte.create({ data: { cartaId, ...parsed.data } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar(cartaId);
  return ok();
}

export async function atualizarContraparte(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Registro inválido.");

  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.contraparte.update({ where: { id }, data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar(cartaId);
  return ok();
}

export async function excluirContraparte(
  cartaId: string,
  id: string,
): Promise<ActionResult> {
  await requireEditor();
  try {
    await prisma.contraparte.delete({ where: { id } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar(cartaId);
  return ok();
}
