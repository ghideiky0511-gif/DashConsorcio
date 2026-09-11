import { PageHeader } from "@/components/layout/page-header";
import { PrecificadorWorkspace } from "@/components/precificador/precificador-workspace";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Precificador — HH Gestão de Consórcio" };

export default async function PrecificadorPage() {
  await requireProfile();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Precificador"
        description="Quanto pagar por uma carta e quanto se recebe no final, comparado ao CDI."
      />
      <PrecificadorWorkspace />
    </div>
  );
}
