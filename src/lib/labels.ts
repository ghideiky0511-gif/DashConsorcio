import {
  CategoriaMovimento,
  FormaContemplacao,
  PapelContraparte,
  Role,
  StatusConsorcio,
  StatusParcela,
  TipoBem,
  TipoDespesa,
  TipoDocumento,
  TipoSaida,
} from "@/generated/prisma/client";

export const roleLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  VISUALIZADOR: "Visualizador",
};

export const tipoBemLabel: Record<TipoBem, string> = {
  IMOVEL: "Imóvel",
  VEICULO: "Veículo",
  SERVICOS: "Serviços",
  OUTRO: "Outro",
};

export const statusConsorcioLabel: Record<StatusConsorcio, string> = {
  ATIVA: "Ativa",
  CANCELADA: "Cancelada",
};

export const tipoSaidaLabel: Record<TipoSaida, string> = {
  RESGATE: "Resgate",
  REVENDA: "Revenda",
};

export const formaContemplacaoLabel: Record<FormaContemplacao, string> = {
  SORTEIO: "Sorteio",
  LANCE: "Lance",
};

export const statusParcelaLabel: Record<StatusParcela, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
};

export const papelContraparteLabel: Record<PapelContraparte, string> = {
  CEDENTE: "Cedente (consorciado)",
  COMPRADOR_FINAL: "Comprador final",
  REPRESENTANTE: "Representante",
  OUTRO: "Outro",
};

export const tipoDespesaLabel: Record<TipoDespesa, string> = {
  COMISSAO: "Comissão",
  DARE: "DARE",
  GUIA_TJ: "Guia TJ",
  CARTORIO: "Cartório",
  DIVERSAS: "Diversas",
  OUTRO: "Outro",
};

export const tipoDocumentoLabel: Record<TipoDocumento, string> = {
  CONTRATO: "Contrato",
  PROCURACAO: "Procuração",
  IDENTIFICACAO: "Identificação",
  COMPROVANTE: "Comprovante",
  OUTRO: "Outro",
};

export const categoriaMovimentoLabel: Record<CategoriaMovimento, string> = {
  COMPRA_CARTA: "Compra da carta",
  DESPESA_CARTA: "Despesa da carta",
  PARCELA: "Parcela",
  RESGATE_CARTA: "Resgate",
  REVENDA_CARTA: "Revenda",
  OUTRO: "Outro",
};

export const opcoesTipoDespesa = Object.entries(tipoDespesaLabel) as [
  TipoDespesa,
  string,
][];
export const opcoesPapelContraparte = Object.entries(papelContraparteLabel) as [
  PapelContraparte,
  string,
][];
