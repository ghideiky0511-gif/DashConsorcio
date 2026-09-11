import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ImportarWizard } from "@/components/importar/importar-wizard";
import { requireProfile, canEdit } from "@/lib/auth";

export default async function ImportarPage() {
  const profile = await requireProfile();
  if (!canEdit(profile.role)) redirect("/");

  return (
    <>
      <PageHeader
        title="Importar planilha"
        description="Carga da planilha de controle (.csv) com mapeamento das 36 colunas."
      />
      <ImportarWizard />
    </>
  );
}
