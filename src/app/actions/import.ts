"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { etapaPorDatasMarco } from "@/lib/carta";
import { prismaErrorMessage } from "@/lib/action-utils";
import type { LinhaImportada } from "@/lib/import";
import {
  PapelContraparte,
  StatusConsorcio,
  TipoBem,
  type TipoSaida,
} from "@/generated/prisma/client";

export type ResultadoImportacao = {
  importadas: number;
  erros: { linha: number; mensagem: string }[];
};

/** Mesma numeração de etapa usada em `getCarta` (seed padrão: 1 Prospecção .. 10 Resgatada/Revendida). */
function ordemEtapa(carta: LinhaImportada["carta"]): number {
  return etapaPorDatasMarco(
    [
      { etapaOrdem: 2, data: carta.dataCompra },
      { etapaOrdem: 3, data: carta.dataCadastroBolsa },
      { etapaOrdem: 4, data: carta.dataCopiasSeveri },
      { etapaOrdem: 5, data: carta.dataOriginaisSeveri },
      { etapaOrdem: 6, data: carta.dataNotificacao },
      { etapaOrdem: 7, data: carta.dataDoctoAdm },
      { etapaOrdem: 8, data: carta.contempladaEm },
      { etapaOrdem: 9, data: carta.dataPedidoResgate },
      { etapaOrdem: 10, data: carta.dataResgate },
    ],
    1,
  );
}

/** Grava em lote as linhas já validadas pelo client (`src/lib/import.ts`). Uma transação por linha, pra um erro isolado não derrubar o resto do lote. */
export async function importarLinhasAction(
  linhas: LinhaImportada[],
): Promise<ResultadoImportacao> {
  const profile = await requireEditor();
  const erros: ResultadoImportacao["erros"] = [];
  let importadas = 0;

  for (const l of linhas) {
    try {
      await prisma.$transaction(async (tx) => {
        const cessionaria = await tx.cessionaria.upsert({
          where: { nome: l.carta.cessionariaNome },
          update: {},
          create: { nome: l.carta.cessionariaNome },
        });
        const administradora = await tx.administradora.upsert({
          where: { nome: l.carta.administradoraNome },
          update: {},
          create: { nome: l.carta.administradoraNome },
        });

        const ordem = ordemEtapa(l.carta);
        const etapa =
          (await tx.etapa.findUnique({ where: { ordem } })) ??
          (await tx.etapa.findFirst({ orderBy: { ordem: "asc" } }));
        if (!etapa) throw new Error("Nenhuma etapa cadastrada em Configurações.");

        await tx.carta.create({
          data: {
            codigo: l.carta.codigo,
            cessionariaId: cessionaria.id,
            administradoraId: administradora.id,
            grupo: l.carta.grupo,
            cota: l.carta.cota,
            contrato: l.carta.contrato,
            origem: l.carta.origem,
            statusConsorcio: StatusConsorcio.ATIVA,
            tipoBem: TipoBem.OUTRO,
            etapaId: etapa.id,
            valorCompra: l.carta.valorCompra,
            valorCredito: l.carta.valorCredito,
            valorCreditoContemplacao: l.carta.valorCreditoContemplacao,
            percentualPago: l.carta.percentualPago,
            previsaoResgate: l.carta.previsaoResgate,
            valorResgatado: l.carta.valorResgatado,
            tipoSaida: l.carta.tipoSaida as TipoSaida | null,
            dataCompra: l.carta.dataCompra,
            dataCadastroBolsa: l.carta.dataCadastroBolsa,
            encerramentoGrupo: l.carta.encerramentoGrupo,
            contempladaEm: l.carta.contempladaEm,
            dataCopiasSeveri: l.carta.dataCopiasSeveri,
            dataOriginaisSeveri: l.carta.dataOriginaisSeveri,
            dataNotificacao: l.carta.dataNotificacao,
            dataDoctoAdm: l.carta.dataDoctoAdm,
            dataPedidoResgate: l.carta.dataPedidoResgate,
            dataResgate: l.carta.dataResgate,
            observacoes: l.carta.observacoes,
            observacoesGerais: l.carta.observacoesGerais,
            createdById: profile.id,
            etapaHistorico: {
              create: {
                etapaParaId: etapa.id,
                observacao: "Carta importada da planilha.",
                userId: profile.id,
              },
            },
            despesas: l.despesas.length
              ? { create: l.despesas.map((d) => ({ tipo: d.tipo, valor: d.valor })) }
              : undefined,
            acesso: l.acesso ? { create: l.acesso } : undefined,
            contrapartes: l.cedente
              ? {
                  create: {
                    papel: PapelContraparte.CEDENTE,
                    nome: l.cedente.nome,
                    documento: l.cedente.documento,
                  },
                }
              : undefined,
          },
        });
      });
      importadas++;
    } catch (e) {
      erros.push({
        linha: l.linha,
        mensagem: prismaErrorMessage(e, "Não foi possível importar esta linha."),
      });
    }
  }

  if (importadas > 0) {
    revalidatePath("/");
    revalidatePath("/fluxo-caixa");
  }
  return { importadas, erros };
}
