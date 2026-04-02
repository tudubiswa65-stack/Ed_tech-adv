'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart as RechartsAreaChart,
  TooltipProps,
} from 'recharts';

interface ChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  currency?: boolean;
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

// Custom tooltip for currency values
function CurrencyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
            ${Number(entry.value ?? 0).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Custom tooltip for count values
function CountTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
            {Number(entry.value ?? 0).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function BarChart({ data, xKey, yKey, color = '#6366f1', currency = false }: ChartProps) {
  const formatYAxis = (value: number) =>
    currency ? `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}` : String(value);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={currency ? 60 : 40}
        />
        {currency ? <Tooltip content={<CurrencyTooltip />} /> : <Tooltip content={<CountTooltip />} />}
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={50} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

export function LineChart({ data, xKey, yKey, color = '#10b981', currency = false }: ChartProps) {
  const formatYAxis = (value: number) =>
    currency ? `$${value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}` : String(value);

  // Use xKey + yKey to produce a stable, collision-resistant gradient ID
  const gradientId = `gradient-${color.replace('#', '')}-${xKey}-${yKey}`;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={currency ? 60 : 40}
        />
        {currency ? <Tooltip content={<CurrencyTooltip />} /> : <Tooltip content={<CountTooltip />} />}
        <Area
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

// Minimum slice percentage to display an inline label (avoids crowding tiny slices)
const MIN_LABEL_PERCENT = 0.04;

// Custom label renderer for pie slices (shows percentage)
const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < MIN_LABEL_PERCENT) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Custom pie tooltip
function PieTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-800">{entry.name}</p>
        <p className="text-sm text-gray-600">
          Count: <span className="font-bold" style={{ color: entry.payload.fill }}>{entry.value}</span>
        </p>
        <p className="text-sm text-gray-500">
          {((entry.payload.percent ?? 0) * 100).toFixed(1)}% of total
        </p>
      </div>
    );
  }
  return null;
}

export function PieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  // Recharts Pie uses `name` for Legend/Tooltip display; our data has `label`.
  // Map `label` → `name` so Legend and Tooltip work correctly.
  // Falls back to a placeholder so the legend never renders undefined.
  const normalized = data.map((d, i) => ({
    ...d,
    name: d.label ?? d.name ?? `Slice ${i + 1}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={normalized}
          cx="50%"
          cy="45%"
          labelLine={false}
          label={renderPieLabel}
          outerRadius={105}
          innerRadius={40}
          dataKey="value"
          nameKey="name"
          paddingAngle={2}
        >
          {normalized.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend
          iconType="circle"
          iconSize={10}
          formatter={(value) => (
            <span style={{ fontSize: 13, color: '#374151' }}>{value}</span>
          )}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
