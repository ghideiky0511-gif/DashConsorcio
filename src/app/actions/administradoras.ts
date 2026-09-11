"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import {
  IndiceCorrecao,
  MomentoResgate,
  Role,
  TipoLanceAceito,
} from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  firstZodError,
  nullableText,
  ok,
  parseIntInput,
  prismaErrorMessage,
} from "@/lib/action-utils";

/** Número decimal simples (ponto ou vírgula), sem a heurística de "%" de `parsePercentInput`. */
function parseFractionInput(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const num = Number(value.trim().replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da administradora."),
  cnpj: z.string().trim().max(20).optional().nullable(),
  contato: z.string().trim().max(200).optional().nullable(),
  // --- regras usadas pelo precificador (todas opcionais: nem toda
  // administradora precisa estar configurada pra o resto do sistema funcionar) ---
  indiceCorrecao: z.nativeEnum(IndiceCorrecao).optional().nullable(),
  resgateCorrigido: z.boolean().optional(),
  multaExclusaoPct: z.number().min(0).max(1).optional().nullable(),
  momentoResgate: z.nativeEnum(MomentoResgate).optional().nullable(),
  tipoLanceAceito: z.nativeEnum(TipoLanceAceito).optional().nullable(),
  prazoLiberacaoQuitacaoDias: z.number().int().min(0).optional().nullable(),
});

function enumOrNull<T extends string>(value: FormDataEntryValue | null): T | null {
  const t = nullableText(value);
  return t as T | null;
}

function parse(formData: FormData) {
  return schema.safeParse({
    nome: formData.get("nome"),
    cnpj: nullableText(formData.get("cnpj")),
    contato: nullableText(formData.get("contato")),
    indiceCorrecao: enumOrNull(formData.get("indiceCorrecao")),
    resgateCorrigido: formData.get("resgateCorrigido") === "true",
    multaExclusaoPct: parseFractionInput(formData.get("multaExclusaoPct")),
    momentoResgate: enumOrNull(formData.get("momentoResgate")),
    tipoLanceAceito: enumOrNull(formData.get("tipoLanceAceito")),
    prazoLiberacaoQuitacaoDias: parseIntInput(formData.get("prazoLiberacaoQuitacaoDias")),
  });
}

export async function criarAdministradora(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.administradora.create({ data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function atualizarAdministradora(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Registro inválido.");

  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.administradora.update({ where: { id }, data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function excluirAdministradora(id: string): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  try {
    await prisma.administradora.delete({ where: { id } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}
