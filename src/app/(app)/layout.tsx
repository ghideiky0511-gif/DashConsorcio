import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { requireProfile } from "@/lib/auth";
import { Role } from "@/generated/prisma/client";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={profile.role === Role.ADMIN} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b bg-card px-6">
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
