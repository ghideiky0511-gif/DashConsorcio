import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DetalhadoView } from "@/components/carteira/detalhado-view";
import { ViewTabs } from "@/components/carteira/view-tabs";
import { VisaoGeralView } from "@/components/carteira/visao-geral-view";
import { getFiltroOpcoes, parseFiltros } from "@/lib/queries/carteira";
import { getVisaoGeral } from "@/lib/queries/visao-geral";

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CarteiraPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const filtros = parseFiltros(sp);
  const view = one(sp.view) === "detalhado" ? "detalhado" : "geral";
  const editarId = one(sp.editar);

  const opcoes = await getFiltroOpcoes();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Carteira"
        description="Visão da carteira de cartas de consórcio."
        actions={
          <Link href="/cartas/nova" className={buttonVariants({ size: "sm" })}>
            <Plus /> Nova carta
          </Link>
        }
      />

      <ViewTabs />

      {view === "geral" ? (
        <VisaoGeralView data={await getVisaoGeral(filtros)} opcoes={opcoes} />
      ) : (
        <DetalhadoView filtros={filtros} opcoes={opcoes} editarId={editarId} />
      )}
    </div>
  );
}
