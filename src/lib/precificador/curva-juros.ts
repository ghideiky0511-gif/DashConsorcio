// Coleta das taxas de juros usadas na precificação e persistência de um snapshot
// diário (para o cálculo ser reproduzível depois). Faz I/O — não tem teste unitário;
// a matemática que consome estes dados está em `juros.ts` (essa sim, testada).

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { mesesEntre } from "./core/tempo";
import type { PontoCurva } from "./core/juros";
import { PARAMETROS } from "./parametros";

const TIMEOUT_MS = PARAMETROS.curvaJuros.timeoutMs;

export interface CurvaJuros {
  fonte: string;
  /** CDI a.a. corrente, em fração. */
  cdiAnual: number;
  /** Projeção de IPCA para os próximos 12 meses (Focus), em fração. null se indisponível. */
  ipcaProjAnual: number | null;
  /** Curva a termo: taxa anual projetada por horizonte (meses), ordenada. */
  pontos: PontoCurva[];
}

async function getJson<T = unknown>(url: string): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** BCB SGS série 4389 — CDI anualizado base 252, em % a.a. */
async function buscarCdiAnual(): Promise<number> {
  const j = await getJson<Array<{ valor: string }>>(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${PARAMETROS.curvaJuros.seriesBcb.cdiAnualizado}/dados/ultimos/1?formato=json`,
  );
  const v = Number(j?.[0]?.valor);
  if (!Number.isFinite(v)) throw new Error("CDI (SGS 4389) sem valor");
  return v / 100;
}

/** BCB Focus — expectativa de IPCA para os próximos 12 meses, em %. */
async function buscarIpcaProjAnual(): Promise<number | null> {
  try {
    const filtro = "Indicador eq 'IPCA' and Suavizada eq 'N'";
    const url =
      "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/" +
      "ExpectativasMercadoInflacao12Meses?%24top=1&%24orderby=Data%20desc&%24format=json&%24filter=" +
      encodeURIComponent(filtro);
    const j = await getJson<{ value: Array<{ Media: number }> }>(url);
    const v = Number(j?.value?.[0]?.Media);
    return Number.isFinite(v) ? v / 100 : null;
  } catch {
    return null;
  }
}

/**
 * BCB Focus — Selic média projetada por ano-calendário (próximos ~5 anos).
 * Vira a curva a termo: horizonte = meses até 31/12 do ano; taxa = Selic média projetada.
 */
async function buscarPontosCurva(hoje: Date): Promise<PontoCurva[]> {
  const filtro = "Indicador eq 'Selic' and baseCalculo eq 0";
  const url =
    "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/" +
    "ExpectativasMercadoAnuais?%24top=60&%24orderby=Data%20desc&%24format=json&%24filter=" +
    encodeURIComponent(filtro);
  const j = await getJson<{
    value: Array<{ DataReferencia: string; Data: string; Media: number }>;
  }>(url);
  const linhas = j?.value ?? [];
  if (linhas.length === 0) throw new Error("Focus Selic anual sem dados");

  // Só a leitura mais recente.
  const dataMaisRecente = linhas.reduce((a, b) => (a.Data >= b.Data ? a : b)).Data;
  const porAno = new Map<number, number>();
  for (const l of linhas) {
    if (l.Data !== dataMaisRecente) continue;
    const ano = Number(l.DataReferencia);
    if (Number.isFinite(ano) && Number.isFinite(l.Media)) porAno.set(ano, l.Media / 100);
  }

  const pontos: PontoCurva[] = [];
  for (const [ano, taxaAnual] of [...porAno].sort((a, b) => a[0] - b[0])) {
    const fimDoAno = new Date(ano, 11, 31);
    const meses = mesesEntre(hoje, fimDoAno);
    if (meses >= 1) pontos.push({ meses, taxaAnual });
  }
  if (pontos.length === 0) throw new Error("Focus Selic anual: nenhum ano futuro");
  return pontos.sort((a, b) => a.meses - b.meses);
}

/** Busca CDI, projeção de IPCA e curva a termo. Lança se CDI ou curva falharem. */
export async function buscarCurvaJuros(hoje: Date = new Date()): Promise<CurvaJuros> {
  const [cdiAnual, ipcaProjAnual, pontosCurva] = await Promise.all([
    buscarCdiAnual(),
    buscarIpcaProjAnual(),
    buscarPontosCurva(hoje),
  ]);
  // Ancora o curto prazo no CDI corrente.
  const pontos = [{ meses: 1, taxaAnual: cdiAnual }, ...pontosCurva].sort(
    (a, b) => a.meses - b.meses,
  );
  return {
    fonte: "BCB SGS 4389 (CDI) + BCB Focus (IPCA 12m e Selic anual)",
    cdiAnual,
    ipcaProjAnual,
    pontos,
  };
}

export interface CurvaDoDia extends CurvaJuros {
  id: string;
  data: Date;
}

function inicioDoDiaUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Snapshot da curva de hoje: devolve o que já foi salvo hoje ou busca, grava e
 * devolve. Uma linha por dia (`data` é única).
 */
export async function obterCurvaDoDia(
  hoje: Date = new Date(),
): Promise<CurvaDoDia> {
  const data = inicioDoDiaUTC(hoje);

  const existente = await prisma.curvaJurosSnapshot.findUnique({ where: { data } });
  if (existente) return toCurvaDoDia(existente);

  const nova = await buscarCurvaJuros(hoje);
  try {
    const criado = await prisma.curvaJurosSnapshot.create({
      data: {
        data,
        fonte: nova.fonte,
        cdiAnual: nova.cdiAnual,
        ipcaProjAnual: nova.ipcaProjAnual,
        pontos: nova.pontos as unknown as Prisma.InputJsonValue,
      },
    });
    return toCurvaDoDia(criado);
  } catch {
    // corrida: outra requisição gravou primeiro
    const again = await prisma.curvaJurosSnapshot.findUnique({ where: { data } });
    if (again) return toCurvaDoDia(again);
    throw new Error("não foi possível salvar o snapshot da curva de juros");
  }
}

type SnapshotRow = {
  id: string;
  data: Date;
  fonte: string;
  cdiAnual: unknown;
  ipcaProjAnual: unknown;
  pontos: unknown;
};

function toCurvaDoDia(row: SnapshotRow): CurvaDoDia {
  return {
    id: row.id,
    data: row.data,
    fonte: row.fonte,
    cdiAnual: Number(row.cdiAnual),
    ipcaProjAnual: row.ipcaProjAnual == null ? null : Number(row.ipcaProjAnual),
    pontos: (Array.isArray(row.pontos) ? row.pontos : []) as PontoCurva[],
  };
}
