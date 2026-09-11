import { describe, expect, it } from "vitest";
import {
  cdiAcumulado,
  interpolarCurva,
  projetarResgate,
  taxaAcumulada,
} from "./juros";

describe("taxaAcumulada / cdiAcumulado", () => {
  it("12 meses = a própria taxa anual", () => {
    expect(taxaAcumulada(0.12, 12)).toBeCloseTo(0.12, 10);
  });

  it("6 meses = juro composto de meio ano", () => {
    expect(taxaAcumulada(0.12, 6)).toBeCloseTo(Math.sqrt(1.12) - 1, 10);
  });

  it("30 meses compõe corretamente", () => {
    expect(cdiAcumulado(0.1, 30)).toBeCloseTo(Math.pow(1.1, 2.5) - 1, 10);
  });

  it("0 meses = 0", () => {
    expect(taxaAcumulada(0.12, 0)).toBe(0);
  });
});

describe("interpolarCurva", () => {
  const curva = [
    { meses: 12, taxaAnual: 0.1 },
    { meses: 24, taxaAnual: 0.12 },
    { meses: 48, taxaAnual: 0.13 },
  ];

  it("interpola linearmente entre dois pontos", () => {
    expect(interpolarCurva(curva, 18)).toBeCloseTo(0.11, 10);
    expect(interpolarCurva(curva, 36)).toBeCloseTo(0.125, 10);
  });

  it("não extrapola: usa a ponta mais próxima", () => {
    expect(interpolarCurva(curva, 3)).toBe(0.1);
    expect(interpolarCurva(curva, 120)).toBe(0.13);
  });

  it("aceita curva fora de ordem", () => {
    expect(interpolarCurva([...curva].reverse(), 18)).toBeCloseTo(0.11, 10);
  });

  it("null quando a curva está vazia", () => {
    expect(interpolarCurva([], 18)).toBeNull();
  });
});

describe("projetarResgate", () => {
  it("corrige a base pelo índice até o encerramento", () => {
    // fundo comum pago 15.727,70 · IPCA proj. 4% a.a. · 30 meses
    const r = projetarResgate({
      base: 15_727.7,
      indiceCorrecaoAnual: 0.04,
      meses: 30,
    });
    expect(r).toBeCloseTo(15_727.7 * Math.pow(1.04, 2.5), 1);
    expect(r).toBeGreaterThan(15_727.7);
  });

  it("desconta a multa de exclusão", () => {
    const semMulta = projetarResgate({
      base: 20_000,
      indiceCorrecaoAnual: 0,
      meses: 24,
    });
    const comMulta = projetarResgate({
      base: 20_000,
      indiceCorrecaoAnual: 0,
      meses: 24,
      multaPct: 0.1,
    });
    expect(semMulta).toBe(20_000);
    expect(comMulta).toBe(18_000);
  });

  it("corrigido:false devolve o nominal", () => {
    expect(
      projetarResgate({
        base: 20_000,
        indiceCorrecaoAnual: 0.05,
        meses: 60,
        corrigido: false,
      }),
    ).toBe(20_000);
  });

  it("base zerada = 0", () => {
    expect(
      projetarResgate({ base: 0, indiceCorrecaoAnual: 0.04, meses: 30 }),
    ).toBe(0);
  });
});
