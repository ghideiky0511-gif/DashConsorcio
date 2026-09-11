import { describe, expect, it } from "vitest";
import {
  propostaMdv,
  propostaObjetiva,
  resgateProxySsa,
} from "./benchmarks";

// Carta ERIKA (extrato Itaú, grupo 020358): crédito 253.574,00 · %pago 6,7920 ·
// encerramento 23/03/2029 · proposta rodada em 09/2026 → meses = 30.
// Resultados observados nos sites: MDV R$ 8.000,00 · Objetiva R$ 6.000,00.
const ERIKA = { credito: 253_574, percentualPago: 6.792, meses: 30 };

describe("propostaMdv", () => {
  it("reproduz a proposta real da MDV (R$ 8.000)", () => {
    const r = propostaMdv(ERIKA);
    expect(r.valor).toBe(8_000);
    expect(r.recusado).toBe(false);
    expect(r.fator).toBeCloseTo(0.455, 4); // 0,605 − 0,005 × 30
    expect(r.recebivel).toBeCloseTo(17_217.67, 2); // %pago truncado a 2 casas (6,79)
  });

  it("trava o fator em 0,15 a partir de 91 meses", () => {
    expect(propostaMdv({ ...ERIKA, meses: 91 }).fator).toBeCloseTo(0.15, 4);
    expect(propostaMdv({ ...ERIKA, meses: 120 }).fator).toBeCloseTo(0.15, 4);
  });

  it("recusa quando a proposta fica abaixo de R$ 3.000", () => {
    const r = propostaMdv({ credito: 40_000, percentualPago: 5, meses: 80 });
    expect(r.recusado).toBe(true);
    expect(r.valor).toBe(0);
  });

  it("arredonda para múltiplo de R$ 1.000", () => {
    expect(propostaMdv(ERIKA).valor % 1000).toBe(0);
  });
});

describe("propostaObjetiva", () => {
  it("reproduz a proposta real da Objetiva (R$ 6.000)", () => {
    const r = propostaObjetiva(ERIKA);
    expect(r.valor).toBe(6_000);
    expect(r.recusado).toBe(false);
    expect(r.fator).toBeCloseTo(0.355, 4); // 0,505 − 0,005 × 30
    expect(r.recebivel).toBeCloseTo(17_222.75, 2);
  });

  it("recusa recebível abaixo de R$ 15.000", () => {
    const r = propostaObjetiva({ credito: 100_000, percentualPago: 5, meses: 30 });
    expect(r.recusado).toBe(true);
    expect(r.motivo).toMatch(/15\.000/);
  });

  it("recusa prazo acima de 120 meses", () => {
    const r = propostaObjetiva({ ...ERIKA, meses: 121 });
    expect(r.recusado).toBe(true);
    expect(r.motivo).toMatch(/120/);
  });

  it("degraus de fator: 0,15 entre 71 e 94, 0,10 a partir de 95", () => {
    expect(propostaObjetiva({ ...ERIKA, meses: 80 }).fator).toBeCloseTo(0.15, 4);
    expect(propostaObjetiva({ ...ERIKA, meses: 100 }).fator).toBeCloseTo(0.1, 4);
  });

  it("paga menos que a MDV no mesmo cenário", () => {
    expect(propostaObjetiva(ERIKA).valor).toBeLessThan(propostaMdv(ERIKA).valor);
  });
});

describe("resgateProxySsa", () => {
  it("crédito × %pago × 0,87", () => {
    expect(resgateProxySsa(500_000, 5.26)).toBe(22_881); // 26.300 × 0,87
    expect(resgateProxySsa(253_574, 6.792)).toBeCloseTo(14_983.79, 2);
  });
});
