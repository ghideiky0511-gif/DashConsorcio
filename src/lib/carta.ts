// Regras puras de negócio da Carta. Sem Prisma, sem I/O — cobertas por testes.

type Num = number | string | { toString(): string } | null | undefined;

function n(value: Num): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Custo TOTAL da Cota = Custo da Aquisição + Σ despesas. */
export function custoTotal(input: {
  valorCompra: Num;
  despesas?: Array<{ valor: Num }> | Num[];
}): number {
  const compra = n(input.valorCompra);
  const despesas = (input.despesas ?? []) as Array<{ valor: Num } | Num>;
  const soma = despesas.reduce<number>((acc, d) => {
    const valor = typeof d === "object" && d !== null && "valor" in d ? d.valor : (d as Num);
    return acc + n(valor);
  }, 0);
  return round2(compra + soma);
}

/**
 * Previsão % Lucro/Total = (Previsão de Resgate − Custo Total) / Custo Total.
 * Retorna fração (0,25 = 25%) ou null quando não há base de cálculo.
 */
export function previsaoPercentualLucro(input: {
  previsaoResgate: Num;
  custoTotal: Num;
}): number | null {
  const custo = n(input.custoTotal);
  if (custo <= 0) return null;
  const previsao = n(input.previsaoResgate);
  if (previsao <= 0) return null;
  return round4((previsao - custo) / custo);
}

/** Lucro previsto em R$ (pode ser negativo). */
export function lucroPrevisto(input: {
  previsaoResgate: Num;
  custoTotal: Num;
}): number {
  return round2(n(input.previsaoResgate) - n(input.custoTotal));
}

/**
 * Resultado realizado da carta = (valor resgatado + valor de revenda) − custo total.
 * Só faz sentido para cartas já encerradas; retorna null se nada foi recebido.
 */
export function resultadoRealizado(input: {
  valorResgatado?: Num;
  valorRevenda?: Num;
  custoTotal: Num;
}): number | null {
  const recebido = n(input.valorResgatado) + n(input.valorRevenda);
  if (recebido <= 0) return null;
  return round2(recebido - n(input.custoTotal));
}

/**
 * Etapa do pipeline a partir das datas-marco preenchidas.
 * Recebe pares { etapaOrdem, data }; devolve a maior `etapaOrdem` com data preenchida,
 * ou `fallbackOrdem` (padrão: menor ordem informada) quando nenhuma data existe.
 */
export function etapaPorDatasMarco(
  marcos: Array<{ etapaOrdem: number; data: Date | string | null | undefined }>,
  fallbackOrdem?: number,
): number {
  const ordensDisponiveis = marcos.map((m) => m.etapaOrdem);
  const fallback =
    fallbackOrdem ?? (ordensDisponiveis.length ? Math.min(...ordensDisponiveis) : 1);

  const alcancadas = marcos
    .filter((m) => {
      if (!m.data) return false;
      const d = m.data instanceof Date ? m.data : new Date(m.data);
      return !Number.isNaN(d.getTime());
    })
    .map((m) => m.etapaOrdem);

  return alcancadas.length ? Math.max(...alcancadas) : fallback;
}

function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
