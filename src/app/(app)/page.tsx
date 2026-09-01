import { PageHeader, Placeholder } from "@/components/layout/page-header";

const kpis = [
  "Total de cartas",
  "Crédito total",
  "Investido (custo total)",
  "Previsão de lucro",
  "A pagar em 30 dias",
  "Parcelas atrasadas",
];

export default function CarteiraPage() {
  return (
    <>
      <PageHeader
        title="Carteira"
        description="Visão das cartas de consórcio e indicadores da operação."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((label) => (
          <div
            key={label}
            className="rounded-lg border bg-card p-4"
          >
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-2 text-lg font-semibold text-muted-foreground/50">—</div>
          </div>
        ))}
      </div>

      <Placeholder>
        A tabela de cartas com filtros, os mini-gráficos e os KPIs reais entram na
        Fase B (Carteira &amp; cartas). Esta é a estrutura base da tela.
      </Placeholder>
    </>
  );
}
