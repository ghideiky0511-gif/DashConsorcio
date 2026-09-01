const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const PERCENT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

type Numeric = number | string | { toString(): string } | null | undefined;

function toNumber(value: Numeric): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/** R$ 1.234,56 */
export function formatBRL(value: Numeric): string {
  return BRL.format(toNumber(value));
}

/** Recebe uma fração (0,7 → "70,0%"). */
export function formatPercent(fraction: Numeric): string {
  return PERCENT.format(toNumber(fraction));
}

/** 01/09/2026 — trata a data como UTC para não deslocar um dia. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE.format(d);
}

/** set. 2026 */
export function formatMonth(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return MONTH.format(d);
}
