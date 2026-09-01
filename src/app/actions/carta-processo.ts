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
  etapaId: z.string().uuid("Etapa inválida."),
  observacao: z.string().trim().max(300).nullable().optional(),
});

export async function moverEtapaCarta(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireEditor();

  const parsed = schema.safeParse({
    etapaId: formData.get("etapaId"),
    observacao: nullableText(formData.get("observacao")),
  });
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    const carta = await prisma.carta.findUnique({
      where: { id: cartaId },
      select: { etapaId: true },
    });
    if (!carta) return fail("Carta não encontrada.");
    if (carta.etapaId === parsed.data.etapaId)
      return fail("A carta já está nesta etapa.");

    await prisma.$transaction([
      prisma.carta.update({
        where: { id: cartaId },
        data: { etapaId: parsed.data.etapaId },
      }),
      prisma.etapaHistorico.create({
        data: {
          cartaId,
          etapaDeId: carta.etapaId,
          etapaParaId: parsed.data.etapaId,
          observacao: parsed.data.observacao ?? null,
          userId: profile.id,
        },
      }),
    ]);
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }

  revalidatePath(`/cartas/${cartaId}`);
  revalidatePath("/");
  return ok();
}
