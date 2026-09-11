// Precificação de carta ATIVA já contemplada: você compra o direito ao crédito
// hoje e assume o saldo devedor, pago em parcelas mensais até o fim do plano.
//
// Mesma filosofia e MESMA fórmula da carta cancelada — meta de retorno, não
// tabela de fator: trata "crédito recebido − parcelas a pagar" (o ganho nominal
// do negócio) como se fosse um resgate único recebido ao final das parcelas
// restantes, e reaproveita `precoJusto()` / `metricasRetorno()` de `retorno.ts`.
//
// Por que não TIR do fluxo completo: nesse formato de fluxo (entrada grande
// hoje, saídas pequenas depois) a TIR "de livro-texto" mede a taxa implícita de
// um financiamento, não o retorno de um investimento — o sinal fica
// contraintuitivo bem no caso em que o negócio é claramente muito bom (ver
// `fluxo.ts` para o motor de TIR genérico, guardado pra quando modelarmos o
// caso "não contemplada", cujo fluxo tem outro formato).
//
// Escopo desta primeira versão: cota JÁ CONTEMPLADA. O caso "aguardando
// sorteio" ou "vai dar lance pra antecipar" fica pra quando tivermos exemplos
// reais pra modelar certo — ver docs/precificacao/analise-planilha.md.
//
// Pura — coberta por testes.

import type { FluxoCaixa } from "../core/fluxo";
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

export interface EntradaPrecificacaoAtivaContemplada {
  /** Crédito recebido na hora, ao assumir a cota contemplada. */
  creditoAtual: Num;
  /** Valor da parcela mensal restante (o que o comprador vai pagar). */
  parcelaMensal: Num;
  /** Quantas parcelas faltam até quitar. */
  parcelasRestantes: number;
  /** Custo único de transferência da cota (taxa cobrada pela administradora), se houver. */
  taxaTransferencia?: Num;
  /** Lance de contemplação em R$, se a cota ainda não estava contemplada e ele
   *  foi necessário pra contemplar agora (administradora só aceita esse tipo de
   *  lance — o saldo devedor continua a pagar em parcelas). Ignorado se
   *  `percentualLanceContemplacao` for informado. */
  lanceContemplacao?: Num;
  /** Lance de contemplação em % do crédito (como o mercado costuma cotar, ex.:
   *  "dei um lance de 25%"). Quando informado, tem prioridade sobre
   *  `lanceContemplacao`: `lance = crédito × percentual / 100`. */
  percentualLanceContemplacao?: Num;
  /** Múltiplo do CDI exigido no período. Default: 2. */
  metaMultiploCdi?: Num;
  /** Preço que o operador quer avaliar. Ausente → avalia o preço justo. */
  precoOfertado?: Num;
  curva: CurvaParaCalculo;
}

export interface ResultadoPrecificacaoAtivaContemplada {
  motor: "ATIVA";
  parcelasRestantes: number;
  cdiAnual: number;
  taxaCurvaNoPrazo: number | null;
  cdiAcumuladoPeriodo: number;
  /** Taxa mensal equivalente à meta × CDI do período — só informativo. */
  taxaAlvoMensal: number;
  metaMultiploCdi: number;
  /** Lance de contemplação efetivamente usado no cálculo (já resolvido a partir
   *  do % quando informado). */
  lanceContemplacao: number;
  /** Fluxo de caixa do que se recebe/paga DEPOIS da aquisição (crédito − parcelas). */
  fluxoSemAquisicao: FluxoCaixa[];
  /** Soma nominal do fluxo acima (sem desconto) — o ganho "de bolso" do negócio,
   *  tratado como se fosse recebido de uma vez ao fim das parcelas restantes. */
  valorNominalTotal: number;
  /** Preço máximo a pagar hoje pra que o retorno bata a meta. null se o negócio
   *  já é ruim (valorNominalTotal ≤ 0) independente do preço. */
  precoJusto: number | null;
  precoAvaliado: number | null;
  retorno: MetricasRetorno | null;
  avisos: string[];
}

export function precificarAtivaContemplada(
  entrada: EntradaPrecificacaoAtivaContemplada,
): ResultadoPrecificacaoAtivaContemplada {
  const credito = n(entrada.creditoAtual);
  const parcela = n(entrada.parcelaMensal);
  const parcelasRestantes = Math.max(0, Math.trunc(entrada.parcelasRestantes));
  const taxaTransferencia = n(entrada.taxaTransferencia);
  const lanceContemplacao =
    entrada.percentualLanceContemplacao != null
      ? round2((credito * n(entrada.percentualLanceContemplacao)) / 100)
      : n(entrada.lanceContemplacao);
  const meta =
    entrada.metaMultiploCdi == null
      ? PARAMETROS.metaMultiploCdiPadrao
      : n(entrada.metaMultiploCdi);

  const cdiAnual = n(entrada.curva.cdiAnual);
  const taxaCurva = interpolarCurva(entrada.curva.pontos ?? [], parcelasRestantes);
  const taxaParaCdi = taxaCurva ?? cdiAnual;
  const cdiAcumuladoPeriodo = round4(taxaAcumulada(taxaParaCdi, parcelasRestantes));

  const fluxoSemAquisicao: FluxoCaixa[] = [
    { meses: 0, valor: round2(credito - taxaTransferencia - lanceContemplacao) },
    ...Array.from({ length: parcelasRestantes }, (_, i) => ({
      meses: i + 1,
      valor: round2(-parcela),
    })),
  ];

  const valorNominalTotal = round2(
    fluxoSemAquisicao.reduce((acc, f) => acc + f.valor, 0),
  );

  // Só informativo: a taxa mensal que, composta por `parcelasRestantes` meses,
  // dá exatamente meta × CDI do período.
  const retornoAlvoPeriodo = meta * cdiAcumuladoPeriodo;
  const taxaAlvoMensal = round4(
    parcelasRestantes > 0 ? Math.pow(1 + retornoAlvoPeriodo, 1 / parcelasRestantes) - 1 : 0,
  );

  const pj = calcularPrecoJusto({
    resgate: valorNominalTotal,
    metaMultiploCdi: meta,
    cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
  });

  const precoAvaliado = entrada.precoOfertado != null ? n(entrada.precoOfertado) : pj;

  const retorno =
    precoAvaliado != null && precoAvaliado > 0
      ? metricasRetorno({
          preco: precoAvaliado,
          resgate: valorNominalTotal,
          meses: parcelasRestantes,
          cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
        })
      : null;

  const avisos: string[] = [];
  if (parcelasRestantes <= 0)
    avisos.push("Sem parcelas restantes informadas — não há fluxo futuro a descontar.");
  if (credito <= 0) avisos.push("Informe o crédito recebido na contemplação.");
  if (parcela <= 0 && parcelasRestantes > 0)
    avisos.push("Parcela mensal zerada com parcelas restantes > 0 — confira os dados.");
  if (taxaCurva == null)
    avisos.push("Curva de juros vazia — CDI acumulado usa o CDI corrente.");
  if (valorNominalTotal <= 0)
    avisos.push(
      "As parcelas restantes somam mais que o crédito — negócio ruim independente do preço.",
    );
  if (retorno?.multiploCdi != null && retorno.multiploCdi < meta)
    avisos.push(
      `No preço avaliado o retorno é ${retorno.multiploCdi.toFixed(
        2,
      )}× o CDI, abaixo da meta de ${meta}×.`,
    );

  return {
    motor: "ATIVA",
    parcelasRestantes,
    cdiAnual: round4(cdiAnual),
    taxaCurvaNoPrazo: taxaCurva == null ? null : round4(taxaCurva),
    cdiAcumuladoPeriodo,
    taxaAlvoMensal,
    metaMultiploCdi: meta,
    lanceContemplacao,
    fluxoSemAquisicao,
    valorNominalTotal,
    precoJusto: pj,
    precoAvaliado,
    retorno,
    avisos,
  };
}
