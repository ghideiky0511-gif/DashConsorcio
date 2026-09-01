import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityCrud, type FieldDef } from "@/components/configuracoes/entity-crud";
import { EtapasCrud } from "@/components/configuracoes/etapas-crud";
import {
  atualizarAdministradora,
  criarAdministradora,
  excluirAdministradora,
} from "@/app/actions/administradoras";
import {
  atualizarCessionaria,
  criarCessionaria,
  excluirCessionaria,
} from "@/app/actions/cessionarias";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@/generated/prisma/client";

const camposCessionaria: FieldDef[] = [
  { name: "nome", label: "Nome", required: true },
  { name: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
  { name: "observacao", label: "Observação", showInTable: false },
  { name: "ativa", label: "Ativa", type: "toggle" },
];

const camposAdministradora: FieldDef[] = [
  { name: "nome", label: "Nome", required: true },
  { name: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
  { name: "contato", label: "Contato", placeholder: "e-mail ou telefone" },
];

export default async function ConfiguracoesPage() {
  const profile = await requireProfile();
  if (profile.role !== Role.ADMIN) redirect("/");

  const [cessionarias, administradoras, etapas] = await Promise.all([
    prisma.cessionaria.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { cartas: true } } },
    }),
    prisma.administradora.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { cartas: true } } },
    }),
    prisma.etapa.findMany({
      orderBy: { ordem: "asc" },
      include: { _count: { select: { cartas: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Cadastros de apoio usados pelas cartas e pela importação."
      />

      <Tabs defaultValue="cessionarias">
        <TabsList>
          <TabsTrigger value="cessionarias">Cessionárias</TabsTrigger>
          <TabsTrigger value="administradoras">Administradoras</TabsTrigger>
          <TabsTrigger value="etapas">Etapas do processo</TabsTrigger>
        </TabsList>

        <TabsContent value="cessionarias" className="pt-4">
          <EntityCrud
            singular="Cessionária"
            rows={cessionarias}
            fields={camposCessionaria}
            criar={criarCessionaria}
            atualizar={atualizarCessionaria}
            excluir={excluirCessionaria}
          />
        </TabsContent>

        <TabsContent value="administradoras" className="pt-4">
          <EntityCrud
            singular="Administradora"
            rows={administradoras}
            fields={camposAdministradora}
            criar={criarAdministradora}
            atualizar={atualizarAdministradora}
            excluir={excluirAdministradora}
          />
        </TabsContent>

        <TabsContent value="etapas" className="pt-4">
          <EtapasCrud etapas={etapas} />
        </TabsContent>
      </Tabs>
    </>
  );
}
