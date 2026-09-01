"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { TipoDespesa } from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  firstZodError,
  nullableText,
  ok,
  parseDateInput,
  parseMoneyInput,
  prismaErrorMessage,
} from "@/lib/action-utils";

const schema = z.object({
  tipo: z.nativeEnum(TipoDespesa),
  descricao: z.string().trim().max(200).optional().nullable(),
  valor: z.number().positive("Informe um valor maior que zero."),
  data: z.date().nullable(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    tipo: formData.get("tipo"),
    descricao: nullableText(formData.get("descricao")),
    valor: parseMoneyInput(formData.get("valor")) ?? Number.NaN,
    data: parseDateInput(formData.get("data")),
  });
}

function revalidar(cartaId: string) {
  revalidatePath(`/cartas/${cartaId}`);
  revalidatePath("/");
}

export async function criarDespesa(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.despesaCarta.create({ data: { cartaId, ...parsed.data } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar(cartaId);
  return ok();
}

export async function atualizarDespesa(
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
    await prisma.despesaCarta.update({ where: { id }, data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar(cartaId);
  return ok();
}

export async function excluirDespesa(
  cartaId: string,
  id: string,
): Promise<ActionResult> {
  await requireEditor();
  try {
    await prisma.despesaCarta.delete({ where: { id } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar(cartaId);
  return ok();
}
