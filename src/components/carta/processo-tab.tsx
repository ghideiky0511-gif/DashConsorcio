"use client";

import { useActionState, useEffect } from "react";
import { ArrowRight, Check, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { moverEtapaCarta } from "@/app/actions/carta-processo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CartaDetalhe } from "@/lib/queries/carta";

export function ProcessoTab({
  carta,
  podeEditar,
}: {
  carta: CartaDetalhe;
  podeEditar: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    moverEtapaCarta.bind(null, carta.id),
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Etapa atualizada.");
    else if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Etapa atual</div>
          <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
            <span
              className="size-2.5 rounded-full"
              style={{
                background: carta.etapa.cor ?? "var(--color-muted-foreground)",
              }}
            />
            {carta.etapa.nome}
          </div>

          {podeEditar && (
            <form action={formAction} className="mt-4 space-y-3 border-t pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="etapaId">Mover para</Label>
                <NativeSelect
                  id="etapaId"
                  name="etapaId"
                  defaultValue={carta.etapa.id}
                >
                  {carta.etapasDisponiveis.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.ordem}. {e.nome}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="observacao">Observação</Label>
                <Input
                  id="observacao"
                  name="observacao"
                  placeholder="opcional"
                />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                <ArrowRight /> {pending ? "Movendo…" : "Mover etapa"}
              </Button>
            </form>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Datas-marco</h3>
          <ul className="space-y-2">
            {carta.marcos.map((m) => {
              const feito = !!m.data;
              return (
                <li key={m.etapaOrdem} className="flex items-center gap-2 text-sm">
                  {feito ? (
                    <Check className="size-4 text-positive" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/40" />
                  )}
                  <span className={cn(!feito && "text-muted-foreground")}>
                    {m.nome}
                  </span>
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {feito ? formatDate(m.data) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Histórico de etapas</h3>
        {carta.historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>
        ) : (
          <ol className="space-y-3">
            {carta.historico.map((h) => (
              <li key={h.id} className="border-l-2 pl-3 text-sm">
                <div className="font-medium">
                  {h.de ? `${h.de} → ` : ""}
                  {h.para}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(h.data)}
                </div>
                {h.observacao && <div className="mt-1">{h.observacao}</div>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
