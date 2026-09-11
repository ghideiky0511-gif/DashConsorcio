// Métricas de retorno de uma carta e preço justo por meta de CDI.
// Vale para carta cancelada (paga P hoje, recebe `resgate` no encerramento) e,
// de forma simplificada, para qualquer entrada única / saída única.
// Sem I/O — coberta por testes.

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

export interface EntradaRetorno {
  /** Quanto se paga hoje pela carta, em R$. */
  preco: Num;
  /** Quanto se recebe no encerramento do grupo, em R$. */
  resgate: Num;
  /** Meses entre o pagamento e o recebimento. */
  meses: number;
  /** CDI acumulado projetado no mesmo período, em fração (0,32 = 32%). */
  cdiAcumuladoNoPeriodo?: Num;
}

export interface MetricasRetorno {
  lucro: number;
  /** Retorno do período, em fração. */
  retornoTotal: number;
  /** Retorno equivalente ao mês, em fração. */
  retornoMensal: number;
  /** Retorno equivalente ao ano, em fração. */
  retornoAnual: number;
  /** retornoTotal ÷ CDI acumulado do período. null se o CDI não foi informado. */
  multiploCdi: number | null;
  cdiAcumuladoNoPeriodo: number | null;
}

/** Métricas de retorno para um preço já definido. null se faltar base. */
export function metricasRetorno(entrada: EntradaRetorno): MetricasRetorno | null {
  const preco = n(entrada.preco);
  const resgate = n(entrada.resgate);
  const meses = Math.trunc(entrada.meses);
  if (preco <= 0 || resgate <= 0 || meses <= 0) return null;

  const multiplo = resgate / preco;
  const retornoTotal = multiplo - 1;
  const retornoMensal = Math.pow(multiplo, 1 / meses) - 1;
  const retornoAnual = Math.pow(1 + retornoMensal, 12) - 1;

  const cdi =
    entrada.cdiAcumuladoNoPeriodo == null
      ? null
      : n(entrada.cdiAcumuladoNoPeriodo);
  const multiploCdi = cdi != null && cdi > 0 ? retornoTotal / cdi : null;

  return {
    lucro: round2(resgate - preco),
    retornoTotal: round4(retornoTotal),
    retornoMensal: round4(retornoMensal),
    retornoAnual: round4(retornoAnual),
    multiploCdi: multiploCdi == null ? null : round2(multiploCdi),
    cdiAcumuladoNoPeriodo: cdi,
  };
}

export interface EntradaPrecoJusto {
  /** Quanto se recebe no encerramento, em R$. */
  resgate: Num;
  /** Múltiplo do CDI exigido no período (ex.: 2 = precisa render 2× o CDI). */
  metaMultiploCdi: Num;
  /** CDI acumulado projetado no período, em fração. */
  cdiAcumuladoNoPeriodo: Num;
}

/**
 * Maior preço a pagar hoje para que o retorno do período seja ≥ meta × CDI.
 *   resgate / preço − 1 = meta × cdiAcumulado
 * null quando não há base de cálculo.
 */
export function precoJusto(entrada: EntradaPrecoJusto): number | null {
  const resgate = n(entrada.resgate);
  const alvo = n(entrada.metaMultiploCdi) * n(entrada.cdiAcumuladoNoPeriodo);
  if (resgate <= 0 || 1 + alvo <= 0) return null;
  return round2(resgate / (1 + alvo));
}
