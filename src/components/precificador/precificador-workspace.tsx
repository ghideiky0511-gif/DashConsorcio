"use client";

// Dono único do upload/extração do extrato — as duas abas (cancelada e ativa)
// recebem os mesmos `campos` extraídos e se preenchem sozinhas, sem precisar
// ler o extrato duas vezes.

import { useActionState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extrairExtratoAction } from "@/app/actions/agente-extracao";
import { ExtratoUpload } from "./extrato-upload";
import { PrecificadorCanceladaForm } from "./precificador-cancelada-form";
import { PrecificadorAtivaForm } from "./precificador-ativa-form";

export function PrecificadorWorkspace() {
  const [extracao, extrairAction, extraindo] = useActionState(extrairExtratoAction, null);
  const campos = extracao?.ok ? extracao.campos : null;
  const abaSugerida = extracao?.ok && extracao.atualidade.motor === "ATIVA" ? "ativa" : "cancelada";

  return (
    <div className="space-y-6">
      <ExtratoUpload state={extracao} action={extrairAction} pending={extraindo} />

      <Tabs defaultValue={abaSugerida} key={campos ? abaSugerida : "default"}>
        <TabsList>
          <TabsTrigger value="cancelada">Carta cancelada</TabsTrigger>
          <TabsTrigger value="ativa">Carta ativa</TabsTrigger>
        </TabsList>
        <TabsContent value="cancelada" className="pt-4">
          <PrecificadorCanceladaForm key={campos ? JSON.stringify(campos) : "vazio"} campos={campos} />
        </TabsContent>
        <TabsContent value="ativa" className="pt-4">
          <PrecificadorAtivaForm key={campos ? JSON.stringify(campos) : "vazio"} campos={campos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
