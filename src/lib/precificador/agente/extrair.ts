// Chama o Claude com o extrato (PDF/imagem) e devolve os campos extraídos, já
// validados. Faz I/O — sem teste unitário; a lógica de negócio que consome o
// resultado (`atualidade.ts`) é pura e testada à parte.

import Anthropic from "@anthropic-ai/sdk";
import { campoExtratoSchema, SITUACOES_COBRANCA, type CampoExtrato } from "./schema";

const MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `Você analisa extratos de consorciado (PDF ou imagem) de qualquer
administradora (Itaú, Porto, Bradesco, Rodobens, Embracon, HS, Volkswagen, Canopus etc.)
e devolve os campos pedidos pela ferramenta "reportar_extrato".

Regras:
1. Use só o que está escrito no documento. Nunca invente, estime ou arredonde um
   campo que não está claramente legível — devolva null e liste a chave em
   "camposFaltantes".
2. Cada administradora nomeia os campos de um jeito diferente; mapeie para os
   nomes da ferramenta pelo significado, não pelo rótulo exato.
3. Valores monetários em número puro (sem "R$", sem separador de milhar):
   253574.00, não "R$ 253.574,00".
4. Percentuais em "percentualPagoPct" vão em %, como aparecem no extrato: 6.792
   para "6,7920%", nunca a fração 0.06792.
5. Todas as datas em "AAAA-MM-DD".
6. "situacaoCobranca" é a situação do consorciado perante o grupo — normalize
   para um destes valores: ${SITUACOES_COBRANCA.join(", ")}. Consorciado excluído
   do grupo (não paga mais, saiu do plano) = EXCLUIDO. Encerrado por cancelamento
   formal = CANCELADO. Sem informação clara = OUTRO.
7. "dataEmissaoExtrato" é a data em que o EXTRATO foi gerado (cabeçalho do
   documento), não a data de venda/adesão do consórcio.
8. "fundoComumPago" é o valor em R$ do fundo comum efetivamente pago até hoje —
   normalmente numa seção "valores pagos" ou "situação financeira". É diferente
   do total pago (que inclui taxa de administração e fundo de reserva).
9. "parcelaMensal" e "parcelasRestantes" são pra carta ATIVA (consorciado ainda
   pagando): valor da parcela mensal atual e quantas parcelas ainda faltam.
   Não confunda "parcelasRestantes" com o número da assembleia atual.
10. Preencha "observacoes" só se algo relevante não couber nos outros campos
   (ambiguidade, rasura, documento parcialmente ilegível, mais de uma cota no
   mesmo arquivo). Senão, null.

Sempre chame a ferramenta "reportar_extrato" — não responda em texto livre.`;

const FERRAMENTA: Anthropic.Tool = {
  name: "reportar_extrato",
  description: "Reporta os campos extraídos de um extrato de consórcio.",
  input_schema: {
    type: "object",
    properties: {
      administradora: { type: ["string", "null"] },
      grupo: { type: ["string", "null"] },
      cota: { type: ["string", "null"] },
      contrato: { type: ["string", "null"] },
      situacaoCobranca: {
        anyOf: [{ type: "string", enum: [...SITUACOES_COBRANCA] }, { type: "null" }],
      },
      dataEmissaoExtrato: {
        type: ["string", "null"],
        description: "AAAA-MM-DD — data de geração do extrato.",
      },
      valorCredito: { type: ["number", "null"] },
      percentualPagoPct: {
        type: ["number", "null"],
        description: "Em %, ex.: 6.792 para 6,7920%.",
      },
      fundoComumPago: {
        type: ["number", "null"],
        description: "Fundo comum efetivamente pago, em R$.",
      },
      dataPrevistaEncerramento: { type: ["string", "null"], description: "AAAA-MM-DD" },
      indiceCorrecao: { type: ["string", "null"], description: "Ex.: IPCA, INCC, IGP-M." },
      prazoGrupoMeses: { type: ["number", "null"] },
      parcelaMensal: {
        type: ["number", "null"],
        description: "Valor da parcela mensal atual, em R$ (carta ATIVA).",
      },
      parcelasRestantes: {
        type: ["number", "null"],
        description: "Quantas parcelas ainda faltam pagar (carta ATIVA).",
      },
      assembleiaAtualNumero: { type: ["number", "null"] },
      assembleiaAtualData: { type: ["string", "null"], description: "AAAA-MM-DD" },
      proximoReajusteData: { type: ["string", "null"], description: "AAAA-MM-DD" },
      camposFaltantes: { type: "array", items: { type: "string" } },
      observacoes: { type: ["string", "null"] },
    },
    required: [
      "administradora",
      "grupo",
      "cota",
      "contrato",
      "situacaoCobranca",
      "dataEmissaoExtrato",
      "valorCredito",
      "percentualPagoPct",
      "fundoComumPago",
      "dataPrevistaEncerramento",
      "indiceCorrecao",
      "prazoGrupoMeses",
      "parcelaMensal",
      "parcelasRestantes",
      "assembleiaAtualNumero",
      "assembleiaAtualData",
      "proximoReajusteData",
      "camposFaltantes",
      "observacoes",
    ],
  },
};

export type MediaTypeSuportado =
  | "application/pdf"
  | "image/png"
  | "image/jpeg"
  | "image/webp";

export interface EntradaExtracao {
  arquivo: Buffer;
  mediaType: MediaTypeSuportado;
}

let clienteCache: Anthropic | null = null;
function cliente(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada — adicione no .env para usar o agente de extração.",
    );
  }
  clienteCache ??= new Anthropic({ apiKey });
  return clienteCache;
}

/** Lê o extrato e devolve os campos extraídos, validados contra o schema. */
export async function extrairCampos(entrada: EntradaExtracao): Promise<CampoExtrato> {
  const base64 = entrada.arquivo.toString("base64");

  const documentBlock: Anthropic.ContentBlockParam =
    entrada.mediaType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: entrada.mediaType, data: base64 },
        };

  const resposta = await cliente().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [FERRAMENTA],
    tool_choice: { type: "tool", name: "reportar_extrato" },
    messages: [
      {
        role: "user",
        content: [documentBlock, { type: "text", text: "Extraia os campos deste extrato." }],
      },
    ],
  });

  const bloco = resposta.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!bloco) throw new Error("O agente não retornou os campos esperados.");

  const parsed = campoExtratoSchema.safeParse(bloco.input);
  if (!parsed.success) {
    throw new Error(
      "Resposta do agente fora do formato esperado: " + parsed.error.issues[0]?.message,
    );
  }
  return parsed.data;
}
