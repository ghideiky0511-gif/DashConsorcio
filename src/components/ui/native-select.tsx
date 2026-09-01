import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** <select> nativo estilizado como os campos do shadcn. Bom para formulários simples. */
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
