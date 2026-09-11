import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type CartaFormValues = {
  id: string;
  codigo: string;
  cessionariaId: string;
  administradoraId: string;
  etapaId: string;
  grupo: string;
  cota: string;
  contrato: string;
  origem: string;
  tipoBem: string;
  statusConsorcio: string;
  tipoSaida: string;
  formaContemplacao: string;
  valorCredito: string;
  valorCreditoContemplacao: string;
  percentualPago: string;
  valorCompra: string;
  previsaoResgate: string;
  valorResgatado: string;
  valorRevenda: string;
  parcelasTotais: string;
  parcelasQuitadas: string;
  parcelaValor: string;
  diaVencimento: string;
  observacoes: string;
  observacoesGerais: string;
  dataCompra: string;
  dataCadastroBolsa: string;
  encerramentoGrupo: string;
  dataCopiasSeveri: string;
  dataOriginaisSeveri: string;
  dataNotificacao: string;
  dataDoctoAdm: string;
  contempladaEm: string;
  dataPedidoResgate: string;
  dataResgate: string;
  dataRevenda: string;
  proximaAssembleia: string;
};

const d = (x: Date | null) => (x ? new Date(x).toISOString().slice(0, 10) : "");
const m = (x: Prisma.Decimal | null) => (x == null ? "" : String(Number(x.toString())));

export async function getCartaFormValues(id: string): Promise<CartaFormValues> {
  const v = await getCartaFormValuesOrNull(id);
  if (!v) notFound();
  return v;
}

export async function getCartaFormValuesOrNull(
  id: string,
): Promise<CartaFormValues | null> {
  const c = await prisma.carta.findUnique({ where: { id } });
  if (!c) return null;

  return {
    id: c.id,
    codigo: c.codigo,
    cessionariaId: c.cessionariaId,
    administradoraId: c.administradoraId,
    etapaId: c.etapaId,
    grupo: c.grupo,
    cota: c.cota,
    contrato: c.contrato ?? "",
    origem: c.origem ?? "",
    tipoBem: c.tipoBem,
    statusConsorcio: c.statusConsorcio,
    tipoSaida: c.tipoSaida ?? "",
    formaContemplacao: c.formaContemplacao ?? "",
    valorCredito: m(c.valorCredito),
    valorCreditoContemplacao: m(c.valorCreditoContemplacao),
    percentualPago:
      c.percentualPago == null
        ? ""
        : String(Math.round(Number(c.percentualPago.toString()) * 10000) / 100),
    valorCompra: m(c.valorCompra),
    previsaoResgate: m(c.previsaoResgate),
    valorResgatado: m(c.valorResgatado),
    valorRevenda: m(c.valorRevenda),
    parcelasTotais: c.parcelasTotais?.toString() ?? "",
    parcelasQuitadas: c.parcelasQuitadas?.toString() ?? "",
    parcelaValor: m(c.parcelaValor),
    diaVencimento: c.diaVencimento?.toString() ?? "",
    observacoes: c.observacoes ?? "",
    observacoesGerais: c.observacoesGerais ?? "",
    dataCompra: d(c.dataCompra),
    dataCadastroBolsa: d(c.dataCadastroBolsa),
    encerramentoGrupo: d(c.encerramentoGrupo),
    dataCopiasSeveri: d(c.dataCopiasSeveri),
    dataOriginaisSeveri: d(c.dataOriginaisSeveri),
    dataNotificacao: d(c.dataNotificacao),
    dataDoctoAdm: d(c.dataDoctoAdm),
    contempladaEm: d(c.contempladaEm),
    dataPedidoResgate: d(c.dataPedidoResgate),
    dataResgate: d(c.dataResgate),
    dataRevenda: d(c.dataRevenda),
    proximaAssembleia: d(c.proximaAssembleia),
  };
}
