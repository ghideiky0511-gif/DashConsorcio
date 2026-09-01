"use client";

import { X } from "lucide-react";
import {
  statusConsorcioLabel,
  tipoBemLabel,
  tipoSaidaLabel,
} from "@/lib/labels";
import { useCarteiraParams } from "./use-carteira-params";

type Opcao = { id: string; nome: string };
type Opcoes = {
  cessionarias: Opcao[];
  administradoras: Opcao[];
  etapas: Opcao[];
};

const nomeDe = (lista: Opcao[], id: string, fallback: string) =>
  lista.find((o) => o.id === id)?.nome ?? fallback;

export function FiltrosAtivos({ opcoes }: { opcoes: Opcoes }) {
  const { sp, clearKey, clearAll, temFiltro } = useCarteiraParams();
  if (!temFiltro) return null;

  const chips: { key: string; label: string }[] = [];
  const add = (key: string, label: string | null | undefined) => {
    if (label) chips.push({ key, label });
  };

  add("q", sp.get("q") ? `“${sp.get("q")}”` : null);
  add(
    "status",
    sp.get("status")
      ? statusConsorcioLabel[
          sp.get("status") as keyof typeof statusConsorcioLabel
        ]
      : null,
  );
  add(
    "cessionaria",
    sp.get("cessionaria")
      ? nomeDe(opcoes.cessionarias, sp.get("cessionaria")!, "Cessionária")
      : null,
  );
  add(
    "adm",
    sp.get("adm")
      ? nomeDe(opcoes.administradoras, sp.get("adm")!, "Administradora")
      : null,
  );
  add(
    "etapa",
    sp.get("etapa") ? nomeDe(opcoes.etapas, sp.get("etapa")!, "Etapa") : null,
  );
  add(
    "tipoBem",
    sp.get("tipoBem")
      ? tipoBemLabel[sp.get("tipoBem") as keyof typeof tipoBemLabel]
      : null,
  );
  add(
    "saida",
    sp.get("saida")
      ? tipoSaidaLabel[sp.get("saida") as keyof typeof tipoSaidaLabel]
      : null,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Filtrando:</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => clearKey(c.key)}
          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-muted"
        >
          {c.label}
          <X className="size-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        limpar tudo
      </button>
    </div>
  );
}
