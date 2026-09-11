"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { precificarCartaAtivaAction } from "@/app/actions/precificador-ativa";
import type { CampoExtrato } from "@/lib/precificador/agente";
import {
  ResultadoAtivaNaoContemplada,
  ResultadoAtivaParcelas,
  ResultadoAtivaQuitacao,
} from "./resultado-ativa";

type Variante = "PARCELAS" | "LANCE_QUITACAO" | "NAO_CONTEMPLADA";

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

export function PrecificadorAtivaForm({
  campos,
}: {
  /** Campos já lidos do extrato pelo agente (compartilhado com a aba de carta cancelada). */
  campos: CampoExtrato | null;
}) {
  // Sugere a variante pela situação de cobrança do extrato: contemplado/quitado
  // já tem crédito na mão (parcelas); ativo/em atraso ainda não contemplou
  // (aguardando sorteio). Só roda na montagem — o componente é remontado
  // (via `key`, no workspace) toda vez que o agente lê um extrato novo.
  const [variante, setVariante] = useState<Variante>(() => {
    if (campos?.situacaoCobranca === "ATIVO" || campos?.situacaoCobranca === "EM_ATRASO") {
      return "NAO_CONTEMPLADA";
    }
    return "PARCELAS";
  });
  const [state, formAction, pending] = useActionState(precificarCartaAtivaAction, null);
  const fieldErrors = state?.ok === false ? state.fieldErrors : undefined;

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        key={campos ? JSON.stringify(campos) : "vazio"}
        className="space-y-4"
      >
        <input type="hidden" name="variante" value={variante} />

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-1 text-sm font-medium">Como a cota vai ser contemplada?</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Depende da administradora: algumas só aceitam lance de contemplação (o saldo
            continua sendo pago em parcelas), outras só aceitam lance de quitação (quita
            tudo, mas libera o crédito só depois de um prazo de carência).
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={variante === "PARCELAS"}
                onChange={() => setVariante("PARCELAS")}
              />
              Já contemplada / lance de contemplação (parcelas continuam)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={variante === "LANCE_QUITACAO"}
                onChange={() => setVariante("LANCE_QUITACAO")}
              />
              Lance de quitação (quita tudo, libera depois de um prazo)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={variante === "NAO_CONTEMPLADA"}
                onChange={() => setVariante("NAO_CONTEMPLADA")}
              />
              Ainda não contemplada (nenhum lance dado, aguardando sorteio)
            </label>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Dados da carta</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo
              label="Crédito atual"
              name="creditoAtual"
              placeholder="90.814,30"
              defaultValue={numeroParaCampo(campos?.valorCredito)}
              required
              error={fieldErrors?.creditoAtual}
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
            <Campo label="Cota" name="cota" placeholder="0223" defaultValue={campos?.cota ?? ""} />

            {variante === "PARCELAS" ? (
              <>
                <Campo
                  label="Parcela mensal restante"
                  name="parcelaMensal"
                  placeholder="708,05"
                  defaultValue={numeroParaCampo(campos?.parcelaMensal)}
                  required
                  error={fieldErrors?.parcelaMensal}
                />
                <Campo
                  label="Parcelas restantes"
                  name="parcelasRestantes"
                  placeholder="60"
                  defaultValue={numeroParaCampo(campos?.parcelasRestantes)}
                  required
                  error={fieldErrors?.parcelasRestantes}
                />
                <Campo
                  label="% da contemplação"
                  name="percentualLanceContemplacao"
                  placeholder="25"
                  hint="lance em % do crédito, se souber assim (tem prioridade sobre o R$ abaixo)"
                />
                <Campo
                  label="Lance de contemplação (R$)"
                  name="lanceContemplacao"
                  placeholder="0"
                  hint="se precisou dar lance pra contemplar agora"
                />
                <Campo
                  label="Taxa de transferência (R$)"
                  name="taxaTransferencia"
                  placeholder="0"
                  hint="cobrada pela administradora ao transferir a cota"
                />
              </>
            ) : variante === "LANCE_QUITACAO" ? (
              <>
                <Campo
                  label="Lance de quitação (R$)"
                  name="lanceQuitacao"
                  placeholder="40.000,00"
                  required
                  error={fieldErrors?.lanceQuitacao}
                />
                <Campo
                  label="Prazo de liberação (dias)"
                  name="prazoLiberacaoDias"
                  placeholder="180"
                  hint="padrão de mercado: 180 dias"
                />
              </>
            ) : (
              <>
                <Campo
                  label="Parcela mensal"
                  name="parcelaMensal"
                  placeholder="708,05"
                  defaultValue={numeroParaCampo(campos?.parcelaMensal)}
                  required
                  error={fieldErrors?.parcelaMensal}
                />
                <Campo
                  label="Meses até o encerramento do grupo"
                  name="mesesAteEncerramento"
                  placeholder="60"
                  defaultValue={numeroParaCampo(campos?.prazoGrupoMeses)}
                  required
                  error={fieldErrors?.mesesAteEncerramento}
                />
                <Campo
                  label="Estimativa de meses até contemplar"
                  name="mesesAteContemplacaoEstimados"
                  placeholder="opcional"
                  hint="sem informar, usamos metade do prazo restante como cenário esperado"
                />
                <Campo
                  label="Taxa de transferência (R$)"
                  name="taxaTransferencia"
                  placeholder="0"
                  hint="cobrada pela administradora ao transferir a cota"
                />
              </>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 text-sm font-medium">Assunções</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo
              label="Meta de retorno (× CDI)"
              name="metaMultiploCdi"
              placeholder="2"
              defaultValue="2"
              error={fieldErrors?.metaMultiploCdi}
            />
            <Campo
              label={
                variante === "LANCE_QUITACAO"
                  ? "Preço ao vendedor a testar (R$)"
                  : "Preço da cota a testar (R$)"
              }
              name="precoOfertado"
              placeholder="opcional"
              hint="deixe em branco para avaliar o preço justo"
            />
          </div>
        </section>

        <Button type="submit" disabled={pending}>
          {pending ? "Calculando…" : "Calcular"}
        </Button>

        {state?.ok === false && <p className="text-sm text-destructive">{state.error}</p>}
      </form>

      {state?.ok === true && state.variante === "PARCELAS" && (
        <ResultadoAtivaParcelas resultado={state.resultado} />
      )}
      {state?.ok === true && state.variante === "LANCE_QUITACAO" && (
        <ResultadoAtivaQuitacao resultado={state.resultado} />
      )}
      {state?.ok === true && state.variante === "NAO_CONTEMPLADA" && (
        <ResultadoAtivaNaoContemplada resultado={state.resultado} />
      )}
    </div>
  );
}
