import { describe, expect, it } from "vitest";
import { tirMensal, valorPresente } from "./fluxo";

describe("valorPresente", () => {
  it("soma os fluxos sem desconto quando a taxa é 0", () => {
    expect(
      valorPresente(0, [
        { meses: 0, valor: -1000 },
        { meses: 12, valor: 1200 },
      ]),
    ).toBe(200);
  });

  it("desconta fluxos futuros", () => {
    const vp = valorPresente(0.01, [{ meses: 12, valor: 1000 }]);
    expect(vp).toBeCloseTo(1000 / Math.pow(1.01, 12), 6);
  });
});

describe("tirMensal", () => {
  it("dois fluxos (entrada/saída única) = juro composto direto", () => {
    // -1000 hoje, +1120 em 12 meses -> TIR = 1,12^(1/12) - 1
    const tir = tirMensal([
      { meses: 0, valor: -1000 },
      { meses: 12, valor: 1_120 },
    ])!;
    expect(tir).toBeCloseTo(Math.pow(1.12, 1 / 12) - 1, 8);
  });

  it("fluxo com várias parcelas: TIR zera o valor presente", () => {
    const fluxos = [
      { meses: 0, valor: -10_000 },
      { meses: 1, valor: 1_000 },
      { meses: 2, valor: 1_000 },
      { meses: 3, valor: 1_000 },
      { meses: 12, valor: 9_000 },
    ];
    const tir = tirMensal(fluxos)!;
    expect(Math.abs(valorPresente(tir, fluxos))).toBeLessThan(0.01);
  });

  it("null quando não há troca de sinal", () => {
    expect(
      tirMensal([
        { meses: 0, valor: 100 },
        { meses: 1, valor: 50 },
      ]),
    ).toBeNull();
  });

  it("TIR negativa quando o investimento dá prejuízo", () => {
    const tir = tirMensal([
      { meses: 0, valor: -1_000 },
      { meses: 6, valor: 800 },
    ])!;
    expect(tir).toBeLessThan(0);
  });
});
