import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { UsuariosCrud } from "@/components/usuarios/usuarios-crud";
import { requireProfile } from "@/lib/auth";
import { getUsuarios } from "@/lib/queries/usuarios";
import { Role } from "@/generated/prisma/client";

export default async function UsuariosPage() {
  const profile = await requireProfile();
  if (profile.role !== Role.ADMIN) redirect("/");

  const usuarios = await getUsuarios();

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Convidar, alterar papel e desativar usuários."
      />
      <UsuariosCrud rows={usuarios} meuId={profile.id} />
    </>
  );
}
