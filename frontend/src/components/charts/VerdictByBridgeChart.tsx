import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export interface VerdictByBridgeDatum {
  name: string;
  bridgeId: string;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
  label: string;
}

interface VerdictByBridgeChartProps {
  data: VerdictByBridgeDatum[];
}

const COLORS = {
  LOW: '#34d399',
  MEDIUM: '#fbbf24',
  HIGH: '#fb923c',
  CRITICAL: '#f87171',
};

export function VerdictByBridgeChart({ data }: VerdictByBridgeChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,152,173,0.15)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#8b98ad', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(139,152,173,0.2)' }}
            tickLine={false}
            interval={0}
            angle={-24}
            height={58}
            textAnchor="end"
          />
          <YAxis
            tick={{ fill: '#8b98ad', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(34,211,238,0.06)' }}
            formatter={(value, name) => [Number(value ?? 0) === 1 ? 'yes' : '—', name]}
            contentStyle={{
              background: '#0b0f1f',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#e5eaf3',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
            }}
            labelStyle={{ color: '#8b98ad' }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as VerdictByBridgeDatum | undefined;
              return p ? `${p.name} · verdict ${p.label}` : '';
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: '#8b98ad', fontSize: 12 }}>{value}</span>}
          />
          {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((k) => (
            <Bar key={k} dataKey={k} stackId="1" fill={COLORS[k]} radius={k === 'CRITICAL' ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
