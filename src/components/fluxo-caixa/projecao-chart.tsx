"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";
import type { ResumoCaixa } from "@/lib/queries/fluxo-caixa";

const AXIS = "var(--color-muted-foreground)";
const TOOLTIP = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export function ProjecaoChart({ dados }: { dados: ResumoCaixa["projecao12Meses"] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke={AXIS}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatBRL(v).replace(",00", "")}
            width={80}
          />
          <Tooltip
            contentStyle={TOOLTIP}
            formatter={(value, _name, item) => [
              formatBRL(Number(value) || 0),
              `${(item?.payload as { qtd?: number } | undefined)?.qtd ?? 0} parcela(s)`,
            ]}
          />
          <Bar dataKey="valor" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
