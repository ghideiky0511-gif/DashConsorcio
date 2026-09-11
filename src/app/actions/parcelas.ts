"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { gerarCronogramaParcelas } from "@/lib/parcelas";
import { CategoriaMovimento, StatusParcela, TipoMovimento } from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  nullableText,
  ok,
  parseDateInput,
  parseMoneyInput,
  prismaErrorMessage,
  zodFail,
} from "@/lib/action-utils";

function revalidar(cartaId: string) {
  revalidatePath(`/cartas/${cartaId}`);
  revalidatePath("/fluxo-caixa");
  revalidatePath("/");
}

export async function gerarParcelasAction(cartaId: string): Promise<ActionResult> {
  await requireEditor();

  const carta = await prisma.carta.findUnique({
    where: { id: cartaId },
    select: {
      parcelasTotais: true,
      parcelasQuitadas: true,
      parcelaValor: true,
      diaVencimento: true,
      dataCompra: true,
      _count: { select: { parcelas: true } },
    },
  });
  if (!carta) return fail("Carta não encontrada.");
  if (carta._count.parcelas > 0) {
    return fail("Esta carta já tem parcelas cadastradas.");
  }
  if (!carta.parcelasTotais || !carta.parcelaValor || !carta.diaVencimento) {
    return fail(
      "Preencha parcelas totais, valor da parcela e dia de vencimento antes de gerar o cronograma.",
    );
  }

  const dataReferencia = carta.dataCompra ?? new Date();
  const cronograma = gerarCronogramaParcelas({
    parcelasTotais: carta.parcelasTotais,
    parcelasQuitadas: carta.parcelasQuitadas ?? 0,
    parcelaValor: Number(carta.parcelaValor.toString()),
    diaVencimento: carta.diaVencimento,
    dataReferencia,
  });

  if (cronograma.length === 0) {
    return fail("Não há parcelas restantes a gerar (parcelas quitadas ≥ parcelas totais).");
  }

  try {
    await prisma.parcela.createMany({
      data: cronograma.map((p) => ({ cartaId, ...p })),
    });
  } catch (e) {
    return fail(prismaErrorMessage(e, "Não foi possível gerar o cronograma."));
  }

  revalidar(cartaId);
  return ok();
}

const pagamentoSchema = z.object({
  valorPago: z.number().positive("Informe um valor maior que zero."),
  dataPagamento: z.date({ message: "Informe a data do pagamento." }),
  formaPagamento: z.string().trim().max(60).nullable(),
});

export async function marcarParcelaPagaAction(
  cartaId: string,
  parcelaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();

  const parsed = pagamentoSchema.safeParse({
    valorPago: parseMoneyInput(formData.get("valorPago")),
    dataPagamento: parseDateInput(formData.get("dataPagamento")),
    formaPagamento: nullableText(formData.get("formaPagamento")),
  });
  if (!parsed.success) return zodFail(parsed.error);

  const parcela = await prisma.parcela.findUnique({
    where: { id: parcelaId },
    select: { id: true, cartaId: true, numero: true, status: true },
  });
  if (!parcela || parcela.cartaId !== cartaId) return fail("Parcela não encontrada.");
  if (parcela.status === StatusParcela.PAGO) return fail("Esta parcela já está paga.");

  try {
    await prisma.$transaction([
      prisma.parcela.update({
        where: { id: parcelaId },
        data: {
          status: StatusParcela.PAGO,
          valorPago: parsed.data.valorPago,
          dataPagamento: parsed.data.dataPagamento,
          formaPagamento: parsed.data.formaPagamento,
        },
      }),
      prisma.movimentoCaixa.create({
        data: {
          tipo: TipoMovimento.SAIDA,
          categoria: CategoriaMovimento.PARCELA,
          descricao: `Parcela nº ${parcela.numero}`,
          valor: parsed.data.valorPago,
          data: parsed.data.dataPagamento,
          cartaId,
          parcelaId,
        },
      }),
    ]);
  } catch (e) {
    return fail(prismaErrorMessage(e, "Não foi possível registrar o pagamento."));
  }

  revalidar(cartaId);
  return ok();
}

export async function estornarParcelaAction(
  cartaId: string,
  parcelaId: string,
): Promise<ActionResult> {
  await requireEditor();

  const parcela = await prisma.parcela.findUnique({
    where: { id: parcelaId },
    select: { id: true, cartaId: true, status: true },
  });
  if (!parcela || parcela.cartaId !== cartaId) return fail("Parcela não encontrada.");
  if (parcela.status !== StatusParcela.PAGO) return fail("Esta parcela não está paga.");

  try {
    await prisma.$transaction([
      prisma.movimentoCaixa.deleteMany({ where: { parcelaId } }),
      prisma.parcela.update({
        where: { id: parcelaId },
        data: {
          status: StatusParcela.PENDENTE,
          valorPago: null,
          dataPagamento: null,
          formaPagamento: null,
        },
      }),
    ]);
  } catch (e) {
    return fail(prismaErrorMessage(e, "Não foi possível estornar o pagamento."));
  }

  revalidar(cartaId);
  return ok();
}
