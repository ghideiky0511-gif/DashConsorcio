import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Sem acesso — HH Gestão de Consórcio" };

/**
 * Mostrada quando há sessão Supabase válida mas o usuário não tem um profile
 * ativo. Não redireciona de volta — quebra o loop que antes dava
 * ERR_TOO_MANY_REDIRECTS / tela branca.
 */
export default async function SemAcessoPage() {
  const user = await getUser();

  // Sem sessão nenhuma: manda para o login normal.
  if (!user) redirect("/login");

  // Já tem profile ativo: não deveria estar aqui.
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (profile?.ativo) redirect("/");

  const motivo = profile
    ? "Seu perfil existe mas está inativo."
    : "Seu usuário está autenticado, mas não tem um perfil liberado no sistema.";

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            HH
          </span>
          <div className="text-sm font-semibold leading-tight">
            Gestão de Consórcio
          </div>
        </div>

        <h1 className="text-lg font-semibold">Acesso não liberado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{motivo}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Peça a um administrador para liberar o acesso desta conta.
        </p>

        <dl className="mt-4 space-y-1 rounded-md bg-muted/60 p-3 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd className="font-mono">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">ID do usuário</dt>
            <dd className="font-mono break-all">{user.id}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-muted-foreground">
          Para liberar: criar/atualizar a linha em <code>profiles</code> com este
          ID e <code>ativo = true</code>.
        </p>

        <div className="mt-5">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
