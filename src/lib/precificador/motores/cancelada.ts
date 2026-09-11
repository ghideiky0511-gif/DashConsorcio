// Orquestrador da precificação de carta CANCELADA (consorciado excluído).
//
// O ganho do negócio só se realiza quando a cota é CONTEMPLADA — e uma carta
// cancelada pode ser contemplada de duas formas: no sorteio de excluídos (pode
// sair a qualquer momento) ou, o mais tardar, no encerramento do grupo (aí todo
// excluído que sobrou é resgatado). Como o mês do sorteio é incerto, tratamos
// como a mesma incerteza já modelada em `ativa-nao-contemplada.ts`: 3 cenários
// (otimista/esperado/pessimista, ver `PARAMETROS.contemplacaoIncerta`), com o
// encerramento do grupo como teto garantido. O "preço justo" principal usa o
// cenário ESPERADO — não mais o encerramento do grupo puro.
//
// Junta: meses até o encerramento (teto) → mês esperado de contemplação →
// resgate projetado nesse mês → preço justo por meta de CDI → propostas de
// mercado (MDV, Objetiva, cotadas pelo prazo contratual do grupo) → retorno →
// cenários de contemplação e de sensibilidade ao índice de correção.
// Pura (recebe a curva pronta) — coberta por testes.

import {
  propostaMdv,
  propostaObjetiva,
  resgateProxySsa,
  type ResultadoBenchmark,
} from "../mercado/benchmarks";
import {
  interpolarCurva,
  projetarResgate,
  taxaAcumulada,
  type PontoCurva,
} from "../core/juros";
import { metricasRetorno, precoJusto, type MetricasRetorno } from "../core/retorno";
import { mesesEntre } from "../core/tempo";
import { PARAMETROS } from "../parametros";

type Num = number | string | null | undefined;

function n(value: Num): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value.toString().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function round4(v: number): number {
  return Math.round((v + Number.EPSILON) * 10000) / 10000;
}

export interface CurvaParaCalculo {
  /** CDI a.a. corrente, fração. */
  cdiAnual: number;
  /** Curva a termo: taxa anual por horizonte em meses. */
  pontos: PontoCurva[];
  /** Projeção de IPCA 12m (fração), só para exibição. */
  ipcaProjAnual?: number | null;
}

export interface EntradaPrecificacaoCancelada {
  // --- dados da carta ---
  creditoAtual: Num;
  /** Percentual pago do fundo comum, em % (ex.: 6.792). */
  percentualPagoPct: Num;
  /** Fundo comum efetivamente pago (do extrato). Ausente → usa proxy SSA. */
  fundoComumPago?: Num;
  encerramentoGrupo: Date | string;
  /** "Hoje" do cálculo. Default: agora. */
  dataReferencia?: Date | string;

  // --- assunções ---
  /** Índice de correção do grupo projetado ao ano, fração. */
  indiceCorrecaoAnual: Num;
  /** Multa contratual retida do excluído, fração. Só se aplica quando a base é o
   *  fundo comum pago — o proxy SSA já embute deságio. */
  multaExclusaoPct?: Num;
  /** false = administradora devolve nominal, sem correção. Default: true. */
  resgateCorrigido?: boolean;
  /** Múltiplo do CDI exigido no período. Default: 2. */
  metaMultiploCdi?: Num;
  /** Preço que o operador quer avaliar. Ausente → avalia o preço justo. */
  precoOfertado?: Num;
  /** Estimativa própria de em quantos meses sai o sorteio de excluídos.
   *  Ausente → `PARAMETROS.contemplacaoIncerta.fatorEsperado` × prazo restante.
   *  Se a administradora só resgata no encerramento do grupo (sem sorteio de
   *  excluídos), informe igual a `mesesAteEncerramento` pra eliminar a
   *  incerteza. */
  mesesAteContemplacaoEstimados?: number;

  // --- mercado ---
  curva: CurvaParaCalculo;
}

export interface CenarioSensibilidade {
  rotulo: string;
  indiceCorrecaoAnual: number;
  resgateProjetado: number;
  precoJusto: number | null;
  /** Retorno total no preço avaliado (o mesmo em todos os cenários). */
  retornoTotal: number | null;
  multiploCdi: number | null;
}

export interface CenarioContemplacao {
  rotulo: string;
  mesesAteContemplacao: number;
  resgateProjetado: number;
  precoJusto: number | null;
  retornoTotal: number | null;
  multiploCdi: number | null;
}

export interface ResultadoPrecificacaoCancelada {
  motor: "CANCELADA";
  dataReferencia: string;
  /** Teto garantido: se não sortear antes, é resgatado aqui. */
  mesesAteEncerramento: number;
  /** Mês assumido pro sorteio de excluídos — base do cálculo principal. */
  mesesAteContemplacaoEstimados: number;

  /** crédito × %pago (sem correção nem deságio) — referência. */
  recebivelNominal: number;
  baseResgate: number;
  baseResgateOrigem: "fundo_comum_pago" | "proxy_ssa";

  cdiAnual: number;
  taxaCurvaNoPrazo: number | null;
  cdiAcumuladoPeriodo: number;
  ipcaProjAnual: number | null;

  indiceCorrecaoAnual: number;
  /** Resgate projetado no mês esperado de contemplação (não no encerramento). */
  resgateProjetado: number;

  metaMultiploCdi: number;
  precoJusto: number | null;

  /** Cotadas pelo prazo contratual do grupo (mesesAteEncerramento) — é o que
   *  os concorrentes usam, não o mês esperado de contemplação. */
  propostaMdv: ResultadoBenchmark;
  propostaObjetiva: ResultadoBenchmark;

  /** Preço usado no cálculo de retorno (precoOfertado ou, na falta, precoJusto). */
  precoAvaliado: number | null;
  retorno: MetricasRetorno | null;

  /** Otimista / esperado / pessimista — quando o sorteio de excluídos sai. */
  cenariosContemplacao: CenarioContemplacao[];
  /** Sensibilidade ao índice de correção, no mês esperado de contemplação. */
  cenarios: CenarioSensibilidade[];
  avisos: string[];
}

const DELTAS_SENSIBILIDADE: Array<{ rotulo: string; delta: number }> =
  PARAMETROS.cancelada.deltasSensibilidadeIndice.map((delta) => ({
    delta,
    rotulo: delta === 0 ? "base" : `índice ${delta > 0 ? "+" : "−"}${Math.abs(delta * 100)} p.p.`,
  }));

export function precificarCancelada(
  entrada: EntradaPrecificacaoCancelada,
): ResultadoPrecificacaoCancelada {
  const credito = n(entrada.creditoAtual);
  const pct = n(entrada.percentualPagoPct);
  const dataRef = entrada.dataReferencia
    ? new Date(entrada.dataReferencia)
    : new Date();
  const mesesAteEncerramento = mesesEntre(dataRef, entrada.encerramentoGrupo);

  const { fatorOtimista, fatorEsperado, fatorPessimista } = PARAMETROS.contemplacaoIncerta;
  const mesesEsperado =
    entrada.mesesAteContemplacaoEstimados != null
      ? Math.max(0, Math.trunc(entrada.mesesAteContemplacaoEstimados))
      : Math.max(0, Math.round(mesesAteEncerramento * fatorEsperado));

  const corrigido = entrada.resgateCorrigido !== false;
  const meta =
    entrada.metaMultiploCdi == null
      ? PARAMETROS.metaMultiploCdiPadrao
      : n(entrada.metaMultiploCdi);
  // Arredondado aqui para o cenário "base" bater exatamente com o resultado principal.
  const indiceBase = round4(n(entrada.indiceCorrecaoAnual));

  // Base do resgate: valor real do extrato quando existe; senão, proxy da SSA.
  const fundoComum = n(entrada.fundoComumPago);
  const usaFundoComum = fundoComum > 0;
  const baseResgate = usaFundoComum
    ? round2(fundoComum)
    : resgateProxySsa(credito, pct);
  const multaEfetiva = usaFundoComum ? n(entrada.multaExclusaoPct) : 0;

  const recebivelNominal = round2((credito * pct) / 100);

  const resgateComIndiceEMeses = (indiceAnual: number, meses: number) =>
    projetarResgate({
      base: baseResgate,
      indiceCorrecaoAnual: indiceAnual,
      meses,
      multaPct: multaEfetiva,
      corrigido,
    });

  // Mercado (CDI): acumulado até o mês ESPERADO de contemplação — é até lá que
  // o dinheiro fica parado, no cenário central.
  const cdiAnual = n(entrada.curva.cdiAnual);
  const taxaCurva = interpolarCurva(entrada.curva.pontos ?? [], mesesEsperado);
  const taxaParaCdi = taxaCurva ?? cdiAnual;
  const cdiAcumuladoPeriodo = round4(taxaAcumulada(taxaParaCdi, mesesEsperado));

  const resgateProjetado = resgateComIndiceEMeses(indiceBase, mesesEsperado);

  const pj = precoJusto({
    resgate: resgateProjetado,
    metaMultiploCdi: meta,
    cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
  });

  // Benchmarks: os concorrentes cotam pelo prazo CONTRATUAL do grupo, não pelo
  // mês esperado de sorteio — formato validado contra exemplos reais assim.
  const bench = { credito, percentualPago: pct, meses: mesesAteEncerramento };
  const mdv = propostaMdv(bench);
  const objetiva = propostaObjetiva(bench);

  const precoAvaliado =
    entrada.precoOfertado != null ? n(entrada.precoOfertado) : pj;
  const retorno =
    precoAvaliado != null && precoAvaliado > 0
      ? metricasRetorno({
          preco: precoAvaliado,
          resgate: resgateProjetado,
          meses: mesesEsperado,
          cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
        })
      : null;

  function calcularCenarioContemplacao(rotulo: string, meses: number): CenarioContemplacao {
    const resgate = resgateComIndiceEMeses(indiceBase, meses);
    const taxa = interpolarCurva(entrada.curva.pontos ?? [], meses) ?? cdiAnual;
    const cdiAcum = round4(taxaAcumulada(taxa, meses));
    const precoJustoCenario = precoJusto({
      resgate,
      metaMultiploCdi: meta,
      cdiAcumuladoNoPeriodo: cdiAcum,
    });
    const precoParaRetorno = entrada.precoOfertado != null ? n(entrada.precoOfertado) : precoJustoCenario;
    const m =
      precoParaRetorno != null && precoParaRetorno > 0
        ? metricasRetorno({
            preco: precoParaRetorno,
            resgate,
            meses,
            cdiAcumuladoNoPeriodo: cdiAcum,
          })
        : null;
    return {
      rotulo,
      mesesAteContemplacao: meses,
      resgateProjetado: resgate,
      precoJusto: precoJustoCenario,
      retornoTotal: m?.retornoTotal ?? null,
      multiploCdi: m?.multiploCdi ?? null,
    };
  }

  const cenariosContemplacao: CenarioContemplacao[] = [
    calcularCenarioContemplacao(
      "otimista",
      Math.max(0, Math.round(mesesAteEncerramento * fatorOtimista)),
    ),
    calcularCenarioContemplacao("esperado", mesesEsperado),
    calcularCenarioContemplacao(
      "pessimista (só no encerramento)",
      Math.max(0, Math.round(mesesAteEncerramento * fatorPessimista)),
    ),
  ];

  const cenarios: CenarioSensibilidade[] = DELTAS_SENSIBILIDADE.map(
    ({ rotulo, delta }) => {
      const indice = round4(Math.max(0, indiceBase + delta));
      const resgate = resgateComIndiceEMeses(indice, mesesEsperado);
      const m =
        precoAvaliado != null && precoAvaliado > 0
          ? metricasRetorno({
              preco: precoAvaliado,
              resgate,
              meses: mesesEsperado,
              cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
            })
          : null;
      return {
        rotulo,
        indiceCorrecaoAnual: indice,
        resgateProjetado: resgate,
        precoJusto: precoJusto({
          resgate,
          metaMultiploCdi: meta,
          cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
        }),
        retornoTotal: m?.retornoTotal ?? null,
        multiploCdi: m?.multiploCdi ?? null,
      };
    },
  );

  const avisos: string[] = [
    "O ganho só se realiza na contemplação (sorteio de excluídos ou encerramento do " +
      "grupo) — o mês exato é incerto. Use o cenário pessimista (encerramento) como " +
      "piso de negociação, não só o esperado.",
  ];
  if (mesesAteEncerramento <= 0)
    avisos.push("Encerramento do grupo já passou ou é neste mês — prazo zero.");
  if (!usaFundoComum)
    avisos.push(
      `Sem fundo comum pago do extrato: resgate estimado pelo proxy crédito × %pago × ${PARAMETROS.proxyResgateSsa.fatorRetido}.`,
    );
  if (pct > 0 && pct < 1)
    avisos.push(
      "Percentual pago parece estar em fração (menor que 1) — informe em % (ex.: 6.79).",
    );
  if (taxaCurva == null)
    avisos.push("Curva de juros vazia — CDI acumulado usa o CDI corrente.");
  if (mdv.recusado) avisos.push(`MDV recusaria: ${mdv.motivo}.`);
  if (objetiva.recusado) avisos.push(`Objetiva recusaria: ${objetiva.motivo}.`);
  if (retorno?.multiploCdi != null && retorno.multiploCdi < meta)
    avisos.push(
      `No preço avaliado o retorno é ${retorno.multiploCdi.toFixed(
        2,
      )}× o CDI, abaixo da meta de ${meta}×.`,
    );

  return {
    motor: "CANCELADA",
    dataReferencia: dataRef.toISOString().slice(0, 10),
    mesesAteEncerramento,
    mesesAteContemplacaoEstimados: mesesEsperado,
    recebivelNominal,
    baseResgate,
    baseResgateOrigem: usaFundoComum ? "fundo_comum_pago" : "proxy_ssa",
    cdiAnual: round4(cdiAnual),
    taxaCurvaNoPrazo: taxaCurva == null ? null : round4(taxaCurva),
    cdiAcumuladoPeriodo,
    ipcaProjAnual: entrada.curva.ipcaProjAnual ?? null,
    indiceCorrecaoAnual: round4(indiceBase),
    resgateProjetado,
    metaMultiploCdi: meta,
    precoJusto: pj,
    propostaMdv: mdv,
    propostaObjetiva: objetiva,
    precoAvaliado,
    retorno,
    cenariosContemplacao,
    cenarios,
    avisos,
  };
}
