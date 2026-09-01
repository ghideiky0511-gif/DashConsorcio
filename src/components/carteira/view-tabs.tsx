"use client";

import { LayoutDashboard, Table2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function ViewTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const view = sp.get("view") === "detalhado" ? "detalhado" : "geral";

  function go(v: "geral" | "detalhado") {
    const p = new URLSearchParams(sp.toString());
    if (v === "geral") p.delete("view");
    else p.set("view", v);
    p.delete("editar");
    router.push(p.toString() ? `${pathname}?${p}` : pathname);
  }

  const cls = (v: string) =>
    cn(
      "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
      view === v
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex gap-1 border-b">
      <button type="button" className={cls("geral")} onClick={() => go("geral")}>
        <LayoutDashboard className="size-4" /> Visão geral
      </button>
      <button
        type="button"
        className={cls("detalhado")}
        onClick={() => go("detalhado")}
      >
        <Table2 className="size-4" /> Detalhado
      </button>
    </div>
  );
}
