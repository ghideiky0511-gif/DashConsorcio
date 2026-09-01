"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Wallet,
  Upload,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

const principal: Item[] = [
  { href: "/", label: "Carteira", icon: LayoutGrid },
  { href: "/fluxo-caixa", label: "Fluxo de Caixa", icon: Wallet },
];

const secundario: Item[] = [
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderItem = ({ href, label, icon: Icon }: Item) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive(href)
          ? "bg-primary text-primary-foreground"
          : "text-muted hover:bg-background hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-surface">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          HH
        </span>
        <span className="text-sm font-semibold leading-tight">
          Gestão de
          <br />
          Consórcio
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {principal.map(renderItem)}

        <div className="mt-6 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Gerência
        </div>
        {secundario.filter((i) => !i.adminOnly || isAdmin).map(renderItem)}
      </nav>
    </aside>
  );
}
