import { describe, expect, it } from "vitest";
import { avaliarAtualidade } from "./atualidade";
import type { CampoExtrato } from "./schema";

const HOJE = new Date(2026, 8, 10); // 10/09/2026

function campos(over: Partial<CampoExtrato> = {}): CampoExtrato {
  return {
    administradora: "Itaú",
    grupo: "020358",
    cota: "0223",
    contrato: null,
    situacaoCobranca: "EXCLUIDO",
    dataEmissaoExtrato: "2026-09-02",
    valorCredito: 253_574,
    percentualPagoPct: 6.792,
    fundoComumPago: 15_727.7,
    dataPrevistaEncerramento: "2029-03-23",
    indiceCorrecao: "IPCA",
    prazoGrupoMeses: 100,
    parcelaMensal: null,
    parcelasRestantes: null,
    assembleiaAtualNumero: 63,
    assembleiaAtualData: "2026-02-24",
    proximoReajusteData: "2027-01-06",
    camposFaltantes: [],
    observacoes: null,
    ...over,
  };
}

describe("avaliarAtualidade — extrato ERIKA (caso saudável)", () => {
  const r = avaliarAtualidade(campos(), HOJE);

  it("extrato do mês vigente = ok", () => {
    expect(r.validacao.extratoVigente.status).toBe("ok");
  });

  it("nenhuma assembleia decorrida desde a emissão (mesmo mês) = ok", () => {
    expect(r.validacao.assembleiaPassou.status).toBe("ok");
    expect(r.assembleiasDesdeEmissao).toBe(0);
  });

  it("grupo longe do encerramento = ok, com meses calculados", () => {
    expect(r.validacao.grupoEncerrado.status).toBe("ok");
    expect(r.mesesAteEncerramento).toBe(30);
  });

  it("situação EXCLUÍDO -> motor CANCELADA", () => {
    expect(r.motor).toBe("CANCELADA");
    expect(r.validacao.situacao.status).toBe("ok");
  });

  it("status geral ok", () => {
    expect(r.statusGeral).toBe("ok");
  });
});

describe("avaliarAtualidade — extrato do mês passado", () => {
  it("1 mês atrás = atenção", () => {
    const r = avaliarAtualidade(campos({ dataEmissaoExtrato: "2026-08-02" }), HOJE);
    expect(r.validacao.extratoVigente.status).toBe("atencao");
    expect(r.validacao.assembleiaPassou.status).toBe("atencao");
    expect(r.assembleiasDesdeEmissao).toBe(1);
    expect(r.assembleiaEstimadaHoje).toBe(64);
  });

  it("3+ meses atrás = bloqueio", () => {
    const r = avaliarAtualidade(campos({ dataEmissaoExtrato: "2026-05-02" }), HOJE);
    expect(r.validacao.extratoVigente.status).toBe("bloqueio");
  });
});

describe("avaliarAtualidade — grupo encerrado", () => {
  it("data de encerramento no passado = bloqueio", () => {
    const r = avaliarAtualidade(
      campos({ dataPrevistaEncerramento: "2026-01-15" }),
      HOJE,
    );
    expect(r.validacao.grupoEncerrado.status).toBe("bloqueio");
    expect(r.statusGeral).toBe("bloqueio");
  });

  it("faltando menos de 3 meses = atenção", () => {
    const r = avaliarAtualidade(
      campos({ dataPrevistaEncerramento: "2026-11-20" }),
      HOJE,
    );
    expect(r.validacao.grupoEncerrado.status).toBe("atencao");
    expect(r.mesesAteEncerramento).toBe(2);
  });
});

describe("avaliarAtualidade — reajuste pendente", () => {
  it("reajuste entre a emissão e hoje = atenção", () => {
    const r = avaliarAtualidade(
      campos({ dataEmissaoExtrato: "2026-08-01", proximoReajusteData: "2026-08-15" }),
      HOJE,
    );
    expect(r.validacao.reajustePendente.status).toBe("atencao");
  });

  it("reajuste no futuro = ok", () => {
    const r = avaliarAtualidade(campos({ proximoReajusteData: "2027-01-06" }), HOJE);
    expect(r.validacao.reajustePendente.status).toBe("ok");
  });
});

describe("avaliarAtualidade — situação de cobrança", () => {
  it("EM_ATRASO -> motor ATIVA com aviso", () => {
    const r = avaliarAtualidade(campos({ situacaoCobranca: "EM_ATRASO" }), HOJE);
    expect(r.motor).toBe("ATIVA");
    expect(r.validacao.situacao.status).toBe("atencao");
  });

  it("ATIVO -> motor ATIVA, ok", () => {
    const r = avaliarAtualidade(campos({ situacaoCobranca: "ATIVO" }), HOJE);
    expect(r.motor).toBe("ATIVA");
    expect(r.validacao.situacao.status).toBe("ok");
  });

  it("null -> motor desconhecido, atenção", () => {
    const r = avaliarAtualidade(campos({ situacaoCobranca: null }), HOJE);
    expect(r.motor).toBeNull();
    expect(r.validacao.situacao.status).toBe("atencao");
  });
});

describe("avaliarAtualidade — campos faltantes", () => {
  it("aponta os campos essenciais ausentes e sobe o status geral", () => {
    const r = avaliarAtualidade(
      campos({ valorCredito: null, dataPrevistaEncerramento: null }),
      HOJE,
    );
    expect(r.validacao.camposFaltantes.status).toBe("atencao");
    expect(r.validacao.camposFaltantes.mensagem).toMatch(/crédito/);
    expect(r.statusGeral).not.toBe("ok");
  });
});
