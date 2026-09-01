"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Role } from "@/generated/prisma/client";
import {
  type ActionResult,
  fail,
  firstZodError,
  nullableText,
  ok,
  prismaErrorMessage,
} from "@/lib/action-utils";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da etapa."),
  cor: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, "Cor deve estar no formato #RRGGBB.")
    .optional()
    .nullable(),
  ativa: z.boolean(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    nome: formData.get("nome"),
    cor: nullableText(formData.get("cor")),
    ativa: formData.get("ativa") === "on" || formData.get("ativa") === "true",
  });
}

export async function criarEtapa(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    const ultima = await prisma.etapa.findFirst({
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });
    await prisma.etapa.create({
      data: { ...parsed.data, ordem: (ultima?.ordem ?? 0) + 1 },
    });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function atualizarEtapa(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return fail("Registro inválido.");

  const parsed = parse(formData);
  if (!parsed.success) return fail(firstZodError(parsed.error));

  try {
    await prisma.etapa.update({ where: { id }, data: parsed.data });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function excluirEtapa(id: string): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  try {
    await prisma.etapa.delete({ where: { id } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}

export async function moverEtapa(
  id: string,
  direcao: "cima" | "baixo",
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);
  try {
    await prisma.$transaction(async (tx) => {
      const atual = await tx.etapa.findUnique({ where: { id } });
      if (!atual) throw new Error("Etapa não encontrada.");

      const vizinho = await tx.etapa.findFirst({
        where: { ordem: direcao === "cima" ? { lt: atual.ordem } : { gt: atual.ordem } },
        orderBy: { ordem: direcao === "cima" ? "desc" : "asc" },
      });
      if (!vizinho) return; // já está no topo/fim

      await tx.etapa.update({ where: { id: atual.id }, data: { ordem: -1 } });
      await tx.etapa.update({ where: { id: vizinho.id }, data: { ordem: atual.ordem } });
      await tx.etapa.update({ where: { id: atual.id }, data: { ordem: vizinho.ordem } });
    });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  revalidatePath("/configuracoes");
  return ok();
}
