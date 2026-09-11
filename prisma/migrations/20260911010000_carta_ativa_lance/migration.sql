-- CreateEnum
CREATE TYPE "TipoLanceAceito" AS ENUM ('CONTEMPLACAO', 'QUITACAO', 'AMBOS');

-- AlterTable
ALTER TABLE "administradoras" ADD COLUMN     "prazoLiberacaoQuitacaoDias" INTEGER,
ADD COLUMN     "tipoLanceAceito" "TipoLanceAceito";

-- AlterTable
ALTER TABLE "precificacoes" ALTER COLUMN "percentualPago" DROP NOT NULL,
ALTER COLUMN "encerramentoGrupo" DROP NOT NULL,
ALTER COLUMN "indiceCorrecaoAnual" DROP NOT NULL;

