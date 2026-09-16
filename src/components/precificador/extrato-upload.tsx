// Upload do extrato + status de atualidade — compartilhado pelas abas de carta
// cancelada e carta ativa (uma leitura só, os dois formulários se preenchem
// a partir do mesmo resultado).

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExtracaoExtratoState } from "@/app/actions/agente-extracao";
import type { StatusChecagem, Validacao } from "@/lib/precificador/agente";

const ROTULO_CHECAGEM: Record<keyof Validacao, string> = {
  extratoVigente: "Extrato vigente",
  assembleiaPassou: "Assembleias desde a emissão",
  grupoEncerrado: "Encerramento do grupo",
  reajustePendente: "Reajuste anual",
  situacao: "Situação de cobrança",
  camposFaltantes: "Campos essenciais",
};

const COR_STATUS: Record<StatusChecagem, string> = {
  ok: "text-emerald-600",
  atencao: "text-amber-600",
  bloqueio: "text-destructive",
};

const ROTULO_STATUS: Record<StatusChecagem, string> = {
  ok: "OK",
  atencao: "Atenção",
  bloqueio: "Bloqueio",
};

export function ExtratoUpload({
  state,
  action,
  pending,
}: {
  state: ExtracaoExtratoState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [arquivos, setArquivos] = useState<File[]>([]);

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 text-sm font-medium">Ler extrato automaticamente</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Envie o PDF (ou imagens) do extrato — se vier em mais de um arquivo (ex.:
        2 fotos), selecione todos de uma vez. O agente preenche os campos da aba
        certa (cancelada ou ativa) abaixo e avisa se o extrato está desatualizado.
      </p>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="arquivos"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp"
          required
          onChange={(e) => setArquivos(Array.from(e.target.files ?? []))}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <UploadCloud className="size-4" />
          {pending ? "Lendo…" : "Extrair dados"}
        </Button>
      </form>

      {arquivos.length > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {arquivos.length} arquivos selecionados: {arquivos.map((a) => a.name).join(", ")}
        </p>
      )}

      {state?.ok === false && (
        <p className="mt-3 text-sm text-destructive">{state.error}</p>
      )}

      {state?.ok === true && (
        <div className="mt-4 space-y-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Status geral:</span>
            <span className={COR_STATUS[state.atualidade.statusGeral]}>
              {ROTULO_STATUS[state.atualidade.statusGeral]}
            </span>
            {state.campos.administradora && (
              <span className="text-muted-foreground">
                · {state.campos.administradora} · grupo {state.campos.grupo ?? "—"} · cota{" "}
                {state.campos.cota ?? "—"}
              </span>
            )}
            {state.atualidade.motor && (
              <span className="text-muted-foreground">
                · sugestão: usar a aba{" "}
                {state.atualidade.motor === "CANCELADA" ? "Carta cancelada" : "Carta ativa"}
              </span>
            )}
          </div>
          <ul className="space-y-1 text-sm">
            {(Object.keys(state.atualidade.validacao) as Array<keyof Validacao>).map((k) => {
              const c = state.atualidade.validacao[k];
              return (
                <li key={k} className="flex gap-2">
                  <span className={`shrink-0 font-medium ${COR_STATUS[c.status]}`}>
                    [{ROTULO_STATUS[c.status]}]
                  </span>
                  <span>
                    <span className="text-muted-foreground">{ROTULO_CHECAGEM[k]}:</span>{" "}
                    {c.mensagem}
                  </span>
                </li>
              );
            })}
          </ul>
          {state.campos.observacoes && (
            <p className="text-sm text-muted-foreground">
              Observação do agente: {state.campos.observacoes}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Campos preenchidos no formulário abaixo — confira antes de calcular.
          </p>
        </div>
      )}
    </section>
  );
}
