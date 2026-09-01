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

/** "yyyy-mm-dd" de um <input type="date"> -> Date (UTC) ou null. */
export function parseDateInput(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "1.234,56" ou "1234.56" -> número, ou null. */
export function parseMoneyInput(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const normalized = value
    .trim()
    .replace(/\s|R\$/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}
