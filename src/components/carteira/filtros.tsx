"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Opcao = { id: string; nome: string };

const SELECT_CLS =
  "h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Sel({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: [string, string][];
}) {
  return (
    <select
      className={cn(SELECT_CLS, !value && "text-muted-foreground")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(([v, label]) => (
        <option key={v} value={v} className="text-foreground">
          {label}
        </option>
      ))}
    </select>
  );
}

export function Filtros({
  cessionarias,
  administradoras,
  etapas,
}: {
  cessionarias: Opcao[];
  administradoras: Opcao[];
  etapas: Opcao[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spString = sp.toString();

  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const p = new URLSearchParams(spString);
      for (const [k, v] of Object.entries(patch)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      p.delete("page");
      router.push(p.toString() ? `${pathname}?${p}` : pathname);
    },
    [router, pathname, spString],
  );

  // busca com debounce
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function onQ(value: string) {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setParams({ q: value.trim() || undefined }),
      400,
    );
  }

  function limparTudo() {
    setQ("");
    router.push(pathname);
  }

  const temFiltro = ["q", "status", "cessionaria", "adm", "etapa", "tipoBem", "saida"].some(
    (k) => sp.get(k),
  );

  const exportHref = `/cartas/export${spString ? `?${spString}` : ""}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder="Buscar código, grupo, cota, contrato, cedente…"
        className="h-9 w-72"
      />
      <Sel
        value={sp.get("status") ?? ""}
        onChange={(v) => setParams({ status: v || undefined })}
        placeholder="Status"
        options={[
          ["ATIVA", "Ativa"],
          ["CANCELADA", "Cancelada"],
        ]}
      />
      <Sel
        value={sp.get("cessionaria") ?? ""}
        onChange={(v) => setParams({ cessionaria: v || undefined })}
        placeholder="Cessionária"
        options={cessionarias.map((c) => [c.id, c.nome])}
      />
      <Sel
        value={sp.get("adm") ?? ""}
        onChange={(v) => setParams({ adm: v || undefined })}
        placeholder="Administradora"
        options={administradoras.map((a) => [a.id, a.nome])}
      />
      <Sel
        value={sp.get("etapa") ?? ""}
        onChange={(v) => setParams({ etapa: v || undefined })}
        placeholder="Etapa"
        options={etapas.map((e) => [e.id, e.nome])}
      />
      <Sel
        value={sp.get("tipoBem") ?? ""}
        onChange={(v) => setParams({ tipoBem: v || undefined })}
        placeholder="Tipo de bem"
        options={[
          ["IMOVEL", "Imóvel"],
          ["VEICULO", "Veículo"],
          ["SERVICOS", "Serviços"],
          ["OUTRO", "Outro"],
        ]}
      />
      <Sel
        value={sp.get("saida") ?? ""}
        onChange={(v) => setParams({ saida: v || undefined })}
        placeholder="Saída"
        options={[
          ["RESGATE", "Resgate"],
          ["REVENDA", "Revenda"],
        ]}
      />

      {temFiltro && (
        <Button variant="ghost" size="sm" onClick={limparTudo}>
          <X /> Limpar
        </Button>
      )}

      <a
        href={exportHref}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
      >
        <Download /> Exportar CSV
      </a>
    </div>
  );
}
