import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { custoTotal, lucroPrevisto } from "@/lib/carta";
import { buildWhere, listarCartas, type CartasFiltros } from "@/lib/queries/carteira";
import { tipoBemLabel } from "@/lib/labels";
import {
  StatusConsorcio,
  StatusParcela,
  TipoBem,
  type Prisma,
} from "@/generated/prisma/client";

const num = (v: { toString(): string } | null | undefined) =>
  v == null ? 0 : Number(v.toString());

export type ChartPonto = {
  key: string;
  label: string;
  qtd: number;
  cor?: string | null;
};

export type VisaoGeral = Awaited<ReturnType<typeof getVisaoGeral>>;

export async function getVisaoGeral(filtros: CartasFiltros) {
  const whereFull = buildWhere(filtros);
  const sans = (
    k: "etapaId" | "cessionariaId" | "administradoraId" | "tipoBem",
  ): Prisma.CartaWhereInput => buildWhere({ ...filtros, [k]: undefined });

  const [
    porStatus,
    creditoAgg,
    creditoContempladoAgg,
    compraAgg,
    despesaAgg,
    previsaoAgg,
    encerradas,
    aPagar30,
    atrasadasAgg,
    porEtapa,
    porCessionaria,
    porAdministradora,
    porTipoBem,
    etapasRef,
    cessionariasRef,
    administradorasRef,
    cartasTempo,
    lista,
  ] = await Promise.all([
    prisma.carta.groupBy({
      by: ["statusConsorcio"],
      _count: { _all: true },
      where: whereFull,
    }),
    prisma.carta.aggregate({ _sum: { valorCredito: true }, where: whereFull }),
    prisma.carta.aggregate({
      _sum: { valorCredito: true },
      where: { ...whereFull, contempladaEm: { not: null } },
    }),
    prisma.carta.aggregate({ _sum: { valorCompra: true }, where: whereFull }),
    prisma.despesaCarta.aggregate({
      _sum: { valor: true },
      where: { carta: whereFull },
    }),
    prisma.carta.aggregate({
      _sum: { previsaoResgate: true },
      where: whereFull,
    }),
    prisma.carta.findMany({
      where: {
        AND: [
          whereFull,
          { OR: [{ dataResgate: { not: null } }, { dataRevenda: { not: null } }] },
        ],
      },
      select: {
        valorResgatado: true,
        valorRevenda: true,
        valorCompra: true,
        despesas: { select: { valor: true } },
      },
    }),
    prisma.parcela.aggregate({
      _sum: { valorPrevisto: true },
      _count: { _all: true },
      where: {
        carta: whereFull,
        status: { in: [StatusParcela.PENDENTE, StatusParcela.ATRASADO] },
        vencimento: { gte: new Date(), lte: addDays(new Date(), 30) },
      },
    }),
    prisma.parcela.aggregate({
      _sum: { valorPrevisto: true },
      _count: { _all: true },
      where: {
        carta: whereFull,
        OR: [
          { status: StatusParcela.ATRASADO },
          { status: StatusParcela.PENDENTE, vencimento: { lt: new Date() } },
        ],
      },
    }),
    prisma.carta.groupBy({
      by: ["etapaId"],
      _count: { _all: true },
      where: sans("etapaId"),
    }),
    prisma.carta.groupBy({
      by: ["cessionariaId"],
      _count: { _all: true },
      where: sans("cessionariaId"),
    }),
    prisma.carta.groupBy({
      by: ["administradoraId"],
      _count: { _all: true },
      where: sans("administradoraId"),
    }),
    prisma.carta.groupBy({
      by: ["tipoBem"],
      _count: { _all: true },
      where: sans("tipoBem"),
    }),
    prisma.etapa.findMany({
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true, cor: true },
    }),
    prisma.cessionaria.findMany({ select: { id: true, nome: true } }),
    prisma.administradora.findMany({ select: { id: true, nome: true } }),
    prisma.carta.findMany({
      where: whereFull,
      select: {
        dataCompra: true,
        valorCompra: true,
        valorCredito: true,
        despesas: { select: { valor: true } },
      },
      orderBy: { dataCompra: "asc" },
    }),
    listarCartas(filtros, { paginado: false }),
  ]);

  const ativas =
    porStatus.find((s) => s.statusConsorcio === StatusConsorcio.ATIVA)?._count
      ._all ?? 0;
  const canceladas =
    porStatus.find((s) => s.statusConsorcio === StatusConsorcio.CANCELADA)?._count
      ._all ?? 0;

  const investido = num(compraAgg._sum.valorCompra) + num(despesaAgg._sum.valor);

  const resultadoRealizado = encerradas.reduce((acc, c) => {
    const ct = custoTotal({
      valorCompra: num(c.valorCompra),
      despesas: c.despesas.map((d) => ({ valor: num(d.valor) })),
    });
    return acc + num(c.valorResgatado) + num(c.valorRevenda) - ct;
  }, 0);

  const kpis = {
    totalCartas: ativas + canceladas,
    ativas,
    canceladas,
    creditoTotal: num(creditoAgg._sum.valorCredito),
    creditoContemplado: num(creditoContempladoAgg._sum.valorCredito),
    investido,
    previsaoResgateTotal: num(previsaoAgg._sum.previsaoResgate),
    lucroPrevistoTotal: lucroPrevisto({
      previsaoResgate: num(previsaoAgg._sum.previsaoResgate),
      custoTotal: investido,
    }),
    resultadoRealizado,
    aPagar30: {
      valor: num(aPagar30._sum.valorPrevisto),
      qtd: aPagar30._count._all,
    },
    atrasadas: {
      valor: num(atrasadasAgg._sum.valorPrevisto),
      qtd: atrasadasAgg._count._all,
    },
  };

  const etapas: ChartPonto[] = etapasRef.map((e) => ({
    key: e.id,
    label: e.nome,
    cor: e.cor,
    qtd: porEtapa.find((p) => p.etapaId === e.id)?._count._all ?? 0,
  }));

  const cessionarias: ChartPonto[] = cessionariasRef
    .map((c) => ({
      key: c.id,
      label: c.nome,
      qtd: porCessionaria.find((p) => p.cessionariaId === c.id)?._count._all ?? 0,
    }))
    .filter((c) => c.qtd > 0);

  const administradoras: ChartPonto[] = administradorasRef
    .map((a) => ({
      key: a.id,
      label: a.nome,
      qtd:
        porAdministradora.find((p) => p.administradoraId === a.id)?._count._all ??
        0,
    }))
    .filter((a) => a.qtd > 0);

  const tiposBem: ChartPonto[] = (Object.keys(tipoBemLabel) as TipoBem[])
    .map((t) => ({
      key: t,
      label: tipoBemLabel[t],
      qtd: porTipoBem.find((p) => p.tipoBem === t)?._count._all ?? 0,
    }))
    .filter((t) => t.qtd > 0);

  // Série temporal por mês da compra
  const buckets = new Map<string, { investido: number; credito: number }>();
  for (const c of cartasTempo) {
    if (!c.dataCompra) continue;
    const dc = new Date(c.dataCompra);
    const mes = `${dc.getUTCFullYear()}-${String(dc.getUTCMonth() + 1).padStart(2, "0")}`;
    const ct = custoTotal({
      valorCompra: num(c.valorCompra),
      despesas: c.despesas.map((d) => ({ valor: num(d.valor) })),
    });
    const cur = buckets.get(mes) ?? { investido: 0, credito: 0 };
    cur.investido += ct;
    cur.credito += num(c.valorCredito);
    buckets.set(mes, cur);
  }
  const mesesOrdenados = [...buckets.keys()].sort();
  let acumCredito = 0;
  let acumInvestido = 0;
  const tempo = mesesOrdenados.map((mes) => {
    const b = buckets.get(mes)!;
    acumCredito += b.credito;
    acumInvestido += b.investido;
    const [ano, m] = mes.split("-").map(Number);
    return {
      mes,
      label: format(new Date(ano!, m! - 1, 1), "MMM/yy", { locale: ptBR }),
      investidoMes: Math.round(b.investido),
      creditoAcum: Math.round(acumCredito),
      investidoAcum: Math.round(acumInvestido),
    };
  });

  return {
    kpis,
    charts: { etapas, cessionarias, administradoras, tiposBem, tempo },
    lista: {
      cartas: lista.cartas,
      total: lista.total,
    },
  };
}
