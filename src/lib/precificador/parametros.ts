// Caixa única de parâmetros ajustáveis do precificador. Tudo que é "número de
// negócio" (meta de retorno, fórmulas de mercado, prazos padrão, limites de
// alerta) vive aqui — os motores (`motores/*.ts`) e a checagem de atualidade
// (`agente/atualidade.ts`) só leem `PARAMETROS`, nunca hard-codam esses valores.
//
// Pra ajustar uma regra de negócio, mexa só aqui. Constantes puramente técnicas
// (tolerância de bisseção, nº de casas decimais) continuam nos arquivos onde
// são usadas — não são "regra de negócio", são detalhe de implementação.

export const PARAMETROS = {
  /** Meta de retorno usada quando o operador não informa outra. */
  metaMultiploCdiPadrao: 2,

  /** Fórmulas dos concorrentes, extraídas do JS dos sites — ver
   *  docs/precificacao/formulas-benchmarks.md. Só mudam se o concorrente mudar
   *  a própria calculadora. */
  mercado: {
    mdv: {
      /** fator = mesesRestantes ≤ mesesLimiteFatorBase ? fatorBase − quedaPorMes×meses : fatorMinimo */
      fatorBase: 0.605,
      quedaPorMes: 0.005,
      mesesLimiteFatorBase: 91,
      fatorMinimo: 0.15,
      /** Recusa proposta abaixo deste valor (R$). */
      propostaMinima: 3_000,
      /** Proposta final arredondada para múltiplo deste valor (R$). */
      arredondamento: 1_000,
    },
    objetiva: {
      /** Recusa se o recebível (crédito × %pago) for menor que isto (R$). */
      recebivelMinimo: 15_000,
      /** fator = mesesRestantes 1–faixaBase.mesesMax: fatorBase − quedaPorMes×meses */
      fatorBase: 0.505,
      quedaPorMes: 0.005,
      faixaBase: { mesesMin: 1, mesesMax: 70 },
      /** Faixa intermediária: fator fixo. */
      faixaIntermediaria: { mesesMin: 71, mesesMax: 94, fator: 0.15 },
      /** Acima da faixa intermediária: fator fixo, menor ainda. */
      fatorLongoPrazo: 0.1,
      /** Recusa se lucro (recebível − proposta) for menor que isto (R$). */
      lucroMinimo: 5_000,
      prazoMinimoMeses: 3,
      prazoMaximoMeses: 120,
      arredondamento: 1_000,
    },
  },

  /** Proxy interno (planilha SSA) pra estimar o resgate quando falta o fundo
   *  comum pago real do extrato. */
  proxyResgateSsa: {
    /** resgate = crédito × %pago × fatorRetido (deságio fixo de 13%). */
    fatorRetido: 0.87,
  },

  /** Carta CANCELADA. */
  cancelada: {
    /** Cenários de sensibilidade ao índice de correção, em pontos percentuais
     *  (fração) somados ao índice base. */
    deltasSensibilidadeIndice: [-0.02, 0, 0.02] as const,
  },

  /** Carta ATIVA. */
  ativa: {
    /** Base sobre a qual "% da contemplação" é calculado (lance = % × base). */
    baseLanceContemplacaoPct: "credito" as const,
    quitacao: {
      /** Prazo de carência até a administradora liberar o crédito, quando não informado. */
      prazoLiberacaoDiasPadrao: 180,
      diasPorMes: 30,
    },
    /** Cota ainda NÃO contemplada (nem lance dado, aguardando sorteio) — a data
     *  da contemplação é incerta, então o preço é avaliado em 3 cenários de
     *  quando ela acontece, como fração do prazo restante até o fim do grupo. */
    naoContemplada: {
      /** Contemplação logo no início do prazo restante. */
      fatorOtimista: 0.25,
      /** Usado quando o operador não informa uma estimativa própria. */
      fatorEsperado: 0.5,
      /** Pior caso: só contempla no sorteio final, junto do encerramento do grupo. */
      fatorPessimista: 1,
    },
  },

  /** Coleta da curva de juros (BCB). */
  curvaJuros: {
    seriesBcb: {
      /** SGS 4389 — CDI anualizado, base 252, % a.a. */
      cdiAnualizado: 4389,
    },
    timeoutMs: 12_000,
  },

  /** Checagem de atualidade do extrato (`agente/atualidade.ts`). */
  atualidadeExtrato: {
    /** Extrato emitido há este número de meses ou mais vira "bloqueio". Entre 1
     *  (exclusive) e este valor é "atenção"; até 0 (mês vigente) é "ok". */
    mesesParaBloqueio: 2,
    /** Faltando menos que isto pro encerramento do grupo, vira "atenção". */
    mesesMinimosAntesEncerramento: 3,
  },
} as const;
