import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  custoTotal,
  lucroPrevisto,
  previsaoPercentualLucro,
  resultadoRealizado,
} from "@/lib/carta";
import type {
  FormaContemplacao,
  PapelContraparte,
  Prisma,
  StatusConsorcio,
  StatusParcela,
  TipoBem,
  TipoDespesa,
  TipoDocumento,
  TipoSaida,
} from "@/generated/prisma/client";

function n(v: Prisma.Decimal | number | null | undefined): number {
  return v == null ? 0 : Number(v.toString());
}
function nn(v: Prisma.Decimal | number | null | undefined): number | null {
  return v == null ? null : Number(v.toString());
}

export type Despesa = {
  id: string;
  tipo: TipoDespesa;
  descricao: string | null;
  valor: number;
  data: Date | null;
};

export type Contraparte = {
  id: string;
  papel: PapelContraparte;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  observacao: string | null;
};

export type ParcelaResumo = {
  id: string;
  numero: number;
  competencia: Date;
  vencimento: Date;
  valorPrevisto: number;
  status: StatusParcela;
  valorPago: number | null;
  dataPagamento: Date | null;
};

export type MarcoProcesso = { etapaOrdem: number; nome: string; data: Date | null };

export type DocumentoResumo = {
  id: string;
  tipo: TipoDocumento;
  nome: string;
  tamanho: number;
  mimeType: string;
  createdAt: Date;
  uploadedByNome: string;
};

export type CartaDetalhe = {
  id: string;
  codigo: string;
  grupo: string;
  cota: string;
  contrato: string | null;
  origem: string | null;
  tipoBem: TipoBem;
  statusConsorcio: StatusConsorcio;
  tipoSaida: TipoSaida | null;
  formaContemplacao: FormaContemplacao | null;
  observacoes: string | null;
  observacoesGerais: string | null;

  cessionaria: { id: string; nome: string };
  administradora: { id: string; nome: string };
  etapa: { id: string; nome: string; cor: string | null; ordem: number };

  valorCredito: number;
  valorCreditoContemplacao: number | null;
  percentualPago: number | null;
  valorCompra: number;
  previsaoResgate: number | null;
  valorResgatado: number | null;
  valorRevenda: number | null;

  dataCompra: Date | null;
  dataCadastroBolsa: Date | null;
  encerramentoGrupo: Date | null;
  contempladaEm: Date | null;
  dataResgate: Date | null;
  dataRevenda: Date | null;
  proximaAssembleia: Date | null;
  parcelasTotais: number | null;
  parcelasQuitadas: number | null;
  parcelaValor: number | null;
  diaVencimento: number | null;

  acesso: {
    emailCadastro: string | null;
    cotaChave: string | null;
    celular: string | null;
    senha: string | null;
    observacao: string | null;
  } | null;

  despesas: Despesa[];
  contrapartes: Contraparte[];
  parcelas: ParcelaResumo[];
  documentos: DocumentoResumo[];
  historico: {
    id: string;
    data: Date;
    de: string | null;
    para: string;
    observacao: string | null;
  }[];
  marcos: MarcoProcesso[];

  // computados
  custoTotal: number;
  lucroPrevisto: number;
  percentualLucroPrevisto: number | null;
  resultadoRealizado: number | null;

  etapasDisponiveis: { id: string; nome: string; ordem: number }[];
};

export async function getCarta(id: string): Promise<CartaDetalhe> {
  const c = await prisma.carta.findUnique({
    where: { id },
    include: {
      cessionaria: { select: { id: true, nome: true } },
      administradora: { select: { id: true, nome: true } },
      etapa: { select: { id: true, nome: true, cor: true, ordem: true } },
      acesso: true,
      despesas: { orderBy: [{ data: "asc" }, { tipo: "asc" }] },
      contrapartes: { orderBy: { papel: "asc" } },
      parcelas: { orderBy: { numero: "asc" } },
      documentos: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { nome: true } } },
      },
      etapaHistorico: {
        orderBy: { data: "desc" },
        include: {
          etapaDe: { select: { nome: true } },
          etapaPara: { select: { nome: true } },
        },
      },
    },
  });

  if (!c) notFound();

  const [etapasDisponiveis] = await Promise.all([
    prisma.etapa.findMany({
      where: { ativa: true },
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true, ordem: true },
    }),
  ]);

  const despesas: Despesa[] = c.despesas.map((d) => ({
    id: d.id,
    tipo: d.tipo,
    descricao: d.descricao,
    valor: n(d.valor),
    data: d.data,
  }));

  const ct = custoTotal({ valorCompra: n(c.valorCompra), despesas });
  const previsao = nn(c.previsaoResgate);
  const resgatado = nn(c.valorResgatado);
  const revenda = nn(c.valorRevenda);

  const marcos: MarcoProcesso[] = [
    { etapaOrdem: 2, nome: "Compra", data: c.dataCompra },
    { etapaOrdem: 3, nome: "Cadastro BOLSA", data: c.dataCadastroBolsa },
    { etapaOrdem: 4, nome: "Cópias p/ Severi", data: c.dataCopiasSeveri },
    { etapaOrdem: 5, nome: "Originais p/ Severi", data: c.dataOriginaisSeveri },
    { etapaOrdem: 6, nome: "Notificação", data: c.dataNotificacao },
    { etapaOrdem: 7, nome: "Docto p/ ADM", data: c.dataDoctoAdm },
    { etapaOrdem: 8, nome: "Contemplação", data: c.contempladaEm },
    { etapaOrdem: 9, nome: "Pedido de Resgate", data: c.dataPedidoResgate },
    {
      etapaOrdem: 10,
      nome: "Resgate / Revenda",
      data: c.dataResgate ?? c.dataRevenda,
    },
  ];

  return {
    id: c.id,
    codigo: c.codigo,
    grupo: c.grupo,
    cota: c.cota,
    contrato: c.contrato,
    origem: c.origem,
    tipoBem: c.tipoBem,
    statusConsorcio: c.statusConsorcio,
    tipoSaida: c.tipoSaida,
    formaContemplacao: c.formaContemplacao,
    observacoes: c.observacoes,
    observacoesGerais: c.observacoesGerais,

    cessionaria: c.cessionaria,
    administradora: c.administradora,
    etapa: c.etapa,

    valorCredito: n(c.valorCredito),
    valorCreditoContemplacao: nn(c.valorCreditoContemplacao),
    percentualPago: nn(c.percentualPago),
    valorCompra: n(c.valorCompra),
    previsaoResgate: previsao,
    valorResgatado: resgatado,
    valorRevenda: revenda,

    dataCompra: c.dataCompra,
    dataCadastroBolsa: c.dataCadastroBolsa,
    encerramentoGrupo: c.encerramentoGrupo,
    contempladaEm: c.contempladaEm,
    dataResgate: c.dataResgate,
    dataRevenda: c.dataRevenda,
    proximaAssembleia: c.proximaAssembleia,
    parcelasTotais: c.parcelasTotais,
    parcelasQuitadas: c.parcelasQuitadas,
    parcelaValor: nn(c.parcelaValor),
    diaVencimento: c.diaVencimento,

    acesso: c.acesso
      ? {
          emailCadastro: c.acesso.emailCadastro,
          cotaChave: c.acesso.cotaChave,
          celular: c.acesso.celular,
          senha: c.acesso.senha,
          observacao: c.acesso.observacao,
        }
      : null,

    despesas,
    contrapartes: c.contrapartes.map((cp) => ({
      id: cp.id,
      papel: cp.papel,
      nome: cp.nome,
      documento: cp.documento,
      email: cp.email,
      telefone: cp.telefone,
      observacao: cp.observacao,
    })),
    parcelas: c.parcelas.map((p) => ({
      id: p.id,
      numero: p.numero,
      competencia: p.competencia,
      vencimento: p.vencimento,
      valorPrevisto: n(p.valorPrevisto),
      status: p.status,
      valorPago: nn(p.valorPago),
      dataPagamento: p.dataPagamento,
    })),
    documentos: c.documentos.map((doc) => ({
      id: doc.id,
      tipo: doc.tipo,
      nome: doc.nome,
      tamanho: doc.tamanho,
      mimeType: doc.mimeType,
      createdAt: doc.createdAt,
      uploadedByNome: doc.uploadedBy.nome,
    })),
    historico: c.etapaHistorico.map((h) => ({
      id: h.id,
      data: h.data,
      de: h.etapaDe?.nome ?? null,
      para: h.etapaPara.nome,
      observacao: h.observacao,
    })),
    marcos,

    custoTotal: ct,
    lucroPrevisto: lucroPrevisto({ previsaoResgate: previsao, custoTotal: ct }),
    percentualLucroPrevisto: previsaoPercentualLucro({
      previsaoResgate: previsao,
      custoTotal: ct,
    }),
    resultadoRealizado: resultadoRealizado({
      valorResgatado: resgatado,
      valorRevenda: revenda,
      custoTotal: ct,
    }),

    etapasDisponiveis,
  };
}
