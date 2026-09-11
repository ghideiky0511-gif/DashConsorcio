import { addDays, endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { StatusParcela, type Prisma } from "@/generated/prisma/client";

function n(v: Prisma.Decimal | number | null | undefined): number {
  return v == null ? 0 : Number(v.toString());
}

export type AlertaItem =
  | {
      tipo: "parcela";
      id: string;
      cartaId: string;
      cartaCodigo: string;
      data: Date;
      valor: number;
      atrasada: boolean;
    }
  | {
      tipo: "assembleia";
      id: string;
      cartaId: string;
      cartaCodigo: string;
      data: Date;
      atrasada: boolean;
    };

/** Parcelas vencendo/atrasadas e assembleias marcadas dentro da janela (padrão 7 dias). */
export async function getAlertas(diasJanela = 7): Promise<AlertaItem[]> {
  const hoje = startOfDay(new Date());
  const limite = endOfDay(addDays(hoje, diasJanela));

  const [parcelas, cartas] = await Promise.all([
    prisma.parcela.findMany({
      where: {
        status: { in: [StatusParcela.PENDENTE, StatusParcela.ATRASADO] },
        vencimento: { lte: limite },
      },
      select: {
        id: true,
        cartaId: true,
        vencimento: true,
        valorPrevisto: true,
        carta: { select: { codigo: true } },
      },
      orderBy: { vencimento: "asc" },
    }),
    prisma.carta.findMany({
      where: { proximaAssembleia: { not: null, lte: limite } },
      select: { id: true, codigo: true, proximaAssembleia: true },
      orderBy: { proximaAssembleia: "asc" },
    }),
  ]);

  const itens: AlertaItem[] = [
    ...parcelas.map((p) => ({
      tipo: "parcela" as const,
      id: p.id,
      cartaId: p.cartaId,
      cartaCodigo: p.carta.codigo,
      data: p.vencimento,
      valor: n(p.valorPrevisto),
      atrasada: p.vencimento < hoje,
    })),
    ...cartas.map((c) => ({
      tipo: "assembleia" as const,
      id: c.id,
      cartaId: c.id,
      cartaCodigo: c.codigo,
      data: c.proximaAssembleia!,
      atrasada: c.proximaAssembleia! < hoje,
    })),
  ];

  return itens.sort((a, b) => a.data.getTime() - b.data.getTime());
}
