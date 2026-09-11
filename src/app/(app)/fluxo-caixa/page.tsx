import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FluxoCaixaKpis } from "@/components/fluxo-caixa/kpis";
import { ParcelasLista } from "@/components/fluxo-caixa/parcelas-lista";
import { ProjecaoChart } from "@/components/fluxo-caixa/projecao-chart";
import { AlertasLista } from "@/components/alertas/alertas-lista";
import { requireProfile } from "@/lib/auth";
import { getAlertas } from "@/lib/queries/alertas";
import { getResumoCaixa } from "@/lib/queries/fluxo-caixa";
import { Role } from "@/generated/prisma/client";

export default async function FluxoCaixaPage() {
  const [profile, resumo, alertas] = await Promise.all([
    requireProfile(),
    getResumoCaixa(),
    getAlertas(),
  ]);
  const podeEditar = profile.role !== Role.VISUALIZADOR;

  return (
    <>
      <PageHeader
        title="Fluxo de Caixa"
        description="Saldo em caixa, contas a pagar por data e projeção mês a mês."
      />

      <FluxoCaixaKpis resumo={resumo} />

      {alertas.length > 0 && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">
            Alertas dos próximos 7 dias
          </h2>
          <AlertasLista itens={alertas} />
        </div>
      )}

      <Tabs defaultValue="a-pagar">
        <TabsList>
          <TabsTrigger value="a-pagar">Saldo & a pagar</TabsTrigger>
          <TabsTrigger value="projecao">Projeção 12 meses</TabsTrigger>
          <TabsTrigger value="mes">Este mês</TabsTrigger>
        </TabsList>

        <TabsContent value="a-pagar" className="pt-4">
          <ParcelasLista
            parcelas={resumo.parcelasEmAberto}
            podeEditar={podeEditar}
            vazio="Nenhuma parcela em aberto nos próximos 12 meses."
          />
        </TabsContent>

        <TabsContent value="projecao" className="pt-4">
          <div className="rounded-lg border bg-card p-4">
            <ProjecaoChart dados={resumo.projecao12Meses} />
          </div>
        </TabsContent>

        <TabsContent value="mes" className="pt-4">
          <ParcelasLista
            parcelas={resumo.parcelasMes}
            podeEditar={podeEditar}
            vazio="Nenhuma parcela pendente no mês corrente."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
