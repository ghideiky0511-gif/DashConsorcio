import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import type { VisaoGeral } from "@/lib/queries/visao-geral";

function Kpi({
  label,
  valor,
  sub,
  tone,
  href,
  destaque,
}: {
  label: string;
  valor: string;
  sub?: string;
  tone?: "positive" | "negative" | "warning";
  href?: string;
  destaque?: boolean;
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-lg border bg-card p-4 transition-colors",
        href && "hover:border-primary/50",
        destaque && "sm:col-span-2",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1.5 font-semibold tabular-nums",
          destaque ? "text-2xl" : "text-lg",
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

  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function CarteiraKpis({ kpis }: { kpis: VisaoGeral["kpis"] }) {
  const lucroTone = kpis.lucroPrevistoTotal >= 0 ? "positive" : "negative";
  const realizadoTone = kpis.resultadoRealizado >= 0 ? "positive" : "negative";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <Kpi
        label="Cartas"
        valor={String(kpis.totalCartas)}
        sub={`${kpis.ativas} ativas · ${kpis.canceladas} canceladas`}
      />
      <Kpi
        label="Crédito total"
        valor={formatBRL(kpis.creditoTotal)}
        sub={`contemplado: ${formatBRL(kpis.creditoContemplado)}`}
      />
      <Kpi
        label="Investido"
        valor={formatBRL(kpis.investido)}
        sub="custo total das cartas"
      />
      <Kpi
        label="Previsão de lucro"
        valor={formatBRL(kpis.lucroPrevistoTotal)}
        sub={`resgate previsto: ${formatBRL(kpis.previsaoResgateTotal)}`}
        tone={lucroTone}
      />
      <Kpi
        label="Resultado realizado"
        valor={formatBRL(kpis.resultadoRealizado)}
        sub="cartas já encerradas"
        tone={realizadoTone}
      />
      <Kpi
        label="A pagar (30 dias)"
        valor={formatBRL(kpis.aPagar30.valor)}
        sub={`${kpis.aPagar30.qtd} parcelas`}
        href="/fluxo-caixa"
      />
      <Kpi
        label="Parcelas atrasadas"
        valor={String(kpis.atrasadas.qtd)}
        sub={formatBRL(kpis.atrasadas.valor)}
        tone={kpis.atrasadas.qtd > 0 ? "negative" : undefined}
        href="/fluxo-caixa"
      />
    </div>
  );
}
