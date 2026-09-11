// Reprodução exata das calculadoras públicas de carta CANCELADA usadas como
// referência de mercado: MDV (mdvconsorcios.com.br/calculadora) e Objetiva
// (objetivaconsorcio.com.br). Fórmulas extraídas do JS dos sites e conferidas
// contra 3 propostas reais — ver docs/precificacao/formulas-benchmarks.md.
// Todos os números de negócio vêm de `../parametros.ts` — não hard-code aqui.
// Sem I/O — cobertas por testes.

import { PARAMETROS } from "../parametros";

type Num = number | string | null | undefined;

function n(value: Num): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function arredondar(value: number, multiplo: number): number {
  return Math.round(value / multiplo) * multiplo;
}

export interface EntradaBenchmark {
  /** Crédito atual da carta (valor do bem), em R$. */
  credito: Num;
  /** Percentual já pago do fundo comum, em % (ex.: 6.792). */
  percentualPago: Num;
  /** Meses do "hoje" até o encerramento do grupo — use `mesesEntre`. */
  meses: number;
}

export interface ResultadoBenchmark {
  fonte: "MDV" | "Objetiva";
  /** Recebível = crédito × %pago (base das duas fórmulas). */
  recebivel: number;
  /** Fração da proposta sobre o recebível para o prazo informado. */
  fator: number;
  meses: number;
  /** Proposta final, arredondada a múltiplo de R$ 1.000. 0 quando recusada. */
  valor: number;
  recusado: boolean;
  motivo?: string;
}

/**
 * Calculadora da MDV.
 *  fator = meses ≤ mesesLimiteFatorBase ? fatorBase − quedaPorMes×meses : fatorMinimo
 *  proposta = recebível × fator, arredondada; recusa se abaixo do mínimo.
 * O site limita o %pago a 2 casas decimais no input — replicado aqui.
 */
export function propostaMdv(entrada: EntradaBenchmark): ResultadoBenchmark {
  const p = PARAMETROS.mercado.mdv;
  const credito = n(entrada.credito);
  const pct = round2(n(entrada.percentualPago));
  const meses = Math.max(0, Math.trunc(entrada.meses));

  const recebivel = round2((credito * pct) / 100);
  const fator =
    meses <= p.mesesLimiteFatorBase ? p.fatorBase - p.quedaPorMes * meses : p.fatorMinimo;
  const bruto = Math.max(0, (credito * pct * fator) / 100);
  const valor = arredondar(bruto, p.arredondamento);
  const recusado = valor < p.propostaMinima;

  return {
    fonte: "MDV",
    recebivel,
    fator: round4(fator),
    meses,
    valor: recusado ? 0 : valor,
    recusado,
    motivo: recusado
      ? `Proposta abaixo do mínimo de R$ ${p.propostaMinima.toLocaleString("pt-BR")}`
      : undefined,
  };
}

/**
 * Calculadora da Objetiva.
 *  recusa se recebível < recebivelMinimo.
 *  fator = meses na faixaBase: fatorBase − quedaPorMes×meses
 *          meses na faixaIntermediaria: fator fixo
 *          meses acima: fatorLongoPrazo
 *  proposta = recebível × fator, arredondada.
 *  recusa se lucro (recebível − proposta) < lucroMinimo ou prazo fora de [mín, máx].
 */
export function propostaObjetiva(entrada: EntradaBenchmark): ResultadoBenchmark {
  const p = PARAMETROS.mercado.objetiva;
  const credito = n(entrada.credito);
  const pct = n(entrada.percentualPago);
  const meses = Math.max(0, Math.trunc(entrada.meses));

  const recebivel = round2((credito * pct) / 100);

  let fator = 0;
  if (recebivel >= p.recebivelMinimo) {
    if (meses >= p.faixaBase.mesesMin && meses <= p.faixaBase.mesesMax) {
      fator = p.fatorBase - p.quedaPorMes * meses;
    } else if (
      meses >= p.faixaIntermediaria.mesesMin &&
      meses <= p.faixaIntermediaria.mesesMax
    ) {
      fator = p.faixaIntermediaria.fator;
    } else {
      fator = p.fatorLongoPrazo;
    }
  }

  const bruto = Math.max(0, recebivel * fator);
  const lucro = recebivel - bruto;

  let motivo: string | undefined;
  if (recebivel < p.recebivelMinimo)
    motivo = `Recebível abaixo de R$ ${p.recebivelMinimo.toLocaleString("pt-BR")}`;
  else if (lucro < p.lucroMinimo)
    motivo = `Lucro (recebível − proposta) abaixo de R$ ${p.lucroMinimo.toLocaleString("pt-BR")}`;
  else if (meses <= p.prazoMinimoMeses || meses > p.prazoMaximoMeses)
    motivo = `Prazo fora da faixa de ${p.prazoMinimoMeses} a ${p.prazoMaximoMeses} meses`;

  const recusado = motivo != null;

  return {
    fonte: "Objetiva",
    recebivel,
    fator: round4(fator),
    meses,
    valor: recusado ? 0 : arredondar(bruto, p.arredondamento),
    recusado,
    motivo,
  };
}

/**
 * Proxy da planilha interna da SSA para "valor previsto para resgate":
 * crédito × %pago × fatorRetido (deságio fixo). É aproximação — quando o
 * extrato traz o fundo comum efetivamente pago, use aquele valor no lugar deste.
 */
export function resgateProxySsa(credito: Num, percentualPago: Num): number {
  return round2(
    (n(credito) * n(percentualPago) * PARAMETROS.proxyResgateSsa.fatorRetido) / 100,
  );
}
