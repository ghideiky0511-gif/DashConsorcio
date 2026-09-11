import { describe, expect, it } from "vitest";
import { metricasRetorno, precoJusto } from "./retorno";

describe("metricasRetorno", () => {
  it("calcula retorno total, mensal, anual e múltiplo do CDI", () => {
    // pago 6.000 hoje, recebe 14.983,79 em 30 meses; CDI acumulado do período 30%.
    const m = metricasRetorno({
      preco: 6_000,
      resgate: 14_983.79,
      meses: 30,
      cdiAcumuladoNoPeriodo: 0.3,
    });
    expect(m).not.toBeNull();
    expect(m!.lucro).toBe(8_983.79);
    expect(m!.retornoTotal).toBeCloseTo(1.4973, 3); // ~149%
    expect(m!.retornoMensal).toBeCloseTo(0.031, 3); // ~3,1% a.m.
    expect(m!.retornoAnual).toBeCloseTo(0.4422, 3);
    expect(m!.multiploCdi).toBeCloseTo(4.99, 2); // 1,4973 / 0,30
  });

  it("multiploCdi é null sem CDI informado", () => {
    const m = metricasRetorno({ preco: 6_000, resgate: 12_000, meses: 24 });
    expect(m!.multiploCdi).toBeNull();
  });

  it("null quando falta base de cálculo", () => {
    expect(metricasRetorno({ preco: 0, resgate: 10_000, meses: 12 })).toBeNull();
    expect(metricasRetorno({ preco: 5_000, resgate: 0, meses: 12 })).toBeNull();
    expect(metricasRetorno({ preco: 5_000, resgate: 10_000, meses: 0 })).toBeNull();
  });
});

describe("precoJusto", () => {
  it("preço que faz o retorno do período bater a meta × CDI", () => {
    // resgate 14.983,79 · meta 2× · CDI do período 30% → alvo 60% → 14.983,79 / 1,6
    expect(
      precoJusto({
        resgate: 14_983.79,
        metaMultiploCdi: 2,
        cdiAcumuladoNoPeriodo: 0.3,
      }),
    ).toBe(9_364.87);
  });

  it("o retorno no preço justo, recalculado, bate a meta", () => {
    const preco = precoJusto({
      resgate: 20_000,
      metaMultiploCdi: 2,
      cdiAcumuladoNoPeriodo: 0.25,
    })!;
    const m = metricasRetorno({
      preco,
      resgate: 20_000,
      meses: 24,
      cdiAcumuladoNoPeriodo: 0.25,
    })!;
    expect(m.multiploCdi).toBeCloseTo(2, 2);
  });

  it("null sem base de cálculo", () => {
    expect(
      precoJusto({ resgate: 0, metaMultiploCdi: 2, cdiAcumuladoNoPeriodo: 0.3 }),
    ).toBeNull();
  });
});
