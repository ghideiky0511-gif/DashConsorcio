import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CartaForm } from "@/components/carta/carta-form";
import { requireProfile } from "@/lib/auth";
import { getCartaFormValues } from "@/lib/queries/carta-form";
import { getFiltroOpcoes } from "@/lib/queries/carteira";
import { Role } from "@/generated/prisma/client";

export default async function EditarCartaPage({
  params,
}: PageProps<"/cartas/[id]/editar">) {
  const { id } = await params;
  const profile = await requireProfile();
  if (profile.role === Role.VISUALIZADOR) redirect(`/cartas/${id}`);

  const [values, opcoes] = await Promise.all([
    getCartaFormValues(id),
    getFiltroOpcoes(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/cartas/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {values.codigo}
        </Link>
        <PageHeader
          title={`Editar ${values.codigo}`}
          description="Altere os dados da carta."
        />
      </div>
      <CartaForm mode="editar" opcoes={opcoes} values={values} />
    </div>
  );
}
