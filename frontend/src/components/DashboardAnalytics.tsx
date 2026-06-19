import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatInrAmount } from "../const/formatCurrency";
import { APP_TIMEZONE } from "../const/timezone";

export type DashboardDailyOrders = {
  date: string;
  orders: number;
  revenue: string;
};

export type DashboardStatusBreakdown = {
  status: string;
  count: number;
};

export type DashboardAnalytics = {
  range_start: string;
  range_end: string;
  total_orders: number;
  total_revenue: string;
  daily_orders: DashboardDailyOrders[];
  status_breakdown: DashboardStatusBreakdown[];
};

type DashboardAnalyticsProps = {
  data?: DashboardAnalytics;
  isLoading: boolean;
  isError: boolean;
};

const chartPalette = {
  primary: "#1e293b",
  secondary: "#1d4ed8",
  success: "#15803d",
  warning: "#b45309",
  danger: "#be123c",
  neutral: "#475569",
} as const;

const statusColors = [
  chartPalette.primary,
  chartPalette.secondary,
  chartPalette.success,
  chartPalette.warning,
  chartPalette.danger,
  chartPalette.neutral,
];

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "short",
});

function formatChartDate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateLabelFormatter.format(parsed);
}

function formatRevenueTick(value: number) {
  return compactNumber.format(value);
}

export function DashboardAnalytics({
  data,
  isLoading,
  isError,
}: DashboardAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading analytics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
        Failed to load dashboard analytics.
      </div>
    );
  }

  if (!data || data.total_orders === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Analytics
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              No order activity in the selected window.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Range
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {data ? `${data.range_start} to ${data.range_end}` : "30 days"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = data.daily_orders.map((entry) => ({
    ...entry,
    revenueValue: Number(entry.revenue),
    label: formatChartDate(entry.date),
  }));
  const statusSeries = [...data.status_breakdown]
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);
  const totalStatusCount = statusSeries.reduce(
    (sum, entry) => sum + entry.count,
    0,
  );

  const totalRevenue = formatInrAmount(data.total_revenue);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Sales & Order Trends
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Daily orders, revenue, and order status mix for the selected range.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryChip label="Orders" value={data.total_orders.toString()} tone="primary" />
            <SummaryChip label="Revenue" value={totalRevenue} tone="secondary" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">Daily trend</h4>
              <p className="text-sm text-slate-500">
                Orders and revenue over time
              </p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatRevenueTick}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid #e4e4e7",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                  }}
                  labelStyle={{ color: "#18181b", fontWeight: 600 }}
                  formatter={(value, name) => {
                    const numericValue = Number(value ?? 0);

                    return [
                      name === "revenueValue"
                        ? formatInrAmount(numericValue)
                        : numericValue,
                      name === "revenueValue" ? "Revenue" : "Orders",
                    ] as [string | number, string];
                  }}
                />
                <Legend content={<LineLegend />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="orders"
                  stroke={chartPalette.primary}
                  strokeWidth={2.25}
                  dot={{ r: 2.75, strokeWidth: 2, stroke: "#fff", fill: chartPalette.primary }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  name="Orders"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenueValue"
                  stroke={chartPalette.secondary}
                  strokeWidth={2.25}
                  dot={{ r: 2.75, strokeWidth: 2, stroke: "#fff", fill: chartPalette.secondary }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-900">Order status</h4>
              <p className="text-sm text-slate-500">
                Distribution of orders in the selected range
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Total
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {totalStatusCount}
              </p>
            </div>
          </div>

          {statusSeries.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-1 2xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)] 2xl:items-center">
              <div className="relative mx-auto h-60 w-full max-w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e4e4e7",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                      }}
                      labelStyle={{ color: "#18181b", fontWeight: 600 }}
                      formatter={(value, name) => {
                        const count = Number(value ?? 0);
                        const share =
                          totalStatusCount > 0
                            ? Math.round((count / totalStatusCount) * 100)
                            : 0;

                        return [
                          `${count} orders (${share}%)`,
                          formatStatusLabel(String(name)),
                        ] as [string, string];
                      }}
                    />
                    <Pie
                      data={statusSeries}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={70}
                      outerRadius={98}
                      paddingAngle={3}
                      cornerRadius={8}
                      startAngle={90}
                      endAngle={-270}
                      stroke="#f8fafc"
                      strokeWidth={3}
                      minAngle={5}
                    >
                      {statusSeries.map((entry, index) => (
                        <Cell
                          key={entry.status}
                          fill={statusColors[index % statusColors.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-semibold tracking-tight text-slate-900">
                      {totalStatusCount}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Orders
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                {statusSeries.map((entry, index) => {
                  const color = statusColors[index % statusColors.length];
                  const share =
                    totalStatusCount > 0
                      ? Math.round((entry.count / totalStatusCount) * 100)
                      : 0;

                  return (
                    <LegendChip
                      key={entry.status}
                      label={formatStatusLabel(entry.status)}
                      count={entry.count}
                      share={share}
                      color={color}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              No order status data available.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

type SummaryChipProps = {
  label: string;
  value: string;
  tone: "primary" | "secondary" | "neutral";
};

const summaryChipTones: Record<SummaryChipProps["tone"], string> = {
  primary: "bg-slate-800",
  secondary: "bg-blue-600",
  neutral: "bg-slate-500",
};

function SummaryChip({ label, value, tone }: SummaryChipProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${summaryChipTones[tone]}`} />
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function LineLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <LegendChip label="Orders" color={chartPalette.primary} />
      <LegendChip label="Revenue" color={chartPalette.secondary} />
    </div>
  );
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function LegendChip({
  label,
  color,
  count,
  share,
}: {
  label: string;
  color: string;
  count?: number;
  share?: number;
}) {
  const showStats = count !== undefined && share !== undefined;

  return (
    <div
      className={`flex items-center ${
        showStats ? "justify-between" : "justify-start"
      } gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 truncate text-slate-700">{label}</span>
      </div>
      {showStats ? (
        <div className="shrink-0 text-right leading-none">
          <p className="text-sm font-semibold text-slate-900">{count}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
            {share}%
          </p>
        </div>
      ) : null}
    </div>
  );
}
