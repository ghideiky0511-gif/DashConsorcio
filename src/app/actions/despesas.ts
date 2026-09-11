"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { tipoDespesaLabel } from "@/lib/labels";
import {
  CategoriaMovimento,
  TipoDespesa,
  TipoMovimento,
} from "@/generated/prisma/client";
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
  revalidatePath("/fluxo-caixa");
  revalidatePath("/");
}

function descricaoMovimento(
  tipo: TipoDespesa,
  descricao: string | null | undefined,
) {
  return descricao ? `${tipoDespesaLabel[tipo]} — ${descricao}` : tipoDespesaLabel[tipo];
}

export async function criarDespesa(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));
  const { tipo, descricao, valor, data } = parsed.data;
  const dataMovimento = data ?? new Date();

  try {
    await prisma.despesaCarta.create({
      data: {
        cartaId,
        tipo,
        descricao,
        valor,
        data,
        movimentos: {
          create: {
            tipo: TipoMovimento.SAIDA,
            categoria: CategoriaMovimento.DESPESA_CARTA,
            descricao: descricaoMovimento(tipo, descricao),
            valor,
            data: dataMovimento,
            cartaId,
          },
        },
      },
    });
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
  const { tipo, descricao, valor, data } = parsed.data;
  const dataMovimento = data ?? new Date();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.despesaCarta.update({
        where: { id },
        data: { tipo, descricao, valor, data },
      });

      const movimentoExistente = await tx.movimentoCaixa.findFirst({
        where: { despesaId: id },
        select: { id: true },
      });
      const dadosMovimento = {
        tipo: TipoMovimento.SAIDA,
        categoria: CategoriaMovimento.DESPESA_CARTA,
        descricao: descricaoMovimento(tipo, descricao),
        valor,
        data: dataMovimento,
      };
      if (movimentoExistente) {
        await tx.movimentoCaixa.update({
          where: { id: movimentoExistente.id },
          data: dadosMovimento,
        });
      } else {
        await tx.movimentoCaixa.create({
          data: { ...dadosMovimento, cartaId, despesaId: id },
        });
      }
    });
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
    await prisma.$transaction([
      prisma.movimentoCaixa.deleteMany({ where: { despesaId: id } }),
      prisma.despesaCarta.delete({ where: { id } }),
    ]);
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidar(cartaId);
  return ok();
}
