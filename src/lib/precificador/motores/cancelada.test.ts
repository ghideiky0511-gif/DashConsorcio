import { describe, expect, it } from "vitest";
import { precificarCancelada } from "./cancelada";

// Curva simplificada e estável para os testes (não depende de rede).
const CURVA = {
  cdiAnual: 0.139,
  ipcaProjAnual: 0.043,
  pontos: [
    { meses: 1, taxaAnual: 0.139 },
    { meses: 15, taxaAnual: 0.1205 },
    { meses: 27, taxaAnual: 0.1056 },
    { meses: 39, taxaAnual: 0.1021 },
  ],
};

// Carta ERIKA (extrato Itaú): crédito 253.574 · %pago 6,7920 · fundo comum pago
// 15.727,70 · encerra 23/03/2029. Referência: 10/09/2026 → 30 meses.
const ERIKA = {
  creditoAtual: 253_574,
  percentualPagoPct: 6.792,
  fundoComumPago: 15_727.7,
  encerramentoGrupo: "2029-03-23",
  dataReferencia: "2026-09-10",
  indiceCorrecaoAnual: 0.043,
  metaMultiploCdi: 2,
  curva: CURVA,
};

describe("precificarCancelada", () => {
  it("monta o resultado completo para a carta de exemplo", () => {
    const r = precificarCancelada(ERIKA);

    expect(r.motor).toBe("CANCELADA");
    expect(r.mesesAteEncerramento).toBe(30);
    expect(r.baseResgateOrigem).toBe("fundo_comum_pago");
    expect(r.baseResgate).toBe(15_727.7);

    // resgate = 15.727,70 corrigido por 4,3% a.a. em 2,5 anos
    expect(r.resgateProjetado).toBeCloseTo(15_727.7 * Math.pow(1.043, 2.5), 0);

    // CDI acumulado no prazo (~10,5% a.a. em 30 meses)
    expect(r.cdiAcumuladoPeriodo).toBeGreaterThan(0.25);
    expect(r.cdiAcumuladoPeriodo).toBeLessThan(0.32);

    // benchmarks reproduzem os sites
    expect(r.propostaMdv.valor).toBe(8_000);
    expect(r.propostaObjetiva.valor).toBe(6_000);

    // preço justo bate a meta quando recalculado
    expect(r.precoJusto).not.toBeNull();
    expect(r.precoAvaliado).toBe(r.precoJusto);
    expect(r.retorno!.multiploCdi).toBeCloseTo(2, 1);
  });

  it("no preço justo o retorno total ≈ meta × CDI acumulado", () => {
    const r = precificarCancelada(ERIKA);
    expect(r.retorno!.retornoTotal).toBeCloseTo(
      r.metaMultiploCdi * r.cdiAcumuladoPeriodo,
      2,
    );
  });

  it("usa o proxy SSA e avisa quando falta o fundo comum pago", () => {
    const semFundo = { ...ERIKA, fundoComumPago: undefined };
    const r = precificarCancelada(semFundo);
    expect(r.baseResgateOrigem).toBe("proxy_ssa");
    // proxy = 253.574 × 6,792% × 0,87 = 14.983,79 (antes da correção)
    expect(r.baseResgate).toBeCloseTo(14_983.79, 2);
    expect(r.avisos.some((a) => /proxy/i.test(a))).toBe(true);
  });

  it("cenários: resgate cresce com o índice, e o do meio é o base", () => {
    const r = precificarCancelada(ERIKA);
    expect(r.cenarios).toHaveLength(3);
    const [baixo, base, alto] = r.cenarios;
    expect(baixo.resgateProjetado).toBeLessThan(base.resgateProjetado);
    expect(alto.resgateProjetado).toBeGreaterThan(base.resgateProjetado);
    expect(base.indiceCorrecaoAnual).toBeCloseTo(0.043, 4);
    expect(base.resgateProjetado).toBe(r.resgateProjetado);
  });

  it("preço ofertado abaixo do justo → múltiplo do CDI acima da meta, com aviso ausente", () => {
    const r = precificarCancelada({ ...ERIKA, precoOfertado: 5_000 });
    expect(r.precoAvaliado).toBe(5_000);
    expect(r.retorno!.multiploCdi!).toBeGreaterThan(2);
    expect(r.avisos.some((a) => /abaixo da meta/i.test(a))).toBe(false);
  });

  it("preço ofertado acima do justo → aviso de retorno abaixo da meta", () => {
    const r = precificarCancelada({ ...ERIKA, precoOfertado: 14_000 });
    expect(r.retorno!.multiploCdi!).toBeLessThan(2);
    expect(r.avisos.some((a) => /abaixo da meta/i.test(a))).toBe(true);
  });

  it("grupo encerrado → prazo zero e aviso", () => {
    const r = precificarCancelada({
      ...ERIKA,
      dataReferencia: "2030-01-01",
    });
    expect(r.mesesAteEncerramento).toBe(0);
    expect(r.avisos.some((a) => /prazo zero/i.test(a))).toBe(true);
  });
});
