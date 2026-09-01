"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function SortHeader({
  field,
  children,
  numeric,
}: {
  field: string;
  children: ReactNode;
  numeric?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const active = (sp.get("sort") ?? "codigo") === field;
  const dir = active && sp.get("dir") === "desc" ? "desc" : "asc";

  function toggle() {
    const p = new URLSearchParams(sp.toString());
    p.set("sort", field);
    p.set("dir", active && dir === "asc" ? "desc" : "asc");
    p.delete("page");
    router.push(`${pathname}?${p}`);
  }

  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={cn(numeric && "text-right")}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          numeric && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon className="size-3 opacity-70" />
      </button>
    </TableHead>
  );
}
