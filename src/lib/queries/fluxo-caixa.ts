import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { StatusParcela, TipoMovimento, type Prisma } from "@/generated/prisma/client";

function n(v: Prisma.Decimal | number | null | undefined): number {
  return v == null ? 0 : Number(v.toString());
}

export type ParcelaEmAberto = {
  id: string;
  cartaId: string;
  cartaCodigo: string;
  numero: number;
  vencimento: Date;
  valorPrevisto: number;
  atrasada: boolean;
};

export type ResumoCaixa = {
  saldoAtual: number;
  livreParaComprar: number;
  pagoMes: number;
  aPagarMes: { valor: number; qtd: number };
  aPagarMesAtrasado: { valor: number; qtd: number };
  /** Todas as parcelas pendentes/atrasadas nos próximos 12 meses, por vencimento. */
  parcelasEmAberto: ParcelaEmAberto[];
  /** Só as parcelas pendentes/atrasadas com vencimento no mês corrente. */
  parcelasMes: ParcelaEmAberto[];
  projecao12Meses: { mes: string; label: string; valor: number; qtd: number }[];
};

export async function getResumoCaixa(): Promise<ResumoCaixa> {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  const inicioProjecao = startOfMonth(hoje);
  const fimProjecao = endOfMonth(addMonths(hoje, 11));

  const [config, movimentosAgg, pagoMesAgg, pendentesMesAgg, atrasadasAgg, parcelasAbertas] =
    await Promise.all([
      prisma.configCaixa.findUnique({ where: { id: "singleton" } }),
      prisma.movimentoCaixa.groupBy({ by: ["tipo"], _sum: { valor: true } }),
      prisma.movimentoCaixa.aggregate({
        _sum: { valor: true },
        where: { tipo: TipoMovimento.SAIDA, data: { gte: inicioMes, lte: fimMes } },
      }),
      prisma.parcela.aggregate({
        _sum: { valorPrevisto: true },
        _count: { _all: true },
        where: {
          status: { in: [StatusParcela.PENDENTE, StatusParcela.ATRASADO] },
          vencimento: { gte: inicioMes, lte: fimMes },
        },
      }),
      prisma.parcela.aggregate({
        _sum: { valorPrevisto: true },
        _count: { _all: true },
        where: {
          OR: [
            { status: StatusParcela.ATRASADO },
            { status: StatusParcela.PENDENTE, vencimento: { lt: hoje } },
          ],
        },
      }),
      prisma.parcela.findMany({
        where: {
          status: { in: [StatusParcela.PENDENTE, StatusParcela.ATRASADO] },
          vencimento: { lte: fimProjecao },
        },
        select: {
          id: true,
          cartaId: true,
          numero: true,
          vencimento: true,
          valorPrevisto: true,
          status: true,
          carta: { select: { codigo: true } },
        },
        orderBy: { vencimento: "asc" },
      }),
    ]);

  const saldoInicial = n(config?.saldoInicial);
  const entrada = n(movimentosAgg.find((m) => m.tipo === TipoMovimento.ENTRADA)?._sum.valor);
  const saida = n(movimentosAgg.find((m) => m.tipo === TipoMovimento.SAIDA)?._sum.valor);
  const saldoAtual = saldoInicial + entrada - saida;

  const aPagarMes = {
    valor: n(pendentesMesAgg._sum.valorPrevisto),
    qtd: pendentesMesAgg._count._all,
  };
  const aPagarMesAtrasado = {
    valor: n(atrasadasAgg._sum.valorPrevisto),
    qtd: atrasadasAgg._count._all,
  };

  const parcelasEmAberto: ParcelaEmAberto[] = parcelasAbertas.map((p) => ({
    id: p.id,
    cartaId: p.cartaId,
    cartaCodigo: p.carta.codigo,
    numero: p.numero,
    vencimento: p.vencimento,
    valorPrevisto: n(p.valorPrevisto),
    atrasada: p.status === StatusParcela.ATRASADO || p.vencimento < hoje,
  }));
  const parcelasMes = parcelasEmAberto.filter(
    (p) => p.vencimento >= inicioMes && p.vencimento <= fimMes,
  );

  // Projeção 12 meses: soma das parcelas pendentes por mês de vencimento.
  const buckets = new Map<string, { valor: number; qtd: number }>();
  for (const p of parcelasAbertas) {
    const key = `${p.vencimento.getUTCFullYear()}-${String(p.vencimento.getUTCMonth() + 1).padStart(2, "0")}`;
    const cur = buckets.get(key) ?? { valor: 0, qtd: 0 };
    cur.valor += n(p.valorPrevisto);
    cur.qtd += 1;
    buckets.set(key, cur);
  }
  const projecao12Meses = Array.from({ length: 12 }, (_, i) => {
    const ref = addMonths(inicioProjecao, i);
    const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key) ?? { valor: 0, qtd: 0 };
    return {
      mes: key,
      label: format(ref, "MMM/yy", { locale: ptBR }),
      valor: Math.round(b.valor * 100) / 100,
      qtd: b.qtd,
    };
  });

  return {
    saldoAtual: Math.round(saldoAtual * 100) / 100,
    livreParaComprar: Math.round((saldoAtual - aPagarMes.valor) * 100) / 100,
    pagoMes: n(pagoMesAgg._sum.valor),
    aPagarMes,
    aPagarMesAtrasado,
    parcelasEmAberto,
    parcelasMes,
    projecao12Meses,
  };
}
