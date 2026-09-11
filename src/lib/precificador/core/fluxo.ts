// Motor financeiro genérico: valor presente e TIR de um fluxo de caixa datado em
// meses. Base do motor da carta ATIVA (que é um fluxo de várias parcelas, ao
// contrário da carta cancelada, que é só entrada hoje / saída única no futuro).
// Pura — coberta por testes.

export interface FluxoCaixa {
  /** Meses a partir de hoje (0 = agora). */
  meses: number;
  /** Negativo = saída de caixa (você paga); positivo = entrada (você recebe). */
  valor: number;
}

/** Valor presente do fluxo, descontado por `taxaMensal` (fração ao mês). */
export function valorPresente(taxaMensal: number, fluxos: FluxoCaixa[]): number {
  return fluxos.reduce(
    (acc, f) => acc + f.valor / Math.pow(1 + taxaMensal, f.meses),
    0,
  );
}

export interface OpcoesTir {
  min?: number;
  max?: number;
  tolerancia?: number;
  iteracoesMax?: number;
}

/**
 * TIR mensal do fluxo (taxa que zera o valor presente), por bisseção.
 * null se o fluxo não tiver troca de sinal (não existe TIR bem definida).
 */
export function tirMensal(fluxos: FluxoCaixa[], opcoes: OpcoesTir = {}): number | null {
  const min = opcoes.min ?? -0.99;
  const max = opcoes.max ?? 10; // 1000% a.m. — teto generoso, cobre qualquer caso plausível
  const tolerancia = opcoes.tolerancia ?? 1e-9;
  const iteracoesMax = opcoes.iteracoesMax ?? 200;

  let lo = min;
  let hi = max;
  let vLo = valorPresente(lo, fluxos);
  const vHi = valorPresente(hi, fluxos);

  if (Math.abs(vLo) < tolerancia) return lo;
  if (Math.abs(vHi) < tolerancia) return hi;
  if (vLo > 0 === vHi > 0) return null; // sem troca de sinal no intervalo

  for (let i = 0; i < iteracoesMax; i++) {
    const mid = (lo + hi) / 2;
    const vMid = valorPresente(mid, fluxos);
    if (Math.abs(vMid) < tolerancia || hi - lo < tolerancia) return mid;
    if (vMid > 0 === vLo > 0) {
      lo = mid;
      vLo = vMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
