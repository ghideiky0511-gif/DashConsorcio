// Precificação de carta ATIVA ainda NÃO contemplada: nenhum lance foi dado, o
// consorciado só está pagando parcela e aguardando sorteio/lance de terceiros
// no grupo. Diferença para `ativa-parcelas.ts`: lá o crédito já está na mão
// hoje; aqui ele só chega numa contemplação FUTURA e incerta.
//
// Como não dá pra saber o mês exato da contemplação (depende do grupo, é
// sorte), em vez de exigir um valor único avaliamos 3 cenários — contemplação
// cedo, na metade do prazo, ou só no sorteio final (pior caso, igual ao fim do
// grupo) — mesma lógica de "cenário de sensibilidade" já usada em
// `cancelada.ts` pro índice de correção. O "preço justo" principal é o do
// cenário ESPERADO; os outros dois servem de piso/teto pra negociação.
//
// Em todos os cenários, a parcela continua sendo paga do mês 1 até o fim do
// prazo restante (contemplar não quita a dívida, só antecipa o crédito) — o
// que muda é só QUANDO o crédito entra no fluxo.
//
// Pura — coberta por testes. Segue sem TIR pelo mesmo motivo documentado em
// `ativa-parcelas.ts`: fluxo "entrada grande, saídas pequenas" degenera o
// sinal da TIR de livro-texto.

import { interpolarCurva, taxaAcumulada } from "../core/juros";
import {
  metricasRetorno,
  precoJusto as calcularPrecoJusto,
  type MetricasRetorno,
} from "../core/retorno";
import type { CurvaParaCalculo } from "./cancelada";
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

export interface EntradaPrecificacaoAtivaNaoContemplada {
  /** Crédito a ser recebido quando (e se) a cota for contemplada. */
  creditoAtual: Num;
  /** Parcela mensal paga do mês 1 até o fim do prazo, com ou sem contemplação. */
  parcelaMensal: Num;
  /** Meses restantes até o fim do plano (encerramento do grupo). */
  mesesAteEncerramento: number;
  /** Estimativa própria de em qual mês a contemplação deve sair. Ausente →
   *  usa `PARAMETROS.ativa.naoContemplada.fatorEsperado` × prazo restante. */
  mesesAteContemplacaoEstimados?: number;
  /** Custo único de transferência da cota, se houver. */
  taxaTransferencia?: Num;
  /** Múltiplo do CDI exigido no período. Default: 2. */
  metaMultiploCdi?: Num;
  /** Preço que o operador quer avaliar. Ausente → avalia o preço justo do
   *  cenário esperado. */
  precoOfertado?: Num;
  curva: CurvaParaCalculo;
}

export interface CenarioContemplacao {
  rotulo: string;
  mesesAteContemplacao: number;
  /** Crédito recebido na contemplação, já descontando parcelas pagas até lá. */
  valorNominalTotal: number;
  precoJusto: number | null;
  retornoTotal: number | null;
  multiploCdi: number | null;
}

export interface ResultadoPrecificacaoAtivaNaoContemplada {
  motor: "ATIVA";
  variante: "NAO_CONTEMPLADA";
  mesesAteEncerramento: number;
  mesesAteContemplacaoEstimados: number;
  cdiAnual: number;
  taxaCurvaNoPrazo: number | null;
  cdiAcumuladoPeriodo: number;
  metaMultiploCdi: number;
  /** Soma nominal no cenário esperado (crédito − parcelas pagas até o fim do prazo). */
  valorNominalTotal: number;
  precoJusto: number | null;
  precoAvaliado: number | null;
  retorno: MetricasRetorno | null;
  /** Otimista / esperado / pessimista — mesmo preço avaliado, contemplação em momentos diferentes. */
  cenarios: CenarioContemplacao[];
  avisos: string[];
}

export function precificarAtivaNaoContemplada(
  entrada: EntradaPrecificacaoAtivaNaoContemplada,
): ResultadoPrecificacaoAtivaNaoContemplada {
  const credito = n(entrada.creditoAtual);
  const parcela = n(entrada.parcelaMensal);
  const mesesAteEncerramento = Math.max(0, Math.trunc(entrada.mesesAteEncerramento));
  const taxaTransferencia = n(entrada.taxaTransferencia);
  const meta =
    entrada.metaMultiploCdi == null
      ? PARAMETROS.metaMultiploCdiPadrao
      : n(entrada.metaMultiploCdi);

  const { fatorOtimista, fatorEsperado, fatorPessimista } =
    PARAMETROS.ativa.naoContemplada;
  const mesesEsperado =
    entrada.mesesAteContemplacaoEstimados != null
      ? Math.max(1, Math.trunc(entrada.mesesAteContemplacaoEstimados))
      : Math.max(1, Math.round(mesesAteEncerramento * fatorEsperado));

  // CDI acumulado sobre o prazo total do plano — é até esse mês que o dinheiro
  // fica comprometido, contemple cedo ou tarde (a parcela segue até lá).
  const cdiAnual = n(entrada.curva.cdiAnual);
  const taxaCurva = interpolarCurva(entrada.curva.pontos ?? [], mesesAteEncerramento);
  const taxaParaCdi = taxaCurva ?? cdiAnual;
  const cdiAcumuladoPeriodo = round4(taxaAcumulada(taxaParaCdi, mesesAteEncerramento));

  // Independente de quando contempla, a parcela é paga todo mês até o fim do
  // prazo — só o momento em que o crédito "entra" no bolso muda por cenário.
  const valorNominalBase = round2(
    credito - taxaTransferencia - parcela * mesesAteEncerramento,
  );

  function calcularCenario(rotulo: string, mesesContemplacao: number): CenarioContemplacao {
    const pj = calcularPrecoJusto({
      resgate: valorNominalBase,
      metaMultiploCdi: meta,
      cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
    });
    const precoParaRetorno =
      entrada.precoOfertado != null ? n(entrada.precoOfertado) : pj;
    const m =
      precoParaRetorno != null && precoParaRetorno > 0
        ? metricasRetorno({
            preco: precoParaRetorno,
            resgate: valorNominalBase,
            meses: mesesAteEncerramento,
            cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
          })
        : null;
    return {
      rotulo,
      mesesAteContemplacao: mesesContemplacao,
      valorNominalTotal: valorNominalBase,
      precoJusto: pj,
      retornoTotal: m?.retornoTotal ?? null,
      multiploCdi: m?.multiploCdi ?? null,
    };
  }

  const cenarios: CenarioContemplacao[] = [
    calcularCenario(
      "otimista",
      Math.max(1, Math.round(mesesAteEncerramento * fatorOtimista)),
    ),
    calcularCenario("esperado", mesesEsperado),
    calcularCenario(
      "pessimista",
      Math.max(1, Math.round(mesesAteEncerramento * fatorPessimista)),
    ),
  ];

  const esperado = cenarios[1];
  const precoAvaliado =
    entrada.precoOfertado != null ? n(entrada.precoOfertado) : esperado.precoJusto;
  const retorno =
    precoAvaliado != null && precoAvaliado > 0
      ? metricasRetorno({
          preco: precoAvaliado,
          resgate: esperado.valorNominalTotal,
          meses: mesesAteEncerramento,
          cdiAcumuladoNoPeriodo: cdiAcumuladoPeriodo,
        })
      : null;

  const avisos: string[] = [
    "Cota ainda não contemplada: o mês exato do sorteio é incerto — use o cenário " +
      "pessimista como piso de negociação, não só o esperado.",
  ];
  if (mesesAteEncerramento <= 0)
    avisos.push("Prazo até o encerramento do grupo é zero ou já passou — confira os dados.");
  if (credito <= 0) avisos.push("Informe o crédito previsto na contemplação.");
  if (parcela <= 0 && mesesAteEncerramento > 0)
    avisos.push("Parcela mensal zerada com prazo restante > 0 — confira os dados.");
  if (taxaCurva == null)
    avisos.push("Curva de juros vazia — CDI acumulado usa o CDI corrente.");
  if (valorNominalBase <= 0)
    avisos.push(
      "As parcelas até o fim do prazo somam mais que o crédito — negócio ruim independente do preço.",
    );
  if (retorno?.multiploCdi != null && retorno.multiploCdi < meta)
    avisos.push(
      `No preço avaliado (cenário esperado) o retorno é ${retorno.multiploCdi.toFixed(
        2,
      )}× o CDI, abaixo da meta de ${meta}×.`,
    );

  return {
    motor: "ATIVA",
    variante: "NAO_CONTEMPLADA",
    mesesAteEncerramento,
    mesesAteContemplacaoEstimados: mesesEsperado,
    cdiAnual: round4(cdiAnual),
    taxaCurvaNoPrazo: taxaCurva == null ? null : round4(taxaCurva),
    cdiAcumuladoPeriodo,
    metaMultiploCdi: meta,
    valorNominalTotal: esperado.valorNominalTotal,
    precoJusto: esperado.precoJusto,
    precoAvaliado,
    retorno,
    cenarios,
    avisos,
  };
}
