import { prisma } from "@/lib/db";
import { custoTotal, previsaoPercentualLucro } from "@/lib/carta";
import {
  StatusConsorcio,
  TipoBem,
  TipoSaida,
  type Prisma,
} from "@/generated/prisma/client";

export const PAGE_SIZE = 20;

const SORT_FIELDS = {
  codigo: "codigo",
  valorCredito: "valorCredito",
  previsaoResgate: "previsaoResgate",
  contempladaEm: "contempladaEm",
  dataCompra: "dataCompra",
} as const;

export type SortField = keyof typeof SORT_FIELDS;

export type CartasFiltros = {
  q?: string;
  cessionariaId?: string;
  administradoraId?: string;
  etapaId?: string;
  status?: StatusConsorcio;
  tipoBem?: TipoBem;
  tipoSaida?: TipoSaida;
  sort: SortField;
  dir: "asc" | "desc";
  page: number;
};

function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}

/** Converte os searchParams da rota em filtros tipados e saneados. */
export function parseFiltros(
  sp: Record<string, string | string[] | undefined>,
): CartasFiltros {
  const enumOf = <T extends Record<string, string>>(
    e: T,
    v: string | undefined,
  ): T[keyof T] | undefined =>
    v && Object.values(e).includes(v) ? (v as T[keyof T]) : undefined;

  const sortRaw = str(sp.sort);
  const sort: SortField =
    sortRaw && sortRaw in SORT_FIELDS ? (sortRaw as SortField) : "codigo";

  const pageRaw = Number.parseInt(str(sp.page) ?? "1", 10);

  return {
    q: str(sp.q),
    cessionariaId: str(sp.cessionaria),
    administradoraId: str(sp.adm),
    etapaId: str(sp.etapa),
    status: enumOf(StatusConsorcio, str(sp.status)),
    tipoBem: enumOf(TipoBem, str(sp.tipoBem)),
    tipoSaida: enumOf(TipoSaida, str(sp.saida)),
    sort,
    dir: str(sp.dir) === "desc" ? "desc" : "asc",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function buildWhere(f: CartasFiltros): Prisma.CartaWhereInput {
  return {
    ...(f.q && {
      OR: [
        { codigo: { contains: f.q, mode: "insensitive" } },
        { grupo: { contains: f.q, mode: "insensitive" } },
        { cota: { contains: f.q, mode: "insensitive" } },
        { contrato: { contains: f.q, mode: "insensitive" } },
        {
          contrapartes: {
            some: { nome: { contains: f.q, mode: "insensitive" } },
          },
        },
      ],
    }),
    ...(f.cessionariaId && { cessionariaId: f.cessionariaId }),
    ...(f.administradoraId && { administradoraId: f.administradoraId }),
    ...(f.etapaId && { etapaId: f.etapaId }),
    ...(f.status && { statusConsorcio: f.status }),
    ...(f.tipoBem && { tipoBem: f.tipoBem }),
    ...(f.tipoSaida && { tipoSaida: f.tipoSaida }),
  };
}

const cartaSelect = {
  id: true,
  codigo: true,
  grupo: true,
  cota: true,
  statusConsorcio: true,
  tipoBem: true,
  tipoSaida: true,
  valorCredito: true,
  valorCompra: true,
  previsaoResgate: true,
  contempladaEm: true,
  cessionaria: { select: { nome: true } },
  administradora: { select: { nome: true } },
  etapa: { select: { nome: true, cor: true } },
  despesas: { select: { valor: true } },
} satisfies Prisma.CartaSelect;

export type CartaLista = {
  id: string;
  codigo: string;
  grupoCota: string;
  cessionaria: string;
  administradora: string;
  etapa: string;
  etapaCor: string | null;
  status: StatusConsorcio;
  valorCredito: number;
  custoTotal: number;
  previsaoResgate: number | null;
  percentualLucro: number | null;
  contempladaEm: Date | null;
};

function toNumber(v: Prisma.Decimal | number | null): number {
  return v == null ? 0 : Number(v.toString());
}

export async function listarCartas(
  f: CartasFiltros,
  opts: { paginado?: boolean } = {},
) {
  const where = buildWhere(f);
  const paginado = opts.paginado ?? true;

  const [rows, total] = await Promise.all([
    prisma.carta.findMany({
      where,
      select: cartaSelect,
      orderBy: [{ [SORT_FIELDS[f.sort]]: f.dir }, { codigo: "asc" }],
      ...(paginado
        ? { skip: (f.page - 1) * PAGE_SIZE, take: PAGE_SIZE }
        : {}),
    }),
    prisma.carta.count({ where }),
  ]);

  const cartas: CartaLista[] = rows.map((c) => {
    const ct = custoTotal({
      valorCompra: toNumber(c.valorCompra),
      despesas: c.despesas.map((d) => ({ valor: toNumber(d.valor) })),
    });
    const prev = c.previsaoResgate == null ? null : toNumber(c.previsaoResgate);
    return {
      id: c.id,
      codigo: c.codigo,
      grupoCota: `${c.grupo} / ${c.cota}`,
      cessionaria: c.cessionaria.nome,
      administradora: c.administradora.nome,
      etapa: c.etapa.nome,
      etapaCor: c.etapa.cor,
      status: c.statusConsorcio,
      valorCredito: toNumber(c.valorCredito),
      custoTotal: ct,
      previsaoResgate: prev,
      percentualLucro:
        prev == null
          ? null
          : previsaoPercentualLucro({ previsaoResgate: prev, custoTotal: ct }),
      contempladaEm: c.contempladaEm,
    };
  });

  return {
    cartas,
    total,
    totalPaginas: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Opções para os selects de filtro. */
export async function getFiltroOpcoes() {
  const [cessionarias, administradoras, etapas] = await Promise.all([
    prisma.cessionaria.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.administradora.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.etapa.findMany({
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true },
    }),
  ]);
  return { cessionarias, administradoras, etapas };
}
