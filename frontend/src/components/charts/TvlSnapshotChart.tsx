import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface TvlSnapshotDatum {
  name: string;
  bridgeId: string;
  tvl: number;
  audited: boolean;
  status: number;
}

interface TvlSnapshotChartProps {
  data: TvlSnapshotDatum[];
}

const STATUS_LABELS = ['ACTIVE', 'FLAGGED', 'COMPROMISED'];

export function TvlSnapshotChart({ data }: TvlSnapshotChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="tvl-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.35} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v: number) => `$${v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${(v / 1_000).toFixed(0)}K`}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(34,211,238,0.06)' }}
            formatter={(value) => [`$${Number(value ?? 0).toLocaleString('en-US')}`, 'TVL']}
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
              const p = payload?.[0]?.payload as TvlSnapshotDatum | undefined;
              if (!p) return '';
              return `${p.name} · ${STATUS_LABELS[p.status] ?? 'ACTIVE'}${p.audited ? ' · audited' : ' · not audited'}`;
            }}
          />
          <Bar dataKey="tvl" radius={[6, 6, 0, 0]} fill="url(#tvl-grad)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
