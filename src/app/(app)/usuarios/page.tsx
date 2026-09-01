import { redirect } from "next/navigation";
import { PageHeader, Placeholder } from "@/components/layout/page-header";
import { requireProfile } from "@/lib/auth";
import { Role } from "@/generated/prisma/client";

export default async function UsuariosPage() {
  const profile = await requireProfile();
  if (profile.role !== Role.ADMIN) redirect("/");

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Convidar, alterar papel e desativar usuários."
      />
      <Placeholder>
        Gestão de usuários (convite via Supabase Admin API, papéis, desativação)
        entra na Fase E.
      </Placeholder>
    </>
  );
}
