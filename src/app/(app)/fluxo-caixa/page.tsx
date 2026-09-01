import { PageHeader, Placeholder } from "@/components/layout/page-header";

export default function FluxoCaixaPage() {
  return (
    <>
      <PageHeader
        title="Fluxo de Caixa"
        description="Saldo em caixa, contas a pagar por data e projeção mês a mês."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Saldo em caixa hoje</div>
          <div className="mt-2 text-2xl font-semibold text-muted-foreground/50">—</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Previsto para o fim do mês</div>
          <div className="mt-2 text-2xl font-semibold text-muted-foreground/50">—</div>
        </div>
      </div>

      <Placeholder>
        As abas <strong>Saldo &amp; a pagar</strong>, <strong>Projeção 12 meses</strong>{" "}
        e <strong>Este mês</strong>, com marcação de pagamento inline, entram na
        Fase C (Parcelas &amp; Fluxo de Caixa).
      </Placeholder>
    </>
  );
}
