"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireEditor, requireProfile } from "@/lib/auth";
import {
  excluirDocumentoStorage,
  getDocumentoSignedUrl,
  uploadDocumento,
} from "@/lib/supabase/storage";
import { TipoDocumento } from "@/generated/prisma/client";
import { type ActionResult, fail, ok, prismaErrorMessage } from "@/lib/action-utils";

const MAX_TAMANHO = 15 * 1024 * 1024; // 15 MB — mesmo limite do bucket

function revalidar(cartaId: string) {
  revalidatePath(`/cartas/${cartaId}`);
}

export async function uploadDocumentoAction(
  cartaId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireEditor();

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return fail("Selecione um arquivo.");
  }
  if (arquivo.size > MAX_TAMANHO) {
    return fail("Arquivo maior que 15 MB.");
  }

  const tipoRaw = formData.get("tipo");
  const tipo =
    typeof tipoRaw === "string" &&
    (Object.values(TipoDocumento) as string[]).includes(tipoRaw)
      ? (tipoRaw as TipoDocumento)
      : TipoDocumento.OUTRO;

  const storagePath = `${cartaId}/${randomUUID()}-${arquivo.name}`;

  try {
    await uploadDocumento(storagePath, arquivo);
  } catch {
    return fail("Não foi possível enviar o arquivo.");
  }

  try {
    await prisma.documento.create({
      data: {
        cartaId,
        tipo,
        nome: arquivo.name,
        storagePath,
        tamanho: arquivo.size,
        mimeType: arquivo.type || "application/octet-stream",
        uploadedById: profile.id,
      },
    });
  } catch (e) {
    await excluirDocumentoStorage(storagePath);
    return fail(prismaErrorMessage(e, "Não foi possível salvar o documento."));
  }

  revalidar(cartaId);
  return ok();
}

export async function excluirDocumentoAction(
  cartaId: string,
  id: string,
): Promise<ActionResult> {
  await requireEditor();

  const doc = await prisma.documento.findUnique({
    where: { id },
    select: { cartaId: true, storagePath: true },
  });
  if (!doc || doc.cartaId !== cartaId) return fail("Documento não encontrado.");

  try {
    await prisma.documento.delete({ where: { id } });
  } catch (e) {
    return fail(prismaErrorMessage(e));
  }
  await excluirDocumentoStorage(doc.storagePath);

  revalidar(cartaId);
  return ok();
}

export async function getDocumentoUrlAction(
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireProfile();

  const doc = await prisma.documento.findUnique({
    where: { id },
    select: { storagePath: true },
  });
  if (!doc) return { ok: false, error: "Documento não encontrado." };

  try {
    const url = await getDocumentoSignedUrl(doc.storagePath, 60);
    return { ok: true, url };
  } catch {
    return { ok: false, error: "Não foi possível gerar o link de download." };
  }
}
