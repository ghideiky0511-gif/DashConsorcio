"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importarLinhasAction, type ResultadoImportacao } from "@/app/actions/import";
import { formatBRL, formatDate } from "@/lib/format";
import {
  COLUNAS_IMPORTACAO,
  parseCsv,
  processarLinhasCsv,
  sugerirMapeamento,
  type ChaveImportacao,
  type ErroLinha,
  type LinhaImportada,
} from "@/lib/import";

const NAO_USAR = "__nao_usar__";

export function ImportarWizard() {
  const [linhasCsv, setLinhasCsv] = useState<string[][] | null>(null);
  const [mapeamento, setMapeamento] = useState<Record<ChaveImportacao, string | null> | null>(
    null,
  );
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [importando, setImportando] = useState(false);

  async function handleFile(file: File) {
    setErroLeitura(null);
    setResultado(null);
    try {
      const texto = await file.text();
      const linhas = parseCsv(texto);
      if (linhas.length < 2) {
        setErroLeitura("O arquivo não tem linhas de dados (só cabeçalho ou vazio).");
        return;
      }
      setLinhasCsv(linhas);
      setMapeamento(sugerirMapeamento(linhas[0]!));
      setNomeArquivo(file.name);
    } catch {
      setErroLeitura("Não foi possível ler o arquivo. Confirme que é um .csv válido.");
    }
  }

  const { linhas: linhasValidas, erros: errosValidacao } = useMemo<{
    linhas: LinhaImportada[];
    erros: ErroLinha[];
  }>(() => {
    if (!linhasCsv || !mapeamento) return { linhas: [], erros: [] };
    return processarLinhasCsv(linhasCsv, mapeamento);
  }, [linhasCsv, mapeamento]);

  function reiniciar() {
    setLinhasCsv(null);
    setMapeamento(null);
    setResultado(null);
    setErroLeitura(null);
  }

  async function handleImportar() {
    setImportando(true);
    const res = await importarLinhasAction(linhasValidas);
    setImportando(false);
    setResultado(res);
  }

  if (resultado) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-positive" />
            <strong>{resultado.importadas}</strong> carta(s) importada(s) com
            sucesso a partir de {nomeArquivo}.
          </div>
        </div>
        {resultado.erros.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-destructive">
              {resultado.erros.length} linha(s) não importada(s)
            </h3>
            <ul className="space-y-1 text-sm">
              {resultado.erros.map((e) => (
                <li key={e.linha} className="text-muted-foreground">
                  Linha {e.linha}: {e.mensagem}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button onClick={reiniciar}>Importar outro arquivo</Button>
      </div>
    );
  }

  if (!linhasCsv || !mapeamento) {
    return (
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-10 text-center hover:border-primary/50">
          <FileUp className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">Clique para escolher o arquivo .csv</span>
          <span className="text-xs text-muted-foreground">
            Exporte a planilha do Excel/Google Sheets como CSV antes de enviar.
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {erroLeitura && <p className="text-sm text-destructive">{erroLeitura}</p>}
      </div>
    );
  }

  const headersArquivo = linhasCsv[0]!;
  const obrigatoriasNaoMapeadas = COLUNAS_IMPORTACAO.filter(
    (c) => c.obrigatoria && !mapeamento[c.chave],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{nomeArquivo}</strong> ·{" "}
          {linhasCsv.length - 1} linha(s) de dados
        </p>
        <Button variant="outline" size="sm" onClick={reiniciar}>
          Trocar arquivo
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Mapeamento de colunas</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Casamos automaticamente pelo nome do cabeçalho. Corrija o que não bateu.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COLUNAS_IMPORTACAO.map(({ chave, rotulo, obrigatoria }) => (
            <div key={chave} className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`map-${chave}`}>
                {rotulo}
                {obrigatoria ? " *" : ""}
              </label>
              <NativeSelect
                id={`map-${chave}`}
                value={mapeamento[chave] ?? NAO_USAR}
                onChange={(e) =>
                  setMapeamento((prev) => ({
                    ...prev!,
                    [chave]: e.target.value === NAO_USAR ? null : e.target.value,
                  }))
                }
              >
                <option value={NAO_USAR}>— não usar —</option>
                {headersArquivo.map((h, i) => (
                  <option key={`${h}-${i}`} value={h}>
                    {h}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ))}
        </div>
      </div>

      {obrigatoriasNaoMapeadas.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="size-4" /> Mapeie as colunas obrigatórias:{" "}
          {obrigatoriasNaoMapeadas.map((c) => c.rotulo).join(", ")}.
        </p>
      )}

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">
            Prévia · <span className="text-positive">{linhasValidas.length} prontas</span>
            {errosValidacao.length > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="text-destructive">
                  {errosValidacao.length} com erro
                </span>
              </>
            )}
          </h2>
          <Button
            onClick={handleImportar}
            disabled={importando || linhasValidas.length === 0}
          >
            <Upload />
            {importando ? "Importando…" : `Importar ${linhasValidas.length} carta(s)`}
          </Button>
        </div>

        {linhasValidas.length > 0 && (
          <div className="mb-4 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Cessionária</TableHead>
                  <TableHead>ADM</TableHead>
                  <TableHead>Grupo/Cota</TableHead>
                  <TableHead className="text-right">Custo aquisição</TableHead>
                  <TableHead>Compra</TableHead>
                  <TableHead>Avisos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasValidas.slice(0, 30).map((l) => (
                  <TableRow key={l.linha}>
                    <TableCell className="text-muted-foreground">{l.linha}</TableCell>
                    <TableCell className="font-medium">{l.carta.codigo}</TableCell>
                    <TableCell>{l.carta.cessionariaNome}</TableCell>
                    <TableCell>{l.carta.administradoraNome}</TableCell>
                    <TableCell>
                      {l.carta.grupo}/{l.carta.cota}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(l.carta.valorCompra)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(l.carta.dataCompra)}
                    </TableCell>
                    <TableCell>
                      {l.avisos.length > 0 && (
                        <Badge variant="outline" className="text-warning">
                          {l.avisos.length}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {linhasValidas.length > 30 && (
              <p className="p-2 text-center text-xs text-muted-foreground">
                Mostrando 30 de {linhasValidas.length} linhas prontas.
              </p>
            )}
          </div>
        )}

        {errosValidacao.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-destructive">
              Linhas com erro (não serão importadas)
            </h3>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {errosValidacao.map((e) => (
                <li key={e.linha} className="text-muted-foreground">
                  Linha {e.linha}: {e.mensagem}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
