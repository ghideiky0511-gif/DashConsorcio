"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const FILTER_KEYS = [
  "q",
  "status",
  "cessionaria",
  "adm",
  "etapa",
  "tipoBem",
  "saida",
] as const;

export function useCarteiraParams() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function push(p: URLSearchParams) {
    p.delete("page");
    router.push(p.toString() ? `${pathname}?${p}` : pathname);
  }

  function toggle(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (p.get(key) === value) p.delete(key);
    else p.set(key, value);
    push(p);
  }

  function setParam(key: string, value: string | undefined) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    push(p);
  }

  function clearKey(key: string) {
    setParam(key, undefined);
  }

  function clearAll() {
    const p = new URLSearchParams(sp.toString());
    for (const k of FILTER_KEYS) p.delete(k);
    push(p);
  }

  const temFiltro = FILTER_KEYS.some((k) => sp.get(k));

  return { sp, toggle, setParam, clearKey, clearAll, temFiltro, router, pathname };
}

export { FILTER_KEYS };
