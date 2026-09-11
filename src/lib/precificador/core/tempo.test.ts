import { describe, expect, it } from "vitest";
import { mesesEntre } from "./tempo";

describe("mesesEntre", () => {
  it("conta 12 × anos + meses, dia fixado no 1º", () => {
    // exemplo real (carta ERIKA): proposta rodada em 10/09/2026, grupo encerra 23/03/2029
    expect(mesesEntre("2026-09-10", "2029-03-23")).toBe(30);
  });

  it("mesmo mês = 0, independente do dia", () => {
    expect(mesesEntre("2026-09-30", "2026-09-01")).toBe(0);
    expect(mesesEntre("2026-09-01", "2026-09-30")).toBe(0);
  });

  it("nunca negativo", () => {
    expect(mesesEntre("2029-01-15", "2026-09-01")).toBe(0);
  });

  it("aceita objetos Date", () => {
    expect(mesesEntre(new Date(2026, 8, 10), new Date(2029, 2, 23))).toBe(30);
  });

  it("dia 1 não escorrega para o mês anterior por fuso", () => {
    expect(mesesEntre("2026-01-01", "2026-03-01")).toBe(2);
  });
});
