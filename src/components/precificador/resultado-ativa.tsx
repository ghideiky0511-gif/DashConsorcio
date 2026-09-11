import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL, formatPercent } from "@/lib/format";
import type {
  ResultadoPrecificacaoAtivaContemplada,
  ResultadoPrecificacaoAtivaLanceQuitacao,
  ResultadoPrecificacaoAtivaNaoContemplada,
} from "@/lib/precificador";

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
  return (
    <div className="space-y-4">
      <Card className="border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Preço máximo a pagar pela cota (cenário esperado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold text-primary">
            {r.precoJusto == null ? "—" : formatBRL(r.precoJusto)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            preço justo · meta {r.metaMultiploCdi}× CDI · contemplação estimada em{" "}
            {r.mesesAteContemplacaoEstimados} meses de {r.mesesAteEncerramento} restantes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Cenários — o mês da contemplação é incerto (sorteio)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-4">Cenário</th>
                  <th className="py-1 pr-4">Contemplação em</th>
                  <th className="py-1 pr-4">Preço justo</th>
                  <th className="py-1 pr-4">Retorno total</th>
                  <th className="py-1">Múltiplo do CDI</th>
                </tr>
              </thead>
              <tbody>
                {r.cenarios.map((c) => (
                  <tr key={c.rotulo} className="border-t">
                    <td className="py-1.5 pr-4 capitalize">{c.rotulo}</td>
                    <td className="py-1.5 pr-4">{c.mesesAteContemplacao} meses</td>
                    <td className="py-1.5 pr-4">
                      {c.precoJusto == null ? "—" : formatBRL(c.precoJusto)}
                    </td>
                    <td className="py-1.5 pr-4">
                      {c.retornoTotal == null ? "—" : formatPercent(c.retornoTotal)}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Como chegamos nesse número</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metrica
            label="Crédito − parcelas até o fim do prazo"
            valor={formatBRL(r.valorNominalTotal)}
            destaque
          />
          <Metrica label="CDI acumulado no período" valor={formatPercent(r.cdiAcumuladoPeriodo)} />
          <Metrica label="Meses até o encerramento" valor={String(r.mesesAteEncerramento)} />
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
