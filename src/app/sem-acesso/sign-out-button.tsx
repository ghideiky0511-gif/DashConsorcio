"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function sair() {
    startTransition(async () => {
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={sair}>
      <LogOut className="size-4" />
      {pending ? "Saindo…" : "Sair e entrar com outra conta"}
    </Button>
  );
}
