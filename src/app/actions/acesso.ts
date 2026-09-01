"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import {
  type ActionResult,
  fail,
  firstZodError,
  nullableText,
  ok,
  prismaErrorMessage,
} from "@/lib/action-utils";

const schema = z.object({
  emailCadastro: z.string().trim().max(200).nullable().optional(),
  cotaChave: z.string().trim().max(200).nullable().optional(),
  celular: z.string().trim().max(30).nullable().optional(),
  senha: z.string().trim().max(200).nullable().optional(),
  observacao: z.string().trim().max(300).nullable().optional(),
});

export async function salvarAcesso(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = schema.safeParse({
    emailCadastro: nullableText(formData.get("emailCadastro")),
    cotaChave: nullableText(formData.get("cotaChave")),
    celular: nullableText(formData.get("celular")),
    senha: nullableText(formData.get("senha")),
    observacao: nullableText(formData.get("observacao")),
  });
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.acessoCota.upsert({
      where: { cartaId },
      update: parsed.data,
      create: { cartaId, ...parsed.data },
    });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath(`/cartas/${cartaId}`);
  return ok();
}
