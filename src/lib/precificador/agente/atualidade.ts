// Checagens de atualidade/validade do extrato (o "isto ainda vale?" pedido pra
// não repetir a classe de erro de dado desatualizado). Determinístico e testado
// — o agente de IA só extrai fatos; a matemática de data mora aqui.

import { PARAMETROS } from "../parametros";
import type { CampoExtrato } from "./schema";

export type StatusChecagem = "ok" | "atencao" | "bloqueio";

export interface Checagem {
  status: StatusChecagem;
  mensagem: string;
}

export interface Validacao {
  extratoVigente: Checagem;
  assembleiaPassou: Checagem;
  grupoEncerrado: Checagem;
  reajustePendente: Checagem;
  situacao: Checagem;
  camposFaltantes: Checagem;
}

export interface ResultadoAtualidade {
  statusGeral: StatusChecagem;
  validacao: Validacao;
  motor: "ATIVA" | "CANCELADA" | null;
  mesesAteEncerramento: number | null;
  assembleiasDesdeEmissao: number | null;
  assembleiaEstimadaHoje: number | null;
}

const PESO: Record<StatusChecagem, number> = { ok: 0, atencao: 1, bloqueio: 2 };

function pior(...status: StatusChecagem[]): StatusChecagem {
  return status.reduce((a, b) => (PESO[b] > PESO[a] ? b : a), "ok" as StatusChecagem);
}

function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function inicioDoMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Diferença em meses (com sinal): de `a` até `b`, truncando no dia 1. */
function diferencaMeses(a: Date, b: Date): number {
  return 12 * (b.getFullYear() - a.getFullYear()) + (b.getMonth() - a.getMonth());
}

const CAMPOS_ESSENCIAIS: Array<{ chave: keyof CampoExtrato; rotulo: string }> = [
  { chave: "valorCredito", rotulo: "crédito" },
  { chave: "percentualPagoPct", rotulo: "% pago" },
  { chave: "dataPrevistaEncerramento", rotulo: "data de encerramento do grupo" },
  { chave: "situacaoCobranca", rotulo: "situação de cobrança" },
];

export function avaliarAtualidade(
  campos: CampoExtrato,
  hoje: Date = new Date(),
): ResultadoAtualidade {
  // 1. Extrato é do mês vigente?
  let extratoVigente: Checagem;
  let assembleiaPassou: Checagem;
  let assembleiasDesdeEmissao: number | null = null;
  let assembleiaEstimadaHoje: number | null = null;

  if (!campos.dataEmissaoExtrato) {
    extratoVigente = {
      status: "atencao",
      mensagem: "Extrato sem data de emissão legível — confirme a validade manualmente.",
    };
    assembleiaPassou = {
      status: "atencao",
      mensagem: "Sem data de emissão para estimar assembleias decorridas.",
    };
  } else {
    const diff = diferencaMeses(paraData(campos.dataEmissaoExtrato), hoje);
    if (diff <= 0) {
      extratoVigente = { status: "ok", mensagem: "Extrato do mês vigente." };
    } else if (diff < PARAMETROS.atualidadeExtrato.mesesParaBloqueio) {
      extratoVigente = {
        status: "atencao",
        mensagem: "Extrato é do mês passado — peça a 2ª via atualizada.",
      };
    } else {
      extratoVigente = {
        status: "bloqueio",
        mensagem: `Extrato de ${diff} meses atrás — dados provavelmente desatualizados.`,
      };
    }

    assembleiasDesdeEmissao = Math.max(0, diff);
    assembleiaEstimadaHoje =
      campos.assembleiaAtualNumero != null
        ? campos.assembleiaAtualNumero + assembleiasDesdeEmissao
        : null;
    assembleiaPassou =
      assembleiasDesdeEmissao === 0
        ? { status: "ok", mensagem: "Nenhuma assembleia nova esperada desde a emissão." }
        : {
            status: "atencao",
            mensagem: `Estimando ${assembleiasDesdeEmissao} assembleia(s) desde a emissão — % pago e saldo devedor devem ter avançado.`,
          };
  }

  // 2. O grupo já encerrou?
  let grupoEncerrado: Checagem;
  let mesesAteEncerramento: number | null = null;
  if (!campos.dataPrevistaEncerramento) {
    grupoEncerrado = {
      status: "atencao",
      mensagem: "Sem data prevista de encerramento do grupo.",
    };
  } else {
    const fim = paraData(campos.dataPrevistaEncerramento);
    const mesAtual = inicioDoMes(hoje);
    if (fim < mesAtual) {
      grupoEncerrado = {
        status: "bloqueio",
        mensagem:
          "O grupo já encerrou na data prevista — confirme a situação do resgate antes de precificar.",
      };
    } else {
      mesesAteEncerramento = diferencaMeses(mesAtual, fim);
      grupoEncerrado =
        mesesAteEncerramento < PARAMETROS.atualidadeExtrato.mesesMinimosAntesEncerramento
          ? {
              status: "atencao",
              mensagem: `Faltam só ${mesesAteEncerramento} mês(es) para o encerramento.`,
            }
          : {
              status: "ok",
              mensagem: `Faltam ${mesesAteEncerramento} meses para o encerramento.`,
            };
    }
  }

  // 3. Reajuste anual pendente entre a emissão e hoje?
  let reajustePendente: Checagem = {
    status: "ok",
    mensagem: "Sem reajuste pendente identificado.",
  };
  if (campos.proximoReajusteData && campos.dataEmissaoExtrato) {
    const reajuste = paraData(campos.proximoReajusteData);
    const emissao = paraData(campos.dataEmissaoExtrato);
    if (reajuste > emissao && reajuste <= hoje) {
      reajustePendente = {
        status: "atencao",
        mensagem: `Reajuste previsto para ${campos.proximoReajusteData} já deveria ter ocorrido — crédito pode estar desatualizado.`,
      };
    }
  }

  // 4. Situação de cobrança -> qual motor de precificação usar.
  let situacao: Checagem;
  let motor: "ATIVA" | "CANCELADA" | null;
  switch (campos.situacaoCobranca) {
    case "EXCLUIDO":
    case "CANCELADO":
      motor = "CANCELADA";
      situacao = {
        status: "ok",
        mensagem: "Consorciado excluído/cancelado — usar o motor de carta cancelada.",
      };
      break;
    case "EM_ATRASO":
      motor = "ATIVA";
      situacao = {
        status: "atencao",
        mensagem: "Parcelas em atraso — risco de exclusão do grupo.",
      };
      break;
    case "ATIVO":
    case "CONTEMPLADO":
    case "QUITADO":
      motor = "ATIVA";
      situacao = { status: "ok", mensagem: "Consorciado ativo — usar o motor de carta ativa." };
      break;
    default:
      motor = null;
      situacao = {
        status: "atencao",
        mensagem: "Situação de cobrança não identificada no extrato.",
      };
  }

  // 5. Campos essenciais faltando.
  const faltando = CAMPOS_ESSENCIAIS.filter((c) => campos[c.chave] == null);
  const camposFaltantes: Checagem =
    faltando.length === 0
      ? { status: "ok", mensagem: "Todos os campos essenciais foram lidos." }
      : {
          status: "atencao",
          mensagem: `Faltando: ${faltando.map((c) => c.rotulo).join(", ")}.`,
        };

  const validacao: Validacao = {
    extratoVigente,
    assembleiaPassou,
    grupoEncerrado,
    reajustePendente,
    situacao,
    camposFaltantes,
  };

  return {
    statusGeral: pior(...Object.values(validacao).map((c) => c.status)),
    validacao,
    motor,
    mesesAteEncerramento,
    assembleiasDesdeEmissao,
    assembleiaEstimadaHoje,
  };
}
