import { describe, expect, it } from "vitest";
import { precificarAtivaLanceQuitacao } from "./ativa-quitacao";

const CURVA = {
  cdiAnual: 0.139,
  pontos: [
    { meses: 1, taxaAnual: 0.139 },
    { meses: 6, taxaAnual: 0.13 },
    { meses: 12, taxaAnual: 0.12 },
  ],
};

describe("precificarAtivaLanceQuitacao", () => {
  it("180 dias vira 6 meses", () => {
    const r = precificarAtivaLanceQuitacao({
      creditoAtual: 100_000,
      lanceQuitacao: 40_000,
      curva: CURVA,
    });
    expect(r.prazoLiberacaoDias).toBe(180);
    expect(r.prazoLiberacaoMeses).toBe(6);
  });

  it("preço justo ao vendedor = custo total justo − lance", () => {
    const r = precificarAtivaLanceQuitacao({
      creditoAtual: 100_000,
      lanceQuitacao: 40_000,
      metaMultiploCdi: 2,
      curva: CURVA,
    });
    // custo total justo = credito / (1 + meta*cdiAcumulado)
    const custoTotalJusto = 100_000 / (1 + 2 * r.cdiAcumuladoPeriodo);
    expect(r.precoJustoVendedor).toBeCloseTo(custoTotalJusto - 40_000, 2);
  });

  it("no preço justo, o retorno bate a meta", () => {
    const r = precificarAtivaLanceQuitacao({
      creditoAtual: 100_000,
      lanceQuitacao: 40_000,
      metaMultiploCdi: 2,
      curva: CURVA,
    });
    expect(r.precoVendedorAvaliado).toBe(r.precoJustoVendedor);
    expect(r.retorno!.multiploCdi).toBeCloseTo(2, 1);
  });

  it("lance alto demais deixa o preço justo ao vendedor negativo, com aviso", () => {
    const r = precificarAtivaLanceQuitacao({
      creditoAtual: 100_000,
      lanceQuitacao: 95_000,
      metaMultiploCdi: 2,
      curva: CURVA,
    });
    expect(r.precoJustoVendedor).toBeLessThan(0);
    expect(
      r.avisos.some((a) => /não deixa margem/i.test(a)),
    ).toBe(true);
  });

  it("preço ofertado ao vendedor menor que o justo dá múltiplo do CDI maior", () => {
    const r = precificarAtivaLanceQuitacao({
      creditoAtual: 100_000,
      lanceQuitacao: 40_000,
      metaMultiploCdi: 2,
      precoOfertado: 5_000,
      curva: CURVA,
    });
    expect(r.custoTotalAvaliado).toBe(45_000);
    expect(r.retorno!.multiploCdi!).toBeGreaterThan(2);
  });

  it("avisos: sem crédito e sem lance", () => {
    const r = precificarAtivaLanceQuitacao({
      creditoAtual: 0,
      lanceQuitacao: 0,
      curva: CURVA,
    });
    expect(r.avisos.some((a) => /crédito líquido/i.test(a))).toBe(true);
    expect(r.avisos.some((a) => /lance de quitação/i.test(a))).toBe(true);
  });
});
