import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import type { ResumoCaixa } from "@/lib/queries/fluxo-caixa";

function Kpi({
  label,
  valor,
  sub,
  tone,
}: {
  label: string;
  valor: string;
  sub?: string;
  tone?: "positive" | "negative" | "warning";
}) {
  return (
    <div className="h-full rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-destructive",
          tone === "warning" && "text-warning",
        )}
      >
        {valor}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function FluxoCaixaKpis({ resumo }: { resumo: ResumoCaixa }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi label="Saldo em caixa hoje" valor={formatBRL(resumo.saldoAtual)} />
      <Kpi
        label="Livre para novas cartas"
        valor={formatBRL(resumo.livreParaComprar)}
        sub="saldo hoje − pendente este mês"
        tone={resumo.livreParaComprar < 0 ? "negative" : "positive"}
      />
      <Kpi
        label="Pago este mês"
        valor={formatBRL(resumo.pagoMes)}
        sub="parcelas e outras saídas já lançadas"
      />
      <Kpi
        label="A pagar este mês"
        valor={formatBRL(resumo.aPagarMes.valor)}
        sub={
          resumo.aPagarMesAtrasado.qtd > 0
            ? `${resumo.aPagarMes.qtd} parcelas · ${resumo.aPagarMesAtrasado.qtd} atrasadas`
            : `${resumo.aPagarMes.qtd} parcelas`
        }
        tone={resumo.aPagarMesAtrasado.qtd > 0 ? "negative" : "warning"}
      />
    </div>
  );
}
