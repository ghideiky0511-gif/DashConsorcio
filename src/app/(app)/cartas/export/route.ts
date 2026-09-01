import { getUser } from "@/lib/auth";
import { listarCartas, parseFiltros } from "@/lib/queries/carteira";

const COLS = [
  "Código",
  "Cessionária",
  "Administradora",
  "Grupo / Cota",
  "Etapa",
  "Status",
  "Crédito atual",
  "Custo total",
  "Previsão de resgate",
  "% lucro previsto",
  "Contemplação",
];

function brNumber(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function brDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const { searchParams } = new URL(request.url);
  const filtros = parseFiltros(Object.fromEntries(searchParams.entries()));
  const { cartas } = await listarCartas(filtros, { paginado: false });

  const linhas = cartas.map((c) =>
    [
      c.codigo,
      c.cessionaria,
      c.administradora,
      c.grupoCota,
      c.etapa,
      c.status === "ATIVA" ? "Ativa" : "Cancelada",
      brNumber(c.valorCredito),
      brNumber(c.custoTotal),
      c.previsaoResgate == null ? "" : brNumber(c.previsaoResgate),
      c.percentualLucro == null ? "" : brNumber(c.percentualLucro * 100),
      brDate(c.contempladaEm),
    ]
      .map((v) => csvCell(String(v)))
      .join(";"),
  );

  const body = "﻿" + [COLS.map(csvCell).join(";"), ...linhas].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cartas-${stamp}.csv"`,
    },
  });
}
