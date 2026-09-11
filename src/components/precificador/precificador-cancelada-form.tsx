"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { precificarCartaCanceladaAction } from "@/app/actions/precificador";
import type { CampoExtrato } from "@/lib/precificador/agente";
import { ResultadoCancelada } from "./resultado-cancelada";

function numeroParaCampo(v: number | null | undefined): string {
  if (v == null) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function Campo({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  hint,
  error,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        aria-invalid={!!error}
      />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function PrecificadorCanceladaForm({
  campos,
}: {
  /** Campos já lidos do extrato pelo agente (compartilhado com a aba de carta ativa). */
  campos: CampoExtrato | null;
}) {
  const [state, formAction, pending] = useActionState(
    precificarCartaCanceladaAction,
    null,
  );
  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        key={campos ? JSON.stringify(campos) : "vazio"}
        className="space-y-4"
      >
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Dados da carta (do extrato)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo
              label="Crédito atual"
              name="creditoAtual"
              placeholder="253.574,00"
              defaultValue={numeroParaCampo(campos?.valorCredito)}
              required
              error={fieldErrors?.creditoAtual}
            />
            <Campo
              label="Percentual pago"
              name="percentualPagoPct"
              placeholder="6,79"
              defaultValue={numeroParaCampo(campos?.percentualPagoPct)}
              hint="em %, como no extrato (ex.: 6,79)"
              required
              error={fieldErrors?.percentualPagoPct}
            />
            <Campo
              label="Encerramento do grupo"
              name="encerramentoGrupo"
              type="date"
              defaultValue={campos?.dataPrevistaEncerramento ?? ""}
              required
              error={fieldErrors?.encerramentoGrupo}
            />
            <Campo
              label="Fundo comum pago (R$)"
              name="fundoComumPago"
              placeholder="15.727,70"
              defaultValue={numeroParaCampo(campos?.fundoComumPago)}
              hint="do extrato; sem isso usamos o proxy crédito × %pago × 0,87"
              error={fieldErrors?.fundoComumPago}
            />
            <Campo
              label="Administradora"
              name="administradoraNome"
              placeholder="Itaú"
              defaultValue={campos?.administradora ?? ""}
            />
            <Campo
              label="Grupo"
              name="grupo"
              placeholder="020358"
              defaultValue={campos?.grupo ?? ""}
            />
            <Campo
              label="Cota"
              name="cota"
              placeholder="0223"
              defaultValue={campos?.cota ?? ""}
            />
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Assunções</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo
              label="Índice de correção (a.a.)"
              name="indiceCorrecaoAnual"
              placeholder="4,30"
              hint={
                campos?.indiceCorrecao
                  ? `em %; taxa que corrige o fundo comum até a devolução — índice do grupo: ${campos.indiceCorrecao}`
                  : "em %; taxa (IPCA/INCC/IGP-M) que corrige o fundo comum até a devolução"
              }
              error={fieldErrors?.indiceCorrecaoAnual}
            />
            <Campo
              label="Multa de exclusão"
              name="multaExclusaoPct"
              placeholder="0"
              hint="em %; só quando há fundo comum pago"
            />
            <Campo
              label="Meta de retorno (× CDI)"
              name="metaMultiploCdi"
              placeholder="2"
              defaultValue="2"
              error={fieldErrors?.metaMultiploCdi}
            />
            <Campo
              label="Preço a testar (R$)"
              name="precoOfertado"
              placeholder="opcional"
              hint="deixe em branco para avaliar o preço justo"
            />
            <Campo
              label="Data de referência"
              name="dataReferencia"
              type="date"
              hint="opcional; padrão hoje"
            />
            <Campo
              label="Estimativa de meses até o sorteio"
              name="mesesAteContemplacaoEstimados"
              placeholder="opcional"
              hint="sem informar, usamos metade do prazo até o encerramento como cenário esperado"
            />
            <div className="flex items-center gap-2 pt-6">
              <input
                id="resgateCorrigido"
                name="resgateCorrigido"
                type="checkbox"
                defaultChecked
                className="size-4 rounded border-input"
              />
              <Label htmlFor="resgateCorrigido" className="font-normal">
                Administradora devolve o valor corrigido
              </Label>
            </div>
          </div>
        </section>

        <Button type="submit" disabled={pending}>
          {pending ? "Calculando…" : "Calcular"}
        </Button>

        {state?.ok === false && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </form>

      {state?.ok === true && <ResultadoCancelada resultado={state.resultado} />}
    </div>
  );
}
