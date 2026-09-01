"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { atualizarCarta, criarCarta } from "@/app/actions/cartas";
import {
  formaContemplacaoLabel,
  statusConsorcioLabel,
  tipoBemLabel,
  tipoSaidaLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CartaFormValues } from "@/lib/queries/carta-form";

type Opcao = { id: string; nome: string };
type Opcoes = {
  cessionarias: Opcao[];
  administradoras: Opcao[];
  etapas: Opcao[];
};

const TEXTAREA_CLS =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-4 text-sm font-medium">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Campo({
  label,
  name,
  defaultValue,
  error,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  error?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Selecao({
  label,
  name,
  defaultValue,
  options,
  error,
  required,
  incluirVazio,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: [string, string][];
  error?: string;
  required?: boolean;
  incluirVazio?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <NativeSelect
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={!!error}
      >
        {incluirVazio && <option value="">—</option>}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </NativeSelect>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function CartaForm({
  mode,
  opcoes,
  values,
}: {
  mode: "criar" | "editar";
  opcoes: Opcoes;
  values?: CartaFormValues;
}) {
  const action =
    mode === "editar" && values
      ? atualizarCarta.bind(null, values.id)
      : criarCarta;
  const [state, formAction, pending] = useActionState(action, null);

  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const e = (name: string) => fe?.[name];
  const d = (name: keyof CartaFormValues) => values?.[name] ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <Secao titulo="Identificação">
        <Campo label="Controle interno" name="codigo" defaultValue={d("codigo")} error={e("codigo")} required />
        <Selecao
          label="Cessionária"
          name="cessionariaId"
          defaultValue={d("cessionariaId")}
          error={e("cessionariaId")}
          required
          incluirVazio
          options={opcoes.cessionarias.map((c) => [c.id, c.nome])}
        />
        <Selecao
          label="Administradora"
          name="administradoraId"
          defaultValue={d("administradoraId")}
          error={e("administradoraId")}
          required
          incluirVazio
          options={opcoes.administradoras.map((a) => [a.id, a.nome])}
        />
        <Campo label="Grupo" name="grupo" defaultValue={d("grupo")} error={e("grupo")} required />
        <Campo label="Cota" name="cota" defaultValue={d("cota")} error={e("cota")} required />
        <Campo label="Contrato" name="contrato" defaultValue={d("contrato")} error={e("contrato")} />
        <Campo label="Origem (intermediador)" name="origem" defaultValue={d("origem")} error={e("origem")} />
        <Selecao label="Tipo de bem" name="tipoBem" defaultValue={d("tipoBem") || "OUTRO"} error={e("tipoBem")} options={Object.entries(tipoBemLabel)} />
        <Selecao label="Status do consórcio" name="statusConsorcio" defaultValue={d("statusConsorcio") || "ATIVA"} error={e("statusConsorcio")} options={Object.entries(statusConsorcioLabel)} />
        <Selecao
          label="Etapa"
          name="etapaId"
          defaultValue={d("etapaId")}
          error={e("etapaId")}
          required
          incluirVazio
          options={opcoes.etapas.map((et) => [et.id, et.nome])}
        />
        <Selecao label="Tipo de saída" name="tipoSaida" defaultValue={d("tipoSaida")} error={e("tipoSaida")} incluirVazio options={Object.entries(tipoSaidaLabel)} />
      </Secao>

      <Secao titulo="Financeiro">
        <Campo label="Crédito atual (R$)" name="valorCredito" defaultValue={d("valorCredito")} error={e("valorCredito")} placeholder="0,00" />
        <Campo label="Crédito na contemplação (R$)" name="valorCreditoContemplacao" defaultValue={d("valorCreditoContemplacao")} error={e("valorCreditoContemplacao")} placeholder="0,00" />
        <Campo label="Percentual pago (%)" name="percentualPago" defaultValue={d("percentualPago")} error={e("percentualPago")} placeholder="70" />
        <Campo label="Custo da aquisição (R$)" name="valorCompra" defaultValue={d("valorCompra")} error={e("valorCompra")} placeholder="0,00" />
        <Campo label="Previsão de resgate (R$)" name="previsaoResgate" defaultValue={d("previsaoResgate")} error={e("previsaoResgate")} placeholder="0,00" />
        <Campo label="Valor resgatado (R$)" name="valorResgatado" defaultValue={d("valorResgatado")} error={e("valorResgatado")} placeholder="0,00" />
        <Campo label="Valor de revenda (R$)" name="valorRevenda" defaultValue={d("valorRevenda")} error={e("valorRevenda")} placeholder="0,00" />
      </Secao>

      <Secao titulo="Parcelamento">
        <Campo label="Parcelas totais" name="parcelasTotais" defaultValue={d("parcelasTotais")} error={e("parcelasTotais")} type="number" />
        <Campo label="Parcelas quitadas" name="parcelasQuitadas" defaultValue={d("parcelasQuitadas")} error={e("parcelasQuitadas")} type="number" />
        <Campo label="Valor da parcela (R$)" name="parcelaValor" defaultValue={d("parcelaValor")} error={e("parcelaValor")} placeholder="0,00" />
        <Campo label="Dia de vencimento" name="diaVencimento" defaultValue={d("diaVencimento")} error={e("diaVencimento")} type="number" />
      </Secao>

      <Secao titulo="Datas do processo">
        <Campo label="Data da compra" name="dataCompra" defaultValue={d("dataCompra")} error={e("dataCompra")} type="date" />
        <Campo label="Cadastro BOLSA" name="dataCadastroBolsa" defaultValue={d("dataCadastroBolsa")} error={e("dataCadastroBolsa")} type="date" />
        <Campo label="Encerramento do grupo" name="encerramentoGrupo" defaultValue={d("encerramentoGrupo")} error={e("encerramentoGrupo")} type="date" />
        <Campo label="Cópias p/ Severi" name="dataCopiasSeveri" defaultValue={d("dataCopiasSeveri")} error={e("dataCopiasSeveri")} type="date" />
        <Campo label="Originais p/ Severi" name="dataOriginaisSeveri" defaultValue={d("dataOriginaisSeveri")} error={e("dataOriginaisSeveri")} type="date" />
        <Campo label="Notificação" name="dataNotificacao" defaultValue={d("dataNotificacao")} error={e("dataNotificacao")} type="date" />
        <Campo label="Docto p/ ADM" name="dataDoctoAdm" defaultValue={d("dataDoctoAdm")} error={e("dataDoctoAdm")} type="date" />
        <Campo label="Contemplação" name="contempladaEm" defaultValue={d("contempladaEm")} error={e("contempladaEm")} type="date" />
        <Selecao label="Forma de contemplação" name="formaContemplacao" defaultValue={d("formaContemplacao")} error={e("formaContemplacao")} incluirVazio options={Object.entries(formaContemplacaoLabel)} />
        <Campo label="Pedido de resgate" name="dataPedidoResgate" defaultValue={d("dataPedidoResgate")} error={e("dataPedidoResgate")} type="date" />
        <Campo label="Data do resgate" name="dataResgate" defaultValue={d("dataResgate")} error={e("dataResgate")} type="date" />
        <Campo label="Data da revenda" name="dataRevenda" defaultValue={d("dataRevenda")} error={e("dataRevenda")} type="date" />
      </Secao>

      <Secao titulo="Observações">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="observacoes">
            Pendências (documento pendente, etc.)
          </Label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={2}
            defaultValue={d("observacoes")}
            className={TEXTAREA_CLS}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="observacoesGerais">Observações gerais</Label>
          <textarea
            id="observacoesGerais"
            name="observacoesGerais"
            rows={2}
            defaultValue={d("observacoesGerais")}
            className={TEXTAREA_CLS}
          />
        </div>
      </Secao>

      {state && !state.ok && (
        <p className={cn("text-sm text-destructive")}>{state.error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Salvando…"
            : mode === "criar"
              ? "Criar carta"
              : "Salvar alterações"}
        </Button>
        <Link
          href={mode === "editar" && values ? `/cartas/${values.id}` : "/"}
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
