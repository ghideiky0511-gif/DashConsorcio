"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CarteiraResumo } from "@/lib/queries/carteira";

const AXIS = "var(--color-muted-foreground)";

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 text-sm font-medium">{titulo}</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CarteiraGraficos({ resumo }: { resumo: CarteiraResumo }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Painel titulo="Cartas por etapa">
        <BarChart
          data={resumo.grafEtapas}
          layout="vertical"
          margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="nome"
            width={130}
            tick={{ fontSize: 12, fill: AXIS }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="qtd" name="Cartas" radius={4} maxBarSize={22}>
            {resumo.grafEtapas.map((e, i) => (
              <Cell key={i} fill={e.cor ?? "var(--color-chart-1)"} />
            ))}
            <LabelList dataKey="qtd" position="right" style={{ fontSize: 12, fill: AXIS }} />
          </Bar>
        </BarChart>
      </Painel>

      <Painel titulo="Cartas por cessionária">
        <BarChart
          data={resumo.grafCessionarias}
          margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
        >
          <XAxis
            dataKey="nome"
            tick={{ fontSize: 12, fill: AXIS }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="qtd"
            name="Cartas"
            fill="var(--color-chart-1)"
            radius={4}
            maxBarSize={64}
          >
            <LabelList dataKey="qtd" position="top" style={{ fontSize: 12, fill: AXIS }} />
          </Bar>
        </BarChart>
      </Painel>
    </div>
  );
}
