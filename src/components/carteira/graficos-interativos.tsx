"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChartPonto, VisaoGeral } from "@/lib/queries/visao-geral";
import { useCarteiraParams } from "./use-carteira-params";

const PALETA = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];
const AXIS = "var(--color-muted-foreground)";
const TOOLTIP = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

function Painel({
  titulo,
  hint,
  children,
}: {
  titulo: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-medium">{titulo}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function corDe(p: ChartPonto, i: number) {
  return p.cor ?? PALETA[i % PALETA.length];
}

export function GraficoCategoria({
  titulo,
  dados,
  paramKey,
  orientacao = "horizontal",
}: {
  titulo: string;
  dados: ChartPonto[];
  paramKey: string;
  orientacao?: "horizontal" | "vertical";
}) {
  const { sp, toggle } = useCarteiraParams();
  const ativo = sp.get(paramKey);
  const temSelecao = !!ativo;

  if (dados.length === 0) {
    return (
      <Painel titulo={titulo}>
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          Sem dados
        </div>
      </Painel>
    );
  }

  const opacidade = (p: ChartPonto) =>
    !temSelecao || p.key === ativo ? 1 : 0.25;

  const bars = (
    <Bar
      dataKey="qtd"
      radius={4}
      maxBarSize={orientacao === "vertical" ? 26 : 56}
      cursor="pointer"
      onClick={(_, index) => toggle(paramKey, dados[index]!.key)}
    >
      {dados.map((p, i) => (
        <Cell key={p.key} fill={corDe(p, i)} fillOpacity={opacidade(p)} />
      ))}
      <LabelList
        dataKey="qtd"
        position={orientacao === "vertical" ? "right" : "top"}
        style={{ fontSize: 12, fill: AXIS }}
      />
    </Bar>
  );

  return (
    <Painel titulo={titulo} hint={temSelecao ? "clique p/ limpar" : "clique p/ filtrar"}>
      {orientacao === "vertical" ? (
        <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 28 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={128}
            tick={{ fontSize: 12, fill: AXIS }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={TOOLTIP} />
          {bars}
        </BarChart>
      ) : (
        <BarChart data={dados} margin={{ left: -16, right: 8, top: 8 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: AXIS }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis hide allowDecimals={false} />
          <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={TOOLTIP} />
          {bars}
        </BarChart>
      )}
    </Painel>
  );
}

export function GraficoPizza({
  titulo,
  dados,
  paramKey,
}: {
  titulo: string;
  dados: ChartPonto[];
  paramKey: string;
}) {
  const { sp, toggle } = useCarteiraParams();
  const ativo = sp.get(paramKey);
  const temSelecao = !!ativo;

  if (dados.length === 0) {
    return (
      <Painel titulo={titulo}>
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          Sem dados
        </div>
      </Painel>
    );
  }

  return (
    <Painel titulo={titulo} hint={temSelecao ? "clique p/ limpar" : "clique p/ filtrar"}>
      <PieChart>
        <Tooltip contentStyle={TOOLTIP} />
        <Legend
          verticalAlign="bottom"
          height={24}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Pie
          data={dados}
          dataKey="qtd"
          nameKey="label"
          innerRadius={40}
          outerRadius={72}
          paddingAngle={2}
          cursor="pointer"
          onClick={(_, index) => toggle(paramKey, dados[index]!.key)}
          label
          labelLine={false}
        >
          {dados.map((p, i) => (
            <Cell
              key={p.key}
              fill={corDe(p, i)}
              fillOpacity={!temSelecao || p.key === ativo ? 1 : 0.25}
            />
          ))}
        </Pie>
      </PieChart>
    </Painel>
  );
}

export function GraficoTempo({ tempo }: { tempo: VisaoGeral["charts"]["tempo"] }) {
  if (tempo.length === 0) {
    return (
      <Painel titulo="Evolução no tempo">
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          Sem cartas com data de compra
        </div>
      </Painel>
    );
  }
  return (
    <Painel titulo="Evolução no tempo" hint="investido no mês · crédito acumulado">
      <ComposedChart data={tempo} margin={{ left: -8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
          }
        />
        <Tooltip
          contentStyle={TOOLTIP}
          formatter={(value) => formatBRL(Number(value ?? 0))}
        />
        <Bar
          dataKey="investidoMes"
          name="Investido no mês"
          fill="var(--color-chart-1)"
          radius={4}
          maxBarSize={40}
        />
        <Line
          dataKey="creditoAcum"
          name="Crédito acumulado"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </Painel>
  );
}

export function ChartHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Clique nos gráficos para filtrar a visão. Clique de novo para limpar.
    </p>
  );
}
