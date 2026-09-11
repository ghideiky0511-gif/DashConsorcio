// Campos que o agente de IA extrai de um extrato de consórcio (PDF/imagem).
// Escopo enxuto: só o que o precificador de carta cancelada usa + o que a
// checagem de atualidade (`atualidade.ts`) precisa. Sem I/O.

import { z } from "zod";

export const SITUACOES_COBRANCA = [
  "ATIVO",
  "EM_ATRASO",
  "EXCLUIDO",
  "CONTEMPLADO",
  "QUITADO",
  "CANCELADO",
  "OUTRO",
] as const;

export const situacaoCobrancaSchema = z.enum(SITUACOES_COBRANCA);

/** Data no formato "AAAA-MM-DD", ou null quando o extrato não traz o campo. */
const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data deve estar em AAAA-MM-DD")
  .nullable();

export const campoExtratoSchema = z.object({
  administradora: z.string().nullable(),
  grupo: z.string().nullable(),
  cota: z.string().nullable(),
  contrato: z.string().nullable(),
  situacaoCobranca: situacaoCobrancaSchema.nullable(),
  /** Data de emissão/geração do extrato (cabeçalho do documento). */
  dataEmissaoExtrato: dataIso,
  valorCredito: z.number().nullable(),
  /** Em %, como aparece no extrato (ex.: 6.792, não 0.06792). */
  percentualPagoPct: z.number().nullable(),
  /** Fundo comum efetivamente pago — base real do resgate quando disponível. */
  fundoComumPago: z.number().nullable(),
  dataPrevistaEncerramento: dataIso,
  /** Ex.: "IPCA", "INCC", "IGP-M". */
  indiceCorrecao: z.string().nullable(),
  prazoGrupoMeses: z.number().nullable(),
  /** Valor da parcela mensal atual (usado pela carta ATIVA). */
  parcelaMensal: z.number().nullable(),
  /** Quantas parcelas ainda faltam pagar (usado pela carta ATIVA). */
  parcelasRestantes: z.number().nullable(),
  assembleiaAtualNumero: z.number().nullable(),
  assembleiaAtualData: dataIso,
  proximoReajusteData: dataIso,
  /** Campos essenciais que o extrato não trouxe — o agente não deduz, só reporta. */
  camposFaltantes: z.array(z.string()).default([]),
  observacoes: z.string().nullable(),
});

export type CampoExtrato = z.infer<typeof campoExtratoSchema>;
export type SituacaoCobranca = (typeof SITUACOES_COBRANCA)[number];
