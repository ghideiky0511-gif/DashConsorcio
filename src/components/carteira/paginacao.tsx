"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Paginacao({
  page,
  totalPaginas,
  total,
}: {
  page: number;
  totalPaginas: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function goto(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params}`);
  }

  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {total} carta{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => goto(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </Button>
        <span>
          Página {page} de {totalPaginas}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPaginas}
          onClick={() => goto(page + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
