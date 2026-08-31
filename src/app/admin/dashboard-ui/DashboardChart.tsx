"use client";

/**
 * GO-03C — Gráficos do Dashboard (recharts já no projeto).
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "./aggregates";

const COLORS = ["#f87171", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb7185", "#22d3ee", "#a3e635"];

export function DashboardChart({
  title,
  data,
  type = "bar",
  valueKey = "valor",
  currency = false,
  emptyLabel = "Sem dados neste período",
}: {
  title: string;
  data: { label: string; valor?: number; [k: string]: string | number | undefined }[];
  type?: "bar" | "line" | "pie";
  valueKey?: string;
  currency?: boolean;
  emptyLabel?: string;
}) {
  const hasData = data.some((d) => Number(d[valueKey] || 0) > 0);

  return (
    <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      {!hasData ? (
        <div className="flex h-48 items-center justify-center text-xs text-zinc-500">{emptyLabel}</div>
      ) : type === "pie" ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={36}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {data.map((d, i) => (
              <li key={d.label} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {d.label} ({d[valueKey]})
              </li>
            ))}
          </ul>
        </div>
      ) : type === "line" ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => (currency ? compactCurrency(Number(v)) : String(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) =>
                  currency ? formatCurrency(Number(v ?? 0)) : String(v ?? 0)
                }
              />
              <Line type="monotone" dataKey={valueKey} stroke="#f87171" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => (currency ? compactCurrency(Number(v)) : String(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v) =>
                  currency ? formatCurrency(Number(v ?? 0)) : String(v ?? 0)
                }
              />
              <Bar dataKey={valueKey} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function compactCurrency(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}
