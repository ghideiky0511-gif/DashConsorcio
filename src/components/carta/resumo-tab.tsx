import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import {
  formaContemplacaoLabel,
  statusConsorcioLabel,
  tipoBemLabel,
  tipoSaidaLabel,
} from "@/lib/labels";
import type { CartaDetalhe } from "@/lib/queries/carta";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">{titulo}</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {children}
      </dl>
    </div>
  );
}

export function ResumoTab({ carta }: { carta: CartaDetalhe }) {
  const lucroNeg = carta.percentualLucroPrevisto != null && carta.percentualLucroPrevisto < 0;

  return (
    <div className="space-y-4">
      <Bloco titulo="Identificação">
        <Campo label="Controle interno">{carta.codigo}</Campo>
        <Campo label="Cessionária">{carta.cessionaria.nome}</Campo>
        <Campo label="Administradora">{carta.administradora.nome}</Campo>
        <Campo label="Grupo / Cota">{`${carta.grupo} / ${carta.cota}`}</Campo>
        <Campo label="Contrato">{carta.contrato}</Campo>
        <Campo label="Origem">{carta.origem}</Campo>
        <Campo label="Tipo de bem">{tipoBemLabel[carta.tipoBem]}</Campo>
        <Campo label="Status do consórcio">
          {statusConsorcioLabel[carta.statusConsorcio]}
        </Campo>
        <Campo label="Tipo de saída">
          {carta.tipoSaida ? tipoSaidaLabel[carta.tipoSaida] : null}
        </Campo>
      </Bloco>

      <Bloco titulo="Financeiro">
        <Campo label="Crédito atual">{formatBRL(carta.valorCredito)}</Campo>
        <Campo label="Crédito na contemplação">
          {carta.valorCreditoContemplacao != null
            ? formatBRL(carta.valorCreditoContemplacao)
            : null}
        </Campo>
        <Campo label="Percentual pago">
          {carta.percentualPago != null ? formatPercent(carta.percentualPago) : null}
        </Campo>
        <Campo label="Custo da aquisição">{formatBRL(carta.valorCompra)}</Campo>
        <Campo label="Despesas">
          {formatBRL(carta.custoTotal - carta.valorCompra)}
        </Campo>
        <Campo label="Custo total">
          <span className="font-semibold">{formatBRL(carta.custoTotal)}</span>
        </Campo>
        <Campo label="Previsão de resgate">
          {carta.previsaoResgate != null ? formatBRL(carta.previsaoResgate) : null}
        </Campo>
        <Campo label="Lucro previsto">
          <span
            className={cn(lucroNeg ? "text-destructive" : "text-positive")}
          >
            {formatBRL(carta.lucroPrevisto)}
            {carta.percentualLucroPrevisto != null &&
              ` (${formatPercent(carta.percentualLucroPrevisto)})`}
          </span>
        </Campo>
        <Campo label="Resultado realizado">
          {carta.resultadoRealizado != null ? (
            <span
              className={cn(
                carta.resultadoRealizado < 0
                  ? "text-destructive"
                  : "text-positive",
              )}
            >
              {formatBRL(carta.resultadoRealizado)}
            </span>
          ) : null}
        </Campo>
        <Campo label="Valor resgatado">
          {carta.valorResgatado != null ? formatBRL(carta.valorResgatado) : null}
        </Campo>
        <Campo label="Valor de revenda">
          {carta.valorRevenda != null ? formatBRL(carta.valorRevenda) : null}
        </Campo>
      </Bloco>

      <Bloco titulo="Parcelamento e datas">
        <Campo label="Parcelas totais">{carta.parcelasTotais}</Campo>
        <Campo label="Parcelas quitadas">{carta.parcelasQuitadas}</Campo>
        <Campo label="Valor da parcela">
          {carta.parcelaValor != null ? formatBRL(carta.parcelaValor) : null}
        </Campo>
        <Campo label="Dia de vencimento">{carta.diaVencimento}</Campo>
        <Campo label="Data da compra">{formatDate(carta.dataCompra)}</Campo>
        <Campo label="Cadastro BOLSA">{formatDate(carta.dataCadastroBolsa)}</Campo>
        <Campo label="Encerramento do grupo">
          {formatDate(carta.encerramentoGrupo)}
        </Campo>
        <Campo label="Contemplação">
          {formatDate(carta.contempladaEm)}
          {carta.formaContemplacao
            ? ` (${formaContemplacaoLabel[carta.formaContemplacao]})`
            : ""}
        </Campo>
        <Campo label="Resgate / Revenda">
          {formatDate(carta.dataResgate ?? carta.dataRevenda)}
        </Campo>
        <Campo label="Próxima assembleia">
          {formatDate(carta.proximaAssembleia)}
        </Campo>
      </Bloco>

      {(carta.observacoes || carta.observacoesGerais) && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">Observações</h3>
          {carta.observacoes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Pendências: </span>
              {carta.observacoes}
            </p>
          )}
          {carta.observacoesGerais && (
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Gerais: </span>
              {carta.observacoesGerais}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
