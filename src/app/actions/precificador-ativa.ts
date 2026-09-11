"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";
import { nullableText, parseMoneyInput, prismaErrorMessage } from "@/lib/action-utils";
import {
  obterCurvaDoDia,
  precificarAtivaContemplada,
  precificarAtivaLanceQuitacao,
  precificarAtivaNaoContemplada,
  type ResultadoPrecificacaoAtivaContemplada,
  type ResultadoPrecificacaoAtivaLanceQuitacao,
  type ResultadoPrecificacaoAtivaNaoContemplada,
} from "@/lib/precificador";
import { MotorPrecificacao, type Prisma } from "@/generated/prisma/client";

export type PrecificacaoAtivaState =
  | {
      ok: true;
      variante: "PARCELAS";
      resultado: ResultadoPrecificacaoAtivaContemplada;
      precificacaoId: string;
    }
  | {
      ok: true;
      variante: "LANCE_QUITACAO";
      resultado: ResultadoPrecificacaoAtivaLanceQuitacao;
      precificacaoId: string;
    }
  | {
      ok: true;
      variante: "NAO_CONTEMPLADA";
      resultado: ResultadoPrecificacaoAtivaNaoContemplada;
      precificacaoId: string;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

const schemaParcelas = z.object({
  administradoraNome: z.string().trim().max(120).nullable(),
  grupo: z.string().trim().max(60).nullable(),
  cota: z.string().trim().max(60).nullable(),
  creditoAtual: z.number({ invalid_type_error: "Informe o crédito." }).positive("Informe o crédito."),
  parcelaMensal: z.number({ invalid_type_error: "Informe a parcela." }).nonnegative(),
  parcelasRestantes: z
    .number({ invalid_type_error: "Informe as parcelas restantes." })
    .int()
    .positive("Informe as parcelas restantes."),
  taxaTransferencia: z.number().nonnegative().nullable(),
  lanceContemplacao: z.number().nonnegative().nullable(),
  percentualLanceContemplacao: z.number().min(0).max(100).nullable(),
  metaMultiploCdi: z.number().positive(),
  precoOfertado: z.number().positive().nullable(),
});

const schemaNaoContemplada = z.object({
  administradoraNome: z.string().trim().max(120).nullable(),
  grupo: z.string().trim().max(60).nullable(),
  cota: z.string().trim().max(60).nullable(),
  creditoAtual: z.number({ invalid_type_error: "Informe o crédito." }).positive("Informe o crédito."),
  parcelaMensal: z.number({ invalid_type_error: "Informe a parcela." }).nonnegative(),
  mesesAteEncerramento: z
    .number({ invalid_type_error: "Informe os meses até o encerramento do grupo." })
    .int()
    .positive("Informe os meses até o encerramento do grupo."),
  mesesAteContemplacaoEstimados: z.number().int().positive().nullable(),
  taxaTransferencia: z.number().nonnegative().nullable(),
  metaMultiploCdi: z.number().positive(),
  precoOfertado: z.number().positive().nullable(),
});

const schemaQuitacao = z.object({
  administradoraNome: z.string().trim().max(120).nullable(),
  grupo: z.string().trim().max(60).nullable(),
  cota: z.string().trim().max(60).nullable(),
  creditoAtual: z.number({ invalid_type_error: "Informe o crédito." }).positive("Informe o crédito."),
  lanceQuitacao: z.number({ invalid_type_error: "Informe o lance de quitação." }).positive(),
  prazoLiberacaoDias: z.number().int().positive().nullable(),
  metaMultiploCdi: z.number().positive(),
  precoOfertado: z.number().positive().nullable(),
});

function fieldErrorsDe(erro: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of erro.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function precificarCartaAtivaAction(
  _prev: PrecificacaoAtivaState,
  formData: FormData,
): Promise<PrecificacaoAtivaState> {
  const profile = await requireProfile();
  const varianteBruta = formData.get("variante");
  const variante =
    varianteBruta === "LANCE_QUITACAO"
      ? "LANCE_QUITACAO"
      : varianteBruta === "NAO_CONTEMPLADA"
        ? "NAO_CONTEMPLADA"
        : "PARCELAS";

  const base = {
    administradoraNome: nullableText(formData.get("administradoraNome")),
    grupo: nullableText(formData.get("grupo")),
    cota: nullableText(formData.get("cota")),
    creditoAtual: parseMoneyInput(formData.get("creditoAtual")),
    metaMultiploCdi: parseMoneyInput(formData.get("metaMultiploCdi")) ?? 2,
    precoOfertado: parseMoneyInput(formData.get("precoOfertado")),
  };

  try {
    const curva = await obterCurvaDoDia();

    if (variante === "LANCE_QUITACAO") {
      const parsed = schemaQuitacao.safeParse({
        ...base,
        lanceQuitacao: parseMoneyInput(formData.get("lanceQuitacao")),
        prazoLiberacaoDias: parseMoneyInput(formData.get("prazoLiberacaoDias")),
      });
      if (!parsed.success) {
        return { ok: false, error: "Confira os campos destacados.", fieldErrors: fieldErrorsDe(parsed.error) };
      }
      const input = parsed.data;

      const resultado = precificarAtivaLanceQuitacao({
        creditoAtual: input.creditoAtual,
        lanceQuitacao: input.lanceQuitacao,
        prazoLiberacaoDias: input.prazoLiberacaoDias ?? undefined,
        metaMultiploCdi: input.metaMultiploCdi,
        precoOfertado: input.precoOfertado ?? undefined,
        curva,
      });

      const criada = await prisma.precificacao.create({
        data: {
          motor: MotorPrecificacao.ATIVA,
          administradoraNome: input.administradoraNome,
          grupo: input.grupo,
          cota: input.cota,
          creditoAtual: input.creditoAtual,
          dataReferencia: new Date(),
          mesesAteEncerramento: resultado.prazoLiberacaoMeses,
          multaExclusaoPct: 0,
          metaMultiploCdi: resultado.metaMultiploCdi,
          cdiAcumuladoPeriodo: resultado.cdiAcumuladoPeriodo,
          curvaSnapshotId: curva.id,
          resgateProjetado: resultado.creditoLiquido,
          precoJusto: resultado.precoJustoVendedor,
          precoOfertado: input.precoOfertado,
          retornoTotal: resultado.retorno?.retornoTotal,
          retornoMensal: resultado.retorno?.retornoMensal,
          multiploCdi: resultado.retorno?.multiploCdi,
          detalhe: resultado as unknown as Prisma.InputJsonValue,
          createdById: profile.id,
        },
        select: { id: true },
      });

      return { ok: true, variante: "LANCE_QUITACAO", resultado, precificacaoId: criada.id };
    }

    if (variante === "NAO_CONTEMPLADA") {
      const parsed = schemaNaoContemplada.safeParse({
        ...base,
        parcelaMensal: parseMoneyInput(formData.get("parcelaMensal")),
        mesesAteEncerramento: parseMoneyInput(formData.get("mesesAteEncerramento")),
        mesesAteContemplacaoEstimados: parseMoneyInput(
          formData.get("mesesAteContemplacaoEstimados"),
        ),
        taxaTransferencia: parseMoneyInput(formData.get("taxaTransferencia")),
      });
      if (!parsed.success) {
        return { ok: false, error: "Confira os campos destacados.", fieldErrors: fieldErrorsDe(parsed.error) };
      }
      const input = parsed.data;

      const resultado = precificarAtivaNaoContemplada({
        creditoAtual: input.creditoAtual,
        parcelaMensal: input.parcelaMensal,
        mesesAteEncerramento: input.mesesAteEncerramento,
        mesesAteContemplacaoEstimados: input.mesesAteContemplacaoEstimados ?? undefined,
        taxaTransferencia: input.taxaTransferencia ?? undefined,
        metaMultiploCdi: input.metaMultiploCdi,
        precoOfertado: input.precoOfertado ?? undefined,
        curva,
      });

      const criada = await prisma.precificacao.create({
        data: {
          motor: MotorPrecificacao.ATIVA,
          administradoraNome: input.administradoraNome,
          grupo: input.grupo,
          cota: input.cota,
          creditoAtual: input.creditoAtual,
          dataReferencia: new Date(),
          mesesAteEncerramento: resultado.mesesAteEncerramento,
          multaExclusaoPct: 0,
          metaMultiploCdi: resultado.metaMultiploCdi,
          cdiAcumuladoPeriodo: resultado.cdiAcumuladoPeriodo,
          curvaSnapshotId: curva.id,
          resgateProjetado: resultado.valorNominalTotal,
          precoJusto: resultado.precoJusto,
          precoOfertado: input.precoOfertado,
          retornoTotal: resultado.retorno?.retornoTotal,
          retornoMensal: resultado.retorno?.retornoMensal,
          multiploCdi: resultado.retorno?.multiploCdi,
          cenarios: resultado.cenarios as unknown as Prisma.InputJsonValue,
          detalhe: resultado as unknown as Prisma.InputJsonValue,
          createdById: profile.id,
        },
        select: { id: true },
      });

      return { ok: true, variante: "NAO_CONTEMPLADA", resultado, precificacaoId: criada.id };
    }

    const parsed = schemaParcelas.safeParse({
      ...base,
      parcelaMensal: parseMoneyInput(formData.get("parcelaMensal")),
      parcelasRestantes: parseMoneyInput(formData.get("parcelasRestantes")),
      taxaTransferencia: parseMoneyInput(formData.get("taxaTransferencia")),
      lanceContemplacao: parseMoneyInput(formData.get("lanceContemplacao")),
      percentualLanceContemplacao: parseMoneyInput(formData.get("percentualLanceContemplacao")),
    });
    if (!parsed.success) {
      return { ok: false, error: "Confira os campos destacados.", fieldErrors: fieldErrorsDe(parsed.error) };
    }
    const input = parsed.data;

    const resultado = precificarAtivaContemplada({
      creditoAtual: input.creditoAtual,
      parcelaMensal: input.parcelaMensal,
      parcelasRestantes: input.parcelasRestantes,
      taxaTransferencia: input.taxaTransferencia ?? undefined,
      lanceContemplacao: input.lanceContemplacao ?? undefined,
      percentualLanceContemplacao: input.percentualLanceContemplacao ?? undefined,
      metaMultiploCdi: input.metaMultiploCdi,
      precoOfertado: input.precoOfertado ?? undefined,
      curva,
    });

    const criada = await prisma.precificacao.create({
      data: {
        motor: MotorPrecificacao.ATIVA,
        administradoraNome: input.administradoraNome,
        grupo: input.grupo,
        cota: input.cota,
        creditoAtual: input.creditoAtual,
        dataReferencia: new Date(),
        mesesAteEncerramento: resultado.parcelasRestantes,
        multaExclusaoPct: 0,
        metaMultiploCdi: resultado.metaMultiploCdi,
        cdiAcumuladoPeriodo: resultado.cdiAcumuladoPeriodo,
        curvaSnapshotId: curva.id,
        resgateProjetado: resultado.valorNominalTotal,
        precoJusto: resultado.precoJusto,
        precoOfertado: input.precoOfertado,
        retornoTotal: resultado.retorno?.retornoTotal,
        retornoMensal: resultado.retorno?.retornoMensal,
        multiploCdi: resultado.retorno?.multiploCdi,
        detalhe: { variante: "PARCELAS", ...resultado } as unknown as Prisma.InputJsonValue,
        createdById: profile.id,
      },
      select: { id: true },
    });

    return { ok: true, variante: "PARCELAS", resultado, precificacaoId: criada.id };
  } catch (err) {
    return {
      ok: false,
      error: prismaErrorMessage(err, "Não foi possível calcular a precificação."),
    };
  }
}
