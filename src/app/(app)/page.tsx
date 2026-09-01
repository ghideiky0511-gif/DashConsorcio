import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CarteiraGraficos } from "@/components/carteira/graficos";
import { CarteiraKpis } from "@/components/carteira/kpis";
import { CartaRow } from "@/components/carteira/carta-row";
import { Filtros } from "@/components/carteira/filtros";
import { Paginacao } from "@/components/carteira/paginacao";
import { SortHeader } from "@/components/carteira/sort-header";
import {
  getCarteiraResumo,
  getFiltroOpcoes,
  listarCartas,
  parseFiltros,
} from "@/lib/queries/carteira";

export default async function CarteiraPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const filtros = parseFiltros(sp);

  const [resumo, opcoes, { cartas, total, totalPaginas }] = await Promise.all([
    getCarteiraResumo(),
    getFiltroOpcoes(),
    listarCartas(filtros),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carteira"
        description="Visão das cartas de consórcio e indicadores da operação."
        actions={
          <Link href="/cartas/nova" className={buttonVariants({ size: "sm" })}>
            <Plus /> Nova carta
          </Link>
        }
      />

      <CarteiraKpis resumo={resumo} />
      <CarteiraGraficos resumo={resumo} />

      <div className="space-y-3">
        <Filtros
          cessionarias={opcoes.cessionarias}
          administradoras={opcoes.administradoras}
          etapas={opcoes.etapas}
        />

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader field="codigo">Código</SortHeader>
                <TableHead>Cessionária</TableHead>
                <TableHead>Administradora</TableHead>
                <TableHead>Grupo / Cota</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <SortHeader field="valorCredito" numeric>
                  Crédito atual
                </SortHeader>
                <TableHead className="text-right">Custo total</TableHead>
                <SortHeader field="previsaoResgate" numeric>
                  Prev. resgate
                </SortHeader>
                <TableHead className="text-right">% lucro prev.</TableHead>
                <SortHeader field="contempladaEm" numeric>
                  Contemplação
                </SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartas.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Nenhuma carta encontrada com esses filtros.
                  </TableCell>
                </TableRow>
              ) : (
                cartas.map((carta) => <CartaRow key={carta.id} carta={carta} />)
              )}
            </TableBody>
          </Table>
        </div>

        <Paginacao
          page={filtros.page}
          totalPaginas={totalPaginas}
          total={total}
        />
      </div>
    </div>
  );
}
