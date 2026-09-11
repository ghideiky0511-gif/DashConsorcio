import { describe, expect, it } from "vitest";
import {
  COLUNAS_IMPORTACAO,
  mapearLinha,
  parseCsv,
  parseDataPlanilha,
  processarLinhasCsv,
  sugerirMapeamento,
} from "./import";

describe("parseCsv", () => {
  it("detecta ';' (padrão Excel pt-BR) e separa colunas", () => {
    const linhas = parseCsv("a;b;c\n1;2;3\n");
    expect(linhas).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("detecta ',' quando não há ';'", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("respeita campos entre aspas com delimitador e quebra de linha dentro", () => {
    const linhas = parseCsv('a;b\n"Silva; Souza";"linha\ndupla"\n');
    expect(linhas).toEqual([
      ["a", "b"],
      ["Silva; Souza", "linha\ndupla"],
    ]);
  });

  it("aspas duplicadas viram uma aspa literal", () => {
    expect(parseCsv('a\n"ele disse ""oi"""\n')).toEqual([["a"], ['ele disse "oi"']]);
  });

  it("remove BOM e ignora linhas totalmente vazias", () => {
    const linhas = parseCsv("﻿a;b\n1;2\n\n3;4\n");
    expect(linhas).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});

describe("parseDataPlanilha", () => {
  it("aceita dd/mm/aaaa", () => {
    expect(parseDataPlanilha("10/03/2026")).toEqual(new Date("2026-03-10T00:00:00.000Z"));
  });

  it("aceita ano com 2 dígitos", () => {
    expect(parseDataPlanilha("10/03/26")).toEqual(new Date("2026-03-10T00:00:00.000Z"));
  });

  it("rejeita data inválida (31 de fevereiro)", () => {
    expect(parseDataPlanilha("31/02/2026")).toBeNull();
  });

  it("vazio -> null", () => {
    expect(parseDataPlanilha(undefined)).toBeNull();
    expect(parseDataPlanilha("")).toBeNull();
  });
});

describe("sugerirMapeamento", () => {
  it("casa cabeçalhos ignorando acento/caixa/espaço", () => {
    const mapeamento = sugerirMapeamento(["controle interno ssa", "CESSIONÁRIA", "grupo", "cota", "adm"]);
    expect(mapeamento.codigo).toBe("controle interno ssa");
    expect(mapeamento.cessionariaNome).toBe("CESSIONÁRIA");
    expect(mapeamento.grupo).toBe("grupo");
  });

  it("coluna sem correspondência fica null", () => {
    const mapeamento = sugerirMapeamento(["codigo"]);
    expect(mapeamento.senha).toBeNull();
  });

  it("cobre as 36 colunas do template", () => {
    expect(COLUNAS_IMPORTACAO).toHaveLength(36);
  });
});

describe("mapearLinha", () => {
  const base = {
    codigo: "SSA-001",
    cessionariaNome: "HH Consórcio LTDA",
    administradoraNome: "Porto",
    grupo: "1234",
    cota: "056",
  };

  it("mapeia os campos obrigatórios com o resto vazio", () => {
    const r = mapearLinha(base, 2);
    expect("erro" in r).toBe(false);
    if ("linha" in r) {
      expect(r.linha.carta.codigo).toBe("SSA-001");
      expect(r.linha.carta.valorCompra).toBe(0);
      expect(r.linha.acesso).toBeNull();
      expect(r.linha.cedente).toBeNull();
      expect(r.linha.despesas).toEqual([]);
    }
  });

  it("erro quando falta campo obrigatório", () => {
    const r = mapearLinha({ ...base, codigo: "" }, 5);
    expect("erro" in r).toBe(true);
    if ("erro" in r) {
      expect(r.erro.linha).toBe(5);
      expect(r.erro.mensagem).toContain("Controle Interno SSA");
    }
  });

  it("parseia valores em R$ e monta as despesas informadas", () => {
    const r = mapearLinha(
      {
        ...base,
        valorCompra: "R$ 10.000,00",
        despesaComissao: "500,00",
        despesaDare: "0",
        despesaCartorio: "120,50",
      },
      2,
    );
    if ("linha" in r) {
      expect(r.linha.carta.valorCompra).toBe(10_000);
      expect(r.linha.despesas).toEqual([
        { tipo: "COMISSAO", valor: 500 },
        { tipo: "CARTORIO", valor: 120.5 },
      ]);
    } else {
      throw new Error("esperava sucesso");
    }
  });

  it("avisa quando o Custo TOTAL da planilha diverge do calculado", () => {
    const r = mapearLinha(
      { ...base, valorCompra: "10.000,00", despesaComissao: "500,00", custoTotalPlanilha: "10.000,00" },
      2,
    );
    if ("linha" in r) {
      expect(r.linha.avisos.some((a) => a.includes("diverge"))).toBe(true);
    } else {
      throw new Error("esperava sucesso");
    }
  });

  it("separa e-mail e cota chave da mesma célula", () => {
    const r = mapearLinha({ ...base, emailCotaChave: "joao@x.com / ABC123" }, 2);
    if ("linha" in r) {
      expect(r.linha.acesso).toEqual({
        emailCadastro: "joao@x.com",
        cotaChave: "ABC123",
        celular: null,
        senha: null,
      });
    } else {
      throw new Error("esperava sucesso");
    }
  });

  it("flag SIM sem data em originais Severi gera aviso e não seta data", () => {
    const r = mapearLinha({ ...base, dataOriginaisSeveri: "SIM" }, 2);
    if ("linha" in r) {
      expect(r.linha.carta.dataOriginaisSeveri).toBeNull();
      expect(r.linha.avisos.some((a) => a.includes("sem data"))).toBe(true);
    } else {
      throw new Error("esperava sucesso");
    }
  });

  it("extrai valor e data de 'Valor Resgatado em:' e marca tipoSaida RESGATE", () => {
    const r = mapearLinha({ ...base, valorResgatadoEm: "R$ 12.345,67 em 10/03/2026" }, 2);
    if ("linha" in r) {
      expect(r.linha.carta.valorResgatado).toBe(12_345.67);
      expect(r.linha.carta.dataResgate).toEqual(new Date("2026-03-10T00:00:00.000Z"));
      expect(r.linha.carta.tipoSaida).toBe("RESGATE");
    } else {
      throw new Error("esperava sucesso");
    }
  });

  it("cedente só aparece quando o nome vem preenchido", () => {
    const r = mapearLinha({ ...base, cedenteDocumento: "123.456.789-00" }, 2);
    if ("linha" in r) expect(r.linha.cedente).toBeNull();
    else throw new Error("esperava sucesso");
  });
});

describe("processarLinhasCsv", () => {
  it("aplica o mapeamento e devolve linhas + erros", () => {
    const csv = parseCsv(
      "Controle Interno SSA;Cessionária;ADM;Grupo;Cota\nSSA-001;HH;Porto;1234;056\n;HH;Porto;1234;057\n",
    );
    const mapeamento = sugerirMapeamento(csv[0]!);
    const { linhas, erros } = processarLinhasCsv(csv, mapeamento);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]!.carta.codigo).toBe("SSA-001");
    expect(erros).toHaveLength(1);
    expect(erros[0]!.linha).toBe(3);
  });
});
