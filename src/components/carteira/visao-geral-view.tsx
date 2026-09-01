import { CarteiraKpis } from "./kpis";
import { FiltrosAtivos } from "./filtros-ativos";
import {
  ChartHint,
  GraficoCategoria,
  GraficoPizza,
  GraficoTempo,
} from "./graficos-interativos";
import { ListaCompacta } from "./lista-compacta";
import type { VisaoGeral } from "@/lib/queries/visao-geral";

type Opcao = { id: string; nome: string };
type Opcoes = {
  cessionarias: Opcao[];
  administradoras: Opcao[];
  etapas: Opcao[];
};

export function VisaoGeralView({
  data,
  opcoes,
}: {
  data: VisaoGeral;
  opcoes: Opcoes;
}) {
  return (
    <div className="space-y-4">
      <CarteiraKpis kpis={data.kpis} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FiltrosAtivos opcoes={opcoes} />
        <ChartHint className="ml-auto" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <GraficoCategoria
          titulo="Cartas por etapa"
          dados={data.charts.etapas}
          paramKey="etapa"
          orientacao="vertical"
        />
        <GraficoCategoria
          titulo="Cartas por cessionária"
          dados={data.charts.cessionarias}
          paramKey="cessionaria"
        />
        <GraficoCategoria
          titulo="Cartas por administradora"
          dados={data.charts.administradoras}
          paramKey="adm"
        />
        <GraficoPizza
          titulo="Cartas por tipo de bem"
          dados={data.charts.tiposBem}
          paramKey="tipoBem"
        />
      </div>

      <GraficoTempo tempo={data.charts.tempo} />

      <ListaCompacta cartas={data.lista.cartas} total={data.lista.total} />
    </div>
  );
}
