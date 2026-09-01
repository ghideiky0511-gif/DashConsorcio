import type { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const ok = (): ActionResult => ({ ok: true });
export const fail = (error: string): ActionResult => ({ ok: false, error });

/** Primeira mensagem de um erro de validação zod. */
export function firstZodError(err: ZodError): string {
  return err.issues[0]?.message ?? "Dados inválidos.";
}

/** Traduz erros conhecidos do Prisma para mensagens de UI. */
export function prismaErrorMessage(
  err: unknown,
  fallback = "Não foi possível concluir a operação.",
): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return "Já existe um registro com esse valor.";
      case "P2003":
      case "P2014":
        return "Há cartas vinculadas a este registro — não é possível excluir.";
      case "P2025":
        return "Registro não encontrado.";
    }
  }
  return fallback;
}

/** Converte "" -> null e faz trim; útil para campos opcionais de formulário. */
export function nullableText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}
