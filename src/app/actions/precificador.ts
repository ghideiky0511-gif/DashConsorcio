"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";
import {
  nullableText,
  parseDateInput,
  parseMoneyInput,
  prismaErrorMessage,
} from "@/lib/action-utils";
import {
  obterCurvaDoDia,
  precificarCancelada,
  type ResultadoPrecificacaoCancelada,
} from "@/lib/precificador";
import { MotorPrecificacao, type Prisma } from "@/generated/prisma/client";

export type PrecificacaoCanceladaState =
  | { ok: true; resultado: ResultadoPrecificacaoCancelada; precificacaoId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

/** Campo de porcentagem do formulário ("4,3" → fração 0,043). */
function parsePercentFraction(value: FormDataEntryValue | null): number | null {
  const num = parseMoneyInput(value);
  return num == null ? null : num / 100;
}

const schema = z.object({
  administradoraNome: z.string().trim().max(120).nullable(),
  grupo: z.string().trim().max(60).nullable(),
  cota: z.string().trim().max(60).nullable(),
  creditoAtual: z.number({ invalid_type_error: "Informe o crédito." }).positive("Informe o crédito."),
  percentualPagoPct: z
    .number({ invalid_type_error: "Informe o percentual pago." })
    .min(0)
    .max(100, "O percentual pago é em %, não em fração."),
  fundoComumPago: z.number().nonnegative().nullable(),
  encerramentoGrupo: z.date({
    invalid_type_error: "Informe a data de encerramento do grupo.",
  }),
  dataReferencia: z.date().nullable(),
  indiceCorrecaoAnual: z.number().min(0).max(1),
  multaExclusaoPct: z.number().min(0).max(1).nullable(),
  resgateCorrigido: z.boolean(),
  metaMultiploCdi: z.number().positive(),
  precoOfertado: z.number().positive().nullable(),
  mesesAteContemplacaoEstimados: z.number().int().min(0).nullable(),
});

export async function precificarCartaCanceladaAction(
  _prev: PrecificacaoCanceladaState,
  formData: FormData,
): Promise<PrecificacaoCanceladaState> {
  const profile = await requireProfile();

  const parsed = schema.safeParse({
    administradoraNome: nullableText(formData.get("administradoraNome")),
    grupo: nullableText(formData.get("grupo")),
    cota: nullableText(formData.get("cota")),
    creditoAtual: parseMoneyInput(formData.get("creditoAtual")),
    percentualPagoPct: parseMoneyInput(formData.get("percentualPagoPct")),
    fundoComumPago: parseMoneyInput(formData.get("fundoComumPago")),
    encerramentoGrupo: parseDateInput(formData.get("encerramentoGrupo")),
    dataReferencia: parseDateInput(formData.get("dataReferencia")),
    indiceCorrecaoAnual: parsePercentFraction(formData.get("indiceCorrecaoAnual")) ?? 0,
    multaExclusaoPct: parsePercentFraction(formData.get("multaExclusaoPct")),
    resgateCorrigido: formData.get("resgateCorrigido") === "on",
    metaMultiploCdi: parseMoneyInput(formData.get("metaMultiploCdi")) ?? 2,
    precoOfertado: parseMoneyInput(formData.get("precoOfertado")),
    mesesAteContemplacaoEstimados: parseMoneyInput(
      formData.get("mesesAteContemplacaoEstimados"),
    ),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Confira os campos destacados.", fieldErrors };
  }

  const input = parsed.data;

  try {
    const curva = await obterCurvaDoDia();

    const resultado = precificarCancelada({
      creditoAtual: input.creditoAtual,
      percentualPagoPct: input.percentualPagoPct,
      fundoComumPago: input.fundoComumPago ?? undefined,
      encerramentoGrupo: input.encerramentoGrupo,
      dataReferencia: input.dataReferencia ?? undefined,
      indiceCorrecaoAnual: input.indiceCorrecaoAnual,
      multaExclusaoPct: input.multaExclusaoPct ?? undefined,
      resgateCorrigido: input.resgateCorrigido,
      metaMultiploCdi: input.metaMultiploCdi,
      precoOfertado: input.precoOfertado ?? undefined,
      mesesAteContemplacaoEstimados: input.mesesAteContemplacaoEstimados ?? undefined,
      curva,
    });

    const criada = await prisma.precificacao.create({
      data: {
        motor: MotorPrecificacao.CANCELADA,
        administradoraNome: input.administradoraNome,
        grupo: input.grupo,
        cota: input.cota,
        creditoAtual: input.creditoAtual,
        percentualPago: input.percentualPagoPct / 100, // coluna guarda fração 0..1
        fundoComumPago: input.fundoComumPago,
        encerramentoGrupo: input.encerramentoGrupo,
        dataReferencia: new Date(resultado.dataReferencia),
        mesesAteEncerramento: resultado.mesesAteEncerramento,
        indiceCorrecaoAnual: resultado.indiceCorrecaoAnual,
        multaExclusaoPct: input.multaExclusaoPct ?? 0,
        metaMultiploCdi: resultado.metaMultiploCdi,
        cdiAcumuladoPeriodo: resultado.cdiAcumuladoPeriodo,
        curvaSnapshotId: curva.id,
        resgateProjetado: resultado.resgateProjetado,
        precoJusto: resultado.precoJusto,
        precoOfertado: input.precoOfertado,
        propostaMdv: resultado.propostaMdv.valor,
        propostaObjetiva: resultado.propostaObjetiva.valor,
        retornoTotal: resultado.retorno?.retornoTotal,
        retornoMensal: resultado.retorno?.retornoMensal,
        multiploCdi: resultado.retorno?.multiploCdi,
        cenarios: resultado.cenarios as unknown as Prisma.InputJsonValue,
        detalhe: resultado as unknown as Prisma.InputJsonValue,
        createdById: profile.id,
      },
      select: { id: true },
    });

    return { ok: true, resultado, precificacaoId: criada.id };
  } catch (err) {
    return { ok: false, error: prismaErrorMessage(err, "Não foi possível calcular a precificação.") };
  }
}
