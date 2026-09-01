import { PageHeader, Placeholder } from "@/components/layout/page-header";

export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Cessionárias, administradoras, etapas do pipeline, tipos de despesa e saldo de caixa inicial."
      />
      <Placeholder>
        Os CRUDs de apoio entram na Fase B (cessionárias, administradoras, etapas,
        tipos de despesa) e o saldo inicial do caixa na Fase C.
      </Placeholder>
    </>
  );
}
