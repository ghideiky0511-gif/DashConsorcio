import { PageHeader, Placeholder } from "@/components/layout/page-header";

export default function ImportarPage() {
  return (
    <>
      <PageHeader
        title="Importar planilha"
        description="Carga da planilha de controle (.xlsx / .csv) com mapeamento das 36 colunas."
      />
      <Placeholder>
        O upload, o mapeamento pré-preenchido pelo template real e a gravação em
        lote (Carta + Acesso + Cedente + despesas por linha) entram na Fase D.
      </Placeholder>
    </>
  );
}
