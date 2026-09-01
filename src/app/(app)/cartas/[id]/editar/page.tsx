import { PageHeader, Placeholder } from "@/components/layout/page-header";

export default async function EditarCartaPage({
  params,
}: PageProps<"/cartas/[id]/editar">) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Editar carta" description={`Carta ${id}`} />
      <Placeholder>Formulário de edição entra na Fase B.</Placeholder>
    </>
  );
}
