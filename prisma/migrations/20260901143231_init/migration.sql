-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "TipoBem" AS ENUM ('IMOVEL', 'VEICULO', 'SERVICOS', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusConsorcio" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoSaida" AS ENUM ('RESGATE', 'REVENDA');

-- CreateEnum
CREATE TYPE "FormaContemplacao" AS ENUM ('SORTEIO', 'LANCE');

-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PapelContraparte" AS ENUM ('CEDENTE', 'COMPRADOR_FINAL', 'REPRESENTANTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CONTRATO', 'PROCURACAO', 'IDENTIFICACAO', 'COMPROVANTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoDespesa" AS ENUM ('COMISSAO', 'DARE', 'GUIA_TJ', 'CARTORIO', 'DIVERSAS', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "CategoriaMovimento" AS ENUM ('COMPRA_CARTA', 'DESPESA_CARTA', 'PARCELA', 'RESGATE_CARTA', 'REVENDA_CARTA', 'OUTRO');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VISUALIZADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cessionarias" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "observacao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cessionarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administradoras" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "contato" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "administradoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "cor" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartas" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "cessionariaId" UUID NOT NULL,
    "administradoraId" UUID NOT NULL,
    "grupo" TEXT NOT NULL,
    "cota" TEXT NOT NULL,
    "contrato" TEXT,
    "origem" TEXT,
    "tipoBem" "TipoBem" NOT NULL DEFAULT 'OUTRO',
    "statusConsorcio" "StatusConsorcio" NOT NULL DEFAULT 'ATIVA',
    "tipoSaida" "TipoSaida",
    "etapaId" UUID NOT NULL,
    "valorCredito" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorCreditoContemplacao" DECIMAL(14,2),
    "percentualPago" DECIMAL(7,4),
    "valorCompra" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "previsaoResgate" DECIMAL(14,2),
    "valorResgatado" DECIMAL(14,2),
    "valorRevenda" DECIMAL(14,2),
    "dataCompra" DATE,
    "dataCadastroBolsa" DATE,
    "encerramentoGrupo" DATE,
    "dataCopiasSeveri" DATE,
    "dataOriginaisSeveri" DATE,
    "dataNotificacao" DATE,
    "dataDoctoAdm" DATE,
    "dataPedidoResgate" DATE,
    "contempladaEm" DATE,
    "dataResgate" DATE,
    "dataRevenda" DATE,
    "formaContemplacao" "FormaContemplacao",
    "parcelasTotais" INTEGER,
    "parcelasQuitadas" INTEGER,
    "parcelaValor" DECIMAL(14,2),
    "diaVencimento" INTEGER,
    "observacoes" TEXT,
    "observacoesGerais" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cartas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessos_cota" (
    "id" UUID NOT NULL,
    "cartaId" UUID NOT NULL,
    "emailCadastro" TEXT,
    "cotaChave" TEXT,
    "celular" TEXT,
    "senha" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acessos_cota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas_carta" (
    "id" UUID NOT NULL,
    "cartaId" UUID NOT NULL,
    "tipo" "TipoDespesa" NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "data" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despesas_carta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapa_historico" (
    "id" UUID NOT NULL,
    "cartaId" UUID NOT NULL,
    "etapaDeId" UUID,
    "etapaParaId" UUID NOT NULL,
    "observacao" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "etapa_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" UUID NOT NULL,
    "cartaId" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "competencia" DATE NOT NULL,
    "vencimento" DATE NOT NULL,
    "valorPrevisto" DECIMAL(14,2) NOT NULL,
    "status" "StatusParcela" NOT NULL DEFAULT 'PENDENTE',
    "valorPago" DECIMAL(14,2),
    "dataPagamento" DATE,
    "formaPagamento" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrapartes" (
    "id" UUID NOT NULL,
    "cartaId" UUID NOT NULL,
    "papel" "PapelContraparte" NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contrapartes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "cartaId" UUID,
    "parcelaId" UUID,
    "contraparteId" UUID,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'OUTRO',
    "nome" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_caixa" (
    "id" UUID NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "categoria" "CategoriaMovimento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "data" DATE NOT NULL,
    "cartaId" UUID,
    "parcelaId" UUID,
    "despesaId" UUID,
    "conciliado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentos_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_caixa" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dataSaldoInicial" DATE NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cessionarias_nome_key" ON "cessionarias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "administradoras_nome_key" ON "administradoras"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_ordem_key" ON "etapas"("ordem");

-- CreateIndex
CREATE UNIQUE INDEX "cartas_codigo_key" ON "cartas"("codigo");

-- CreateIndex
CREATE INDEX "cartas_cessionariaId_idx" ON "cartas"("cessionariaId");

-- CreateIndex
CREATE INDEX "cartas_administradoraId_idx" ON "cartas"("administradoraId");

-- CreateIndex
CREATE INDEX "cartas_etapaId_idx" ON "cartas"("etapaId");

-- CreateIndex
CREATE INDEX "cartas_statusConsorcio_idx" ON "cartas"("statusConsorcio");

-- CreateIndex
CREATE UNIQUE INDEX "acessos_cota_cartaId_key" ON "acessos_cota"("cartaId");

-- CreateIndex
CREATE INDEX "despesas_carta_cartaId_idx" ON "despesas_carta"("cartaId");

-- CreateIndex
CREATE INDEX "etapa_historico_cartaId_idx" ON "etapa_historico"("cartaId");

-- CreateIndex
CREATE INDEX "parcelas_vencimento_idx" ON "parcelas"("vencimento");

-- CreateIndex
CREATE INDEX "parcelas_status_idx" ON "parcelas"("status");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_cartaId_numero_key" ON "parcelas"("cartaId", "numero");

-- CreateIndex
CREATE INDEX "contrapartes_cartaId_idx" ON "contrapartes"("cartaId");

-- CreateIndex
CREATE INDEX "documentos_cartaId_idx" ON "documentos"("cartaId");

-- CreateIndex
CREATE INDEX "movimentos_caixa_data_idx" ON "movimentos_caixa"("data");

-- CreateIndex
CREATE INDEX "movimentos_caixa_cartaId_idx" ON "movimentos_caixa"("cartaId");

-- AddForeignKey
ALTER TABLE "cartas" ADD CONSTRAINT "cartas_cessionariaId_fkey" FOREIGN KEY ("cessionariaId") REFERENCES "cessionarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartas" ADD CONSTRAINT "cartas_administradoraId_fkey" FOREIGN KEY ("administradoraId") REFERENCES "administradoras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartas" ADD CONSTRAINT "cartas_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartas" ADD CONSTRAINT "cartas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acessos_cota" ADD CONSTRAINT "acessos_cota_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_carta" ADD CONSTRAINT "despesas_carta_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_historico" ADD CONSTRAINT "etapa_historico_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_historico" ADD CONSTRAINT "etapa_historico_etapaDeId_fkey" FOREIGN KEY ("etapaDeId") REFERENCES "etapas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_historico" ADD CONSTRAINT "etapa_historico_etapaParaId_fkey" FOREIGN KEY ("etapaParaId") REFERENCES "etapas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_historico" ADD CONSTRAINT "etapa_historico_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrapartes" ADD CONSTRAINT "contrapartes_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_contraparteId_fkey" FOREIGN KEY ("contraparteId") REFERENCES "contrapartes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "despesas_carta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
