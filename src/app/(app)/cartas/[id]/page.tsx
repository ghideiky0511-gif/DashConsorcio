import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcessoTab } from "@/components/carta/acesso-tab";
import { ContrapartesTab } from "@/components/carta/contrapartes-tab";
import { CustosTab } from "@/components/carta/custos-tab";
import { ParcelasTab } from "@/components/carta/parcelas-tab";
import { ProcessoTab } from "@/components/carta/processo-tab";
import { ResumoTab } from "@/components/carta/resumo-tab";
import { requireProfile } from "@/lib/auth";
import { getCarta } from "@/lib/queries/carta";
import { statusConsorcioLabel } from "@/lib/labels";
import { Role } from "@/generated/prisma/client";

export default async function CartaPage({ params }: PageProps<"/cartas/[id]">) {
  const { id } = await params;
  const [carta, profile] = await Promise.all([getCarta(id), requireProfile()]);
  const podeEditar = profile.role !== Role.VISUALIZADOR;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Carteira
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {carta.codigo}
            </h1>
            <Badge
              variant={
                carta.statusConsorcio === "ATIVA" ? "secondary" : "outline"
              }
            >
              {statusConsorcioLabel[carta.statusConsorcio]}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{
                  background:
                    carta.etapa.cor ?? "var(--color-muted-foreground)",
                }}
              />
              {carta.etapa.nome}
            </span>
          </div>

          {podeEditar && (
            <Link
              href={`/cartas/${carta.id}/editar`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil /> Editar carta
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {carta.cessionaria.nome} · {carta.administradora.nome} · Grupo{" "}
          {carta.grupo} / Cota {carta.cota}
        </p>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="processo">Processo</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
          <TabsTrigger value="contrapartes">Contrapartes</TabsTrigger>
          <TabsTrigger value="acesso">Acesso</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="pt-4">
          <ResumoTab carta={carta} />
        </TabsContent>
        <TabsContent value="processo" className="pt-4">
          <ProcessoTab carta={carta} podeEditar={podeEditar} />
        </TabsContent>
        <TabsContent value="custos" className="pt-4">
          <CustosTab
            cartaId={carta.id}
            despesas={carta.despesas}
            valorCompra={carta.valorCompra}
            custoTotal={carta.custoTotal}
            podeEditar={podeEditar}
          />
        </TabsContent>
        <TabsContent value="parcelas" className="pt-4">
          <ParcelasTab
            cartaId={carta.id}
            parcelas={carta.parcelas}
            parcelasTotais={carta.parcelasTotais}
            parcelasQuitadas={carta.parcelasQuitadas}
            parcelaValor={carta.parcelaValor}
            diaVencimento={carta.diaVencimento}
            podeEditar={podeEditar}
          />
        </TabsContent>
        <TabsContent value="contrapartes" className="pt-4">
          <ContrapartesTab
            cartaId={carta.id}
            contrapartes={carta.contrapartes}
            podeEditar={podeEditar}
          />
        </TabsContent>
        <TabsContent value="acesso" className="pt-4">
          <AcessoTab
            cartaId={carta.id}
            acesso={carta.acesso}
            podeEditar={podeEditar}
          />
        </TabsContent>
        <TabsContent value="documentos" className="pt-4">
          <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
            Upload e download de documentos (bucket privado do Supabase) entram na
            Fase D.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
