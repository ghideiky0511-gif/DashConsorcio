import { describe, expect, it } from "vitest";
import { gerarCronogramaParcelas } from "./parcelas";

describe("gerarCronogramaParcelas", () => {
  it("gera as parcelas restantes, uma por mês, no dia de vencimento", () => {
    const parcelas = gerarCronogramaParcelas({
      parcelasTotais: 180,
      parcelasQuitadas: 177,
      parcelaValor: 1200,
      diaVencimento: 10,
      dataReferencia: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(parcelas).toHaveLength(3);
    expect(parcelas[0]).toEqual({
      numero: 178,
      competencia: new Date("2026-09-01T00:00:00.000Z"),
      vencimento: new Date("2026-09-10T00:00:00.000Z"),
      valorPrevisto: 1200,
    });
    expect(parcelas[2]!.numero).toBe(180);
    expect(parcelas[2]!.vencimento).toEqual(new Date("2026-11-10T00:00:00.000Z"));
  });

  it("pula pro mês seguinte quando o vencimento deste mês já passou", () => {
    const parcelas = gerarCronogramaParcelas({
      parcelasTotais: 2,
      parcelasQuitadas: 0,
      parcelaValor: 500,
      diaVencimento: 5,
      dataReferencia: new Date("2026-09-20T00:00:00.000Z"),
    });

    expect(parcelas[0]!.vencimento).toEqual(new Date("2026-10-05T00:00:00.000Z"));
    expect(parcelas[1]!.vencimento).toEqual(new Date("2026-11-05T00:00:00.000Z"));
  });

  it("ajusta dia de vencimento inexistente pro último dia do mês", () => {
    const parcelas = gerarCronogramaParcelas({
      parcelasTotais: 2,
      parcelasQuitadas: 0,
      parcelaValor: 500,
      diaVencimento: 31,
      dataReferencia: new Date("2027-01-15T00:00:00.000Z"),
    });

    // vencimento deste mês (31/01) ainda não passou -> começa em janeiro
    expect(parcelas[0]!.vencimento).toEqual(new Date("2027-01-31T00:00:00.000Z"));
    // fevereiro/2027 não tem dia 31 -> cai no dia 28
    expect(parcelas[1]!.vencimento).toEqual(new Date("2027-02-28T00:00:00.000Z"));
  });

  it("atravessa a virada de ano", () => {
    const parcelas = gerarCronogramaParcelas({
      parcelasTotais: 2,
      parcelasQuitadas: 0,
      parcelaValor: 500,
      diaVencimento: 15,
      dataReferencia: new Date("2026-12-01T00:00:00.000Z"),
    });

    expect(parcelas[0]!.vencimento).toEqual(new Date("2026-12-15T00:00:00.000Z"));
    expect(parcelas[1]!.vencimento).toEqual(new Date("2027-01-15T00:00:00.000Z"));
  });

  it("retorna vazio quando não há parcelas restantes", () => {
    expect(
      gerarCronogramaParcelas({
        parcelasTotais: 10,
        parcelasQuitadas: 10,
        parcelaValor: 100,
        diaVencimento: 5,
        dataReferencia: new Date(),
      }),
    ).toEqual([]);
  });
});
