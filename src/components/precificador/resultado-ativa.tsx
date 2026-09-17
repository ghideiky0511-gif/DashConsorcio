"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatPercent } from "@/lib/format";
import { metricasRetorno } from "@/lib/precificador/core/retorno";
import type {
  ResultadoPrecificacaoAtivaContemplada,
  ResultadoPrecificacaoAtivaLanceQuitacao,
  ResultadoPrecificacaoAtivaNaoContemplada,
} from "@/lib/precificador";

/** "4.772,35" → 4772.35. Aceita ponto de milhar e vírgula decimal (padrão BR). */
function parseValorBr(texto: string): number {
  const limpo = texto.trim().replace(/\./g, "").replace(",", ".");
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : 0;
}

function formatarValorBr(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Metrica({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={destaque ? "text-2xl font-semibold" : "text-sm font-medium"}>
        {valor}
      </div>
    </div>
  );
}

function Avisos({ avisos }: { avisos: string[] }) {
  if (avisos.length === 0) return null;
  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Avisos</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ResultadoAtivaParcelas({
  resultado: r,
}: {
  resultado: ResultadoPrecificacaoAtivaContemplada;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Preço máximo a pagar pela cota
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-primary">
            {r.precoJusto == null ? "—" : formatBRL(r.precoJusto)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            preço justo · meta {r.metaMultiploCdi}× CDI em {r.parcelasRestantes} parcelas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como chegamos nesse número</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica
            label="Crédito recebido − parcelas restantes"
            valor={formatBRL(r.valorNominalTotal)}
            destaque
          />
          <Metrica label="CDI acumulado no período" valor={formatPercent(r.cdiAcumuladoPeriodo)} />
          <Metrica
            label="Taxa mensal equivalente à meta"
            valor={formatPercent(r.taxaAlvoMensal) + " a.m."}
          />
          <Metrica label="Parcelas restantes" valor={String(r.parcelasRestantes)} />
          {r.lanceContemplacao > 0 && (
            <Metrica label="Lance de contemplação usado" valor={formatBRL(r.lanceContemplacao)} />
          )}
        </CardContent>
      </Card>

      {r.retorno && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Retorno no preço avaliado ({formatBRL(r.precoAvaliado)})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metrica label="Lucro" valor={formatBRL(r.retorno.lucro)} />
            <Metrica label="Retorno total" valor={formatPercent(r.retorno.retornoTotal)} />
            <Metrica label="Retorno ao mês" valor={formatPercent(r.retorno.retornoMensal)} />
            <Metrica
              label="Múltiplo do CDI"
              valor={r.retorno.multiploCdi == null ? "—" : `${r.retorno.multiploCdi.toFixed(2)}×`}
            />
          </CardContent>
        </Card>
      )}

      <Avisos avisos={r.avisos} />
    </div>
  );
}

export function ResultadoAtivaQuitacao({
  resultado: r,
}: {
  resultado: ResultadoPrecificacaoAtivaLanceQuitacao;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Preço máximo a pagar ao vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-primary">
            {r.precoJustoVendedor == null ? "—" : formatBRL(r.precoJustoVendedor)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            preço justo · meta {r.metaMultiploCdi}× CDI · crédito liberado em{" "}
            {r.prazoLiberacaoDias} dias (~{r.prazoLiberacaoMeses} meses)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como chegamos nesse número</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica label="Crédito líquido liberado" valor={formatBRL(r.creditoLiquido)} />
          <Metrica label="Lance de quitação" valor={formatBRL(r.lanceQuitacao)} />
          <Metrica
            label="Custo total no preço avaliado"
            valor={r.custoTotalAvaliado == null ? "—" : formatBRL(r.custoTotalAvaliado)}
            destaque
          />
          <Metrica label="CDI acumulado no período" valor={formatPercent(r.cdiAcumuladoPeriodo)} />
        </CardContent>
      </Card>

      {r.retorno && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Retorno no preço avaliado (custo total {formatBRL(r.custoTotalAvaliado)})
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metrica label="Lucro" valor={formatBRL(r.retorno.lucro)} />
            <Metrica label="Retorno total" valor={formatPercent(r.retorno.retornoTotal)} />
            <Metrica label="Retorno ao mês" valor={formatPercent(r.retorno.retornoMensal)} />
            <Metrica
              label="Múltiplo do CDI"
              valor={r.retorno.multiploCdi == null ? "—" : `${r.retorno.multiploCdi.toFixed(2)}×`}
            />
          </CardContent>
        </Card>
      )}

      <Avisos avisos={r.avisos} />
    </div>
  );
}

export function ResultadoAtivaNaoContemplada({
  resultado: r,
}: {
  resultado: ResultadoPrecificacaoAtivaNaoContemplada;
}) {
  const [precoTexto, setPrecoTexto] = useState(() => formatarValorBr(r.precoJusto));
  const precoSimulado = parseValorBr(precoTexto);

  const linhas = useMemo(
    () =>
      r.cenarios.map((c) => {
        const m =
          precoSimulado > 0 && c.valorNominalTotal > 0
            ? metricasRetorno({
                preco: precoSimulado,
                resgate: c.valorNominalTotal,
                meses: r.mesesAteEncerramento,
                cdiAcumuladoNoPeriodo: r.cdiAcumuladoPeriodo,
              })
            : null;
        return { ...c, retornoSimulado: m };
      }),
    [r.cenarios, r.mesesAteEncerramento, r.cdiAcumuladoPeriodo, precoSimulado],
  );

  return (
    <div className="space-y-4">
      <Card className="border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Preço justo (piso — cenário pessimista)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-primary">
            {r.precoJusto == null ? "—" : formatBRL(r.precoJusto)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            meta {r.metaMultiploCdi}× CDI em {r.mesesAteEncerramento} meses, mesmo se o
            sorteio só sair no encerramento do grupo
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Simule o preço que você vai pagar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-[200px] space-y-1.5">
            <Label htmlFor="preco-simulado">Você paga (R$)</Label>
            <Input
              id="preco-simulado"
              inputMode="decimal"
              value={precoTexto}
              onChange={(e) => setPrecoTexto(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              edite pra testar o que o dono da carta pedir — a tabela recalcula na hora
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-4">Cenário (sorteio)</th>
                  <th className="py-1 pr-4">Prazo</th>
                  <th className="py-1 pr-4">Você recebe</th>
                  <th className="py-1 pr-4">Retorno</th>
                  <th className="py-1">× CDI</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.rotulo} className="border-t">
                    <td className="py-1.5 pr-4 capitalize">
                      {l.rotulo} ({l.mesesAteContemplacao}m)
                    </td>
                    <td className="py-1.5 pr-4">{r.mesesAteEncerramento} meses</td>
                    <td className="py-1.5 pr-4">{formatBRL(l.valorNominalTotal)}</td>
                    <td className="py-1.5 pr-4">
                      {l.retornoSimulado == null ? "—" : formatPercent(l.retornoSimulado.retornoTotal)}
                    </td>
                    <td className="py-1.5">
                      {l.retornoSimulado?.multiploCdi == null
                        ? "—"
                        : `${l.retornoSimulado.multiploCdi.toFixed(2)}×`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Avisos avisos={r.avisos} />
    </div>
  );
}
