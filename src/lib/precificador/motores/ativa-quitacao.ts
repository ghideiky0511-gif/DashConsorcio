// Precificação de carta ATIVA via LANCE DE QUITAÇÃO: você paga o vendedor (X)
// pela cota E dá um lance que quita o saldo devedor inteiro (contempla e zera a
// dívida de uma vez) — mas várias administradoras só liberam o crédito depois
// de um prazo de carência (normalmente 180 dias).
//
// O fluxo é: paga (X + lance) hoje, recebe o crédito líquido daqui a
// `prazoLiberacaoDias`. Mesmo formato de fluxo único da carta cancelada —
// reaproveita as mesmas `precoJusto()` / `metricasRetorno()`, só que aqui
// resolvemos para X (preço ao vendedor), descontando o lance (que é um custo
// fixo conhecido, não uma incógnita).
//
// Pura — coberta por testes.

import { interpolarCurva, taxaAcumulada } from "../core/juros";
import {
  metricasRetorno,
  precoJusto as calcularPrecoJusto,
  type MetricasRetorno,
} from "../core/retorno";
import type { CurvaParaCalculo } from "./cancelada";
import { PARAMETROS } from "../parametros";

type Num = number | string | null | undefined;

function n(value: Num): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function round4(v: number): number {
  return Math.round((v + Number.EPSILON) * 10000) / 10000;
}

export interface EntradaPrecificacaoAtivaLanceQuitacao {
  /** Crédito líquido que será liberado ao fim da carência. */
  creditoAtual: Num;
  /** Valor do lance de quitação — paga a dívida inteira e contempla. */
  lanceQuitacao: Num;
  /** Dias de carência até a administradora liberar o crédito. Padrão: 180. */
  prazoLiberacaoDias?: number;
  /** Múltiplo do CDI exigido no período. Default: 2. */
  metaMultiploCdi?: Num;
  /** Preço pago ao vendedor pela cota. Ausente → avalia o preço justo. */
  precoOfertado?: Num;
  curva: CurvaParaCalculo;
}

export interface ResultadoPrecificacaoAtivaLanceQuitacao {
  motor: "ATIVA";
  variante: "LANCE_QUITACAO";
  prazoLiberacaoDias: number;
  prazoLiberacaoMeses: number;
  cdiAnual: number;
  taxaCurvaNoPrazo: number | null;
  cdiAcumuladoPeriodo: number;
  metaMultiploCdi: number;
  lanceQuitacao: number;
  /** Crédito líquido recebido ao fim da carência. */
  creditoLiquido: number;
  /** Preço MÁXIMO a pagar ao vendedor (sem contar o lance) pra bater a meta.
   *  Pode ser negativo — significa que o lance sozinho já estoura a meta. */
  precoJustoVendedor: number | null;
  precoVendedorAvaliado: number | null;
  /** Preço ao vendedor + lance de quitação, no preço avaliado. */
  custoTotalAvaliado: number | null;
  retorno: MetricasRetorno | null;
  avisos: string[];
}

export function precificarAtivaLanceQuitacao(
  entrada: EntradaPrecificacaoAtivaLanceQuitacao,
): ResultadoPrecificacaoAtivaLanceQuitacao {
  const credito = n(entrada.creditoAtual);
  const lance = n(entrada.lanceQuitacao);
  const prazoDias =
    entrada.prazoLiberacaoDias ?? PARAMETROS.ativa.quitacao.prazoLiberacaoDiasPadrao;
  const prazoMeses = Math.max(
    1,
    Math.round(prazoDias / PARAMETROS.ativa.quitacao.diasPorMes),
  );
  const meta =
    entrada.metaMultiploCdi == null ? PARAMETROS.metaMultiploCdiPadrao : n(entrada.metaMultiploCdi);

  const cdiAnual = n(entrada.curva.cdiAnual);
  const taxaCurva = interpolarCurva(entrada.curva.pontos ?? [], prazoMeses);
  const taxaParaCdi = taxaCurva ?? cdiAnual;
  const cdiAcumuladoPeriodo = round4(taxaAcumulada(taxaParaCdi, prazoMeses));

  // Custo total (vendedor + lance) que bate a meta, dado que se recebe `credito`
  // líquido ao fim da carência.
  const custoTotalJusto = calcularPrecoJusto({
    resgate: credito,
    metaMultiploCdi: meta,
    cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
  });
  const precoJustoVendedor = custoTotalJusto == null ? null : round2(custoTotalJusto - lance);

  const precoVendedorAvaliado =
    entrada.precoOfertado != null ? n(entrada.precoOfertado) : precoJustoVendedor;
  const custoTotalAvaliado =
    precoVendedorAvaliado == null ? null : round2(precoVendedorAvaliado + lance);

  const retorno =
    custoTotalAvaliado != null && custoTotalAvaliado > 0
      ? metricasRetorno({
          preco: custoTotalAvaliado,
          resgate: credito,
          meses: prazoMeses,
          cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
        })
      : null;

  const avisos: string[] = [];
  if (credito <= 0) avisos.push("Informe o crédito líquido a ser liberado.");
  if (lance <= 0) avisos.push("Informe o valor do lance de quitação.");
  if (taxaCurva == null)
    avisos.push("Curva de juros vazia — CDI acumulado usa o CDI corrente.");
  if (precoJustoVendedor != null && precoJustoVendedor <= 0)
    avisos.push(
      "O lance de quitação sozinho já não deixa margem pra pagar nada ao vendedor e ainda bater a meta.",
    );
  if (retorno?.multiploCdi != null && retorno.multiploCdi < meta)
    avisos.push(
      `No preço avaliado o retorno é ${retorno.multiploCdi.toFixed(
        2,
      )}× o CDI, abaixo da meta de ${meta}×.`,
    );

  return {
    motor: "ATIVA",
    variante: "LANCE_QUITACAO",
    prazoLiberacaoDias: prazoDias,
    prazoLiberacaoMeses: prazoMeses,
    cdiAnual: round4(cdiAnual),
    taxaCurvaNoPrazo: taxaCurva == null ? null : round4(taxaCurva),
    cdiAcumuladoPeriodo,
    metaMultiploCdi: meta,
    lanceQuitacao: round2(lance),
    creditoLiquido: round2(credito),
    precoJustoVendedor,
    precoVendedorAvaliado,
    custoTotalAvaliado,
    retorno,
    avisos,
  };
}
