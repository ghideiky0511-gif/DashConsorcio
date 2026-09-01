import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";
import type { CarteiraResumo } from "@/lib/queries/carteira";

function Kpi({
  label,
  valor,
  sub,
  tone,
  href,
}: {
  label: string;
  valor: string;
  sub?: string;
  tone?: "positive" | "negative" | "warning";
  href?: string;
}) {
  const body = (
    <div className="rounded-lg border bg-card p-4 transition-colors data-[link=true]:hover:border-primary/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1.5 text-lg font-semibold tabular-nums",
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
    <Link href={href} data-link="true" className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function CarteiraKpis({ resumo }: { resumo: CarteiraResumo }) {
  const lucroTone = resumo.lucroPrevistoTotal >= 0 ? "positive" : "negative";
  const realizadoTone = resumo.resultadoRealizado >= 0 ? "positive" : "negative";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <Kpi
        label="Cartas"
        valor={String(resumo.totalCartas)}
        sub={`${resumo.ativas} ativas · ${resumo.canceladas} canceladas`}
      />
      <Kpi
        label="Crédito total"
        valor={formatBRL(resumo.creditoTotal)}
        sub={`contemplado: ${formatBRL(resumo.creditoContemplado)}`}
      />
      <Kpi label="Investido" valor={formatBRL(resumo.investido)} sub="custo total das cartas" />
      <Kpi
        label="Previsão de lucro"
        valor={formatBRL(resumo.lucroPrevistoTotal)}
        sub="previsão de resgate − investido"
        tone={lucroTone}
      />
      <Kpi
        label="Resultado realizado"
        valor={formatBRL(resumo.resultadoRealizado)}
        sub="cartas já encerradas"
        tone={realizadoTone}
      />
      <Kpi
        label="A pagar (30 dias)"
        valor={formatBRL(resumo.aPagar30.valor)}
        sub={`${resumo.aPagar30.qtd} parcelas`}
        href="/fluxo-caixa"
      />
      <Kpi
        label="Parcelas atrasadas"
        valor={String(resumo.atrasadas.qtd)}
        sub={formatBRL(resumo.atrasadas.valor)}
        tone={resumo.atrasadas.qtd > 0 ? "negative" : undefined}
        href="/fluxo-caixa"
      />
    </div>
  );
}
