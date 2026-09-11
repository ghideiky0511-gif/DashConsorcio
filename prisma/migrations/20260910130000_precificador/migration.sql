-- CreateEnum
CREATE TYPE "MotorPrecificacao" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "IndiceCorrecao" AS ENUM ('IPCA', 'INCC', 'IGPM', 'OUTRO');

-- CreateEnum
CREATE TYPE "MomentoResgate" AS ENUM ('ENCERRAMENTO_GRUPO', 'SORTEIO_EXCLUIDOS', 'PRAZO_FIXO');

-- AlterTable
ALTER TABLE "administradoras" ADD COLUMN     "indiceCorrecao" "IndiceCorrecao",
ADD COLUMN     "momentoResgate" "MomentoResgate",
ADD COLUMN     "multaExclusaoPct" DECIMAL(7,4),
ADD COLUMN     "resgateCorrigido" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "curva_juros_snapshot" (
    "id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "fonte" TEXT NOT NULL,
    "cdiAnual" DECIMAL(9,6) NOT NULL,
    "ipcaProjAnual" DECIMAL(9,6),
    "pontos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curva_juros_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precificacoes" (
    "id" UUID NOT NULL,
    "motor" "MotorPrecificacao" NOT NULL,
    "cartaId" UUID,
    "administradoraId" UUID,
    "administradoraNome" TEXT,
    "grupo" TEXT,
    "cota" TEXT,
    "creditoAtual" DECIMAL(14,2) NOT NULL,
    "percentualPago" DECIMAL(7,4) NOT NULL,
    "fundoComumPago" DECIMAL(14,2),
    "encerramentoGrupo" DATE NOT NULL,
    "dataReferencia" DATE NOT NULL,
    "mesesAteEncerramento" INTEGER NOT NULL,
    "indiceCorrecaoAnual" DECIMAL(9,6) NOT NULL,
    "multaExclusaoPct" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "metaMultiploCdi" DECIMAL(6,3) NOT NULL DEFAULT 2,
    "cdiAcumuladoPeriodo" DECIMAL(9,6) NOT NULL,
    "curvaSnapshotId" UUID,
    "resgateProjetado" DECIMAL(14,2) NOT NULL,
    "precoJusto" DECIMAL(14,2),
    "precoOfertado" DECIMAL(14,2),
    "propostaMdv" DECIMAL(14,2),
    "propostaObjetiva" DECIMAL(14,2),
    "retornoTotal" DECIMAL(9,6),
    "retornoMensal" DECIMAL(9,6),
    "multiploCdi" DECIMAL(9,4),
    "cenarios" JSONB,
    "detalhe" JSONB,
    "observacoes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curva_juros_snapshot_data_key" ON "curva_juros_snapshot"("data");

-- CreateIndex
CREATE INDEX "precificacoes_cartaId_idx" ON "precificacoes"("cartaId");

-- CreateIndex
CREATE INDEX "precificacoes_createdAt_idx" ON "precificacoes"("createdAt");

-- AddForeignKey
ALTER TABLE "precificacoes" ADD CONSTRAINT "precificacoes_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "cartas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precificacoes" ADD CONSTRAINT "precificacoes_administradoraId_fkey" FOREIGN KEY ("administradoraId") REFERENCES "administradoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precificacoes" ADD CONSTRAINT "precificacoes_curvaSnapshotId_fkey" FOREIGN KEY ("curvaSnapshotId") REFERENCES "curva_juros_snapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precificacoes" ADD CONSTRAINT "precificacoes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

