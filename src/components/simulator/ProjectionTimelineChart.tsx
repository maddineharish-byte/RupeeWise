import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { formatPaise } from '../../utils/currency';

interface ProjectionTimelineChartProps {
  data: Array<{
    day: number;
    baselinePaise: number;
    scenarioPaise: number;
  }>;
  scenarioName: string;
}

export function ProjectionTimelineChart({
  data,
  scenarioName,
}: ProjectionTimelineChartProps) {
  // Format data for Recharts (convert paise to rupees for clean Y-axis)
  const chartData = data.map((d) => ({
    day: `Day ${d.day}`,
    rawDay: d.day,
    Baseline: Math.round(d.baselinePaise / 100),
    [scenarioName || 'Scenario']: Math.round(d.scenarioPaise / 100),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg text-xs font-mono border border-slate-700">
          <div className="font-sans font-semibold text-slate-300 mb-1">{label}</div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold">₹{entry.value.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      role="region"
      aria-label={`Projection timeline chart comparing baseline against ${scenarioName || 'simulated scenario'}`}
      className="w-full h-72"
    >
      {/* Screen reader accessible data summary table */}
      <div className="sr-only">
        <h4>Daily cash balance trajectory table:</h4>
        <table>
          <caption>Comparison between baseline and {scenarioName} across the 30-day cycle</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Baseline Balance (₹)</th>
              <th scope="col">Simulated Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>Day {d.day}</td>
                <td>₹{(d.baselinePaise / 100).toLocaleString('en-IN')}</td>
                <td>₹{(d.scenarioPaise / 100).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: '12px' }}
          />
          <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="Baseline"
            stroke="#0284c7"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#0284c7' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey={scenarioName || 'Scenario'}
            stroke="#f59e0b"
            strokeWidth={2.5}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: '#f59e0b' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
