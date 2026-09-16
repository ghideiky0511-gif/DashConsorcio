import { requireProfile } from "@/lib/auth";
import { DefinirSenhaForm } from "./definir-senha-form";

export const metadata = { title: "Definir senha — HH Gestão de Consórcio" };

export default async function DefinirSenhaPage() {
  const profile = await requireProfile();

  return (
    <div className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-2 text-sm font-semibold leading-tight">
          Olá, {profile.nome.split(" ")[0]}
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Crie uma senha para acessar o sistema com e-mail e senha nas próximas vezes.
        </p>
        <DefinirSenhaForm />
      </div>
    </div>
  );
}
