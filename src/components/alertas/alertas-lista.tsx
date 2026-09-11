import Link from "next/link";
import { CalendarClock, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlertaItem } from "@/lib/queries/alertas";

export function AlertasLista({ itens }: { itens: AlertaItem[] }) {
  if (itens.length === 0) return null;

  return (
    <ul className="divide-y">
      {itens.map((item) => (
        <li key={`${item.tipo}-${item.id}`}>
          <Link
            href={`/cartas/${item.cartaId}`}
            className="flex items-center gap-3 py-2 text-sm hover:bg-muted/50"
          >
            {item.tipo === "parcela" ? (
              <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <Landmark className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="w-24 shrink-0 text-muted-foreground">
              {item.tipo === "parcela" ? "Parcela" : "Assembleia"}
            </span>
            <span className="flex-1 truncate font-medium">{item.cartaCodigo}</span>
            {item.tipo === "parcela" && (
              <span className="tabular-nums text-muted-foreground">
                {formatBRL(item.valor)}
              </span>
            )}
            <span className={cn("tabular-nums", item.atrasada && "text-destructive")}>
              {formatDate(item.data)}
            </span>
            {item.atrasada && <Badge variant="destructive">Atrasada</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
