import { PageHeader, Placeholder } from "@/components/layout/page-header";

export default async function CartaPage({ params }: PageProps<"/cartas/[id]">) {
  const { id } = await params;
  return (
    <>
      <PageHeader
        title="Detalhe da carta"
        description={`Carta ${id}`}
      />
      <Placeholder>
        Abas Resumo, Processo, Custos, Parcelas, Contrapartes, Acesso e Documentos
        entram nas Fases B–D.
      </Placeholder>
    </>
  );
}
