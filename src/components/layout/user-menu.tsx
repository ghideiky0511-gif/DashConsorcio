"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Role } from "@/generated/prisma/client";

const roleLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  VISUALIZADOR: "Visualizador",
};

export function UserMenu({
  nome,
  email,
  role,
}: {
  nome: string;
  email: string;
  role: Role;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function sair() {
    startTransition(async () => {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background"
      >
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {nome.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-medium leading-tight">{nome}</span>
          <span className="block text-xs text-muted">{roleLabel[role]}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border bg-surface p-1 shadow-lg">
          <div className="px-3 py-2 text-xs text-muted">{email}</div>
          <button
            type="button"
            onClick={sair}
            disabled={pending}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-negative hover:bg-background disabled:opacity-50"
          >
            <LogOut className="size-4" />
            {pending ? "Saindo…" : "Sair"}
          </button>
        </div>
      )}
    </div>
  );
}
