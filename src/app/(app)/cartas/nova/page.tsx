import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CartaForm } from "@/components/carta/carta-form";
import { requireProfile } from "@/lib/auth";
import { getFiltroOpcoes } from "@/lib/queries/carteira";
import { Role } from "@/generated/prisma/client";

export default async function NovaCartaPage() {
  const profile = await requireProfile();
  if (profile.role === Role.VISUALIZADOR) redirect("/");

  const opcoes = await getFiltroOpcoes();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Carteira
        </Link>
        <PageHeader
          title="Nova carta"
          description="Cadastro manual de uma carta de consórcio."
        />
      </div>
      <CartaForm mode="criar" opcoes={opcoes} />
    </div>
  );
}
