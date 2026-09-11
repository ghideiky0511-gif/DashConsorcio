"use server";

import { requireProfile } from "@/lib/auth";
import {
  avaliarAtualidade,
  extrairCampos,
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
const TAMANHO_MAX_BYTES = 15 * 1024 * 1024;

export async function extrairExtratoAction(
  _prev: ExtracaoExtratoState,
  formData: FormData,
): Promise<ExtracaoExtratoState> {
  await requireProfile();

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, error: "Selecione o arquivo do extrato." };
  }
  if (!TIPOS_ACEITOS.has(arquivo.type as MediaTypeSuportado)) {
    return { ok: false, error: "Envie um PDF, PNG, JPEG ou WEBP." };
  }
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return { ok: false, error: "Arquivo maior que 15MB." };
  }

  try {
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const campos = await extrairCampos({
      arquivo: buffer,
      mediaType: arquivo.type as MediaTypeSuportado,
    });
    const atualidade = avaliarAtualidade(campos);
    return { ok: true, campos, atualidade };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Não foi possível ler o extrato.",
    };
  }
}
