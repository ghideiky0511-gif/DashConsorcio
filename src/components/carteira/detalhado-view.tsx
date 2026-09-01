import { Filtros } from "./filtros";
import { Paginacao } from "./paginacao";
import { TabelaCartas } from "./tabela-cartas";
import { CartaDrawer } from "./carta-drawer";
import { listarCartas, type CartasFiltros } from "@/lib/queries/carteira";
import { getCartaFormValuesOrNull } from "@/lib/queries/carta-form";

type Opcao = { id: string; nome: string };
type Opcoes = {
  cessionarias: Opcao[];
  administradoras: Opcao[];
  etapas: Opcao[];
};

export async function DetalhadoView({
  filtros,
  opcoes,
  editarId,
}: {
  filtros: CartasFiltros;
  opcoes: Opcoes;
  editarId?: string;
}) {
  const [{ cartas, total, totalPaginas }, editarValues] = await Promise.all([
    listarCartas(filtros),
    editarId ? getCartaFormValuesOrNull(editarId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-3">
      <Filtros
        cessionarias={opcoes.cessionarias}
        administradoras={opcoes.administradoras}
        etapas={opcoes.etapas}
      />
      <TabelaCartas cartas={cartas} />
      <Paginacao page={filtros.page} totalPaginas={totalPaginas} total={total} />
      <CartaDrawer values={editarValues} opcoes={opcoes} />
    </div>
  );
}
