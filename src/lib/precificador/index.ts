// Precificador de cartas de consórcio — ponto único de entrada.
//
// Organização (cada pasta é uma "caixa" com uma responsabilidade):
//   parametros.ts   → todo número de negócio ajustável (meta de CDI, fórmulas
//                     de mercado, prazos padrão). Mexer numa regra é mexer só ali.
//   core/           → motor financeiro genérico e testado (datas, juros, TIR,
//                     retorno vs. CDI) — não sabe o que é "carta".
//   mercado/        → réplica das calculadoras da concorrência (MDV, Objetiva).
//   motores/        → um arquivo por tipo de precificação: cancelada, ativa com
//                     parcelas, ativa com lance de quitação.
//   curva-juros.ts  → busca e guarda o snapshot diário do CDI/curva (I/O).
//   agente/         → extração de dados do extrato via IA + checagem de
//                     atualidade (tem seu próprio barrel, `agente/index.ts`).

export { mesesEntre } from "./core/tempo";
export {
  taxaAcumulada,
  cdiAcumulado,
  interpolarCurva,
  projetarResgate,
  type PontoCurva,
  type EntradaResgate,
} from "./core/juros";
export { valorPresente, tirMensal, type FluxoCaixa, type OpcoesTir } from "./core/fluxo";
export {
  metricasRetorno,
  precoJusto,
  type EntradaRetorno,
  type MetricasRetorno,
  type EntradaPrecoJusto,
} from "./core/retorno";

export {
  propostaMdv,
  propostaObjetiva,
  resgateProxySsa,
  type EntradaBenchmark,
  type ResultadoBenchmark,
} from "./mercado/benchmarks";

export {
  precificarCancelada,
  type EntradaPrecificacaoCancelada,
  type ResultadoPrecificacaoCancelada,
  type CenarioSensibilidade,
  type CurvaParaCalculo,
} from "./motores/cancelada";
export {
  precificarAtivaContemplada,
  type EntradaPrecificacaoAtivaContemplada,
  type ResultadoPrecificacaoAtivaContemplada,
} from "./motores/ativa-parcelas";
export {
  precificarAtivaLanceQuitacao,
  type EntradaPrecificacaoAtivaLanceQuitacao,
  type ResultadoPrecificacaoAtivaLanceQuitacao,
} from "./motores/ativa-quitacao";
export {
  precificarAtivaNaoContemplada,
  type EntradaPrecificacaoAtivaNaoContemplada,
  type ResultadoPrecificacaoAtivaNaoContemplada,
  type CenarioContemplacao,
} from "./motores/ativa-nao-contemplada";

export {
  buscarCurvaJuros,
  obterCurvaDoDia,
  type CurvaJuros,
  type CurvaDoDia,
} from "./curva-juros";

export { PARAMETROS } from "./parametros";
