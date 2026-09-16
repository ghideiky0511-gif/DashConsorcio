"use server";

import { requireProfile } from "@/lib/auth";
import {
  avaliarAtualidade,
  extrairCampos,
  type ArquivoExtracao,
  type CampoExtrato,
  type MediaTypeSuportado,
  type ResultadoAtualidade,
} from "@/lib/precificador/agente";

export type ExtracaoExtratoState =
  | { ok: true; campos: CampoExtrato; atualidade: ResultadoAtualidade }
  | { ok: false; error: string }
  | null;

const TIPOS_ACEITOS = new Set<MediaTypeSuportado>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const TAMANHO_MAX_ARQUIVO_BYTES = 15 * 1024 * 1024;
const QTD_MAX_ARQUIVOS = 5;

export async function extrairExtratoAction(
  _prev: ExtracaoExtratoState,
  formData: FormData,
): Promise<ExtracaoExtratoState> {
  await requireProfile();

  const arquivos = formData
    .getAll("arquivos")
    .filter((a): a is File => a instanceof File && a.size > 0);

  if (arquivos.length === 0) {
    return { ok: false, error: "Selecione ao menos um arquivo do extrato." };
  }
  if (arquivos.length > QTD_MAX_ARQUIVOS) {
    return { ok: false, error: `Envie no máximo ${QTD_MAX_ARQUIVOS} arquivos.` };
  }
  for (const arquivo of arquivos) {
    if (!TIPOS_ACEITOS.has(arquivo.type as MediaTypeSuportado)) {
      return { ok: false, error: "Envie apenas PDF, PNG, JPEG ou WEBP." };
    }
    if (arquivo.size > TAMANHO_MAX_ARQUIVO_BYTES) {
      return { ok: false, error: `"${arquivo.name}" é maior que 15MB.` };
    }
  }

  try {
    const arquivosLidos: ArquivoExtracao[] = await Promise.all(
      arquivos.map(async (arquivo) => ({
        arquivo: Buffer.from(await arquivo.arrayBuffer()),
        mediaType: arquivo.type as MediaTypeSuportado,
      })),
    );
    const campos = await extrairCampos({ arquivos: arquivosLidos });
    const atualidade = avaliarAtualidade(campos);
    return { ok: true, campos, atualidade };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Não foi possível ler o extrato.",
    };
  }
}
