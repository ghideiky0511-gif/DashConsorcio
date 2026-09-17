import { describe, expect, it } from "vitest";
import { precificarAtivaNaoContemplada } from "./ativa-nao-contemplada";

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

describe("precificarAtivaNaoContemplada", () => {
  it("com CDI 0%, o preço justo do cenário esperado é a soma nominal do fluxo", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      mesesAteEncerramento: 60,
      curva: CURVA_ZERO,
    });
    // 90.000 na contemplação − 60 parcelas de 1.000 pagas até o fim = 30.000
    expect(r.valorNominalTotal).toBe(30_000);
    expect(r.precoJusto).toBe(30_000);
  });

  it("sem estimativa própria, usa metade do prazo restante como cenário esperado", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      mesesAteEncerramento: 60,
      curva: CURVA_ZERO,
    });
    expect(r.mesesAteContemplacaoEstimados).toBe(30);
  });

  it("respeita a estimativa própria de meses até a contemplação", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      mesesAteEncerramento: 60,
      mesesAteContemplacaoEstimados: 10,
      curva: CURVA_ZERO,
    });
    expect(r.mesesAteContemplacaoEstimados).toBe(10);
  });

  it("monta 3 cenários: otimista, esperado e pessimista", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      mesesAteEncerramento: 60,
      curva: CURVA_ZERO,
    });
    expect(r.cenarios.map((c) => c.rotulo)).toEqual(["otimista", "esperado", "pessimista"]);
    expect(r.cenarios[0].mesesAteContemplacao).toBe(15); // 60 × 0.25
    expect(r.cenarios[1].mesesAteContemplacao).toBe(30); // 60 × 0.5
    expect(r.cenarios[2].mesesAteContemplacao).toBe(60); // 60 × 1
  });

  it("no preço justo do cenário esperado, o múltiplo do CDI bate a meta", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      mesesAteEncerramento: 60,
      metaMultiploCdi: 2,
      curva: CURVA_REAL,
    });
    expect(r.precoAvaliado).toBe(r.precoJusto);
    expect(r.retorno!.multiploCdi).toBeCloseTo(2, 1);
  });

  it("pagar menos que o preço justo dá retorno acima da meta", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      mesesAteEncerramento: 60,
      metaMultiploCdi: 2,
      precoOfertado: 10_000,
      curva: CURVA_REAL,
    });
    expect(r.retorno!.multiploCdi!).toBeGreaterThan(2);
  });

  it("alerta que negócio é ruim quando as parcelas superam o crédito", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 20_000,
      parcelaMensal: 1_000,
      mesesAteEncerramento: 60,
      curva: CURVA_ZERO,
    });
    expect(r.valorNominalTotal).toBeLessThan(0);
    expect(r.precoJusto).toBeNull();
    expect(r.avisos.some((a) => a.includes("negócio ruim"))).toBe(true);
  });

  it("com CDI > 0, contemplar cedo reinveste o crédito e dá cenários diferentes", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      mesesAteEncerramento: 60,
      metaMultiploCdi: 2,
      curva: CURVA_REAL,
    });
    const [otimista, esperado, pessimista] = r.cenarios;
    // Otimista contempla mais cedo → mais tempo pra reinvestir o crédito → recebe mais.
    expect(otimista.valorNominalTotal).toBeGreaterThan(esperado.valorNominalTotal);
    expect(esperado.valorNominalTotal).toBeGreaterThan(pessimista.valorNominalTotal);
    expect(otimista.precoJusto!).toBeGreaterThan(pessimista.precoJusto!);
  });

  it("o preço justo principal é sempre o piso do cenário pessimista", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_814.3,
      parcelaMensal: 708.05,
      mesesAteEncerramento: 60,
      metaMultiploCdi: 2,
      curva: CURVA_REAL,
    });
    const pessimista = r.cenarios[r.cenarios.length - 1];
    expect(r.precoJusto).toBe(pessimista.precoJusto);
    expect(r.valorNominalTotal).toBe(pessimista.valorNominalTotal);
  });

  it("no cenário pessimista o crédito não é reinvestido — bate com a fórmula nominal simples", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      mesesAteEncerramento: 60,
      curva: CURVA_REAL,
    });
    const pessimista = r.cenarios[r.cenarios.length - 1];
    expect(pessimista.valorNominalTotal).toBe(30_000);
  });

  it("sempre alerta sobre a incerteza do mês de contemplação", () => {
    const r = precificarAtivaNaoContemplada({
      creditoAtual: 90_000,
      parcelaMensal: 1_000,
      mesesAteEncerramento: 60,
      curva: CURVA_ZERO,
    });
    expect(r.avisos.some((a) => a.includes("incerto"))).toBe(true);
  });
});
