"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CartaForm } from "@/components/carta/carta-form";
import type { CartaFormValues } from "@/lib/queries/carta-form";

type Opcao = { id: string; nome: string };
type Opcoes = {
  cessionarias: Opcao[];
  administradoras: Opcao[];
  etapas: Opcao[];
};

export function CartaDrawer({
  values,
  opcoes,
}: {
  values: CartaFormValues | null;
  opcoes: Opcoes;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function close() {
    const p = new URLSearchParams(sp.toString());
    p.delete("editar");
    router.push(p.toString() ? `${pathname}?${p}` : pathname);
  }

  return (
    <Sheet open={!!values} onOpenChange={(o: boolean) => !o && close()}>
      <SheetContent
        side="right"
        style={{ maxWidth: "min(44rem, 100vw)", width: "100%" }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {values ? `Editar ${values.codigo}` : "Editar carta"}
            {values && (
              <Link
                href={`/cartas/${values.id}`}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Abrir página completa"
              >
                <ExternalLink className="size-4" />
              </Link>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {values && (
            <CartaForm
              mode="editar"
              values={values}
              opcoes={opcoes}
              compact
              onSuccess={() => {
                close();
                router.refresh();
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
