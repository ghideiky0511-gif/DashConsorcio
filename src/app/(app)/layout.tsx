import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { AlertasBell } from "@/components/alertas/alertas-bell";
import { requireProfile } from "@/lib/auth";
import { getAlertas } from "@/lib/queries/alertas";
import { Role } from "@/generated/prisma/client";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [profile, alertas] = await Promise.all([requireProfile(), getAlertas()]);

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={profile.role === Role.ADMIN} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b bg-card px-6">
          <AlertasBell itens={alertas} />
          <UserMenu
            nome={profile.nome}
            email={profile.email}
            role={profile.role}
          />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
