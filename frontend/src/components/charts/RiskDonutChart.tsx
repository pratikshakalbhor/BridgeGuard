import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export interface DistributionDatum {
  name: string;
  value: number;
  color: string;
}

interface RiskDonutChartProps {
  data: DistributionDatum[];
}

export function RiskDonutChart({ data }: RiskDonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="86%"
            paddingAngle={3}
            cornerRadius={6}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [
              Number(value ?? 0).toLocaleString(),
              'assessments',
            ]}
            contentStyle={{
              background: '#0b0f1f',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              color: '#e5eaf3',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12,
            }}
            labelStyle={{ color: '#8b98ad' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: '#8b98ad', fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none -mt-44 flex flex-col items-center">
        <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
          {total.toLocaleString()}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          assessments
        </span>
      </div>
    </div>
  );
}
