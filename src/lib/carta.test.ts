import { describe, expect, it } from "vitest";
import {
  custoTotal,
  etapaPorDatasMarco,
  lucroPrevisto,
  previsaoPercentualLucro,
  resultadoRealizado,
} from "./carta";

describe("custoTotal", () => {
  it("soma aquisição + despesas (objetos com .valor)", () => {
    expect(
      custoTotal({
        valorCompra: 10_000,
        despesas: [{ valor: 500 }, { valor: 250.5 }, { valor: 120 }],
      }),
    ).toBe(10_870.5);
  });

  it("aceita lista de números e strings", () => {
    expect(custoTotal({ valorCompra: "1000", despesas: [100, "50.25"] })).toBe(1150.25);
  });

  it("sem despesas = valor da compra", () => {
    expect(custoTotal({ valorCompra: 7500 })).toBe(7500);
  });
});

describe("previsaoPercentualLucro / lucroPrevisto", () => {
  it("calcula a fração de lucro sobre o custo total", () => {
    expect(previsaoPercentualLucro({ previsaoResgate: 15_000, custoTotal: 12_000 })).toBe(
      0.25,
    );
    expect(lucroPrevisto({ previsaoResgate: 15_000, custoTotal: 12_000 })).toBe(3_000);
  });

  it("retorna null sem base de cálculo", () => {
    expect(previsaoPercentualLucro({ previsaoResgate: 10_000, custoTotal: 0 })).toBeNull();
    expect(previsaoPercentualLucro({ previsaoResgate: 0, custoTotal: 5_000 })).toBeNull();
  });
});

describe("resultadoRealizado", () => {
  it("soma resgate + revenda menos custo", () => {
    expect(
      resultadoRealizado({ valorResgatado: 18_000, custoTotal: 12_000 }),
    ).toBe(6_000);
    expect(
      resultadoRealizado({ valorRevenda: 9_000, custoTotal: 12_000 }),
    ).toBe(-3_000);
  });

  it("null quando nada foi recebido", () => {
    expect(resultadoRealizado({ custoTotal: 12_000 })).toBeNull();
  });
});

describe("etapaPorDatasMarco", () => {
  const marcos = (over: Partial<Record<string, string | null>> = {}) => [
    { etapaOrdem: 2, data: over.compra ?? null },
    { etapaOrdem: 3, data: over.bolsa ?? null },
    { etapaOrdem: 8, data: over.contemplacao ?? null },
    { etapaOrdem: 10, data: over.resgate ?? null },
  ];

  it("cai no fallback (menor ordem) quando não há datas", () => {
    expect(etapaPorDatasMarco(marcos())).toBe(2);
    expect(etapaPorDatasMarco(marcos(), 1)).toBe(1);
  });

  it("usa a maior ordem com data preenchida", () => {
    expect(
      etapaPorDatasMarco(marcos({ compra: "2026-01-10", bolsa: "2026-02-01" })),
    ).toBe(3);
    expect(
      etapaPorDatasMarco(
        marcos({ compra: "2026-01-10", contemplacao: "2026-06-01" }),
      ),
    ).toBe(8);
  });

  it("ignora datas inválidas", () => {
    expect(etapaPorDatasMarco(marcos({ compra: "2026-01-10", bolsa: "xx" }))).toBe(2);
  });
});
