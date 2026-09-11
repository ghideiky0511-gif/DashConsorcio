import { describe, expect, it } from "vitest";
import { precificarAtivaContemplada } from "./ativa-parcelas";

const CURVA_ZERO = { cdiAnual: 0, pontos: [{ meses: 1, taxaAnual: 0 }] };

const CURVA_REAL = {
  cdiAnual: 0.139,
  pontos: [
    { meses: 1, taxaAnual: 0.139 },
    { meses: 15, taxaAnual: 0.1205 },
    { meses: 27, taxaAnual: 0.1056 },
    { meses: 39, taxaAnual: 0.1021 },
    { meses: 51, taxaAnual: 0.1007 },
  ],
};

describe("precificarAtivaContemplada", () => {
  it("com CDI 0%, o preço justo é a soma nominal do fluxo (sem desconto)", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      parcelasRestantes: 60,
      curva: CURVA_ZERO,
    });
    // 90.000 recebidos hoje − 60 parcelas de 1.000 = 30.000
    expect(r.precoJusto).toBe(30_000);
    expect(r.valorNominalTotal).toBe(30_000);
  });

  it("monta o fluxo: crédito hoje, parcelas negativas nos meses seguintes", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      parcelasRestantes: 3,
      taxaTransferencia: 500,
      curva: CURVA_ZERO,
    });
    expect(r.fluxoSemAquisicao).toEqual([
      { meses: 0, valor: 89_500 },
      { meses: 1, valor: -1_000 },
      { meses: 2, valor: -1_000 },
      { meses: 3, valor: -1_000 },
    ]);
    expect(r.valorNominalTotal).toBe(86_500);
  });

  it("o preço justo faz valorNominalTotal/preço − 1 bater exatamente meta × CDI", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      parcelasRestantes: 60,
      metaMultiploCdi: 2,
      curva: CURVA_REAL,
    });
    const retornoNoPrecoJusto = r.valorNominalTotal / r.precoJusto! - 1;
    expect(retornoNoPrecoJusto).toBeCloseTo(2 * r.cdiAcumuladoPeriodo, 4);
  });

  it("no preço justo, o múltiplo do CDI do retorno bate a meta", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      parcelasRestantes: 60,
      metaMultiploCdi: 2,
      curva: CURVA_REAL,
    });
    expect(r.precoAvaliado).toBe(r.precoJusto);
    expect(r.retorno!.multiploCdi).toBeCloseTo(2, 1);
  });

  it("pagar menos que o preço justo dá retorno acima da meta", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      parcelasRestantes: 60,
      metaMultiploCdi: 2,
      precoOfertado: 10_000,
      curva: CURVA_REAL,
    });
    expect(r.retorno!.multiploCdi!).toBeGreaterThan(2);
    expect(r.avisos.some((a) => /abaixo da meta/i.test(a))).toBe(false);
  });

  it("pagar mais que o preço justo dá aviso de retorno abaixo da meta", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      parcelasRestantes: 60,
      metaMultiploCdi: 2,
      precoOfertado: 40_000,
      curva: CURVA_REAL,
    });
    expect(r.retorno!.multiploCdi!).toBeLessThan(2);
    expect(r.avisos.some((a) => /abaixo da meta/i.test(a))).toBe(true);
  });

  it("avisos: sem parcelas restantes e parcela zerada", () => {
    const semParcelas = precificarAtivaContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      parcelasRestantes: 0,
      curva: CURVA_ZERO,
    });
    expect(semParcelas.avisos.some((a) => /sem parcelas restantes/i.test(a))).toBe(true);

    const parcelaZerada = precificarAtivaContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 0,
      parcelasRestantes: 12,
      curva: CURVA_ZERO,
    });
    expect(parcelaZerada.avisos.some((a) => /parcela mensal zerada/i.test(a))).toBe(true);
  });

  it("percentual da contemplação calcula o lance em R$ (base = crédito)", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      parcelasRestantes: 60,
      percentualLanceContemplacao: 25,
      curva: CURVA_ZERO,
    });
    expect(r.lanceContemplacao).toBe(22_500); // 90.000 × 25%
    expect(r.fluxoSemAquisicao[0].valor).toBe(90_000 - 22_500);
  });

  it("percentual tem prioridade sobre o lance em R$ quando os dois vêm preenchidos", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      parcelasRestantes: 60,
      lanceContemplacao: 5_000,
      percentualLanceContemplacao: 10,
      curva: CURVA_ZERO,
    });
    expect(r.lanceContemplacao).toBe(9_000); // 90.000 × 10%, ignora os 5.000
  });

  it("sem percentual, usa o lance em R$ informado", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      parcelasRestantes: 60,
      lanceContemplacao: 5_000,
      curva: CURVA_ZERO,
    });
    expect(r.lanceContemplacao).toBe(5_000);
  });

  it("aviso quando as parcelas somam mais que o crédito", () => {
    const r = precificarAtivaContemplada({
      creditoAtual: 10_000,
      parcelaMensal: 1_000,
      parcelasRestantes: 20,
      curva: CURVA_ZERO,
    });
    expect(r.valorNominalTotal).toBeLessThan(0);
    expect(r.precoJusto).toBeNull();
    expect(r.avisos.some((a) => /mais que o crédito/i.test(a))).toBe(true);
    expect(r.retorno).toBeNull();
  });
});
