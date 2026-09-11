// Meses entre duas datas do jeito que as calculadoras de mercado (MDV, Objetiva)
// contam: as duas pontas são truncadas para o 1º dia do mês e o resultado nunca
// é negativo. Pura — coberta por testes.

type Entrada = Date | string;

function paraData(v: Entrada): Date {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) throw new Error("data inválida");
    return v;
  }
  // "AAAA-MM-DD" (input type=date) interpretado como data local, sem fuso.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`data inválida: ${String(v)}`);
  return d;
}

/**
 * Nº de meses de `de` até `ate` (ex.: encerramento do grupo menos hoje).
 * 12 × anos + meses, com o dia fixado no 1º; mínimo 0.
 */
export function mesesEntre(de: Entrada, ate: Entrada): number {
  const a = paraData(de);
  const b = paraData(ate);
  const total =
    12 * (b.getFullYear() - a.getFullYear()) + (b.getMonth() - a.getMonth());
  return Math.max(0, total);
}
