// Matemática de juros e projeção do resgate. Pura — coberta por testes.

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

/** Taxa anual composta acumulada em `meses`: (1 + taxaAnual)^(meses/12) − 1. */
export function taxaAcumulada(taxaAnual: Num, meses: number): number {
  const m = Math.max(0, meses);
  return Math.pow(1 + n(taxaAnual), m / 12) - 1;
}

/** CDI acumulado no período, em fração. Alias de `taxaAcumulada`. */
export function cdiAcumulado(cdiAnual: Num, meses: number): number {
  return taxaAcumulada(cdiAnual, meses);
}

export interface PontoCurva {
  /** Prazo em meses a partir de hoje. */
  meses: number;
  /** Taxa anual (fração) precificada para esse prazo. */
  taxaAnual: number;
}

/**
 * Taxa anual interpolada linearmente na curva para o prazo `meses`.
 * A curva não precisa vir ordenada. Fora das pontas, devolve a ponta mais próxima
 * (sem extrapolar). null se a curva estiver vazia.
 */
export function interpolarCurva(
  pontos: PontoCurva[],
  meses: number,
): number | null {
  const pts = pontos
    .filter((p) => Number.isFinite(p.meses) && Number.isFinite(p.taxaAnual))
    .sort((a, b) => a.meses - b.meses);
  if (pts.length === 0) return null;
  if (meses <= pts[0].meses) return pts[0].taxaAnual;
  if (meses >= pts[pts.length - 1].meses) return pts[pts.length - 1].taxaAnual;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (meses <= b.meses) {
      const t = (meses - a.meses) / (b.meses - a.meses);
      return a.taxaAnual + t * (b.taxaAnual - a.taxaAnual);
    }
  }
  return pts[pts.length - 1].taxaAnual;
}

export interface EntradaResgate {
  /** Base a corrigir: fundo comum efetivamente pago (ou proxy). */
  base: Num;
  /** Índice de correção do grupo projetado ao ano, em fração. */
  indiceCorrecaoAnual: Num;
  /** Meses até o encerramento do grupo. */
  meses: number;
  /** Multa contratual retida do excluído, em fração (0 quando não há). */
  multaPct?: Num;
  /** false = a administradora devolve o valor nominal, sem correção. */
  corrigido?: boolean;
}

/**
 * Resgate projetado: base corrigida pelo índice do grupo até o encerramento,
 * menos a multa de exclusão.
 */
export function projetarResgate(entrada: EntradaResgate): number {
  const base = n(entrada.base);
  if (base <= 0) return 0;
  const fatorCorrecao =
    entrada.corrigido === false
      ? 1
      : Math.pow(1 + n(entrada.indiceCorrecaoAnual), Math.max(0, entrada.meses) / 12);
  const multa = Math.min(Math.max(n(entrada.multaPct), 0), 1);
  return round2(base * fatorCorrecao * (1 - multa));
}
