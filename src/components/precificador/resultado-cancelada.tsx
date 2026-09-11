import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatPercent } from "@/lib/format";
import type { ResultadoPrecificacaoCancelada } from "@/lib/precificador";

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

export function ResultadoCancelada({
  resultado: r,
}: {
  resultado: ResultadoPrecificacaoCancelada;
}) {
  const abaixoDaMeta = r.retorno != null && r.retorno.multiploCdi != null &&
    r.retorno.multiploCdi < r.metaMultiploCdi;

  return (
    <div className="space-y-4">
      {/* O comparativo pedido: quanto cada player paga e o nosso preço justo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Objetiva está pagando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {r.propostaObjetiva.recusado ? "—" : formatBRL(r.propostaObjetiva.valor)}
            </div>
            {r.propostaObjetiva.recusado && (
              <p className="mt-1 text-xs text-muted-foreground">
                {r.propostaObjetiva.motivo}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              MDV está pagando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {r.propostaMdv.recusado ? "—" : formatBRL(r.propostaMdv.valor)}
            </div>
            {r.propostaMdv.recusado && (
              <p className="mt-1 text-xs text-muted-foreground">{r.propostaMdv.motivo}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Valor previsto para compra da cota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold text-primary">
              {r.precoJusto == null ? "—" : formatBRL(r.precoJusto)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              preço justo · meta {r.metaMultiploCdi}× CDI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Base do cálculo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como chegamos nesse número</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica
            label={`Recebível nominal (${
              r.baseResgateOrigem === "fundo_comum_pago"
                ? "fundo comum pago"
                : "proxy: crédito × %pago × 0,87"
            })`}
            valor={formatBRL(r.baseResgate)}
          />
          <Metrica
            label={`Resgate projetado (corrigido, ${r.mesesAteEncerramento} meses)`}
            valor={formatBRL(r.resgateProjetado)}
            destaque
          />
          <Metrica
            label="Índice de correção usado"
            valor={formatPercent(r.indiceCorrecaoAnual) + " a.a."}
          />
          <Metrica
            label="CDI acumulado no período"
            valor={formatPercent(r.cdiAcumuladoPeriodo)}
          />
        </CardContent>
      </Card>

      {/* Retorno no preço avaliado */}
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
              valor={
                r.retorno.multiploCdi == null ? "—" : `${r.retorno.multiploCdi.toFixed(2)}×`
              }
              destaque={abaixoDaMeta}
            />
          </CardContent>
        </Card>
      )}

      {/* Sensibilidade ao índice de correção */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Sensibilidade ao índice de correção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-4 font-medium">Cenário</th>
                  <th className="py-1.5 pr-4 font-medium">Índice a.a.</th>
                  <th className="py-1.5 pr-4 font-medium">Resgate projetado</th>
                  <th className="py-1.5 pr-4 font-medium">Preço justo</th>
                  <th className="py-1.5 font-medium">Múltiplo do CDI no preço avaliado</th>
                </tr>
              </thead>
              <tbody>
                {r.cenarios.map((c) => (
                  <tr key={c.rotulo} className="border-b last:border-0">
                    <td className="py-1.5 pr-4">{c.rotulo}</td>
                    <td className="py-1.5 pr-4">{formatPercent(c.indiceCorrecaoAnual)}</td>
                    <td className="py-1.5 pr-4">{formatBRL(c.resgateProjetado)}</td>
                    <td className="py-1.5 pr-4">
                      {c.precoJusto == null ? "—" : formatBRL(c.precoJusto)}
                    </td>
                    <td className="py-1.5">
                      {c.multiploCdi == null ? "—" : `${c.multiploCdi.toFixed(2)}×`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {r.avisos.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avisos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {r.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
