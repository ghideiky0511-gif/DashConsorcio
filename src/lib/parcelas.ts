// Regras puras de cronograma de parcelas. Sem Prisma, sem I/O — cobertas por testes.

export type ParcelaGerada = {
  numero: number;
  competencia: Date; // 1º dia do mês, UTC
  vencimento: Date; // UTC
  valorPrevisto: number;
};

/**
 * Gera o cronograma das parcelas AINDA NÃO cadastradas de uma carta: de
 * `parcelasQuitadas + 1` até `parcelasTotais`, vencendo todo mês no
 * `diaVencimento`, a partir do próximo vencimento igual ou posterior a
 * `dataReferencia` (normalmente "hoje" ou a data da compra).
 *
 * Dias de vencimento que não existem no mês (ex.: 31 em fevereiro) caem no
 * último dia do mês.
 */
export function gerarCronogramaParcelas(input: {
  parcelasTotais: number;
  parcelasQuitadas: number;
  parcelaValor: number;
  diaVencimento: number;
  dataReferencia: Date;
}): ParcelaGerada[] {
  const { parcelasTotais, parcelasQuitadas, parcelaValor, diaVencimento, dataReferencia } =
    input;

  const restantes = parcelasTotais - parcelasQuitadas;
  if (restantes <= 0) return [];

  const ano = dataReferencia.getUTCFullYear();
  let mes = dataReferencia.getUTCMonth(); // 0-based

  const diaNoMes = (a: number, m: number) => {
    const ultimoDia = new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
    return Math.min(diaVencimento, ultimoDia);
  };

  // Se o vencimento deste mês já passou, começa no mês seguinte.
  const primeiroVencimento = new Date(Date.UTC(ano, mes, diaNoMes(ano, mes)));
  if (primeiroVencimento < dataReferencia) {
    mes += 1;
  }

  const parcelas: ParcelaGerada[] = [];
  for (let i = 0; i < restantes; i++) {
    const a = ano + Math.floor((mes + i) / 12);
    const m = (mes + i) % 12;
    parcelas.push({
      numero: parcelasQuitadas + 1 + i,
      competencia: new Date(Date.UTC(a, m, 1)),
      vencimento: new Date(Date.UTC(a, m, diaNoMes(a, m))),
      valorPrevisto: parcelaValor,
    });
  }
  return parcelas;
}
