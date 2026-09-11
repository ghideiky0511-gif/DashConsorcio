// Importador da planilha de controle. Puro — sem Prisma, sem I/O, roda no
// NAVEGADOR (importado por `ImportarWizard`, client component) — por isso não
// pode importar `action-utils.ts` (puxaria o Prisma Client inteiro pro bundle
// do cliente). Cobertas por testes. Resolução de Cessionária/Administradora
// por nome, cálculo de etapa e gravação em lote vivem na server action
// (`src/app/actions/import.ts`), que é quem sabe falar com o banco.

import type { TipoDespesa } from "@/generated/prisma/client";

/** "1.234,56" ou "1234.56" -> número, ou null. */
function parseMoneyInput(value: string): number | null {
  if (value.trim() === "") return null;
  const normalized = value
    .trim()
    .replace(/\s|R\$/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/** "70" ou "70%" ou "0,7" -> fração 0..1, ou null. Valores > 1 são tratados como porcentagem. */
function parsePercentInput(value: string): number | null {
  const num = parseMoneyInput(value.replace("%", ""));
  if (num == null) return null;
  return num > 1 ? num / 100 : num;
}

/** Chave interna de cada uma das 36 colunas do template. */
export const COLUNAS_IMPORTACAO = [
  { chave: "codigo", rotulo: "Controle Interno SSA", obrigatoria: true },
  { chave: "cessionariaNome", rotulo: "Cessionária", obrigatoria: true },
  { chave: "dataCompra", rotulo: "Data da Compra", obrigatoria: false },
  { chave: "grupo", rotulo: "Grupo", obrigatoria: true },
  { chave: "cota", rotulo: "Cota", obrigatoria: true },
  { chave: "contrato", rotulo: "Contrato", obrigatoria: false },
  { chave: "administradoraNome", rotulo: "ADM", obrigatoria: true },
  { chave: "cedenteNome", rotulo: "Cedente (Consorciado)", obrigatoria: false },
  { chave: "cedenteDocumento", rotulo: "CPF / CNPJ", obrigatoria: false },
  { chave: "origem", rotulo: "Origem (intermediador)", obrigatoria: false },
  { chave: "dataCadastroBolsa", rotulo: "Data do cadastro BOLSA", obrigatoria: false },
  { chave: "emailCotaChave", rotulo: "E-mail cadastro / Cota Chave", obrigatoria: false },
  { chave: "celular", rotulo: "Celular Cadastrado", obrigatoria: false },
  { chave: "senha", rotulo: "Senha", obrigatoria: false },
  { chave: "valorCompra", rotulo: "Custo da Aquisição", obrigatoria: false },
  { chave: "despesaComissao", rotulo: "Custo da Comissão", obrigatoria: false },
  { chave: "despesaDare", rotulo: "DARE", obrigatoria: false },
  { chave: "despesaGuiaTj", rotulo: "Guia TJ", obrigatoria: false },
  { chave: "despesaCartorio", rotulo: "Despesas Cartório", obrigatoria: false },
  { chave: "despesaDiversas", rotulo: "Despesas Diversas", obrigatoria: false },
  { chave: "custoTotalPlanilha", rotulo: "Custo TOTAL da Cota", obrigatoria: false },
  { chave: "valorCredito", rotulo: "Crédito Atual", obrigatoria: false },
  { chave: "encerramentoGrupo", rotulo: "ENCERRAMENTO DO GRUPO", obrigatoria: false },
  { chave: "contempladaEm", rotulo: "Data da CONTEMPLAÇÃO", obrigatoria: false },
  { chave: "valorCreditoContemplacao", rotulo: "Valor do Crédito", obrigatoria: false },
  { chave: "percentualPago", rotulo: "Percentual Pago", obrigatoria: false },
  { chave: "previsaoResgate", rotulo: "Previsão de Resgate (R$)", obrigatoria: false },
  { chave: "previsaoLucroPlanilha", rotulo: "Previsão % Lucro/Total", obrigatoria: false },
  { chave: "dataCopiasSeveri", rotulo: "Data Envio CÓPIAS Doctos a Severi", obrigatoria: false },
  { chave: "dataOriginaisSeveri", rotulo: "Doctos ORIGINAIS enviados a Severi", obrigatoria: false },
  { chave: "observacoes", rotulo: "OBSERVAÇÃO (Documento pendente, etc)", obrigatoria: false },
  { chave: "dataNotificacao", rotulo: "Data da Notificação", obrigatoria: false },
  { chave: "dataDoctoAdm", rotulo: "Data Docto enviado para ADM", obrigatoria: false },
  { chave: "dataPedidoResgate", rotulo: "Data do Pedido de Resgate", obrigatoria: false },
  { chave: "valorResgatadoEm", rotulo: "Valor Resgatado em:", obrigatoria: false },
  { chave: "observacoesGerais", rotulo: "Observações Gerais", obrigatoria: false },
] as const;

export type ChaveImportacao = (typeof COLUNAS_IMPORTACAO)[number]["chave"];

// ─────────────────────────── CSV ───────────────────────────

/** Remove acentos, baixa a caixa e colapsa espaços — para casar cabeçalhos. */
const DIACRITICOS = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g",
);

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Detecta ";" (padrão do Excel pt-BR) ou "," pela primeira linha. */
function detectarDelimitador(primeiraLinha: string): "," | ";" {
  const porPontoVirgula = primeiraLinha.split(";").length;
  const porVirgula = primeiraLinha.split(",").length;
  return porPontoVirgula >= porVirgula ? ";" : ",";
}

/** Parser de CSV com suporte a campos entre aspas (com delimitador/quebra de linha dentro). */
export function parseCsv(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const primeiraLinha = limpo.slice(0, limpo.indexOf("\n") === -1 ? undefined : limpo.indexOf("\n"));
  const delimitador = detectarDelimitador(primeiraLinha);

  const linhas: string[][] = [];
  let campo = "";
  let linhaAtual: string[] = [];
  let dentroAspas = false;

  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (dentroAspas) {
      if (c === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') {
      dentroAspas = true;
    } else if (c === delimitador) {
      linhaAtual.push(campo);
      campo = "";
    } else if (c === "\n") {
      linhaAtual.push(campo);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || linhaAtual.length > 0) {
    linhaAtual.push(campo);
    linhas.push(linhaAtual);
  }

  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

// ───────────────────────── Mapeamento de colunas ─────────────────────────

/** Para cada coluna do template, sugere qual cabeçalho do arquivo bate (ou null). */
export function sugerirMapeamento(
  headersArquivo: string[],
): Record<ChaveImportacao, string | null> {
  const normalizados = headersArquivo.map((h) => normalizar(h));
  const resultado = {} as Record<ChaveImportacao, string | null>;
  for (const { chave, rotulo } of COLUNAS_IMPORTACAO) {
    const idx = normalizados.indexOf(normalizar(rotulo));
    resultado[chave] = idx === -1 ? null : headersArquivo[idx]!;
  }
  return resultado;
}

// ───────────────────────── Parsers de célula ─────────────────────────

function vazio(v: string | undefined): boolean {
  return v == null || v.trim() === "";
}

/** "10/03/2026" -> Date (UTC), ou null. */
export function parseDataPlanilha(v: string | undefined): Date | null {
  if (vazio(v)) return null;
  const m = v!.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, dStr, mStr, yStr] = m;
  const dia = Number(dStr);
  const mes = Number(mStr);
  const ano = yStr!.length === 2 ? 2000 + Number(yStr) : Number(yStr);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }
  return d;
}

function parseMoeda(v: string | undefined): number | null {
  if (vazio(v)) return null;
  return parseMoneyInput(v!);
}

function parsePercentual(v: string | undefined): number | null {
  if (vazio(v)) return null;
  return parsePercentInput(v!);
}

/** "joao@x.com / ABC123" -> { emailCadastro, cotaChave }. Sem "/" -> tudo cotaChave se parecer chave, senão e-mail. */
function parseEmailCotaChave(v: string | undefined): { emailCadastro: string | null; cotaChave: string | null } {
  if (vazio(v)) return { emailCadastro: null, cotaChave: null };
  const partes = v!.split("/").map((p) => p.trim()).filter(Boolean);
  if (partes.length >= 2) return { emailCadastro: partes[0]!, cotaChave: partes[1]! };
  const unico = partes[0] ?? v!.trim();
  return unico.includes("@")
    ? { emailCadastro: unico, cotaChave: null }
    : { emailCadastro: null, cotaChave: unico };
}

/** "SIM"/"X" (sem data) -> flag; "10/03/2026" -> data. */
function parseDataOuFlag(v: string | undefined): { data: Date | null; flagSemData: boolean } {
  if (vazio(v)) return { data: null, flagSemData: false };
  const data = parseDataPlanilha(v);
  if (data) return { data, flagSemData: false };
  const t = normalizar(v!);
  if (t === "sim" || t === "x" || t === "ok") return { data: null, flagSemData: true };
  return { data: null, flagSemData: false };
}

/** "12.345,67 em 10/03/2026" (ou só um dos dois) -> { valor, data }. */
function parseValorResgatadoEm(v: string | undefined): { valor: number | null; data: Date | null } {
  if (vazio(v)) return { valor: null, data: null };
  const texto = v!.trim();
  const matchData = texto.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  const data = matchData ? parseDataPlanilha(matchData[0]) : null;
  const matchValor = texto.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?/);
  const valor = matchValor ? parseMoeda(matchValor[0]) : null;
  return { valor, data };
}

// ───────────────────────── Linha → estrutura ─────────────────────────

export type DespesaImportada = { tipo: TipoDespesa; valor: number };

export type LinhaImportada = {
  linha: number;
  carta: {
    codigo: string;
    cessionariaNome: string;
    administradoraNome: string;
    grupo: string;
    cota: string;
    contrato: string | null;
    origem: string | null;
    valorCompra: number;
    valorCredito: number;
    valorCreditoContemplacao: number | null;
    percentualPago: number | null;
    previsaoResgate: number | null;
    valorResgatado: number | null;
    tipoSaida: "RESGATE" | null;
    dataCompra: Date | null;
    dataCadastroBolsa: Date | null;
    encerramentoGrupo: Date | null;
    contempladaEm: Date | null;
    dataCopiasSeveri: Date | null;
    dataOriginaisSeveri: Date | null;
    dataNotificacao: Date | null;
    dataDoctoAdm: Date | null;
    dataPedidoResgate: Date | null;
    dataResgate: Date | null;
    observacoes: string | null;
    observacoesGerais: string | null;
  };
  acesso: {
    emailCadastro: string | null;
    cotaChave: string | null;
    celular: string | null;
    senha: string | null;
  } | null;
  cedente: { nome: string; documento: string | null } | null;
  despesas: DespesaImportada[];
  avisos: string[];
};

export type ErroLinha = { linha: number; mensagem: string };

/** `linha` é a linha já remapeada (chave interna -> valor da célula). */
export function mapearLinha(
  linha: Partial<Record<ChaveImportacao, string>>,
  numeroLinha: number,
): { linha: LinhaImportada } | { erro: ErroLinha } {
  const codigo = linha.codigo?.trim() ?? "";
  const cessionariaNome = linha.cessionariaNome?.trim() ?? "";
  const administradoraNome = linha.administradoraNome?.trim() ?? "";
  const grupo = linha.grupo?.trim() ?? "";
  const cota = linha.cota?.trim() ?? "";

  const faltando = [
    !codigo && "Controle Interno SSA",
    !cessionariaNome && "Cessionária",
    !administradoraNome && "ADM",
    !grupo && "Grupo",
    !cota && "Cota",
  ].filter(Boolean) as string[];
  if (faltando.length > 0) {
    return { erro: { linha: numeroLinha, mensagem: `Faltando: ${faltando.join(", ")}.` } };
  }

  const avisos: string[] = [];

  const valorCompra = parseMoeda(linha.valorCompra) ?? 0;
  const valorCredito = parseMoeda(linha.valorCredito) ?? 0;

  const despesas: DespesaImportada[] = [];
  const despesaMap: [ChaveImportacao, TipoDespesa][] = [
    ["despesaComissao", "COMISSAO"],
    ["despesaDare", "DARE"],
    ["despesaGuiaTj", "GUIA_TJ"],
    ["despesaCartorio", "CARTORIO"],
    ["despesaDiversas", "DIVERSAS"],
  ];
  for (const [chave, tipo] of despesaMap) {
    const valor = parseMoeda(linha[chave]);
    if (valor != null && valor > 0) despesas.push({ tipo, valor });
  }

  const custoTotalPlanilha = parseMoeda(linha.custoTotalPlanilha);
  if (custoTotalPlanilha != null) {
    const somaCalculada = valorCompra + despesas.reduce((s, d) => s + d.valor, 0);
    if (Math.abs(somaCalculada - custoTotalPlanilha) > 0.01) {
      avisos.push(
        `Custo TOTAL da planilha (${custoTotalPlanilha.toFixed(2)}) diverge do calculado (${somaCalculada.toFixed(2)}).`,
      );
    }
  }

  const { data: dataOriginaisSeveri, flagSemData } = parseDataOuFlag(linha.dataOriginaisSeveri);
  if (flagSemData) {
    avisos.push("Doctos originais marcados como enviados, mas sem data na planilha.");
  }

  const { valor: valorResgatado, data: dataResgate } = parseValorResgatadoEm(linha.valorResgatadoEm);
  const { emailCadastro, cotaChave } = parseEmailCotaChave(linha.emailCotaChave);
  const celular = linha.celular?.trim() || null;
  const senha = linha.senha?.trim() || null;
  const acesso =
    emailCadastro || cotaChave || celular || senha
      ? { emailCadastro, cotaChave, celular, senha }
      : null;

  const cedenteNome = linha.cedenteNome?.trim() || null;
  const cedente = cedenteNome
    ? { nome: cedenteNome, documento: linha.cedenteDocumento?.trim() || null }
    : null;

  return {
    linha: {
      linha: numeroLinha,
      carta: {
        codigo,
        cessionariaNome,
        administradoraNome,
        grupo,
        cota,
        contrato: linha.contrato?.trim() || null,
        origem: linha.origem?.trim() || null,
        valorCompra,
        valorCredito,
        valorCreditoContemplacao: parseMoeda(linha.valorCreditoContemplacao),
        percentualPago: parsePercentual(linha.percentualPago),
        previsaoResgate: parseMoeda(linha.previsaoResgate),
        valorResgatado,
        tipoSaida: valorResgatado != null || dataResgate != null ? "RESGATE" : null,
        dataCompra: parseDataPlanilha(linha.dataCompra),
        dataCadastroBolsa: parseDataPlanilha(linha.dataCadastroBolsa),
        encerramentoGrupo: parseDataPlanilha(linha.encerramentoGrupo),
        contempladaEm: parseDataPlanilha(linha.contempladaEm),
        dataCopiasSeveri: parseDataPlanilha(linha.dataCopiasSeveri),
        dataOriginaisSeveri,
        dataNotificacao: parseDataPlanilha(linha.dataNotificacao),
        dataDoctoAdm: parseDataPlanilha(linha.dataDoctoAdm),
        dataPedidoResgate: parseDataPlanilha(linha.dataPedidoResgate),
        dataResgate,
        observacoes: linha.observacoes?.trim() || null,
        observacoesGerais: linha.observacoesGerais?.trim() || null,
      },
      acesso,
      cedente,
      despesas,
      avisos,
    },
  };
}

/** Converte as linhas cruas do CSV (com cabeçalho) em `LinhaImportada[]` + erros, usando o mapeamento de colunas confirmado. */
export function processarLinhasCsv(
  linhasCsv: string[][],
  mapeamento: Record<ChaveImportacao, string | null>,
): { linhas: LinhaImportada[]; erros: ErroLinha[] } {
  const [cabecalho, ...resto] = linhasCsv;
  if (!cabecalho) return { linhas: [], erros: [] };

  const indicePorChave = {} as Record<ChaveImportacao, number>;
  for (const { chave } of COLUNAS_IMPORTACAO) {
    const header = mapeamento[chave];
    indicePorChave[chave] = header == null ? -1 : cabecalho.indexOf(header);
  }

  const linhas: LinhaImportada[] = [];
  const erros: ErroLinha[] = [];

  resto.forEach((celulas, i) => {
    const numeroLinha = i + 2; // 1 = cabeçalho
    const linhaMapeada: Partial<Record<ChaveImportacao, string>> = {};
    for (const { chave } of COLUNAS_IMPORTACAO) {
      const idx = indicePorChave[chave];
      if (idx >= 0) linhaMapeada[chave] = celulas[idx] ?? "";
    }
    const resultado = mapearLinha(linhaMapeada, numeroLinha);
    if ("erro" in resultado) erros.push(resultado.erro);
    else linhas.push(resultado.linha);
  });

  return { linhas, erros };
}
