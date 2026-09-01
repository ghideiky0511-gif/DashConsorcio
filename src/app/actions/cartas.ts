"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import {
  FormaContemplacao,
  StatusConsorcio,
  TipoBem,
  TipoSaida,
} from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  nullableText,
  parseDateInput,
  parseIntInput,
  parseMoneyInput,
  parsePercentInput,
  prismaErrorMessage,
  zodFail,
} from "@/lib/action-utils";

const DATE_FIELDS = [
  "dataCompra",
  "dataCadastroBolsa",
  "encerramentoGrupo",
  "dataCopiasSeveri",
  "dataOriginaisSeveri",
  "dataNotificacao",
  "dataDoctoAdm",
  "contempladaEm",
  "dataPedidoResgate",
  "dataResgate",
  "dataRevenda",
] as const;

const schema = z.object({
  codigo: z.string().trim().min(1, "Informe o controle interno."),
  cessionariaId: z.string().uuid("Selecione a cessionária."),
  administradoraId: z.string().uuid("Selecione a administradora."),
  etapaId: z.string().uuid("Selecione a etapa."),
  grupo: z.string().trim().min(1, "Informe o grupo."),
  cota: z.string().trim().min(1, "Informe a cota."),
  contrato: z.string().trim().max(60).nullable(),
  origem: z.string().trim().max(120).nullable(),
  tipoBem: z.nativeEnum(TipoBem),
  statusConsorcio: z.nativeEnum(StatusConsorcio),
  tipoSaida: z.nativeEnum(TipoSaida).nullable(),
  formaContemplacao: z.nativeEnum(FormaContemplacao).nullable(),
  valorCredito: z.number().nonnegative("Valor inválido."),
  valorCreditoContemplacao: z.number().nonnegative().nullable(),
  percentualPago: z.number().min(0).max(1).nullable(),
  valorCompra: z.number().nonnegative("Valor inválido."),
  previsaoResgate: z.number().nonnegative().nullable(),
  valorResgatado: z.number().nonnegative().nullable(),
  valorRevenda: z.number().nonnegative().nullable(),
  parcelasTotais: z.number().int().nonnegative().nullable(),
  parcelasQuitadas: z.number().int().nonnegative().nullable(),
  parcelaValor: z.number().nonnegative().nullable(),
  diaVencimento: z.number().int().min(1).max(31).nullable(),
  observacoes: z.string().trim().max(2000).nullable(),
  observacoesGerais: z.string().trim().max(2000).nullable(),
  dataCompra: z.date().nullable(),
  dataCadastroBolsa: z.date().nullable(),
  encerramentoGrupo: z.date().nullable(),
  dataCopiasSeveri: z.date().nullable(),
  dataOriginaisSeveri: z.date().nullable(),
  dataNotificacao: z.date().nullable(),
  dataDoctoAdm: z.date().nullable(),
  contempladaEm: z.date().nullable(),
  dataPedidoResgate: z.date().nullable(),
  dataResgate: z.date().nullable(),
  dataRevenda: z.date().nullable(),
});

function parseForm(fd: FormData) {
  const enumOrNull = <T extends Record<string, string>>(
    e: T,
    v: FormDataEntryValue | null,
  ) => (typeof v === "string" && Object.values(e).includes(v) ? v : null);

  const base: Record<string, unknown> = {
    codigo: fd.get("codigo") ?? "",
    cessionariaId: fd.get("cessionariaId") ?? "",
    administradoraId: fd.get("administradoraId") ?? "",
    etapaId: fd.get("etapaId") ?? "",
    grupo: fd.get("grupo") ?? "",
    cota: fd.get("cota") ?? "",
    contrato: nullableText(fd.get("contrato")),
    origem: nullableText(fd.get("origem")),
    tipoBem: enumOrNull(TipoBem, fd.get("tipoBem")) ?? TipoBem.OUTRO,
    statusConsorcio:
      enumOrNull(StatusConsorcio, fd.get("statusConsorcio")) ??
      StatusConsorcio.ATIVA,
    tipoSaida: enumOrNull(TipoSaida, fd.get("tipoSaida")),
    formaContemplacao: enumOrNull(FormaContemplacao, fd.get("formaContemplacao")),
    valorCredito: parseMoneyInput(fd.get("valorCredito")) ?? 0,
    valorCreditoContemplacao: parseMoneyInput(fd.get("valorCreditoContemplacao")),
    percentualPago: parsePercentInput(fd.get("percentualPago")),
    valorCompra: parseMoneyInput(fd.get("valorCompra")) ?? 0,
    previsaoResgate: parseMoneyInput(fd.get("previsaoResgate")),
    valorResgatado: parseMoneyInput(fd.get("valorResgatado")),
    valorRevenda: parseMoneyInput(fd.get("valorRevenda")),
    parcelasTotais: parseIntInput(fd.get("parcelasTotais")),
    parcelasQuitadas: parseIntInput(fd.get("parcelasQuitadas")),
    parcelaValor: parseMoneyInput(fd.get("parcelaValor")),
    diaVencimento: parseIntInput(fd.get("diaVencimento")),
    observacoes: nullableText(fd.get("observacoes")),
    observacoesGerais: nullableText(fd.get("observacoesGerais")),
  };
  for (const f of DATE_FIELDS) base[f] = parseDateInput(fd.get(f));
  return base;
}

export async function criarCarta(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireEditor();
  const parsed = schema.safeParse(parseForm(formData));
  if (!parsed.success) return zodFail(parsed.error);

  let novoId: string;
  try {
    const carta = await prisma.carta.create({
      data: {
        ...parsed.data,
        createdById: profile.id,
        etapaHistorico: {
          create: {
            etapaParaId: parsed.data.etapaId,
            observacao: "Carta cadastrada.",
            userId: profile.id,
          },
        },
      },
      select: { id: true },
    });
    novoId = carta.id;
  } catch (e) {
    return fail(prismaErrorMessage(e, "Não foi possível criar a carta."));
  }

  revalidatePath("/");
  redirect(`/cartas/${novoId}`);
}

export async function atualizarCarta(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireEditor();
  const parsed = schema.safeParse(parseForm(formData));
  if (!parsed.success) return zodFail(parsed.error);

  try {
    await prisma.carta.update({ where: { id: cartaId }, data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e, "Não foi possível salvar a carta."));
  }

  revalidatePath("/");
  revalidatePath(`/cartas/${cartaId}`);
  redirect(`/cartas/${cartaId}`);
}
