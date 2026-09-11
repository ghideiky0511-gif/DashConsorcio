// Orquestrador da precificação de carta CANCELADA (consorciado excluído).
// Junta: meses até o encerramento → resgate projetado → preço justo por meta de
// CDI → propostas de mercado (MDV, Objetiva) → retorno → cenários de sensibilidade.
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

export interface ResultadoPrecificacaoCancelada {
  motor: "CANCELADA";
  dataReferencia: string;
  mesesAteEncerramento: number;

  /** crédito × %pago (sem correção nem deságio) — referência. */
  recebivelNominal: number;
  baseResgate: number;
  baseResgateOrigem: "fundo_comum_pago" | "proxy_ssa";

  cdiAnual: number;
  taxaCurvaNoPrazo: number | null;
  cdiAcumuladoPeriodo: number;
  ipcaProjAnual: number | null;

  indiceCorrecaoAnual: number;
  resgateProjetado: number;

  metaMultiploCdi: number;
  precoJusto: number | null;

  propostaMdv: ResultadoBenchmark;
  propostaObjetiva: ResultadoBenchmark;

  /** Preço usado no cálculo de retorno (precoOfertado ou, na falta, precoJusto). */
  precoAvaliado: number | null;
  retorno: MetricasRetorno | null;

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
  const meses = mesesEntre(dataRef, entrada.encerramentoGrupo);

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

  // Mercado.
  const cdiAnual = n(entrada.curva.cdiAnual);
  const taxaCurva = interpolarCurva(entrada.curva.pontos ?? [], meses);
  const taxaParaCdi = taxaCurva ?? cdiAnual;
  const cdiAcumuladoPeriodo = round4(taxaAcumulada(taxaParaCdi, meses));

  const resgateComIndice = (indiceAnual: number) =>
    projetarResgate({
      base: baseResgate,
      indiceCorrecaoAnual: indiceAnual,
      meses,
      multaPct: multaEfetiva,
      corrigido,
    });

  const resgateProjetado = resgateComIndice(indiceBase);

  const pj = precoJusto({
    resgate: resgateProjetado,
    metaMultiploCdi: meta,
    cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
  });

  const bench = { credito, percentualPago: pct, meses };
  const mdv = propostaMdv(bench);
  const objetiva = propostaObjetiva(bench);

  const precoAvaliado =
    entrada.precoOfertado != null ? n(entrada.precoOfertado) : pj;
  const retorno =
    precoAvaliado != null && precoAvaliado > 0
      ? metricasRetorno({
          preco: precoAvaliado,
          resgate: resgateProjetado,
          meses,
          cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
        })
      : null;

  const cenarios: CenarioSensibilidade[] = DELTAS_SENSIBILIDADE.map(
    ({ rotulo, delta }) => {
      const indice = round4(Math.max(0, indiceBase + delta));
      const resgate = resgateComIndice(indice);
      const m =
        precoAvaliado != null && precoAvaliado > 0
          ? metricasRetorno({
              preco: precoAvaliado,
              resgate,
              meses,
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

  const avisos: string[] = [];
  if (meses <= 0)
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
    mesesAteEncerramento: meses,
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
    cenarios,
    avisos,
  };
}
