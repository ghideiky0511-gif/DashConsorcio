"use client";

import Link from "next/link";
import { Bell, CalendarClock, Landmark } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlertaItem } from "@/lib/queries/alertas";

export function AlertasBell({ itens }: { itens: AlertaItem[] }) {
  const atrasados = itens.filter((i) => i.atrasada).length;
  const total = itens.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-9 items-center justify-center rounded-md outline-none hover:bg-accent">
        <Bell className="size-4.5" />
        {total > 0 && (
          <span
            className={cn(
              "absolute right-1 top-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white",
              atrasados > 0 ? "bg-destructive" : "bg-warning",
            )}
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          Alertas dos próximos 7 dias
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {itens.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nada vencendo nos próximos 7 dias.
          </p>
        ) : (
          itens.slice(0, 12).map((item) => (
            <DropdownMenuItem
              key={`${item.tipo}-${item.id}`}
              render={
                <Link
                  href={`/cartas/${item.cartaId}`}
                  className="flex items-start gap-2"
                />
              }
            >
              {item.tipo === "parcela" ? (
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Landmark className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {item.tipo === "parcela" ? "Parcela" : "Assembleia"} ·{" "}
                  {item.cartaCodigo}
                </span>
                <span
                  className={cn(
                    "block text-xs",
                    item.atrasada ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {formatDate(item.data)}
                  {item.tipo === "parcela" ? ` · ${formatBRL(item.valor)}` : ""}
                  {item.atrasada ? " · atrasada" : ""}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        {itens.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <Link href="/fluxo-caixa" className="justify-center text-sm" />
              }
            >
              Ver Fluxo de Caixa
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
